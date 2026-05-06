import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AddMemberDialog({ open, onClose, group, currentUser, existingMemberIds = [] }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const queryClient = useQueryClient();

  // Fetch all users — handles multiple response shapes safely
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-group'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUsersForMessaging', {});
      const list =
        response?.data?.users ||
        response?.users ||
        (Array.isArray(response) ? response : []);
      return list.map(u => ({ ...u, id: u.id || u._id }));
    },
    enabled: open,
  });

  // Filter out users who are already members (safe string compare)
  const safeExistingIds = (existingMemberIds || []).map(id => String(id));
  const availableUsers = users.filter(u => !safeExistingIds.includes(String(u.id)));

  const addMembersMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      
      for (const userId of selectedUsers) {
        const user = users.find(u => String(u.id) === String(userId));
        if (!user) continue;

        try {
          // Check if user already exists in group (defense in depth)
          const existing = await base44.entities.GroupMember.filter({
            group_id: group.id,
            user_id: user.id,
          });

          if (existing && existing.length > 0) {
            results.push({ user: user.full_name, skipped: true });
            continue;
          }

          // Create group member
          await base44.entities.GroupMember.create({
            group_id: group.id,
            group_name: group.group_name,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
            role: 'member',
            added_by: currentUser.id,
            added_by_name: currentUser.full_name,
          });

          // Send notification
          await base44.entities.Notification.create({
            user_email: user.email,
            user_id: user.id,
            title: 'Added to Group',
            message: `You have been added to the group: ${group.group_name}`,
            type: 'group_added',
            is_read: false,
            related_id: group.id,
          });

          results.push({ user: user.full_name, added: true });
        } catch (err) {
          console.error(`Failed to add ${user.full_name}:`, err);
          results.push({ user: user.full_name, error: err?.error || err?.message || 'Unknown error' });
        }
      }

      return results;
    },
    // 🚀 Optimistic update — invalidate immediately so UI refreshes WITHOUT manual reload
    onSuccess: (results) => {
      const added = results.filter(r => r.added).length;
      const skipped = results.filter(r => r.skipped).length;
      const errors = results.filter(r => r.error);

      // Invalidate all related queries — UI updates automatically
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] });
      queryClient.invalidateQueries({ queryKey: ['all-group-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Friendly feedback
      if (added > 0 && errors.length === 0) {
        toast.success(`Added ${added} member${added > 1 ? 's' : ''}`);
      } else if (added > 0 && errors.length > 0) {
        toast.success(`Added ${added}, ${errors.length} failed`);
      } else if (skipped > 0 && added === 0) {
        toast(`${skipped} already in group`);
      } else if (errors.length > 0) {
        toast.error(`Failed to add: ${errors[0].error}`);
      }

      setSelectedUsers([]);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to add members: ${error?.error || error?.message || 'Unknown error'}`);
    },
  });

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Add Members to {group?.group_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Loading users...
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All users are already members of this group
            </div>
          ) : (
            availableUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => toggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => toggleUser(user.id)}
                />
                <Avatar className="w-8 h-8 bg-indigo-100 text-indigo-600">
                  {user.profile_photo ? (
                    <AvatarImage src={user.profile_photo} alt={user.full_name} />
                  ) : (
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {user.role === 'admin' && (
                  <Badge variant="outline" className="text-xs">Admin</Badge>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => addMembersMutation.mutate()}
            disabled={selectedUsers.length === 0 || addMembersMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {addMembersMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedUsers.length} Member${selectedUsers.length === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}