import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Extension } from '@tiptap/core';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from 'react-hot-toast';
import EditorBottomBar from './EditorBottomBar';
import EditorToolbar from './EditorToolbar';
import AttachmentPreview from './AttachmentPreview';
import MentionList from './MentionList';
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

function normalizeUsers(users = []) {
  return users
    .filter(Boolean)
    .map((user) => ({
      id: String(user.id || user._id || ''),
      label: user.full_name || user.name || user.email || 'Team member',
      email: user.email || '',
      role: user.role || user.department || '',
      avatar: user.profile_photo || user.avatar || '',
    }))
    .filter((user) => user.id);
}

function createMentionSuggestion(companyUsers) {
  const users = normalizeUsers(companyUsers);

  return {
    char: '@',
    allowSpaces: false,
    items: ({ query }) => {
      const term = query.trim().toLowerCase();
      return users
        .filter((user) =>
          [user.label, user.email, user.role]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(term))
        )
        .slice(0, 8);
    },
    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.label,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
    },
    render: () => {
      let component;
      let popup;

      const updatePosition = (props) => {
        const rect = props.clientRect?.();
        if (!rect || !popup) return;

        Object.assign(popup.style, {
          position: 'fixed',
          left: `${Math.min(rect.left, window.innerWidth - 340)}px`,
          top: `${rect.bottom + 8}px`,
          zIndex: 9999,
        });
      };

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup = document.createElement('div');
          popup.className = 'attendease-mention-popover';
          popup.appendChild(component.element);
          document.body.appendChild(popup);
          updatePosition(props);
        },
        onUpdate(props) {
          component?.updateProps(props);
          updatePosition(props);
        },
        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup?.remove();
            return true;
          }
          return component?.ref?.onKeyDown(props) || false;
        },
        onExit() {
          component?.destroy();
          popup?.remove();
        },
      };
    },
  };
}

function extractMentionIds(html = '') {
  if (!html || typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('[data-mention-id]'))
    .map((node) => node.getAttribute('data-mention-id'))
    .filter(Boolean)
    .filter((id, index, arr) => arr.indexOf(id) === index);
}

function isFileAllowed(file) {
  return ALLOWED_FILE_TYPES.includes(file.type) || file.type.startsWith('image/') || file.type.startsWith('video/');
}

function normalizeInitialAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((attachment, index) => ({
      id:
        attachment.id ||
        attachment.public_id ||
        attachment.url ||
        attachment.file_url ||
        `${attachment.filename || attachment.original_name || 'attachment'}-${index}`,
      filename: attachment.filename || attachment.original_name || 'Attachment',
      type: attachment.type || attachment.mime_type || '',
      size: Number(attachment.size || 0),
      url: attachment.url || attachment.file_url || '',
      previewUrl: attachment.previewUrl || '',
      public_id: attachment.public_id || '',
      format: attachment.format || '',
      progress: attachment.status === 'uploading' ? attachment.progress || 35 : 100,
      status: attachment.status || ((attachment.url || attachment.file_url) ? 'ready' : 'error'),
    }))
    .filter((attachment) => attachment.url || attachment.previewUrl || attachment.status === 'uploading');
}

function createAttachmentSnapshot(attachments = []) {
  return JSON.stringify(
    normalizeInitialAttachments(attachments).map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
      type: attachment.type,
      size: attachment.size,
      public_id: attachment.public_id,
      status: attachment.status,
    }))
  );
}

