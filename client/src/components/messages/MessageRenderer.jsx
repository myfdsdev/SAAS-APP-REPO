import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import AttachmentPreview from './AttachmentPreview';
import { cn } from "@/lib/utils";
import { ExternalLink, Globe } from 'lucide-react';

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
  'iframe', // YouTube/Vimeo embeds
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
  'data-embed-kind',
  'style',
  'colspan',
  'rowspan',
  'controls',
  'allow',
  'allowfullscreen',
  'frameborder',
  'loading',
  'referrerpolicy',
  'width',
  'height',
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'text-align',
]);

// =====================================================================
// AUTO-EMBED HELPERS
// =====================================================================

const URL_REGEX =
  /(\bhttps?:\/\/[^\s<>"']+[^\s<>"',.;:!?)\]])/g;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

const youtubeId = (url) => {
  const m = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{6,})/i,
  );
  return m?.[1] || null;
};
const vimeoId = (url) => {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m?.[1] || null;
};
const loomId = (url) => {
  const m = url.match(/loom\.com\/share\/([\w-]+)/i);
  return m?.[1] || null;
};

// Build the embed/preview HTML for a single URL.
// Returns null when the URL should stay as a plain anchor.
const embedFor = (url) => {
  // YouTube
  const yt = youtubeId(url);
  if (yt) {
    return `<div class="msg-embed msg-embed-video" data-embed-kind="youtube">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${yt}"
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        frameborder="0"
      ></iframe>
    </div>`;
  }
  // Vimeo
  const vm = vimeoId(url);
  if (vm) {
    return `<div class="msg-embed msg-embed-video" data-embed-kind="vimeo">
      <iframe
        src="https://player.vimeo.com/video/${vm}"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
        loading="lazy"
        frameborder="0"
      ></iframe>
    </div>`;
  }
  // Loom
  const lm = loomId(url);
  if (lm) {
    return `<div class="msg-embed msg-embed-video" data-embed-kind="loom">
      <iframe
        src="https://www.loom.com/embed/${lm}"
        allowfullscreen
        loading="lazy"
        frameborder="0"
      ></iframe>
    </div>`;
  }
  // Bare image
  if (IMAGE_EXT.test(url)) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-embed-image">
      <img src="${url}" alt="" loading="lazy" />
    </a>`;
  }
  // Bare video
  if (VIDEO_EXT.test(url)) {
    return `<div class="msg-embed msg-embed-video">
      <video src="${url}" controls preload="metadata"></video>
    </div>`;
  }
  return null;
};

// Generic link preview card (no metadata fetch — purely client-side: shows
// favicon + hostname + path). Cheap, no backend needed.
const linkCard = (url) => {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname.length > 1 ? u.pathname : "";
  } catch {
    host = url;
  }
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    host,
  )}&sz=64`;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-link-card" data-embed-kind="link">
    <img class="msg-link-card-favicon" src="${favicon}" alt="" loading="lazy" />
    <div class="msg-link-card-body">
      <div class="msg-link-card-host">${host}</div>
      <div class="msg-link-card-path">${path}</div>
    </div>
  </a>`;
};

// =====================================================================
// SANITIZE + ENRICH
// =====================================================================

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
    // Keep iframes only when they target trusted hosts.
    ADD_URI_SAFE_ATTR: ['allow', 'allowfullscreen'],
  });

  if (typeof DOMParser === 'undefined') return sanitized;

  const doc = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');

  // 1. Anchors → open in new tab
  doc.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  // 2. Videos must always have controls
  doc.querySelectorAll('video').forEach((video) => {
    video.setAttribute('controls', 'true');
  });

  // 3. iframes — restrict to trusted embed hosts so users can't inject arbitrary frames
  doc.querySelectorAll('iframe').forEach((frame) => {
    const src = frame.getAttribute('src') || '';
    const ok =
      /^(https:\/\/)?(www\.)?(youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/|loom\.com\/embed\/)/.test(
        src,
      );
    if (!ok) frame.remove();
  });

  // 4. Strip dangerous inline styles
  doc.querySelectorAll('[style]').forEach((node) => {
    const cleanStyle = sanitizeInlineStyle(node.getAttribute('style'));
    if (cleanStyle) node.setAttribute('style', cleanStyle);
    else node.removeAttribute('style');
  });

  // 5. AUTO-LINK plain-text URLs that aren't already inside an <a>.
  //    Walk text nodes; replace bare URLs with anchor tags.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    if (node.parentElement?.closest('a, code, pre')) continue;
    const text = node.nodeValue;
    if (!text || !URL_REGEX.test(text)) continue;
    URL_REGEX.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let lastIdx = 0;
    text.replace(URL_REGEX, (match, _g, idx) => {
      if (idx > lastIdx) frag.appendChild(doc.createTextNode(text.slice(lastIdx, idx)));
      const a = doc.createElement('a');
      a.href = match;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = match;
      frag.appendChild(a);
      lastIdx = idx + match.length;
      return match;
    });
    if (lastIdx < text.length) frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
    node.parentNode?.replaceChild(frag, node);
  }

  return doc.body.firstElementChild?.innerHTML || '';
}

// Collect URLs from anchors so we can render embeds/cards beneath the message.
// Returns array of { url, kind } where kind ∈ "youtube" | "vimeo" | "loom" | "image" | "video" | "link".
function collectEmbeds(html, plainText) {
  const urls = new Set();
  if (typeof DOMParser !== 'undefined' && html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach((a) => urls.add(a.getAttribute('href')));
  }
  if (plainText) {
    const matches = plainText.match(URL_REGEX) || [];
    matches.forEach((m) => urls.add(m));
  }
  const out = [];
  urls.forEach((url) => {
    if (!url) return;
    if (youtubeId(url)) out.push({ url, kind: 'youtube' });
    else if (vimeoId(url)) out.push({ url, kind: 'vimeo' });
    else if (loomId(url)) out.push({ url, kind: 'loom' });
    else if (IMAGE_EXT.test(url)) out.push({ url, kind: 'image' });
    else if (VIDEO_EXT.test(url)) out.push({ url, kind: 'video' });
    else out.push({ url, kind: 'link' });
  });
  // Cap to avoid runaway preview dumps if someone pastes 20 URLs.
  return out.slice(0, 4);
}

export function getPlainTextFromHtml(html = '') {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
}

// =====================================================================
// EMBED COMPONENTS
// =====================================================================

function VideoEmbed({ url, kind }) {
  if (kind === 'youtube') {
    const id = youtubeId(url);
    if (!id) return null;
    return (
      <div className="msg-embed msg-embed-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          frameBorder="0"
        />
      </div>
    );
  }
  if (kind === 'vimeo') {
    const id = vimeoId(url);
    if (!id) return null;
    return (
      <div className="msg-embed msg-embed-video">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          frameBorder="0"
        />
      </div>
    );
  }
  if (kind === 'loom') {
    const id = loomId(url);
    if (!id) return null;
    return (
      <div className="msg-embed msg-embed-video">
        <iframe
          src={`https://www.loom.com/embed/${id}`}
          allowFullScreen
          loading="lazy"
          frameBorder="0"
        />
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <div className="msg-embed msg-embed-video">
        <video src={url} controls preload="metadata" />
      </div>
    );
  }
  if (kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="msg-embed-image-wrap">
        <img src={url} alt="" loading="lazy" className="msg-embed-image" />
      </a>
    );
  }
  return null;
}

