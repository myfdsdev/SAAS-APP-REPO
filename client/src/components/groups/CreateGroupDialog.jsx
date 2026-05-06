import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function CreateGroupDialog({ open, onClose, currentUser }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState("attendance");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const queryClient = useQueryClient();

  // Fetch all users — handles multiple response shapes safely
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-group"],
    queryFn: async () => {
      const response = await base44.functions.invoke(
        "getUsersForMessaging",
        {},
      );
      const list =
        response?.data?.users ||
        response?.users ||
        (Array.isArray(response) ? response : []);
      return list.map((u) => ({ ...u, id: u.id || u._id }));
    },
    enabled: open,
  });

  // Auto-select all users when dialog opens
  useEffect(() => {
    if (open && users.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(users.map((u) => u.id));
    }
  }, [open, users]);

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      // Create group
      const group = await base44.entities.Group.create({
        group_name: groupName,
        description: description,
        created_by: currentUser.id,
        created_by_name: currentUser.full_name,
        group_type: groupType,
      });

      // Add creator as admin
      await base44.entities.GroupMember.create({
        group_id: group.id,
        group_name: groupName,
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        role: "admin",
        added_by: currentUser.id,
        added_by_name: currentUser.full_name,
      });

      // Add selected members and send notifications
      const memberPromises = selectedMembers
        .filter((userId) => userId !== currentUser.id)
        .map(async (userId) => {
          const user = users.find((u) => u.id === userId);
          if (!user) return;

          // Check if user already exists in group
          const existingMembers = await base44.entities.GroupMember.filter({
            group_id: group.id,
            user_id: user.id,
          });

          if (existingMembers.length > 0) {
            return; // skip silently instead of throwing
          }

          // Create group member
          await base44.entities.GroupMember.create({
            group_id: group.id,
            group_name: groupName,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name,
            role: "member",
            added_by: currentUser.id,
            added_by_name: currentUser.full_name,
          });

          // Send notification
          await base44.entities.Notification.create({
            user_email: user.email,
            user_id: user.id,
            title: "Added to Group",
            message: `You have been added to the group: ${groupName}`,
            type: "group_added",
            is_read: false,
            related_id: group.id,
          });
        });

      await Promise.all(memberPromises);

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["all-group-members"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setGroupName("");
      setDescription("");
      setGroupType("attendance");
      setSelectedMembers([]);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error?.error || error?.message || "Unknown error"}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    createGroupMutation.mutate();
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupType">Group Type</Label>
            <Select value={groupType} onValueChange={setGroupType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Select Members</Label>
            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users available
                </p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(user.id)}
                      onCheckedChange={() => toggleMember(user.id)}
                    />
                    <Avatar className="w-8 h-8 bg-indigo-100 text-indigo-600">
                      {user.profile_photo ? (
                        <AvatarImage
                          src={user.profile_photo}
                          alt={user.full_name}
                        />
                      ) : (
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {user.role === "admin" && (
                      <Badge variant="outline" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500">
              {selectedMembers.length} member(s) selected
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!groupName.trim() || createGroupMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createGroupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
