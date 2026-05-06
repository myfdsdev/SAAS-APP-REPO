import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function EmojiPickerPopover({
  open,
  onOpenChange,
  onEmojiSelect,
  trigger,
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-lg bg-gray-950 text-white dark:bg-lime-50 dark:text-gray-950">
          <p>Emoji</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="top"
        className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-lime-400/15 dark:bg-[#020806]"
      >
        <EmojiPicker
          width={330}
          height={390}
          lazyLoadEmojis
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          onEmojiClick={(emojiData) => {
            onEmojiSelect?.(emojiData.emoji);
            onOpenChange?.(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
