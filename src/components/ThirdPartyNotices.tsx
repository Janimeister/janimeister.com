import { useEffect, useRef, useState, type ReactElement } from 'react';

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
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const inlineMarkdown = (line: string): string => {
    // Escape HTML first, then apply markdown transformations.
    // Since escapeHtml already escapes &, <, >, and " the captured URL is safe
    // for use directly inside an href attribute.
    const escaped = escapeHtml(line);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        (_match, text, url) =>
          `<a href="${url}" target="_blank" rel="noreferrer noopener">${text}</a>`,
      )
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
      continue;
    }

    // HTML pass-through (<details>, <summary>) — emit only the allowlisted tag shape,
    // never pass through attributes or arbitrary content to prevent XSS.
    if (/^\s*<details[\s>\/]/.test(line)) {
      closeParagraph();
      html.push('<details>');
      continue;
    }
    if (/^\s*<\/details\s*>/.test(line)) {
      closeParagraph();
      html.push('</details>');
      continue;
    }
    const summaryMatch = line.match(/^\s*<summary>(.*?)<\/summary>\s*$/);
    if (summaryMatch) {
      closeParagraph();
      html.push(`<summary>${escapeHtml(summaryMatch[1])}</summary>`);
      continue;
    }
    if (/^\s*<summary\s*\/?>/.test(line)) {
      closeParagraph();
      html.push('<summary>');
      continue;
    }
    if (/^\s*<\/summary\s*>/.test(line)) {
      closeParagraph();
      html.push('</summary>');
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

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** Returns visible, non-disabled focusable descendants of `root`. */
function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (node) =>
      !node.hasAttribute('disabled') &&
      !node.closest('[hidden]') &&
      node.offsetParent !== null,
  );
}

export default function ThirdPartyNotices(): ReactElement | null {
  const [visible, setVisible] = useState(() => window.location.hash === NOTICES_HASH);
  const [noticesHtml, setNoticesHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setVisible(false);
  };

  useEffect(() => {
    const onHash = () => setVisible(window.location.hash === NOTICES_HASH);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Capture previously focused element, then move focus into dialog on open
  useEffect(() => {
    if (visible) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Defer so the dialog is painted before we move focus
      const id = window.setTimeout(() => {
        const el = dialogRef.current;
        if (!el) return;
        const [first] = getFocusable(el);
        (first ?? el).focus();
      }, 0);
      return () => window.clearTimeout(id);
    } else {
      // Restore focus when dialog closes
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [visible]);

  // Trap focus inside the dialog and close on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const el = dialogRef.current;
      if (!el) return;
      const focusable = getFocusable(el);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  // Lazy-load the markdown only when the modal is first opened
  useEffect(() => {
    if (visible && noticesHtml === null && !loadError) {
      import('../../THIRD_PARTY_NOTICES.md?raw')
        .then((m: { default: string }) => {
          setNoticesHtml(markdownToHtml(m.default));
        })
        .catch(() => {
          setLoadError(true);
        });
    }
  }, [visible, noticesHtml, loadError]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (visible) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-ash/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Third Party Notices"
      tabIndex={-1}
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
        {loadError ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-parchment-dim">
              Failed to load notices. Please try again later.
            </p>
          </div>
        ) : noticesHtml === null ? (
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
