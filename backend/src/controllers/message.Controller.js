import mongoose from "mongoose";
import Message from "../models/Message.js";
import MessageReminder from "../models/MessageReminder.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getIO } from "../sockets/index.js";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "",
];

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const isAllowedAttachmentType = (type = "") =>
  ALLOWED_ATTACHMENT_TYPES.includes(type) ||
  type.startsWith("image/") ||
  type.startsWith("video/");

const normalizeAttachments = (attachments = [], attachment_url = "", attachment_type = "") => {
  const rawAttachments = Array.isArray(attachments) ? [...attachments] : [];

  if (attachment_url) {
    rawAttachments.push({
      url: attachment_url,
      filename: "",
      type: attachment_type,
      size: 0,
    });
  }

  return rawAttachments
    .slice(0, MAX_ATTACHMENTS)
    .map((attachment) => ({
      url: attachment.url || attachment.file_url || "",
      filename: attachment.filename || attachment.original_name || "",
      type: attachment.type || attachment.mime_type || attachment.attachment_type || "",
      size: Number(attachment.size || 0),
      public_id: attachment.public_id || "",
    }))
    .filter((attachment) => attachment.url);
};

const extractMentionIdsFromHtml = (html = "") =>
  Array.from(String(html).matchAll(/data-mention-id=["']([^"']+)["']/g)).map((match) => match[1]);

const resolveMentionUsers = async (mentions = [], html = "", companyId) => {
  const mentionIds = [
    ...(Array.isArray(mentions) ? mentions : []),
    ...extractMentionIdsFromHtml(html),
  ]
    .map((id) => String(id))
    .filter((id, index, array) => array.indexOf(id) === index)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!mentionIds.length) return [];

  // Match by membership so we can mention coworkers who're currently in
  // another workspace (Slack-style — async messages reach them).
  return User.find({
    "workspaces.company_id": companyId,
    _id: { $in: mentionIds },
  }).select("_id email full_name");
};

const validateAttachments = (attachments = []) => {
  if (attachments.length > MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments are allowed`;
  }

  const invalid = attachments.find(
    (attachment) =>
      !isAllowedAttachmentType(attachment.type) || attachment.size > MAX_FILE_SIZE
  );

  if (!invalid) return "";
  if (invalid.size > MAX_FILE_SIZE) return `${invalid.filename || "Attachment"} is larger than 10MB`;
  return `${invalid.filename || "Attachment"} has an unsupported file type`;
};

const notifyMentionedUsers = async ({
  companyId,
  mentionedUsers,
  excludedUserIds = [],
  senderName,
  messageId,
  messageText,
  type = "new_message",
}) => {
  const excluded = new Set(excludedUserIds.map((id) => String(id)));
  const text = messageText || "mentioned you in a message";

  await Promise.all(
    mentionedUsers
      .filter((user) => !excluded.has(user._id.toString()))
      .map((user) =>
        Notification.create({
          company_id: companyId,
          user_email: user.email,
          title: `${senderName} mentioned you`,
          message: text.slice(0, 120),
          type,
          related_id: messageId.toString(),
        })
      )
  );
};

// @desc    Send direct message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const {
    receiver_id,
    message_text = "",
    attachments = [],
    mentions = [],
    attachment_url,
    attachment_type,
  } = req.body;

  if (Array.isArray(attachments) && attachments.length > MAX_ATTACHMENTS) {
    return res.status(400).json({ error: `Maximum ${MAX_ATTACHMENTS} attachments are allowed` });
  }

  const normalizedAttachments = normalizeAttachments(
    attachments,
    attachment_url,
    attachment_type
  );
  const attachmentError = validateAttachments(normalizedAttachments);
  if (attachmentError) return res.status(400).json({ error: attachmentError });

  const plainText = stripHtml(message_text);
  if (!receiver_id || (!plainText && normalizedAttachments.length === 0)) {
    return res
      .status(400)
      .json({ error: "receiver_id and message_text or attachments required" });
  }

  // Validate the receiver is a member of this workspace (membership), not
  // necessarily currently active in it. They'll get the message when they
  // come back, just like Slack DMs.
  const receiver = await User.findOne({
    _id: receiver_id,
    "workspaces.company_id": req.company_id,
  });
  if (!receiver) return res.status(404).json({ error: "Receiver not found" });

  const mentionedUsers = await resolveMentionUsers(mentions, message_text, req.company_id);

  const message = await Message.create({
    company_id: req.company_id,
    sender_id: req.user._id,
    sender_email: req.user.email,
    sender_name: req.user.full_name,
    receiver_id: receiver._id,
    receiver_email: receiver.email,
    receiver_name: receiver.full_name,
    message_text,
    attachments: normalizedAttachments,
    mentions: mentionedUsers.map((user) => user._id),
    attachment_url: attachment_url || "",
    attachment_type: attachment_type || "",
  });

  // Real-time push
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${receiver._id}`).emit("new_message", message);
      io.to(`user_${req.user._id}`).emit("new_message", message);
      mentionedUsers.forEach((mentionedUser) => {
        io.to(`user_${mentionedUser._id}`).emit("new_message", message);
      });
    }
  } catch (err) {
    console.error("Socket emit failed:", err.message);
  }

  // Notification for receiver
  await Notification.create({
    company_id: req.company_id,
    user_email: receiver.email,
    title: `Message from ${req.user.full_name}`,
    message: (plainText || `${normalizedAttachments.length} attachment(s)`).slice(0, 80),
    type: "new_message",
    related_id: message._id.toString(),
  });

  await notifyMentionedUsers({
    companyId: req.company_id,
    mentionedUsers,
    excludedUserIds: [req.user._id, receiver._id],
    senderName: req.user.full_name,
    messageId: message._id,
    messageText: plainText,
    type: "new_message",
  });

  res.status(201).json(message);
});

