import React from 'react';
import { motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Palette,
  Pilcrow,
  Quote,
  Strikethrough,
  Table,
  Underline,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const swatches = [
  '#111827',
  '#4f46e5',
  '#059669',
  '#dc2626',
  '#d97706',
  '#9333ea',
  '#0f766e',
  '#facc15',
];

const fontSizes = [
  { label: '13', value: '13px' },
  { label: '15', value: '15px' },
  { label: '17', value: '17px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
];

function toolbarButtonClass(active) {
  return cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-lime-100/55 transition-colors hover:border-lime-400/15 hover:bg-[#061006]/85 hover:text-lime-200 disabled:pointer-events-none disabled:opacity-40",
    active && "border-lime-400/20 bg-lime-400/12 text-lime-200"
  );
}

function ToolButton({ label, shortcut, icon: Icon, active, disabled, onClick }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.96 }}
          className={toolbarButtonClass(active)}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </motion.button>
      </TooltipTrigger>
      <TooltipContent className="rounded-xl border border-lime-400/15 bg-[#020806] text-lime-50 shadow-xl">
        <p>{label}</p>
        {shortcut ? <p className="text-[11px] opacity-70">{shortcut}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-lime-400/12" />;
}

function getBlockValue(editor) {
  if (!editor) return 'paragraph';
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  return 'paragraph';
}

function applyBlock(editor, value) {
  if (!editor) return;
  if (value === 'paragraph') editor.chain().focus().setParagraph().run();
  if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
  if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
  if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
}

function ColorPicker({ editor, disabled, mode = 'color' }) {
  const Icon = mode === 'highlight' ? Highlighter : Palette;
  const label = mode === 'highlight' ? 'Highlight' : 'Text color';

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <motion.button
              type="button"
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.96 }}
              disabled={disabled}
              className={toolbarButtonClass(false)}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </motion.button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-xl border border-lime-400/15 bg-[#020806] text-lime-50 shadow-xl">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className="w-52 rounded-2xl border border-lime-400/15 bg-[#020806] p-3 text-white shadow-2xl"
      >
        <div className="grid grid-cols-4 gap-2">
          {swatches.map((color) => (
            <button
              key={`${mode}-${color}`}
              type="button"
              className="h-8 rounded-xl border border-lime-400/15 ring-offset-2 ring-offset-[#020806] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
              style={{ backgroundColor: color }}
              onClick={() => {
                if (mode === 'highlight') {
                  editor.chain().focus().toggleHighlight({ color }).run();
                } else {
                  editor.chain().focus().setColor(color).run();
                }
              }}
              aria-label={`${label} ${color}`}
            />
          ))}
          <button
            type="button"
            className="col-span-4 rounded-xl border border-lime-400/15 px-3 py-2 text-xs text-lime-100/70 transition-colors hover:bg-[#061006]"
            onClick={() => {
              if (mode === 'highlight') editor.chain().focus().unsetHighlight().run();
              else editor.chain().focus().unsetColor().run();
            }}
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MoreMenu({ editor, disabled, promptLink }) {
  const itemClass = "cursor-pointer rounded-lg focus:bg-lime-400/10 focus:text-lime-100";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-lime-100/55 transition-colors hover:border-lime-400/15 hover:bg-[#061006]/85 hover:text-lime-200"
          disabled={disabled}
          aria-label="More formatting"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border border-lime-400/15 bg-[#020806] text-white shadow-2xl">
        <DropdownMenuItem className={itemClass} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table className="h-4 w-4" />
          Table
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={promptLink}>
          <LinkIcon className="h-4 w-4" />
          Link
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
          Divider
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-4 w-4" />
          Code block
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
          Quote
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks className="h-4 w-4" />
          Checklist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function EditorToolbar({ editor, disabled = false, promptLink }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-lime-400/15 bg-[#061006]/55 px-3 py-2.5">
      <div className="flex items-center gap-1">
        <Pilcrow className="h-4 w-4 text-lime-100/35" />
        <Select
          value={getBlockValue(editor)}
          onValueChange={(value) => applyBlock(editor, value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-[124px] rounded-xl border-lime-400/15 bg-black/70 px-2 text-xs text-lime-100/75">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border border-lime-400/15 bg-[#020806] text-white shadow-2xl">
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select
        value={editor.getAttributes('textStyle').fontSize || '15px'}
        onValueChange={(value) => editor.chain().focus().setFontSize(value).run()}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[76px] rounded-xl border-lime-400/15 bg-black/70 px-2 text-xs text-lime-100/75">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border border-lime-400/15 bg-[#020806] text-white shadow-2xl">
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator />

      <ToolButton label="Bold" shortcut="Ctrl+B" icon={Bold} active={editor.isActive('bold')} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton label="Italic" shortcut="Ctrl+I" icon={Italic} active={editor.isActive('italic')} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton label="Underline" shortcut="Ctrl+U" icon={Underline} active={editor.isActive('underline')} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton label="Strikethrough" shortcut="Ctrl+Shift+X" icon={Strikethrough} active={editor.isActive('strike')} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ColorPicker editor={editor} disabled={disabled} />
      <ColorPicker editor={editor} disabled={disabled} mode="highlight" />

      <Separator />

      <ToolButton label="Bullet list" shortcut="Ctrl+Shift+7" icon={List} active={editor.isActive('bulletList')} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton label="Numbered list" shortcut="Ctrl+Shift+8" icon={ListOrdered} active={editor.isActive('orderedList')} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()} />

      <div className="hidden items-center gap-1 md:flex">
        <ToolButton label="Insert table" icon={Table} disabled={disabled} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <ToolButton label="Insert link" shortcut="Ctrl+K" icon={LinkIcon} active={editor.isActive('link')} disabled={disabled} onClick={promptLink} />
        <ToolButton label="Align left" icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
        <ToolButton label="Align center" icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
        <ToolButton label="Align right" icon={AlignRight} active={editor.isActive({ textAlign: 'right' })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
        <ToolButton label="Divider" icon={Minus} disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <ToolButton label="Code block" icon={Code} active={editor.isActive('codeBlock')} disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <ToolButton label="Quote" icon={Quote} active={editor.isActive('blockquote')} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolButton label="Checklist" icon={ListChecks} active={editor.isActive('taskList')} disabled={disabled} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      </div>

      <div className="md:hidden">
        <MoreMenu editor={editor} disabled={disabled} promptLink={promptLink} />
      </div>
    </div>
  );
}
