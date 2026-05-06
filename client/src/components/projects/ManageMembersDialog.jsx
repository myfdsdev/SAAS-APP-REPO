import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManageMembersDialog({ open, onClose, project, members, isAdmin }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const availableUsers = allUsers.filter(
    user => !members.some(m => m.user_id === user.id)
  );

  const addMemberMutation = useMutation({
    mutationFn: (userId) => {
      const user = allUsers.find(u => u.id === userId);
      return base44.entities.ProjectMember.create({
        project_id: project.id,
        project_name: project.project_name,
        user_id: userId,
        user_email: user.email,
        user_name: user.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', project.id] });
      setSelectedUserId('');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => base44.entities.ProjectMember.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', project.id] });
    },
  });

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
        </DialogHeader>

        {/* Add Member */}
        {isAdmin && availableUsers.length > 0 && (
          <div className="flex gap-2 pb-4 border-b">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select user to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No members yet</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {member.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.user_name}</p>
                    <p className="text-xs text-gray-500">{member.user_email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMemberMutation.mutate(member.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}