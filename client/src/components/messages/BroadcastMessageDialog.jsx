import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Megaphone, Send, AlertCircle, Users } from "lucide-react";

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

export default function BroadcastMessageDialog({ isOpen, onClose, currentUser }) {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const estimatedAudience = useMemo(() => {
    return audience === 'all' ? 'All users except you' : 'Team members only';
  }, [audience]);

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const cleanMessage = message.trim();

      if (!cleanMessage) {
        throw new Error('Broadcast message cannot be empty.');
      }

      const allUsers = await base44.entities.User.list();

      let targetUsers = allUsers.filter((u) => u.id !== currentUser.id);
      if (audience === 'team') {
        targetUsers = targetUsers.filter((u) => u.role === 'user');
      }

      if (targetUsers.length === 0) {
        throw new Error('No recipients found for this audience.');
      }

      const messagePromises = targetUsers.map((user) =>
        base44.entities.Message.create({
          sender_id: currentUser.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          receiver_id: user.id,
          receiver_email: user.email,
          receiver_name: user.full_name,
          message_text: `📢 BROADCAST: ${cleanMessage}`,
          is_read: false,
        })
      );

      const notificationPromises = targetUsers.map((user) =>
        base44.entities.Notification.create({
          user_email: user.email,
          title: 'New Broadcast Message',
          message: `Admin ${currentUser.full_name} sent: ${cleanMessage.substring(0, 50)}${cleanMessage.length > 50 ? '...' : ''}`,
          type: 'new_message',
          is_read: false,
        })
      );

      await Promise.all([...messagePromises, ...notificationPromises]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setMessage('');
      setAudience('all');
      setError('');
      onClose();
    },
    onError: (err) => {
      setError(err?.message || 'Failed to send broadcast.');
    },
  });

  const handleSend = () => {
    setError('');
    broadcastMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-[2rem] border border-lime-400/15 bg-black text-white p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-lime-400/10 via-transparent to-amber-500/10 pointer-events-none" />

          <div className="relative p-6 border-b border-lime-400/15">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white">
                <div className="w-11 h-11 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-lime-300" />
                </div>
                Broadcast Message
              </DialogTitle>
              <DialogDescription className="text-lime-100/55">
                Send an announcement to multiple users at once.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <Banner message={error} />

            <div className="rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-lime-300" />
                <span className="text-xs font-medium text-lime-100/55">Audience Preview</span>
              </div>
              <p className="text-sm text-white">{estimatedAudience}</p>
            </div>

            <div className="space-y-3">
              <Label className="text-white">Send to</Label>
              <RadioGroup value={audience} onValueChange={setAudience} className="space-y-3">
                <div className="flex items-center space-x-3 rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-3">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer text-white">
                    All Users (Admins + Team Members)
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-3">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="font-normal cursor-pointer text-white">
                    Team Members Only
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message..."
                className="min-h-[120px] rounded-2xl border-lime-400/15 bg-[#020806]/90 text-slate-100 placeholder:text-lime-100/45 resize-none"
              />
              <div className="text-xs text-lime-100/45 text-right">
                {message.trim().length}/500
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-xl border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              >
                Cancel
              </Button>

              <Button
                onClick={handleSend}
                disabled={!message.trim() || broadcastMutation.isPending}
                className="bg-lime-400 hover:bg-lime-400 rounded-xl"
              >
                <Send className="w-4 h-4 mr-2" />
                {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}