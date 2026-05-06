import mongoose from 'mongoose';
import GroupMessage from '../models/GroupMessage.js';
import GroupMember from '../models/GroupMember.js';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getIO } from '../sockets/index.js';

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  '',
];

const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const isAllowedAttachmentType = (type = '') =>
  ALLOWED_ATTACHMENT_TYPES.includes(type) ||
  type.startsWith('image/') ||
  type.startsWith('video/');

const normalizeAttachments = (attachments = [], attachment_url = '') => {
  const rawAttachments = Array.isArray(attachments) ? [...attachments] : [];
  if (attachment_url) rawAttachments.push({ url: attachment_url, type: '', size: 0 });

  return rawAttachments
    .slice(0, MAX_ATTACHMENTS)
    .map((attachment) => ({
      url: attachment.url || attachment.file_url || '',
      filename: attachment.filename || attachment.original_name || '',
      type: attachment.type || attachment.mime_type || '',
      size: Number(attachment.size || 0),
      public_id: attachment.public_id || '',
    }))
    .filter((attachment) => attachment.url);
};

const validateAttachments = (attachments = []) => {
  if (attachments.length > MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments are allowed`;
  }

  const invalid = attachments.find(
    (attachment) =>
      !isAllowedAttachmentType(attachment.type) || attachment.size > MAX_FILE_SIZE
  );

  if (!invalid) return '';
  if (invalid.size > MAX_FILE_SIZE) return `${invalid.filename || 'Attachment'} is larger than 10MB`;
  return `${invalid.filename || 'Attachment'} has an unsupported file type`;
};

const extractMentionIdsFromHtml = (html = '') =>
  Array.from(String(html).matchAll(/data-mention-id=["']([^"']+)["']/g)).map((match) => match[1]);

const resolveMentionUsers = async (mentions = [], html = '', companyId) => {
  const mentionIds = [
    ...(Array.isArray(mentions) ? mentions : []),
    ...extractMentionIdsFromHtml(html),
  ]
    .map((id) => String(id))
    .filter((id, index, array) => array.indexOf(id) === index)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!mentionIds.length) return [];

  return User.find({ company_id: companyId, _id: { $in: mentionIds } }).select(
    '_id email full_name'
  );
};

const notifyMentionedUsers = async ({
  companyId,
  mentionedUsers,
  senderId,
  senderName,
  messageId,
  messageText,
}) => {
  const text = messageText || 'mentioned you in a group message';

  await Promise.all(
    mentionedUsers
      .filter((user) => user._id.toString() !== senderId.toString())
      .map((user) =>
        Notification.create({
          company_id: companyId,
          user_email: user.email,
          title: `${senderName} mentioned you`,
          message: text.slice(0, 120),
          type: 'group_message',
          related_id: messageId.toString(),
        })
      )
  );
};

// Helper: verify membership
const isGroupMember = async (companyId, userId, groupId, userRole) => {
  if (userRole === 'admin') return true;
  const m = await GroupMember.findOne({
    company_id: companyId,
    group_id: groupId,
    user_id: userId,
  });
  return !!m;
};

// @desc    Send group message
// @route   POST /api/group-messages
// @access  Private (member)
export const sendGroupMessage = asyncHandler(async (req, res) => {
  const {
    group_id,
    message_text = '',
    attachments = [],
    mentions = [],
    attachment_url,
  } = req.body;

  if (Array.isArray(attachments) && attachments.length > MAX_ATTACHMENTS) {
    return res.status(400).json({ error: `Maximum ${MAX_ATTACHMENTS} attachments are allowed` });
  }

  const normalizedAttachments = normalizeAttachments(attachments, attachment_url);
  const attachmentError = validateAttachments(normalizedAttachments);
  if (attachmentError) return res.status(400).json({ error: attachmentError });

  const plainText = stripHtml(message_text);
  if (!group_id || (!plainText && normalizedAttachments.length === 0)) {
    return res.status(400).json({ error: 'group_id and message_text or attachments required' });
  }

  const group = await Group.findOne({ _id: group_id, company_id: req.company_id });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isMember = await isGroupMember(req.company_id, req.user._id, group_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Not a group member' });

  const mentionedUsers = await resolveMentionUsers(mentions, message_text, req.company_id);

  const msg = await GroupMessage.create({
    company_id: req.company_id,
    group_id,
    group_name: group.group_name,
    sender_id: req.user._id,
    sender_email: req.user.email,
    sender_name: req.user.full_name,
    message_text,
    attachments: normalizedAttachments,
    mentions: mentionedUsers.map((user) => user._id),
    attachment_url: attachment_url || '',
  });

  // Real-time broadcast to group room
  try {
    getIO()
      .to(`company_${req.company_id}_group_${group_id}`)
      .emit('new_group_message', msg);
    mentionedUsers.forEach((mentionedUser) => {
      getIO().to(`user_${mentionedUser._id}`).emit('new_group_message', msg);
    });
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  await notifyMentionedUsers({
    companyId: req.company_id,
    mentionedUsers,
    senderId: req.user._id,
    senderName: req.user.full_name,
    messageId: msg._id,
    messageText: plainText,
  });

  res.status(201).json(msg);
});

// @desc    Get messages for a group
// @route   GET /api/group-messages?group_id=xxx
// @access  Private (member)
export const getGroupMessages = asyncHandler(async (req, res) => {
  const { group_id, limit = 100, before } = req.query;

  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  const isMember = await isGroupMember(req.company_id, req.user._id, group_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Not a group member' });

  const filter = { company_id: req.company_id, group_id, is_deleted: false };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await GroupMessage.find(filter)
    .sort('-createdAt')
    .limit(parseInt(limit));

  res.json(messages.reverse());
});

// @desc    Filter group messages (base44 pattern)
// @route   GET /api/group-messages/filter
// @access  Private
export const filterGroupMessages = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const msgs = await GroupMessage.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 100);

  res.json(msgs);
});

// @desc    Edit group message
// @route   PUT /api/group-messages/:id
// @access  Private (sender)
export const editGroupMessage = asyncHandler(async (req, res) => {
  const { message_text, attachments, mentions, is_deleted } = req.body;
  const msg = await GroupMessage.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const isSender = msg.sender_id.toString() === req.user._id.toString();
  const groupMember = await GroupMember.findOne({
    company_id: req.company_id,
    group_id: msg.group_id,
    user_id: req.user._id,
  });
  const isGroupAdmin = groupMember && groupMember.role === 'admin';

  if (!isSender && !isGroupAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const isEditingContent =
    message_text !== undefined || attachments !== undefined || mentions !== undefined;

  if (isEditingContent && msg.is_deleted) {
    return res.status(400).json({ error: 'Deleted messages cannot be edited' });
  }

  if (message_text !== undefined && !isSender) {
    return res.status(403).json({ error: 'Only sender can edit' });
  }

  if (attachments !== undefined && !isSender) {
    return res.status(403).json({ error: 'Only sender can edit attachments' });
  }

  if (mentions !== undefined && !isSender) {
    return res.status(403).json({ error: 'Only sender can edit mentions' });
  }

  let normalizedAttachments = msg.attachments || [];
  if (attachments !== undefined) {
    if (Array.isArray(attachments) && attachments.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: `Maximum ${MAX_ATTACHMENTS} attachments are allowed` });
    }

    normalizedAttachments = normalizeAttachments(attachments);
    const attachmentError = validateAttachments(normalizedAttachments);
    if (attachmentError) return res.status(400).json({ error: attachmentError });
  }

  const nextMessageText = message_text !== undefined ? String(message_text || '') : msg.message_text;
  const nextPlainText = stripHtml(nextMessageText);

  if (!nextPlainText && normalizedAttachments.length === 0 && !Boolean(is_deleted)) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (message_text !== undefined) {
    msg.message_text = nextMessageText;
    msg.is_edited = true;
    msg.edited_at = new Date();
  }

  if (attachments !== undefined) {
    msg.attachments = normalizedAttachments;
    msg.is_edited = true;
    msg.edited_at = new Date();
  }

  if (message_text !== undefined || mentions !== undefined) {
    const mentionedUsers = await resolveMentionUsers(
      Array.isArray(mentions) ? mentions : [],
      nextMessageText,
      req.company_id
    );
    msg.mentions = mentionedUsers.map((user) => user._id);
  }

  if (is_deleted !== undefined) {
    msg.is_deleted = Boolean(is_deleted);
    if (msg.is_deleted) {
      msg.deleted_by = req.user._id;
      msg.message_text = 'This message was deleted';
      msg.attachments = [];
    }
  }

  await msg.save();

  try {
    getIO()
      .to(`company_${req.company_id}_group_${msg.group_id}`)
      .emit('group_message_edited', msg);
  } catch (err) {}

  res.json(msg);
});

// @desc    Delete group message
// @route   DELETE /api/group-messages/:id
// @access  Private (sender or group admin)
export const deleteGroupMessage = asyncHandler(async (req, res) => {
  const msg = await GroupMessage.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const isSender = msg.sender_id.toString() === req.user._id.toString();
  const groupMember = await GroupMember.findOne({
    company_id: req.company_id,
    group_id: msg.group_id,
    user_id: req.user._id,
  });
  const isGroupAdmin = groupMember && groupMember.role === 'admin';

  if (!isSender && !isGroupAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  msg.is_deleted = true;
  msg.deleted_by = req.user._id;
  msg.message_text = 'This message was deleted';
  msg.attachments = [];
  await msg.save();

  try {
    const io = getIO();
    if (io) {
      io
        .to(`company_${req.company_id}_group_${msg.group_id}`)
        .emit('group_message_deleted', msg);
    }
  } catch (err) {}

  res.json({ message: 'Message deleted' });
});

// @desc    Mark group message as read
// @route   PUT /api/group-messages/:id/read
// @access  Private
export const markGroupMessageRead = asyncHandler(async (req, res) => {
  const msg = await GroupMessage.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const isMember = await isGroupMember(req.company_id, req.user._id, msg.group_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });

  const userId = req.user._id;
  const readBy = (msg.read_by || []).map((id) => id.toString());

  if (!readBy.includes(userId.toString())) {
    msg.read_by.push(userId);
    await msg.save();
  }

  res.json(msg);
});

