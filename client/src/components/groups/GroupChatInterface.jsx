import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Info,
  Loader2,
  MoreVertical,
  Send,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import RichTextEditor from '../messages/RichTextEditor';
import RichTextInput from '../messages/RichTextInput';
import MessageRenderer, { getPlainTextFromHtml } from '../messages/MessageRenderer';
import GroupInfoDialog from './GroupInfoDialog';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMessageTime(value) {
  if (!value) return '';
  try {
    return format(parseISO(value), 'HH:mm');
  } catch {
    return '';
  }
}

function getMessagePreview(messageText = '', attachments = []) {
  const text = getPlainTextFromHtml(messageText);
  if (text) return text;
  if (attachments?.length) return `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`;
  return '';
}

export default function GroupChatInterface({ group, currentUser, companyUsers = [] }) {
  const groupId = group?.id;
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const msgs = await base44.entities.GroupMessage.getByGroup(groupId, { limit: 100 });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!groupId,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      return base44.entities.GroupMember.filter({ group_id: groupId });
    },
    enabled: !!groupId,
  });

  const groupMentionUsers = useMemo(() => {
    const memberIds = new Set((groupMembers || []).map((member) => String(member.user_id)));
    return (companyUsers || []).filter((member) => memberIds.has(String(member.id || member._id)));
  }, [companyUsers, groupMembers]);

  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = base44.entities.GroupMessage.subscribe((event) => {
      if (event.data?.group_id === groupId) {
        queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      }
    });

    return unsubscribe;
  }, [groupId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setEditingMessage(null);
  }, [groupId]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message_text, attachments = [], mentions = [] }) => {
      if (!groupId) throw new Error('No group selected');

      const preview = getMessagePreview(message_text, attachments);
      if (!preview && !attachments.length) return null;

      return await base44.entities.GroupMessage.create({
        group_id: groupId,
        group_name: group?.group_name || '',
        sender_id: currentUser.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        message_text: message_text || '',
        attachments,
        mentions,
        is_edited: false,
        is_deleted: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-group-messages'] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) =>
      base44.entities.GroupMessage.update(messageId, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, message_text, attachments = [], mentions = [] }) =>
      base44.entities.GroupMessage.update(messageId, {
        message_text,
        attachments,
        mentions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-group-messages'] });
      setEditingMessage(null);
      toast.success('Message updated');
    },
  });

  const handleSendMessage = (html, attachments = [], mentions = []) => {
    if ((html || attachments.length) && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({
        message_text: html,
        attachments,
        mentions,
      });
    }
  };

  const handleStartEditMessage = (message) => {
    if (!message || message.sender_id !== currentUser?.id) return;
    setEditingMessage(message);
  };

  const handleSaveEditedMessage = async (html, attachments = [], mentions = []) => {
    if (!editingMessage) return false;

    const preview = getMessagePreview(html, attachments);
    if (!preview && attachments.length === 0) {
      toast.error('Message cannot be empty');
      return false;
    }

    try {
      await editMessageMutation.mutateAsync({
        messageId: editingMessage.id,
        message_text: html,
        attachments,
        mentions,
      });
      return true;
    } catch (error) {
      toast.error(error?.error || error?.message || 'Unable to save message changes');
      return false;
    }
  };

  const visibleMessages = messages.filter((message) => !message.is_deleted);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#020806]/90">
      <div className="border-b border-lime-400/15 bg-[#020806]/95 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-400/20 bg-lime-400/10">
              <span className="text-sm font-semibold text-lime-300">
                {getInitials(group?.group_name)}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{group?.group_name}</h3>
              <p className="truncate text-xs text-lime-100/55">{group?.group_type || 'Group chat'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGroupInfo(true)}
            className="h-9 w-9 rounded-xl text-lime-100/55 hover:bg-[#061006]/80 hover:text-white"
            aria-label="Group info"
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-black p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3 text-lime-100/55">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading messages...</span>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#061006]/80">
                <Send className="h-8 w-8 text-lime-100/45" />
              </div>
              <p className="font-medium text-white">No messages yet</p>
              <p className="mt-1 text-sm text-lime-100/55">Start the group conversation.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {visibleMessages.map((message) => {
              const isSender = message.sender_id === currentUser.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn("flex gap-3", isSender ? "justify-end" : "justify-start")}
                >
                  {!isSender ? (
                    <Avatar className="h-8 w-8 shrink-0 bg-lime-400/10 text-lime-300">
                      <AvatarFallback className="bg-lime-400/10 text-xs font-bold text-lime-300">
                        {getInitials(message.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}

                  <div className={cn("group flex max-w-[85%] flex-col gap-1 md:max-w-[72%]", isSender ? "items-end" : "items-start")}>
                    {!isSender ? (
                      <p className="text-xs font-medium text-lime-100/55">{message.sender_name}</p>
                    ) : null}

                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
                        isSender
                          ? "rounded-br-md border-lime-400/30 bg-lime-400 text-white"
                          : "rounded-bl-md border-lime-400/15 bg-[#020806]/90 text-slate-100"
                      )}
                    >
                      <MessageRenderer
                        html={message.message_text}
                        attachments={message.attachments}
                        isOwn={isSender}
                      />
                    </div>

                    <div className={cn("flex items-center gap-2", isSender ? "justify-end" : "justify-start")}>
                      <p className="text-xs text-lime-100/45">
                        {formatMessageTime(message.created_date)}
                        {message.is_edited ? (
                          <span className="ml-1 text-lime-100/45">(edited)</span>
                        ) : null}
                      </p>
                      {isSender ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-lg p-1 opacity-0 transition-opacity hover:bg-[#061006]/80 group-hover:opacity-100" aria-label="Message actions">
                              <MoreVertical className="h-4 w-4 text-lime-100/45" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border border-lime-400/15 bg-[#020806]/90 text-white">
                            <DropdownMenuItem
                              onClick={() => handleStartEditMessage(message)}
                              className="focus:bg-lime-400/10 focus:text-white"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMessageMutation.mutate(message.id)}
                              className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-lime-400/15 bg-[#020806]/90 p-4">
        {editingMessage ? (
          <RichTextEditor
            key={`group-edit-${editingMessage.id}-${editingMessage.updated_date || editingMessage.created_date || ''}`}
            initialContent={editingMessage.message_text}
            initialAttachments={editingMessage.attachments || []}
            mode="edit"
            onCancel={() => setEditingMessage(null)}
            onSend={handleSaveEditedMessage}
            disabled={editMessageMutation.isPending}
            placeholder={`Update your message in ${group?.group_name || 'group'}...`}
            companyUsers={groupMentionUsers}
          />
        ) : (
          <RichTextInput
            onSend={handleSendMessage}
            disabled={sendMessageMutation.isPending}
            placeholder={`Message ${group?.group_name || 'group'}...`}
            companyUsers={groupMentionUsers}
          />
        )}
      </div>

      <GroupInfoDialog
        open={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        group={group}
      />
    </div>
  );
}
