import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Loader2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatBytes(bytes = 0) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getAttachmentKind(attachment) {
  const type = attachment.type || attachment.mime_type || '';
  const filename = attachment.filename || attachment.original_name || '';

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (/\.(zip|rar|7z)$/i.test(filename)) return 'archive';
  return 'file';
}

function AttachmentIcon({ kind, className }) {
  if (kind === 'image') return <ImageIcon className={className} />;
  if (kind === 'video') return <Video className={className} />;
  if (kind === 'archive') return <FileArchive className={className} />;
  return <FileText className={className} />;
}

export default function AttachmentPreview({
  attachments = [],
  onRemove,
  readonly = false,
  compact = false,
}) {
  if (!attachments.length) return null;

  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
      <AnimatePresence initial={false}>
        {attachments.map((attachment) => {
          const kind = getAttachmentKind(attachment);
          const url = attachment.url || attachment.file_url || attachment.previewUrl;
          const name = attachment.filename || attachment.original_name || 'Attachment';
          const isUploading = attachment.status === 'uploading';

          return (
            <motion.div
              key={attachment.id || url || name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-lime-400/15 bg-black/65 shadow-[0_14px_32px_rgba(0,0,0,0.26)]"
            >
              {kind === 'image' && url ? (
                <div className="h-32 bg-black">
                  <img src={url} alt={name} className="h-full w-full object-cover" />
                </div>
              ) : kind === 'video' && url ? (
                <div className="h-32 bg-black">
                  <video src={url} className="h-full w-full object-cover" controls={readonly} />
                </div>
              ) : null}

              <div className="flex items-center gap-3 p-3">
                {kind !== 'image' && kind !== 'video' ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-400/15 bg-lime-400/10 text-lime-300">
                    <AttachmentIcon kind={kind} className="h-5 w-5" />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {name}
                  </p>
                  <p className="text-xs text-lime-100/45">
                    {isUploading ? 'Uploading...' : formatBytes(attachment.size)}
                  </p>
                </div>

                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
                ) : readonly && url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-lime-100/55 transition-colors hover:bg-[#061006]/80 hover:text-lime-200"
                    aria-label={`Download ${name}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : null}

                {!readonly && onRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(attachment)}
                    className="h-8 w-8 rounded-xl text-lime-100/55 hover:bg-rose-500/10 hover:text-rose-200"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              {isUploading ? (
                <div className="h-1 bg-[#061006]">
                  <div
                    className="h-full bg-lime-400 transition-all"
                    style={{ width: `${attachment.progress || 35}%` }}
                  />
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