// @desc    Get conversation between current user and another user
// @route   GET /api/messages/conversation/:userId
// @access  Private
export const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 100, before } = req.query;

  // Membership-based lookup so the conversation history loads even when the
  // partner is currently active in a different workspace.
  const partner = await User.findOne({
    _id: userId,
    "workspaces.company_id": req.company_id,
  }).select("_id");
  if (!partner) return res.status(404).json({ error: "Conversation user not found" });

  const filter = {
    company_id: req.company_id,
    is_deleted: false,
    $or: [
      { sender_id: req.user._id, receiver_id: userId },
      { sender_id: userId, receiver_id: req.user._id },
    ],
  };

  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort("-createdAt")
    .limit(parseInt(limit));

  // Return oldest first (for chat UI)
  res.json(messages.reverse());
});

// @desc    Get all conversations list (inbox-style)
// @route   GET /api/messages/conversations
// @access  Private
export const getMyConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all unique conversation partners
  const messages = await Message.find({
    company_id: req.company_id,
    is_deleted: false,
    $or: [{ sender_id: userId }, { receiver_id: userId }],
  })
    .sort("-createdAt")
    .limit(500);

  // Build conversation map (latest message per partner)
  const conversations = new Map();
  for (const msg of messages) {
    const partnerId =
      msg.sender_id.toString() === userId.toString()
        ? msg.receiver_id.toString()
        : msg.sender_id.toString();
    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, {
        partner_id: partnerId,
        partner_name:
          msg.sender_id.toString() === userId.toString()
            ? msg.receiver_name
            : msg.sender_name,
        partner_email:
          msg.sender_id.toString() === userId.toString()
            ? msg.receiver_email
            : msg.sender_email,
        last_message: stripHtml(msg.message_text) || `${msg.attachments?.length || 0} attachment(s)`,
        last_message_at: msg.createdAt,
        is_last_from_me: msg.sender_id.toString() === userId.toString(),
      });
    }
  }

  // Add unread counts
  const result = await Promise.all(
    Array.from(conversations.values()).map(async (c) => {
      const unread = await Message.countDocuments({
        company_id: req.company_id,
        sender_id: c.partner_id,
        receiver_id: userId,
        is_read: false,
        is_deleted: false,
      });
      return { ...c, unread_count: unread };
    }),
  );

  res.json(result);
});

// @desc    Filter messages (base44 pattern)
// @route   GET /api/messages/filter
// @access  Private
export const filterMessages = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;

  if (req.user.role !== "admin") {
    filter.$or = [{ sender_id: req.user._id }, { receiver_id: req.user._id }];
  }
  delete filter.sort;
  delete filter.limit;

  const messages = await Message.find(filter)
    .sort(req.query.sort || "-createdAt")
    .limit(parseInt(req.query.limit) || 100);

  res.json(messages);
});