function LinkCard({ url }) {
  let host = '';
  let path = '';
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, '');
    path = u.pathname.length > 1 ? u.pathname : '';
  } catch {
    host = url;
  }
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="msg-link-card"
    >
      <img
        className="msg-link-card-favicon"
        src={favicon}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <div className="msg-link-card-body">
        <div className="msg-link-card-host">
          {host}
          <ExternalLink className="msg-link-card-icon" size={11} />
        </div>
        {path && <div className="msg-link-card-path">{path}</div>}
      </div>
    </a>
  );
}

// =====================================================================
// MAIN
// =====================================================================

export default function MessageRenderer({
  html = '',
  attachments = [],
  isOwn = false,
  deleted = false,
  className,
}) {
  const cleanHtml = useMemo(() => sanitizeHtml(html), [html]);
  const embeds = useMemo(() => {
    if (!cleanHtml) return [];
    const plain = getPlainTextFromHtml(cleanHtml);
    return collectEmbeds(cleanHtml, plain);
  }, [cleanHtml]);

  if (deleted) {
    return <p className="text-sm italic opacity-60">This message was deleted</p>;
  }

  return (
    <div className={cn("space-y-2", isOwn && "rich-chat-own", className)}>
      {cleanHtml ? (
        <div
          className={cn(
            "rich-chat-message text-sm leading-6 break-words",
            isOwn ? "text-black dark:text-black" : "text-gray-900 dark:text-slate-100",
          )}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : null}

      {embeds.length > 0 && (
        <div className="space-y-2">
          {embeds.map((e, i) =>
            e.kind === 'link' ? (
              <LinkCard key={`${e.url}-${i}`} url={e.url} />
            ) : (
              <VideoEmbed key={`${e.url}-${i}`} url={e.url} kind={e.kind} />
            ),
          )}
        </div>
      )}

      <AttachmentPreview attachments={attachments} readonly compact />
    </div>
  );
}
