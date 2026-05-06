import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "react-hot-toast";

const columnOptions = [
  { id: 'owner', label: 'Owner', description: 'Assign task to team member' },
  { id: 'status', label: 'Status', description: 'Track progress status' },
  { id: 'due_date', label: 'Due Date', description: 'Set deadlines' },
  { id: 'priority', label: 'Priority', description: 'Task priority level' },
  { id: 'files', label: 'Files', description: 'Attach files' },
  { id: 'notes', label: 'Notes', description: 'Additional information' },
];

const colors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4'
];

export default function CreateProjectDialog({ open, onClose, currentUser }) {
  const [formData, setFormData] = useState({
    project_name: '',
    enabled_columns: ['owner', 'status', 'due_date', 'priority', 'notes'],
    color: '#6366f1',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberPopupOpen, setMemberPopupOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [tempSelectedMembers, setTempSelectedMembers] = useState([]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch all users for member selection
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      // Create project
      const project = await base44.entities.Project.create({
        ...data,
        created_by: currentUser.id,
        created_by_name: currentUser.full_name,
      });

      // Add selected members to project
      if (selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map(member =>
            base44.entities.ProjectMember.create({
              project_id: project.id,
              project_name: project.project_name,
              user_id: member.id,
              user_email: member.email,
              user_name: member.full_name,
              added_by: currentUser.id,
            })
          )
        );
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-members'] });
      
      // Navigate to project board with Add Task dialog open
      navigate(createPageUrl('ProjectBoard') + `?projectId=${project.id}&openAddTask=true`);
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    createProjectMutation.mutate({
      ...formData,
      project_name: formData.project_name.trim(),
    });
  };

  const toggleColumn = (columnId) => {
    setFormData(prev => ({
      ...prev,
      enabled_columns: prev.enabled_columns.includes(columnId)
        ? prev.enabled_columns.filter(c => c !== columnId)
        : [...prev.enabled_columns, columnId]
    }));
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  const handleOpenMemberPopup = () => {
    setTempSelectedMembers([...selectedMembers]);
    setMemberPopupOpen(true);
  };

  const handleToggleMember = (user) => {
    const isSelected = tempSelectedMembers.find(m => m.id === user.id);
    if (isSelected) {
      setTempSelectedMembers(tempSelectedMembers.filter(m => m.id !== user.id));
    } else {
      setTempSelectedMembers([...tempSelectedMembers, user]);
    }
  };

  const handleSaveMembers = () => {
    setSelectedMembers([...tempSelectedMembers]);
    setMemberPopupOpen(false);
    setMemberSearch('');
  };

  const filteredUsers = allUsers.filter(user => 
    user.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <Label>Project Name *</Label>
            <Input
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="Enter project name"
            />
          </div>

          <div>
            <Label>Add Members</Label>
            <button
              type="button"
              onClick={handleOpenMemberPopup}
              className="mt-2 w-full border rounded-lg p-3 bg-white text-left hover:bg-gray-50 transition-colors min-h-[60px] flex flex-wrap gap-2 items-center"
            >
              {selectedMembers.length === 0 ? (
                <span className="text-gray-400 text-sm">Click to add members...</span>
              ) : (
                selectedMembers.map(member => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(member.id);
                    }}
                  >
                    <span>{member.full_name}</span>
                    <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" />
                  </div>
                ))
              )}
            </button>
          </div>

          <div>
            <Label>Project Color</Label>
            <div className="flex gap-2 mt-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Select Columns</Label>
            <div className="grid grid-cols-2 gap-4">
              {columnOptions.map((option) => (
                <div key={option.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                  <Checkbox
                    checked={formData.enabled_columns.includes(option.id)}
                    onCheckedChange={() => toggleColumn(option.id)}
                  />
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? 'Creating...' : 'Next'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Member Selection Popup */}
    <Dialog open={memberPopupOpen} onOpenChange={setMemberPopupOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          {/* Search Input */}
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full"
          />

          {/* Members List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No members found</div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map(user => {
                  const isSelected = !!tempSelectedMembers.find(m => m.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleToggleMember(user)}
                      className={`w-full p-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-medium text-sm shrink-0">
                        {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{user.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMemberPopupOpen(false);
                setMemberSearch('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMembers}
            >
              Done ({tempSelectedMembers.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