// @desc    Mark messages as read
// @route   PUT /api/messages/mark-read/:senderId
// @access  Private
export const markConversationRead = asyncHandler(async (req, res) => {
  const filter = {
    company_id: req.company_id,
    sender_id: req.params.senderId,
    receiver_id: req.user._id,
    is_read: false,
  };

  const unreadMessages = await Message.find(filter);
  const result = await Message.updateMany(filter, { is_read: true });

  try {
    const io = getIO();
    if (io) {
      unreadMessages.forEach((message) => {
        message.is_read = true;
        io.to(`user_${message.receiver_id}`).emit("message_edited", message);
        io.to(`user_${message.sender_id}`).emit("message_edited", message);
      });
    }
  } catch (err) {}

  res.json({ message: "Marked as read", updated: result.modifiedCount });
});

// @desc    Edit message
// @route   PUT /api/messages/:id
// @access  Private (sender only)
export const editMessage = asyncHandler(async (req, res) => {
  const {
    message_text,
    attachments,
    mentions,
    is_read,
    is_pinned,
    is_deleted,
    deleted_for_everyone,
    deleted_by,
    muted_by,
  } = req.body;
  const message = await Message.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: "Message not found" });

  const userId = req.user._id.toString();
  const isSender = message.sender_id.toString() === userId;
  const isParticipant = [
    message.sender_id.toString(),
    message.receiver_id.toString(),
  ].includes(userId);

  if (!isParticipant) {
    return res.status(403).json({ error: "Access denied" });
  }

  const isEditingContent =
    message_text !== undefined || attachments !== undefined || mentions !== undefined;

  if (isEditingContent && message.is_deleted) {
    return res.status(400).json({ error: "Deleted messages cannot be edited" });
  }

  if (message_text !== undefined && !isSender) {
    return res.status(403).json({ error: "Only sender can edit" });
  }

  if (attachments !== undefined && !isSender) {
    return res.status(403).json({ error: "Only sender can edit attachments" });
  }

  if (mentions !== undefined && !isSender) {
    return res.status(403).json({ error: "Only sender can edit mentions" });
  }

  let normalizedAttachments = message.attachments || [];
  if (attachments !== undefined) {
    if (Array.isArray(attachments) && attachments.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: `Maximum ${MAX_ATTACHMENTS} attachments are allowed` });
    }

    normalizedAttachments = normalizeAttachments(attachments);
    const attachmentError = validateAttachments(normalizedAttachments);
    if (attachmentError) return res.status(400).json({ error: attachmentError });
  }

  const nextMessageText = message_text !== undefined ? String(message_text || "") : message.message_text;
  const nextPlainText = stripHtml(nextMessageText);

  if (!nextPlainText && normalizedAttachments.length === 0 && !Boolean(is_deleted)) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (message_text !== undefined) {
    message.message_text = nextMessageText;
    message.is_edited = true;
    message.edited_at = new Date();
  }

  if (attachments !== undefined) {
    message.attachments = normalizedAttachments;
    message.is_edited = true;
    message.edited_at = new Date();
  }

  if (message_text !== undefined || mentions !== undefined) {
    const mentionedUsers = await resolveMentionUsers(
      Array.isArray(mentions) ? mentions : [],
      nextMessageText,
      req.company_id
    );
    message.mentions = mentionedUsers.map((user) => user._id);
  }

  if (is_read !== undefined) message.is_read = Boolean(is_read);
  if (is_pinned !== undefined) message.is_pinned = Boolean(is_pinned);
  if (Array.isArray(muted_by)) message.muted_by = muted_by;

  if (is_deleted !== undefined) {
    message.is_deleted = Boolean(is_deleted);
    if (message.is_deleted) {
      message.deleted_by = deleted_by && mongoose.Types.ObjectId.isValid(deleted_by)
        ? deleted_by
        : req.user._id;
      message.deleted_for_everyone = Boolean(deleted_for_everyone);

      if (message.deleted_for_everyone) {
        if (!isSender && req.user.role !== "admin") {
          return res.status(403).json({ error: "Only sender can delete for everyone" });
        }
        message.message_text = "This message was deleted";
        message.attachments = [];
      }
    }
  }

  await message.save();

  try {
    const io = getIO();
    if (io) {
      io.to(`user_${message.receiver_id}`).emit("message_edited", message);
      io.to(`user_${message.sender_id}`).emit("message_edited", message);
    }
  } catch (err) {}

  res.json(message);
});

