import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DirectMessagesList from '../components/messages/DirectMessagesList';
import BroadcastMessageDialog from '../components/messages/BroadcastMessageDialog';
import GroupChatList from '../components/groups/GroupChatList';
import GroupChatInterface from '../components/groups/GroupChatInterface';
import NotificationBell from '../components/notifications/NotificationBell';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Megaphone,
  Pin,
  Star,
  Search,
  Bell,
  Users,
  MessagesSquare,
  X,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import MessageContextMenu from '../components/messages/MessageContextMenu';
import RichTextEditor from '../components/messages/RichTextEditor';
import RichTextInput from '../components/messages/RichTextInput';
import MessageRenderer, { getPlainTextFromHtml } from '../components/messages/MessageRenderer';
import ConversationMenu from '../components/messages/ConversationMenu.jsx';
import UserProfileDialog from '../components/messages/UserProfileDialog';
import { toast } from 'react-hot-toast';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function Banner({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="break-words">{message}</span>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "border-lime-400/20 bg-[#061006]/80/70 text-lime-100/75",
    indigo: "border-lime-400/20 bg-lime-400/10 text-lime-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium", tones[tone])}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-lime-100/55">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function ChatDateSeparator({ date }) {
  let label = format(date, 'MMM d, yyyy');

  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-[#061006]/80" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-lime-100/45">{label}</span>
      <div className="h-px flex-1 bg-[#061006]/80" />
    </div>
  );
}

