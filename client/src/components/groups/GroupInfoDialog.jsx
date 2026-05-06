import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GroupInfoDialog({ open, onClose, group }) {
  const { data: members = [] } = useQuery({
    queryKey: ['group-members-info', group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      return await base44.entities.GroupMember.filter({ group_id: group.id });
    },
    enabled: !!group?.id && open,
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Group Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Details */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Group Name</p>
              <p className="font-semibold text-gray-900">{group?.group_name}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Members</p>
              <Badge variant="outline" className="text-sm">
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </Badge>
            </div>
          </div>

          {/* Members List */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Members
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Avatar className="w-10 h-10 bg-emerald-100 text-emerald-600">
                    {member.profile_photo ? (
                      <AvatarImage src={member.profile_photo} alt={member.user_name} />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold text-sm">
                        {getInitials(member.user_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.user_name}
                    </p>
                    {member.role === 'admin' && (
                      <Badge variant="outline" className="text-xs mt-1">Admin</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}