// @desc    Soft delete message
// @route   DELETE /api/messages/:id
// @access  Private (sender only)
export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: "Message not found" });

  if (message.sender_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Only sender can delete" });
  }

  message.is_deleted = true;
  message.deleted_for_everyone = true;
  message.deleted_by = req.user._id;
  message.message_text = "This message was deleted";
  message.attachments = [];
  await message.save();

  try {
    const io = getIO();
    if (io) {
      io.to(`user_${message.receiver_id}`).emit("message_deleted", message);
      io.to(`user_${message.sender_id}`).emit("message_deleted", message);
    }
  } catch (err) {}

  res.json({ message: "Message deleted" });
});

// @desc    Pin/unpin message
// @route   PUT /api/messages/:id/pin
// @access  Private
export const togglePin = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: "Message not found" });

  // Sender or receiver can pin
  const canPin = [
    message.sender_id.toString(),
    message.receiver_id.toString(),
  ].includes(req.user._id.toString());
  if (!canPin) return res.status(403).json({ error: "Access denied" });

  message.is_pinned = !message.is_pinned;
  await message.save();
  res.json(message);
});

// @desc    Mute/unmute message
// @route   PUT /api/messages/:id/mute
// @access  Private
export const toggleMute = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: "Message not found" });

  const canMute = [
    message.sender_id.toString(),
    message.receiver_id.toString(),
  ].includes(req.user._id.toString());
  if (!canMute) return res.status(403).json({ error: "Access denied" });

  const userId = req.user._id.toString();
  const mutedBy = (message.muted_by || []).map((id) => id.toString());

  if (mutedBy.includes(userId)) {
    message.muted_by = message.muted_by.filter(
      (id) => id.toString() !== userId,
    );
  } else {
    message.muted_by.push(req.user._id);
  }

  await message.save();
  res.json(message);
});

// @desc    Create message reminder
// @route   POST /api/messages/:id/reminder
// @access  Private
export const createMessageReminder = asyncHandler(async (req, res) => {
  const { reminder_time } = req.body;
  if (!reminder_time) {
    return res.status(400).json({ error: "reminder_time required" });
  }

  const message = await Message.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!message) return res.status(404).json({ error: "Message not found" });

  const canRemind = [
    message.sender_id.toString(),
    message.receiver_id.toString(),
  ].includes(req.user._id.toString());
  if (!canRemind) return res.status(403).json({ error: "Access denied" });

  const reminder = await MessageReminder.create({
    company_id: req.company_id,
    user_id: req.user._id,
    message_id: message._id,
    message_text: message.message_text,
    reminder_time: new Date(reminder_time),
  });

  res.status(201).json(reminder);
});

// @desc    Broadcast message to multiple users
// @route   POST /api/messages/broadcast
// @access  Private/Admin
export const broadcastMessage = asyncHandler(async (req, res) => {
  const { user_ids, message_text } = req.body;

  if (!Array.isArray(user_ids) || !user_ids.length || !message_text) {
    return res
      .status(400)
      .json({ error: "user_ids array and message_text required" });
  }

  // Membership-based — broadcasts can reach any team member, even those
  // currently active in another workspace.
  const users = await User.find({ "workspaces.company_id": req.company_id, _id: { $in: user_ids } });
  const messages = [];

  for (const receiver of users) {
    const msg = await Message.create({
      company_id: req.company_id,
      sender_id: req.user._id,
      sender_email: req.user.email,
      sender_name: req.user.full_name,
      receiver_id: receiver._id,
      receiver_email: receiver.email,
      receiver_name: receiver.full_name,
      message_text,
    });
    messages.push(msg);

    try {
      getIO().to(`user_${receiver._id}`).emit("new_message", msg);
    } catch (err) {}
  }

  res.status(201).json({ sent: messages.length, messages });
});
