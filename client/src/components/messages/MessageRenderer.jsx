import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import AttachmentPreview from './AttachmentPreview';
import { cn } from "@/lib/utils";

const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'video',
  'source',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'code',
  'pre',
  'blockquote',
  'span',
  'mark',
  'hr',
];

const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'target',
  'rel',
  'class',
  'data-mention-id',
  'style',
  'colspan',
  'rowspan',
  'controls',
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'text-align',
]);

function sanitizeInlineStyle(styleValue = '') {
  return styleValue
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const [property, value] = rule.split(':').map((part) => part?.trim());
      if (!property || !value || !ALLOWED_STYLE_PROPERTIES.has(property.toLowerCase())) {
        return false;
      }
      return !/url\s*\(|expression\s*\(|javascript:/i.test(value);
    })
    .join('; ');
}

function sanitizeHtml(html = '') {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
  });

  if (typeof DOMParser === 'undefined') return sanitized;

  const doc = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');

  doc.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  doc.querySelectorAll('video').forEach((video) => {
    video.setAttribute('controls', 'true');
  });

  doc.querySelectorAll('[style]').forEach((node) => {
    const cleanStyle = sanitizeInlineStyle(node.getAttribute('style'));
    if (cleanStyle) node.setAttribute('style', cleanStyle);
    else node.removeAttribute('style');
  });

  return doc.body.firstElementChild?.innerHTML || '';
}

export function getPlainTextFromHtml(html = '') {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export default function MessageRenderer({
  html = '',
  attachments = [],
  isOwn = false,
  deleted = false,
  className,
}) {
  const cleanHtml = useMemo(() => sanitizeHtml(html), [html]);

  if (deleted) {
    return <p className="text-sm italic opacity-70">This message was deleted</p>;
  }

  return (
    <div className={cn("space-y-3", isOwn && "rich-chat-own", className)}>
      {cleanHtml ? (
        <div
          className={cn(
            "rich-chat-message text-sm leading-6",
            isOwn ? "text-white dark:text-black" : "text-gray-900 dark:text-slate-100"
          )}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : null}

      <AttachmentPreview attachments={attachments} readonly compact />
    </div>
  );
}
