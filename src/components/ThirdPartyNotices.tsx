import { useEffect, useState, type ReactElement } from 'react';

/** Minimal Markdown-to-HTML converter for our THIRD_PARTY_NOTICES.md structure. */
export function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCode = false;
  let inParagraph = false;

  const closeParagraph = () => {
    if (inParagraph) {
      html.push('</p>');
      inParagraph = false;
    }
  };

  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inlineMarkdown = (line: string): string => {
    // Escape HTML first, then apply markdown transformations
    let escaped = escapeHtml(line);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  for (const rawLine of lines) {
    const line = rawLine;

    // Fenced code blocks
    if (line.startsWith('```')) {
      if (inCode) {
        html.push('</code></pre>');
        inCode = false;
      } else {
        closeParagraph();
        html.push('<pre><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html.push(escapeHtml(line));
      html.push('\n');
      continue;
    }

    // HTML pass-through (<details>, <summary>, etc.)
    if (/^\s*<\/?(?:details|summary)/.test(line)) {
      closeParagraph();
      html.push(line);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeParagraph();
      html.push('<hr />');
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeParagraph();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blank line — close paragraph
    if (line.trim() === '') {
      closeParagraph();
      continue;
    }

    // Regular text
    if (!inParagraph) {
      html.push('<p>');
      inParagraph = true;
    } else {
      html.push('<br />');
    }
    html.push(inlineMarkdown(line));
  }

  closeParagraph();
  return html.join('\n');
}

export const NOTICES_HASH = '#third-party-notices';

export default function ThirdPartyNotices(): ReactElement | null {
  const [visible, setVisible] = useState(() => window.location.hash === NOTICES_HASH);
  const [noticesHtml, setNoticesHtml] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setVisible(window.location.hash === NOTICES_HASH);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Lazy-load the markdown only when the modal is first opened
  useEffect(() => {
    if (visible && noticesHtml === null) {
      import('../../THIRD_PARTY_NOTICES.md?raw').then((m: { default: string }) => {
        setNoticesHtml(markdownToHtml(m.default));
      });
    }
  }, [visible, noticesHtml]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [visible]);

  if (!visible) return null;

  const close = () => {
    history.pushState(null, '', window.location.pathname + window.location.search);
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ash/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Third Party Notices"
    >
      <div className="relative mx-auto mt-4 mb-4 flex h-[calc(100vh-2rem)] w-full max-w-4xl flex-col rounded-sm border border-gold/30 bg-ash-2/95 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gold/20 px-6 py-4">
          <h1 className="heading-rune font-display text-lg sm:text-xl">Third Party Notices</h1>
          <button
            type="button"
            onClick={close}
            aria-label="Close third party notices"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-gold/40 text-gold-bright transition hover:bg-gold hover:text-ash"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        {noticesHtml === null ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-parchment-dim animate-pulse">
              Loading…
            </p>
          </div>
        ) : (
          <div
            className="notices-content flex-1 overflow-y-auto px-6 py-6 sm:px-10"
            dangerouslySetInnerHTML={{ __html: noticesHtml }}
          />
        )}
      </div>
    </div>
  );
}
