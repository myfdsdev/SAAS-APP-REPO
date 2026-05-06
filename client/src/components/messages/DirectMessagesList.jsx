import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  User,
  Star,
} from "lucide-react";
import OnlineStatusIndicator from '../admin/OnlineStatusIndicator';
import { formatDistanceToNow } from 'date-fns';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getLastSeenText(user) {
  if (user.is_online) return 'Online';
  if (user.last_active_time) {
    try {
      return `Last seen ${formatDistanceToNow(new Date(user.last_active_time), { addSuffix: true })}`;
    } catch {
      return 'Offline';
    }
  }
  return 'Offline';
}

function UserRow({
  user,
  currentUser,
  unreadCount,
  isSelected,
  isStarred,
  onSelect,
}) {
  const isCurrentUser = user.email === currentUser?.email;

  return (
    <button
      onClick={() => onSelect(user)}
      className={cn(
        "group w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border",
        isSelected
          ? "bg-lime-400/10 border-lime-400/20"
          : "bg-transparent border-transparent hover:bg-[#061006]/80/70"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10">
          {user.profile_photo ? (
            <AvatarImage src={user.profile_photo} alt={user.full_name} />
          ) : (
            <AvatarFallback className="bg-lime-400/10 text-lime-300 font-semibold text-sm">
              {getInitials(user.full_name)}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatusIndicator isOnline={user.is_online} size="sm" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium text-slate-100 text-sm truncate">
            {user.full_name}
          </p>

          {isCurrentUser && (
            <Badge variant="outline" className="text-[10px] border-lime-400/20 bg-[#061006]/80 text-lime-100/75">
              You
            </Badge>
          )}

          {user.role === 'admin' && (
            <Shield className="w-3.5 h-3.5 text-lime-300 shrink-0" />
          )}

          {isStarred && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>

        <p className="text-xs text-lime-100/45 truncate">
          {getLastSeenText(user)}
        </p>
      </div>

      {unreadCount > 0 ? (
        <Badge className="bg-rose-500 text-white h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      ) : (
        <div className="text-[11px] text-lime-100/45 opacity-0 group-hover:opacity-100 transition-opacity">
          Open
        </div>
      )}
    </button>
  );
}

export default function DirectMessagesList({
  currentUser,
  onUserSelect,
  searchQuery = '',
  starredConversations = [],
  selectedUserId = null,
}) {
  const [users, setUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    starred: true,
    admins: true,
    team: true,
  });
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;

    const fetchUnreadCounts = async (usersList = []) => {
      if (!currentUser) return;

      try {
        const messages = await base44.entities.Message.filter({
          receiver_id: currentUser.id,
          is_read: false,
        });

        const counts = {};
        messages.forEach((msg) => {
          const userId = msg.sender_id;
          counts[userId] = (counts[userId] || 0) + 1;
        });

        if (mounted) setUnreadCounts(counts);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await base44.functions.invoke('getUsersForMessaging', {});
        const nextUsers = response?.data?.users || [];
        if (mounted) setUsers(nextUsers);
        await fetchUnreadCounts(nextUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        if (mounted) setUsers([]);
      }
    };

    fetchUsers();

    const messageUnsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        const msg = event.data;
        if (
          currentUser &&
          (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id)
        ) {
          fetchUnreadCounts(users);
        }
      }
    });

    const userUnsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'create') {
        fetchUsers();
      }
    });

    return () => {
      mounted = false;
      messageUnsubscribe();
      userUnsubscribe();
    };
  }, [currentUser]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredUsers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    let next = [...users];
    if (term) {
      next = next.filter((u) =>
        [u.full_name, u.email, u.role]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
    }

    next.sort((a, b) => {
      const unreadDiff = (unreadCounts[b.id] || 0) - (unreadCounts[a.id] || 0);
      if (unreadDiff !== 0) return unreadDiff;

      if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;

      return String(a.full_name || '').localeCompare(String(b.full_name || ''));
    });

    return next;
  }, [users, searchQuery, unreadCounts]);

  const starredUsers = filteredUsers.filter((u) => starredConversations.includes(u.id));
  const admins = filteredUsers.filter((u) => u.role === 'admin' && !starredConversations.includes(u.id));
  const teamMembers = filteredUsers.filter((u) => u.role === 'user' && !starredConversations.includes(u.id));

  return (
    <Card className="border border-lime-400/15 bg-[#020806]/90 shadow-none rounded-[1.5rem] overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-lime-400/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-5 h-5 text-lime-300 shrink-0" />
          <h3 className="font-semibold text-slate-100">Direct Messages</h3>
          <Badge variant="outline" className="text-[10px] border-lime-400/20 bg-[#061006]/80 text-lime-100/75">
            {filteredUsers.length}
          </Badge>
        </div>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-lime-100/45" />
        ) : (
          <ChevronRight className="w-4 h-4 text-lime-100/45" />
        )}
      </div>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {starredUsers.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('starred')}
                className="flex items-center gap-2 w-full py-2 hover:bg-[#061006]/80/40 rounded-lg transition-colors"
              >
                {expandedSections.starred ? (
                  <ChevronDown className="w-4 h-4 text-lime-100/45" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-lime-100/45" />
                )}
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-semibold text-lime-100/75">Starred</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-lime-400/20 bg-[#061006]/80 text-lime-100/75">
                  {starredUsers.length}
                </Badge>
              </button>

              {expandedSections.starred && (
                <div className="space-y-1 mt-2">
                  {starredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      unreadCount={unreadCounts[user.id] || 0}
                      isSelected={selectedUserId === user.id}
                      isStarred={true}
                      onSelect={onUserSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {admins.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('admins')}
                className="flex items-center gap-2 w-full py-2 hover:bg-[#061006]/80/40 rounded-lg transition-colors"
              >
                {expandedSections.admins ? (
                  <ChevronDown className="w-4 h-4 text-lime-100/45" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-lime-100/45" />
                )}
                <Shield className="w-4 h-4 text-lime-300" />
                <span className="text-sm font-semibold text-lime-100/75">Admins</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-lime-400/20 bg-[#061006]/80 text-lime-100/75">
                  {admins.length}
                </Badge>
              </button>

              {expandedSections.admins && (
                <div className="space-y-1 mt-2">
                  {admins.map((admin) => (
                    <UserRow
                      key={admin.id}
                      user={admin}
                      currentUser={currentUser}
                      unreadCount={unreadCounts[admin.id] || 0}
                      isSelected={selectedUserId === admin.id}
                      isStarred={false}
                      onSelect={onUserSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {teamMembers.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('team')}
                className="flex items-center gap-2 w-full py-2 hover:bg-[#061006]/80/40 rounded-lg transition-colors"
              >
                {expandedSections.team ? (
                  <ChevronDown className="w-4 h-4 text-lime-100/45" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-lime-100/45" />
                )}
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-lime-100/75">Team Members</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-lime-400/20 bg-[#061006]/80 text-lime-100/75">
                  {teamMembers.length}
                </Badge>
              </button>

              {expandedSections.team && (
                <div className="space-y-1 mt-2">
                  {teamMembers.map((member) => (
                    <UserRow
                      key={member.id}
                      user={member}
                      currentUser={currentUser}
                      unreadCount={unreadCounts[member.id] || 0}
                      isSelected={selectedUserId === member.id}
                      isStarred={false}
                      onSelect={onUserSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredUsers.length === 0 && currentUser && (
            <div className="text-center text-lime-100/45 text-sm py-10">
              <MessageCircle className="w-12 h-12 text-lime-100/80 mx-auto mb-3" />
              <p className="font-medium text-lime-100/55">
                {searchQuery ? 'No matching team members' : 'No team members yet'}
              </p>
              <p className="text-xs mt-2">
                {searchQuery
                  ? 'Try another search term'
                  : currentUser.role === 'admin'
                  ? 'Invite team members to start messaging'
                  : 'Waiting for team members to join'}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}