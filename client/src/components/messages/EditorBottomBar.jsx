import React, { useRef, useState } from 'react';
import { motion } from "framer-motion";
import {
  AtSign,
  CalendarClock,
  ChevronDown,
  Image as ImageIcon,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'react-hot-toast';
import EmojiPickerPopover from './EmojiPickerPopover';
import GifPickerPopover from './GifPickerPopover';
import { cn } from "@/lib/utils";

function BarButton({ label, shortcut, icon: Icon, disabled, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <motion.button
            type="button"
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            onClick={onClick}
            disabled={disabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-lime-100/55 transition-colors hover:border-lime-400/15 hover:bg-[#061006]/85 hover:text-lime-200 disabled:pointer-events-none disabled:opacity-40"
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </motion.button>
        )}
      </TooltipTrigger>
      <TooltipContent className="rounded-xl border border-lime-400/15 bg-[#020806] text-lime-50 shadow-xl">
        <p>{label}</p>
        {shortcut ? <p className="text-[11px] opacity-70">{shortcut}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export default function EditorBottomBar({
  editor,
  disabled = false,
  canSend = false,
  isUploading = false,
  onSend,
  onFilesSelected,
  onInsertEmoji,
  onInsertGif,
  mode = 'create',
  onCancel,
}) {
  const fileInputRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);

  const triggerClass = "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-lime-100/55 transition-colors hover:border-lime-400/15 hover:bg-[#061006]/85 hover:text-lime-200 disabled:pointer-events-none disabled:opacity-40";
  const isEditing = mode === 'edit';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lime-400/15 bg-[#020806]/95 px-3 py-3">
      <div className="flex items-center gap-1">
        <BarButton
          label="Mention"
          shortcut="@"
          icon={AtSign}
          disabled={disabled}
          onClick={() => editor?.chain().focus().insertContent('@').run()}
        />

        <BarButton
          label="Attach file"
          icon={Paperclip}
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={(event) => {
            onFilesSelected?.(event.target.files);
            event.target.value = '';
          }}
        />

        <GifPickerPopover
          open={gifOpen}
          onOpenChange={setGifOpen}
          onGifSelect={onInsertGif}
          trigger={
            <button
              type="button"
              disabled={disabled}
              className={triggerClass}
              aria-label="GIF"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          }
        />

        <EmojiPickerPopover
          open={emojiOpen}
          onOpenChange={setEmojiOpen}
          onEmojiSelect={onInsertEmoji}
          trigger={
            <button
              type="button"
              disabled={disabled}
              className={triggerClass}
              aria-label="Emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
          }
        />
      </div>

      <div className="flex items-center gap-2">
        <p className="hidden text-xs text-lime-100/45 sm:block">
          {isEditing ? 'Ctrl+Enter to save' : 'Ctrl+Enter to send'}
        </p>

        {isEditing ? (
          <div className="flex items-center gap-2">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-10 rounded-2xl border-lime-400/20 bg-[#020806]/90 px-4 text-white hover:bg-[#061006]/80"
              >
                Cancel
              </Button>
            ) : null}

            <motion.div whileHover={{ scale: canSend && !disabled ? 1.02 : 1 }} whileTap={{ scale: canSend && !disabled ? 0.98 : 1 }}>
              <Button
                type="button"
                onClick={onSend}
                disabled={!canSend || disabled || isUploading}
                className={cn(
                  "h-10 rounded-2xl px-4 text-white",
                  canSend && !disabled && !isUploading
                    ? "bg-lime-400 text-black hover:bg-lime-300"
                    : "bg-lime-400/15 text-lime-100/45"
                )}
              >
                <Send className="h-4 w-4" />
                Save Changes
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-2xl border border-lime-400/15 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
            <motion.div whileHover={{ scale: canSend && !disabled ? 1.02 : 1 }} whileTap={{ scale: canSend && !disabled ? 0.98 : 1 }}>
              <Button
                type="button"
                onClick={onSend}
                disabled={!canSend || disabled || isUploading}
                className={cn(
                  "h-10 rounded-none rounded-l-2xl px-4 text-white",
                  canSend && !disabled && !isUploading
                    ? "bg-lime-400 text-black hover:bg-lime-300"
                    : "bg-lime-400/15 text-lime-100/45"
                )}
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  disabled={disabled}
                  className="h-10 rounded-none rounded-r-2xl border-l border-black/10 bg-lime-400 px-2 text-black hover:bg-lime-300"
                  aria-label="Send options"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border border-lime-400/15 bg-[#020806] text-white shadow-2xl">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg focus:bg-lime-400/10 focus:text-lime-100"
                  onClick={() => toast.success('Schedule send is ready for a future workflow')}
                >
                  <CalendarClock className="h-4 w-4" />
                  Schedule send
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
