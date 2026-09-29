// Build-time HTML helpers used by vite.config.ts. Plain JavaScript so they
// can be unit-tested with Node's test runner; types live in `site-html.d.mts`.

/** @param {string} s */
export function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Content Security Policy for the built site.
 *
 * - img-src allows data: (inline noise texture) and i.ytimg.com (thumbnails)
 * - style-src 'unsafe-inline' is required for React inline style attributes
 * - connect-src is limited to the site itself plus the origin of the optional
 *   live-feed Worker, when one is configured
 *
 * @param {string | undefined} liveApiUrl value of VITE_VIDEO_API
 * @returns {{ csp: string, warning?: string }}
 */
export function buildCsp(liveApiUrl) {
  const connect = ["'self'"];
  let warning;
  if (liveApiUrl) {
    let url;
    try {
      url = new URL(liveApiUrl);
    } catch {
      url = undefined;
    }
    if (url && (url.protocol === 'https:' || url.protocol === 'http:')) {
      connect.push(url.origin);
    } else {
      warning = `VITE_VIDEO_API is not a valid http(s) URL (${liveApiUrl}); the live feed will be blocked by the CSP.`;
    }
  }
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.ytimg.com",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return { csp, warning };
}

const DATE_FORMAT = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' });

/**
 * Plain-HTML list of videos for visitors (and crawlers) without JavaScript.
 * Returns an empty string when there is nothing to render.
 *
 * @param {unknown} data parsed videos.json
 */
export function renderNoscriptVideoList(data) {
  const videos = Array.isArray(data?.videos) ? data.videos : [];
  const items = videos
    .filter(
      (v) =>
        typeof v?.id === 'string' &&
        typeof v?.title === 'string' &&
        typeof v?.url === 'string' &&
        v.url.startsWith('https://'),
    )
    .map((v) => {
      const time = Date.parse(v.publishedAt);
      const date = Number.isNaN(time)
        ? ''
        : ` <time datetime="${escapeHtml(new Date(time).toISOString())}">${escapeHtml(DATE_FORMAT.format(time))}</time>`;
      return `<li><a href="${escapeHtml(v.url)}">${escapeHtml(v.title)}</a>${date}</li>`;
    });
  if (items.length === 0) return '';
  return [
    '<noscript>',
    '<section style="max-width:48rem;margin:0 auto;padding:2rem 1rem;line-height:1.6">',
    '<h2>Chronicle of Fallen Bosses</h2>',
    `<ul>${items.join('')}</ul>`,
    '<p><a href="https://www.youtube.com/@janimeister">All videos on YouTube</a></p>',
    '</section>',
    '</noscript>',
  ].join('\n');
}