function formatMessageTime(value) {
  if (!value) return '';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return format(toZonedTime(parsed, 'Asia/Kolkata'), 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

function groupMessagesByDay(messages) {
  const grouped = [];
  let lastDateKey = null;

  for (const msg of messages) {
    const msgDate = new Date(msg.created_date);
    const dateKey = format(msgDate, 'yyyy-MM-dd');

    if (dateKey !== lastDateKey) {
      grouped.push({
        type: 'separator',
        id: `sep-${dateKey}`,
        date: msgDate,
      });
      lastDateKey = dateKey;
    }

    grouped.push({
      type: 'message',
      data: msg,
    });
  }

  return grouped;
}

function getMessagePreview(messageText = '', attachments = []) {
  const text = getPlainTextFromHtml(messageText);
  if (text) return text;
  if (attachments?.length) return `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`;
  return '';
}

export default function DirectMessages() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [starredConversations, setStarredConversations] = useState(() => {
    const saved = localStorage.getItem('starredConversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [pageError, setPageError] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const toggleStar = (userId) => {
    setStarredConversations((prev) => {
      const newStarred = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];

      localStorage.setItem('starredConversations', JSON.stringify(newStarred));

      toast.success(prev.includes(userId) ? 'Conversation unstarred' : 'Conversation starred');
      return newStarred;
    });
  };

  useEffect(() => {
    const initUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        setPageError('Unable to load your chat workspace. Please refresh the page.');
      }
    };

    initUser();
  }, []);

  const {
    data: allConversationMessages = [],
    isLoading: loadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', user?.id, selectedUser?.id],
    queryFn: async () => {
      if (!user || !selectedUser) return [];

      try {
        const [sentMessages, receivedMessages] = await Promise.all([
          base44.entities.Message.filter(
            { sender_id: user.id, receiver_id: selectedUser.id },
            '-createdAt',
            1000
          ),
          base44.entities.Message.filter(
            { sender_id: selectedUser.id, receiver_id: user.id },
            '-createdAt',
            1000
          ),
        ]);

        const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
        return allMessages.sort(
          (a, b) =>
            new Date(a.created_date || a.createdAt) -
            new Date(b.created_date || b.createdAt)
        );
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        throw error;
      }
    },
    enabled: !!user && !!selectedUser,
  });

  const { data: companyUsers = [] } = useQuery({
    queryKey: ['messaging-users', user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUsersForMessaging', {});
      return response?.data?.users || response?.users || [];
    },
    enabled: !!user,
  });

  const messages = useMemo(() => {
    if (!messageSearchQuery.trim()) return allConversationMessages;

    const term = messageSearchQuery.toLowerCase();
    return allConversationMessages.filter((msg) => {
      const preview = getMessagePreview(msg.message_text, msg.attachments);
      const attachmentText = (msg.attachments || [])
        .map((attachment) => attachment.filename || attachment.original_name || '')
        .join(' ');
      return `${preview} ${attachmentText}`.toLowerCase().includes(term);
    });
  }, [allConversationMessages, messageSearchQuery]);

  const groupedMessages = useMemo(() => groupMessagesByDay(messages), [messages]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.is_pinned && !m.is_deleted),
    [messages]
  );

  useEffect(() => {
    setEditingMessage(null);
  }, [selectedGroup, selectedUser?.id]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const msg = event.data;

        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          if (
            msg.receiver_id === user.id &&
            msg.sender_id === selectedUser?.id &&
            !msg.is_read
          ) {
            base44.entities.Message.markConversationRead(selectedUser.id).catch(console.error);
          }
        }
      }
    });

    return unsubscribe;
  }, [user, selectedUser, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message_text, attachments = [], mentions = [] }) => {
      const cleanText = getMessagePreview(message_text, attachments);
      if (!cleanText && !attachments.length) return null;

      const newMessage = await base44.entities.Message.create({
        sender_id: user.id,
        sender_email: user.email,
        sender_name: user.full_name,
        receiver_id: selectedUser.id,
        receiver_email: selectedUser.email,
        receiver_name: selectedUser.full_name,
        message_text: message_text || '',
        attachments,
        mentions,
        is_read: false,
        is_edited: false,
        is_pinned: false,
        is_deleted: false,
        muted_by: [],
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, message_text, attachments = [], mentions = [] }) =>
      base44.entities.Message.update(messageId, {
        message_text,
        attachments,
        mentions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setEditingMessage(null);
      toast.success('Message updated');
    },
  });

  const handleMarkUnread = async (messageId) => {
    await base44.entities.Message.update(messageId, {
      is_read: false,
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleSetReminder = async (messageId, reminderTime, messageText) => {
    await base44.entities.MessageReminder.create({
      user_id: user.id,
      message_id: messageId,
      message_text: messageText,
      reminder_time: reminderTime.toISOString(),
      is_triggered: false,
    });
  };

  const handleToggleMute = async (messageId) => {
    const msg = messages.find((m) => m.id === messageId);
    const mutedBy = msg?.muted_by || [];
    const isMuted = mutedBy.includes(user.id);

    await base44.entities.Message.update(messageId, {
      muted_by: isMuted
        ? mutedBy.filter((id) => id !== user.id)
        : [...mutedBy, user.id],
    });

    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleCopyLink = async (messageId) => {
    const link = `${window.location.origin}${window.location.pathname}?messageId=${messageId}`;
    return link;
  };

  const handlePinMessage = async (messageId, pin) => {
    await base44.entities.Message.update(messageId, {
      is_pinned: pin,
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const handleDeleteMessage = async (messageId, deleteForEveryone) => {
    if (deleteForEveryone) {
      await base44.entities.Message.update(messageId, {
        is_deleted: true,
        deleted_for_everyone: true,
        deleted_by: user.id,
        message_text: 'This message was deleted',
      });
    } else {
      await base44.entities.Message.update(messageId, {
        is_deleted: true,
        deleted_for_everyone: false,
        deleted_by: user.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  useEffect(() => {
    const markConversationAsRead = async () => {
      if (!user || !selectedUser || !allConversationMessages.length) return;

      try {
        const unreadMessages = allConversationMessages.filter(
          (m) =>
            m.receiver_id === user.id &&
            m.sender_id === selectedUser.id &&
            !m.is_read
        );

        if (unreadMessages.length > 0) {
          await base44.entities.Message.markConversationRead(selectedUser.id);
        }

        const messageNotifications = await base44.entities.Notification.filter({
          user_email: user.email,
          type: 'new_message',
          is_read: false,
        });

        const relevantNotifications = messageNotifications.filter((notif) =>
          (notif.message || '').includes(selectedUser.full_name)
        );

        if (relevantNotifications.length > 0) {
          await Promise.all(
            relevantNotifications.map((notif) =>
              base44.entities.Notification.update(notif.id, { is_read: true })
            )
          );
        }

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to mark conversation as read:', error);
      }
    };

    markConversationAsRead();
  }, [user, selectedUser, allConversationMessages, queryClient]);

  const handleSendMessage = (html, attachments = [], mentions = []) => {
    if ((html || attachments.length) && !sendMessageMutation.isPending && selectedUser) {
      sendMessageMutation.mutate({
        message_text: html,
        attachments,
        mentions,
      });
    }
  };

  const handleStartEditMessage = (message) => {
    if (!message || message.sender_id !== user?.id) return;
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

  const activeConversationTitle = selectedGroup
    ? selectedGroup.group_name
    : selectedUser?.full_name || 'Messages';

  const selectedUserInitials = selectedUser?.full_name
    ? selectedUser.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : 'U';

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-lime-100/55">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <div className="max-w-[1600px] mx-auto h-screen flex flex-col px-3 md:px-4 lg:px-6 py-3 md:py-4 gap-4">

        <Banner message={pageError || messagesError?.message} />

        {/* Top Bar */}
        <div className="rounded-[1.75rem] border border-lime-400/15 bg-[#020806]/90 px-4 md:px-5 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                  <MessagesSquare className="w-5 h-5 text-lime-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight break-words">
                    Communication Hub
                  </h1>
                  <p className="text-sm text-lime-100/55 break-words">
                    Slack-style team messaging for direct and group communication
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <InfoPill icon={Bell} label="Starred" value={String(starredConversations.length)} tone="amber" />
                <InfoPill icon={Users} label="Mode" value={selectedGroup ? "Group Chat" : selectedUser ? "Direct Message" : "No Chat Selected"} tone="slate" />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <NotificationBell userEmail={user.email} />
              {user.role === 'admin' && (
                <Button
                  onClick={() => setShowBroadcast(true)}
                  className="h-11 bg-lime-400 hover:bg-lime-400 rounded-2xl text-black"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Broadcast
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
          {/* Sidebar */}
          <div className={cn(
            "min-h-0 rounded-[1.75rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden",
            mobileSidebarOpen ? "block" : "hidden lg:block"
          )}>
            <div className="h-full flex flex-col min-h-0">
              <div className="p-4 border-b border-lime-400/15 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-100/55">
                      Conversations
                    </h2>
                    <p className="text-xs text-lime-100/45 mt-1">Browse direct messages and groups</p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-lime-100/45" />
                  <input
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Search people or groups..."
                    className="w-full h-11 rounded-2xl border border-lime-400/15 bg-[#000000] pl-10 pr-4 text-sm text-white placeholder:text-lime-100/45 outline-none focus:border-lime-400/40"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-lime-100/45 px-1">Group Chats</p>
                  <GroupChatList
                    currentUser={user}
                    searchQuery={sidebarSearch}
                    onGroupSelect={(group) => {
                      setSelectedGroup(group);
                      setSelectedUser(null);
                      setMobileSidebarOpen(false);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-lime-100/45 px-1">Direct Messages</p>
                  <DirectMessagesList
                    currentUser={user}
                    searchQuery={sidebarSearch}
                    starredConversations={starredConversations}
                    selectedUserId={selectedUser?.id || null}
                    onUserSelect={(selected) => {
                      setSelectedUser(selected);
                      setSelectedGroup(null);
                      setMessageSearchQuery('');
                      setMobileSidebarOpen(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="min-h-0">
            {selectedGroup ? (
              <div className="h-full min-h-0 rounded-[1.75rem] border border-lime-400/15 bg-[#020806]/90 shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
                <GroupChatInterface
                  group={selectedGroup}
                  currentUser={user}
                  companyUsers={companyUsers}
                />
              </div>
            ) : selectedUser ? (
              <Card className="border border-lime-400/15 bg-[#020806]/90 h-full min-h-0 flex flex-col rounded-[1.75rem] shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b border-lime-400/15 bg-[#020806]/90/95">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden h-9 w-9 rounded-xl text-lime-100/55 hover:text-white hover:bg-[#061006]/80"
                      onClick={() => setMobileSidebarOpen(true)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                      <div className="w-12 h-12 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center">
                        <span className="text-lime-300 font-semibold text-sm">
                          {selectedUserInitials}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900",
                          selectedUser.is_online ? 'bg-emerald-500' : 'bg-black0'
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white break-words">
                          {selectedUser.full_name}
                        </h3>
                        {starredConversations.includes(selectedUser.id) && (
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                        {selectedUser.role === 'admin' && (
                          <span className="text-[11px] bg-lime-400/10 border border-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-lime-100/55">
                        {selectedUser.is_online ? 'Online now' : 'Offline'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden md:block relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lime-100/45" />
                        <input
                          value={messageSearchQuery}
                          onChange={(e) => setMessageSearchQuery(e.target.value)}
                          placeholder="Search in conversation"
                          className="w-[220px] h-10 rounded-xl border border-lime-400/15 bg-[#000000] pl-9 pr-3 text-sm text-white placeholder:text-lime-100/45 outline-none focus:border-lime-400/40"
                        />
                        {messageSearchQuery && (
                          <button
                            onClick={() => setMessageSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lime-100/45 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <ConversationMenu
                        selectedUser={selectedUser}
                        onAction={(action) => {
                          if (action === 'copy') {
                            navigator.clipboard.writeText(selectedUser.email);
                            toast.success('Email copied to clipboard');
                          } else if (action === 'star') {
                            toggleStar(selectedUser.id);
                          } else if (action === 'search') {
                            const field = document.querySelector('[placeholder="Search in conversation"]');
                            field?.focus();
                          } else if (action === 'hide') {
                            setSelectedUser(null);
                            toast.success('Conversation hidden');
                          } else if (action === 'view-profile') {
                            setProfileDialogOpen(true);
                          } else {
                            toast.success(`${action} feature coming soon`);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Mobile conversation search */}
                  <div className="md:hidden mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lime-100/45" />
                    <input
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search in conversation"
                      className="w-full h-10 rounded-xl border border-lime-400/15 bg-[#000000] pl-9 pr-9 text-sm text-white placeholder:text-lime-100/45 outline-none focus:border-lime-400/40"
                    />
                    {messageSearchQuery && (
                      <button
                        onClick={() => setMessageSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lime-100/45 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-black px-4 py-4 space-y-4">
                  {messageSearchQuery && (
                    <div className="bg-lime-400/10 border border-lime-400/20 px-4 py-3 rounded-2xl flex items-center justify-between gap-3">
                      <span className="text-sm text-lime-300 break-words">
                        {messages.length} result(s) for "{messageSearchQuery}"
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMessageSearchQuery('')}
                        className="text-lime-300 hover:text-white hover:bg-[#061006]/80"
                      >
                        Clear
                      </Button>
                    </div>
                  )}

                  {pinnedMessages.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                        onClick={() => setShowPinned((prev) => !prev)}
                      >
                        <div className="flex items-center gap-2">
                          <Pin className="w-4 h-4 text-amber-300" />
                          <span className="text-sm font-medium text-amber-200">
                            Pinned Messages ({pinnedMessages.length})
                          </span>
                        </div>
                        <span className="text-xs text-amber-300">
                          {showPinned ? 'Hide' : 'Show'}
                        </span>
                      </button>

                      {showPinned && (
                        <div className="px-4 pb-4 space-y-2">
                          {pinnedMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className="text-xs bg-[#020806]/90/80 rounded-xl p-3 text-lime-100/75 break-words border border-lime-400/15"
                            >
                              <MessageRenderer
                                html={msg.message_text}
                                attachments={msg.attachments}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex items-center gap-3 text-lime-100/55">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading messages...</span>
                      </div>
                    </div>
                  ) : messages.length === 0 && !messageSearchQuery ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center px-6">
                        <div className="w-16 h-16 bg-[#061006]/80 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageCircle className="w-8 h-8 text-lime-100/45" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
                        <p className="text-lime-100/55">
                          Start the conversation with {selectedUser.full_name}.
                        </p>
                      </div>
                    </div>
                  ) : messages.length === 0 && messageSearchQuery ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center px-6">
                        <div className="w-16 h-16 bg-[#061006]/80 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-lime-100/45" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No messages found</h3>
                        <p className="text-lime-100/55">Try another search term.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {groupedMessages.map((entry, index) => {
                        if (entry.type === 'separator') {
                          return <ChatDateSeparator key={entry.id} date={entry.date} />;
                        }

                        const msg = entry.data;
                        const isSender = msg.sender_id === user.id;
                        const messagePreview = getMessagePreview(msg.message_text, msg.attachments);
                        const isBroadcast = messagePreview.startsWith('BROADCAST:') || messagePreview.includes('BROADCAST:');
                        const isDeleted = Boolean(msg.is_deleted) && (!msg.deleted_by || msg.deleted_for_everyone || msg.deleted_by === user.id);

                        const previousMessage = groupedMessages[index - 1]?.type === 'message'
                          ? groupedMessages[index - 1].data
                          : null;

                        const groupedWithPrevious =
                          previousMessage &&
                          previousMessage.sender_id === msg.sender_id &&
                          format(new Date(previousMessage.created_date), 'yyyy-MM-dd HH:mm') ===
                            format(new Date(msg.created_date), 'yyyy-MM-dd HH:mm');

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex group",
                              isSender ? 'justify-end' : 'justify-start',
                              groupedWithPrevious ? 'mt-1' : 'mt-3'
                            )}
                            id={`message-${msg.id}`}
                          >
                            <div className={cn("max-w-[85%] md:max-w-[72%]", isSender ? 'order-2' : 'order-1')}>
                              <div className="flex items-start gap-2">
                                <div
                                  className={cn(
                                    "rounded-2xl px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] border",
                                    isDeleted
                                      ? 'bg-[#061006]/80 text-lime-100/45 italic border-lime-400/20'
                                      : isBroadcast
                                      ? 'bg-amber-500/10 text-amber-100 border-amber-500/20'
                                      : isSender
                                      ? 'bg-lime-400 text-white border-lime-400/30'
                                      : 'bg-[#020806]/90 text-slate-100 border-lime-400/15',
                                    msg.is_pinned ? 'ring-2 ring-amber-400/40' : ''
                                  )}
                                >
                                <MessageRenderer
                                  html={msg.message_text}
                                  attachments={msg.attachments}
                                  isOwn={isSender}
                                  deleted={isDeleted}
                                />
                                </div>

                                {!isDeleted && (
                                  <MessageContextMenu
                                    message={msg}
                                    currentUser={user}
                                    onEdit={handleStartEditMessage}
                                    onMarkUnread={handleMarkUnread}
                                    onReminder={handleSetReminder}
                                    onToggleMute={handleToggleMute}
                                    onCopyLink={handleCopyLink}
                                    onPin={handlePinMessage}
                                    onDelete={handleDeleteMessage}
                                  />
                                )}
                              </div>

                              <p className={cn(
                                "text-[11px] text-lime-100/45 mt-1 px-1",
                                isSender ? 'text-right' : 'text-left'
                              )}>
                                {formatMessageTime(msg.created_date)}
                                {msg.is_edited && !isDeleted ? (
                                  <span className="ml-1 text-lime-100/45">(edited)</span>
                                ) : null}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Composer */}
                <div className="p-4 border-t border-lime-400/15 bg-[#020806]/90">
                  {editingMessage ? (
                    <RichTextEditor
                      key={`direct-edit-${editingMessage.id}-${editingMessage.updated_date || editingMessage.created_date || ''}`}
                      initialContent={editingMessage.message_text}
                      initialAttachments={editingMessage.attachments || []}
                      mode="edit"
                      onCancel={() => setEditingMessage(null)}
                      onSend={handleSaveEditedMessage}
                      disabled={editMessageMutation.isPending}
                      placeholder={`Update your message to ${selectedUser.full_name}...`}
                      companyUsers={companyUsers}
                    />
                  ) : (
                    <RichTextInput
                      onSend={handleSendMessage}
                      disabled={sendMessageMutation.isPending}
                      placeholder={`Message ${selectedUser.full_name}...`}
                      companyUsers={companyUsers}
                    />
                  )}
                </div>
              </Card>
            ) : (
              <Card className="border border-lime-400/15 bg-[#020806]/90 h-full min-h-0 flex items-center justify-center rounded-[1.75rem] shadow-[0_14px_40px_rgba(0,0,0,0.18)] overflow-hidden">
                <div className="text-center p-8 max-w-md">
                  <div className="w-16 h-16 bg-[#061006]/80 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-lime-100/45" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-lime-100/55">
                    Choose a group chat or direct message from the sidebar to start chatting.
                  </p>

                  <Button
                    className="mt-6 lg:hidden bg-lime-400 hover:bg-lime-400 rounded-2xl"
                    onClick={() => setMobileSidebarOpen(true)}
                  >
                    Open Sidebar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BroadcastMessageDialog
        isOpen={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        currentUser={user}
      />

      <UserProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
