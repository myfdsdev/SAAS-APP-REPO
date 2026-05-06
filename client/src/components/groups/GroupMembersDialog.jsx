import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User, Trash2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import AddMemberDialog from './AddMemberDialog';
import { toast } from "react-hot-toast";

export default function GroupMembersDialog({ open, onClose, group, currentUser }) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', group?.id],
    queryFn: () => base44.entities.GroupMember.filter({ group_id: group.id }),
    enabled: !!group && open,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => base44.entities.GroupMember.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['all-group-members'] });
    },
    onError: (error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isGroupAdmin = members.some(m => 
    m.user_id === currentUser?.id && m.role === 'admin'
  );

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {group.group_name} Members
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                {members.length} member(s) in this group
              </p>
            </div>
            {isGroupAdmin && (
              <Button
                onClick={() => setAddMemberOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Members
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <AnimatePresence>
            {members.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
              >
                <Avatar className="w-10 h-10 bg-indigo-100 text-indigo-600">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm">
                    {getInitials(member.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {member.user_name}
                    </p>
                    {member.user_id === currentUser?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'admin' ? (
                    <Badge className="bg-indigo-100 text-indigo-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <User className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
                  )}
                  {isGroupAdmin && member.role !== 'admin' && member.user_id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AddMemberDialog
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          group={group}
          currentUser={currentUser}
          existingMemberIds={members.map(m => m.user_id)}
        />
      </DialogContent>
    </Dialog>
  );
}
