import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  MailOpen,
  Bell,
  BellOff,
  Link as LinkIcon,
  Copy,
  Pin,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { format, addMinutes, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import { getPlainTextFromHtml } from './MessageRenderer';

export default function MessageContextMenu({
  message,
  currentUser,
  onEdit,
  onMarkUnread,
  onReminder,
  onToggleMute,
  onCopyLink,
  onPin,
  onDelete,
  children,
}) {
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customReminderTime, setCustomReminderTime] = useState('');

  const isSender = message.sender_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const isMuted = message.muted_by?.includes(currentUser.id);

  const handleEdit = () => {
    onEdit?.(message);
  };

  const handleMarkUnread = async () => {
    await onMarkUnread(message.id);
    toast.success('Marked as unread');
  };

  const handleReminder = (minutes) => {
    const reminderTime = addMinutes(new Date(), minutes);
    onReminder(message.id, reminderTime, message.message_text);
    toast.success(`Reminder set for ${format(reminderTime, 'h:mm a')}`);
  };

  const handleCustomReminder = () => {
    if (customReminderTime) {
      const reminderTime = new Date(customReminderTime);
      onReminder(message.id, reminderTime, message.message_text);
      setShowReminderDialog(false);
      toast.success('Custom reminder set');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getPlainTextFromHtml(message.message_text));
    toast.success('Message copied');
  };

  const handleCopyMessageLink = async () => {
    const link = await onCopyLink(message.id);
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const handleToggleMute = async () => {
    await onToggleMute(message.id);
    toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
  };

  const handlePin = async () => {
    await onPin(message.id, !message.is_pinned);
    toast.success(message.is_pinned ? 'Message unpinned' : 'Message pinned');
  };

  const handleDelete = async (deleteForEveryone) => {
    await onDelete(message.id, deleteForEveryone);
    setShowDeleteDialog(false);
    toast.success('Message deleted');
  };

  const canDelete = isSender || isAdmin;
  const canEdit = isSender && !message.is_deleted;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children || (
            <button className="p-1.5 hover:bg-[#061006]/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-lime-100/45" />
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 rounded-2xl border border-lime-400/15 bg-[#020806]/90 text-white"
        >
          {canEdit && (
            <DropdownMenuItem onClick={handleEdit} className="focus:bg-lime-400/10 focus:text-white">
              <Edit className="w-4 h-4 mr-2" />
              Edit Message
            </DropdownMenuItem>
          )}

          {!isSender && (
            <DropdownMenuItem onClick={handleMarkUnread} className="focus:bg-lime-400/10 focus:text-white">
              <MailOpen className="w-4 h-4 mr-2" />
              Mark as Unread
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setShowReminderDialog(true)} className="focus:bg-lime-400/10 focus:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Remind Me
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleMute} className="focus:bg-lime-400/10 focus:text-white">
            {isMuted ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Turn On Notifications
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Turn Off Notifications
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#061006]/80" />

          <DropdownMenuItem onClick={handleCopyMessageLink} className="focus:bg-lime-400/10 focus:text-white">
            <LinkIcon className="w-4 h-4 mr-2" />
            Copy Link
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopyMessage} className="focus:bg-lime-400/10 focus:text-white">
            <Copy className="w-4 h-4 mr-2" />
            Copy Message
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePin} className="focus:bg-lime-400/10 focus:text-white">
            <Pin className="w-4 h-4 mr-2" />
            {message.is_pinned ? 'Unpin Message' : 'Pin Message'}
          </DropdownMenuItem>

          {canDelete && (
            <>
              <DropdownMenuSeparator className="bg-[#061006]/80" />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="rounded-[1.75rem] border border-lime-400/15 bg-black text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Set Reminder</DialogTitle>
            <DialogDescription className="text-lime-100/55">
              When do you want to be reminded about this message?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              onClick={() => {
                handleReminder(30);
                setShowReminderDialog(false);
              }}
            >
              In 30 minutes
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              onClick={() => {
                handleReminder(60);
                setShowReminderDialog(false);
              }}
            >
              In 1 hour
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              onClick={() => {
                const tomorrow9am = addDays(new Date(), 1);
                tomorrow9am.setHours(9, 0, 0, 0);
                onReminder(message.id, tomorrow9am, message.message_text);
                setShowReminderDialog(false);
                toast.success('Reminder set for tomorrow 9 AM');
              }}
            >
              Tomorrow at 9 AM
            </Button>

            <div className="pt-2 space-y-2">
              <Label className="text-lime-100/75">Custom Time</Label>
              <Input
                type="datetime-local"
                value={customReminderTime}
                onChange={(e) => setCustomReminderTime(e.target.value)}
                className="border-lime-400/15 bg-[#020806]/90 text-slate-100"
              />
              <Button
                className="w-full bg-lime-400 hover:bg-lime-400"
                onClick={handleCustomReminder}
                disabled={!customReminderTime}
              >
                Set Custom Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[1.75rem] border border-lime-400/15 bg-black text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Message</DialogTitle>
            <DialogDescription className="text-lime-100/55">
              How do you want to delete this message?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              onClick={() => handleDelete(false)}
            >
              Delete for Me
            </Button>

            {isSender && (
              <Button
                variant="outline"
                className="w-full justify-start text-rose-300 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15"
                onClick={() => handleDelete(true)}
              >
                Delete for Everyone
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