export default function RichTextEditor({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  companyUsers = [],
  className,
  initialContent = '',
  initialAttachments = [],
  mode = 'create',
  onCancel,
}) {
  const isControlled = value !== undefined;
  const [attachments, setAttachments] = useState(() => normalizeInitialAttachments(initialAttachments));
  const lastInitialContentRef = useRef(initialContent || '');
  const lastAttachmentSnapshotRef = useRef(createAttachmentSnapshot(initialAttachments));

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(companyUsers),
    [companyUsers]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-lime-300 underline decoration-lime-300/60 underline-offset-2 transition-colors hover:text-lime-200',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full rounded-2xl border border-lime-400/15 bg-black/40',
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList.configure({
        HTMLAttributes: { class: 'not-prose space-y-1' },
      }),
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        deleteTriggerWithBackspace: true,
        suggestion: mentionSuggestion,
        renderText({ node }) {
          return `@${node.attrs.label || node.attrs.id}`;
        },
        renderHTML({ node }) {
          return [
            'span',
            {
              'data-mention-id': node.attrs.id,
              class: 'rounded-lg border border-lime-400/15 bg-lime-400/10 px-1.5 py-0.5 font-medium text-lime-200',
            },
            `@${node.attrs.label || node.attrs.id}`,
          ];
        },
      }),
    ],
    [mentionSuggestion, placeholder]
  );

  const editor = useEditor({
    extensions,
    content: isControlled ? (value || '') : (initialContent || ''),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'rich-chat-editor-content min-h-[96px] max-h-[400px] overflow-y-auto px-4 py-4 text-sm leading-6 text-slate-100 outline-none selection:bg-lime-400/25 selection:text-white',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange?.(activeEditor.isEmpty ? '' : activeEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (isControlled) {
      const nextValue = value || '';
      const currentValue = editor.isEmpty ? '' : editor.getHTML();
      if (nextValue !== currentValue) {
        editor.commands.setContent(nextValue, false);
      }
      return;
    }

    const nextValue = initialContent || '';
    if (nextValue !== lastInitialContentRef.current) {
      editor.commands.setContent(nextValue, false);
      lastInitialContentRef.current = nextValue;
    }
  }, [editor, initialContent, isControlled, value]);

  useEffect(() => {
    const nextSnapshot = createAttachmentSnapshot(initialAttachments);
    if (nextSnapshot === lastAttachmentSnapshotRef.current) return;

    setAttachments(normalizeInitialAttachments(initialAttachments));
    lastAttachmentSnapshotRef.current = nextSnapshot;
  }, [initialAttachments]);

  const promptLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Paste link URL', previousUrl || 'https://');

    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  const readyAttachments = attachments.filter((attachment) => attachment.status !== 'error');
  const hasUploadingAttachments = attachments.some((attachment) => attachment.status === 'uploading');
  const canSend = Boolean(editor && (!editor.isEmpty || readyAttachments.length > 0));

  const handleSend = useCallback(async () => {
    if (!editor || disabled || hasUploadingAttachments) return;

    const html = editor.isEmpty ? '' : editor.getHTML();
    const payloadAttachments = readyAttachments
      .filter((attachment) => attachment.status === 'ready' && attachment.url)
      .map((attachment) => ({
        url: attachment.url,
        filename: attachment.filename,
        type: attachment.type,
        size: attachment.size,
        public_id: attachment.public_id,
      }));
    const mentions = extractMentionIds(html);

    if (editor.isEmpty && payloadAttachments.length === 0) return;

    try {
      const result = await onSend?.(html, payloadAttachments, mentions);
      if (result === false) return;

      if (mode === 'create') {
        editor.commands.clearContent(true);
        setAttachments([]);
        onChange?.('');
      }
    } catch (error) {
      console.error('Editor send failed:', error);
    }
  }, [disabled, editor, hasUploadingAttachments, mode, onChange, onSend, readyAttachments]);

  const handleFilesSelected = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const availableSlots = MAX_ATTACHMENTS - attachments.length;
      if (availableSlots <= 0) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
        return;
      }

      const acceptedFiles = files.slice(0, availableSlots).filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is larger than 10MB`);
          return false;
        }

        if (!isFileAllowed(file)) {
          toast.error(`${file.name} is not a supported file type`);
          return false;
        }

        return true;
      });

      if (files.length > availableSlots) {
        toast.error(`Only ${availableSlots} more attachment(s) can be added`);
      }

      await Promise.all(
        acceptedFiles.map(async (file) => {
          const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
          const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/')
            ? URL.createObjectURL(file)
            : '';

          setAttachments((current) => [
            ...current,
            {
              id,
              filename: file.name,
              type: file.type,
              size: file.size,
              previewUrl,
              progress: 25,
              status: 'uploading',
            },
          ]);

          try {
            const result = await base44.integrations.Core.UploadFile({
              file,
              folder: 'workflow/messages',
            });

            setAttachments((current) =>
              current.map((attachment) =>
                attachment.id === id
                  ? {
                      ...attachment,
                      url: result.file_url || result.url,
                      public_id: result.public_id,
                      format: result.format,
                      progress: 100,
                      status: 'ready',
                    }
                  : attachment
              )
            );
          } catch (error) {
            console.error('Attachment upload failed:', error);
            toast.error(`Could not upload ${file.name}`);
            setAttachments((current) =>
              current.map((attachment) =>
                attachment.id === id
                  ? { ...attachment, progress: 100, status: 'error' }
                  : attachment
              )
            );
          }
        })
      );
    },
    [attachments.length]
  );

  const removeAttachment = useCallback((attachmentToRemove) => {
    if (attachmentToRemove.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentToRemove.previewUrl);
    }
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentToRemove.id)
    );
  }, []);

  const insertEmoji = useCallback(
    (emoji) => {
      editor?.chain().focus().insertContent(emoji).run();
    },
    [editor]
  );

  const insertGif = useCallback(
    (url, title) => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src: url, alt: title || 'GIF' },
        })
        .run();
    },
    [editor]
  );

  const handleEditorKeyDown = (event) => {
    if (!editor) return;
    const isMod = event.ctrlKey || event.metaKey;

    if (isMod && event.key === 'Enter') {
      event.preventDefault();
      handleSend();
      return;
    }

    if (isMod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      promptLink();
      return;
    }

    if (isMod && event.shiftKey && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      editor.chain().focus().toggleStrike().run();
      return;
    }

    if (isMod && event.shiftKey && event.key === '7') {
      event.preventDefault();
      editor.chain().focus().toggleBulletList().run();
      return;
    }

    if (isMod && event.shiftKey && event.key === '8') {
      event.preventDefault();
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "overflow-hidden rounded-[1.6rem] border border-lime-400/15 bg-[#020806]/95 shadow-[0_18px_48px_rgba(0,0,0,0.26)] transition-all focus-within:border-lime-400/35 focus-within:shadow-[0_0_0_1px_rgba(163,230,53,0.18),0_24px_60px_rgba(0,0,0,0.35)]",
          disabled && "opacity-75",
          className
        )}
        onKeyDown={handleEditorKeyDown}
      >
        {mode === 'edit' ? (
          <div className="flex items-center justify-between gap-3 border-b border-lime-400/15 bg-[#071107] px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-lime-300">
                Editing...
              </span>
              <p className="truncate text-xs text-lime-100/55">
                Your formatting and attachments stay intact while you update the message.
              </p>
            </div>

            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 rounded-xl px-3 text-lime-100/65 hover:bg-[#061006]/80 hover:text-white"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}

        <EditorToolbar editor={editor} disabled={disabled} promptLink={promptLink} />

        <div className="bg-black/80">
          <EditorContent editor={editor} />
        </div>

        {attachments.length > 0 ? (
          <div className="border-t border-lime-400/15 bg-[#061006]/45 p-3">
            <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />
          </div>
        ) : null}

        <EditorBottomBar
          editor={editor}
          disabled={disabled}
          canSend={canSend}
          isUploading={hasUploadingAttachments}
          onSend={handleSend}
          onFilesSelected={handleFilesSelected}
          onInsertEmoji={insertEmoji}
          onInsertGif={insertGif}
          mode={mode}
          onCancel={onCancel}
        />
      </div>
    </TooltipProvider>
  );
}
