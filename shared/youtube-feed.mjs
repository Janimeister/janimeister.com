// YouTube feed fetching shared by the build-time script
// (scripts/fetch-videos.mjs) and the Cloudflare Worker (worker/src/index.ts).
//
// Plain JavaScript so it runs under Node without a build step; types live in
// the sibling `youtube-feed.d.mts`.

const MAX_PAGES = 4; // up to 200 videos (50 per page)
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetch all uploads via YouTube Data API v3 (up to MAX_PAGES * 50 videos).
 *
 * @param {string} channelId canonical `UC…` channel ID
 * @param {string} apiKey YouTube Data API v3 key
 * @param {{ userAgent: string }} options
 */
export async function fetchViaApi(channelId, apiKey, { userAgent }) {
  // The uploads playlist ID is the channel ID with "UC" replaced by "UU".
  if (!channelId.startsWith('UC')) {
    throw new Error(
      `Channel ID must be a canonical YouTube channel ID starting with "UC" (got "${channelId}"). ` +
        'Set it to the UC… ID found in the channel URL, not a handle or custom URL.',
    );
  }
  const uploadsPlaylistId = 'UU' + channelId.slice(2);
  const videos = [];
  let pageToken;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('playlistId', uploadsPlaylistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { 'user-agent': userAgent },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`YouTube API HTTP ${res.status}`);

    const data = await res.json();
    for (const item of data.items ?? []) {
      const { snippet, contentDetails } = item;
      const videoId = snippet.resourceId.videoId;
      videos.push({
        id: videoId,
        title: snippet.title.trim(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: snippet.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: contentDetails?.videoPublishedAt ?? snippet.publishedAt,
        description: snippet.description ? snippet.description.trim().slice(0, 500) : undefined,
      });
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videos;
}

/**
 * Fetch the public RSS feed (returns only the 15 most recent videos).
 *
 * @param {string} channelId
 * @param {{ userAgent: string, init?: RequestInit }} options `init` is merged
 *   into the fetch options (e.g. Cloudflare's `cf` cache settings).
 */
export async function fetchViaRss(channelId, { userAgent, init = {} }) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, {
    ...init,
    headers: { 'user-agent': userAgent },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`RSS feed HTTP ${res.status}`);
  return parseFeed(await res.text());
}

/**
 * Minimal, dependency-free XML feed parser specialised for YouTube's feed.
 * Pulls each <entry> block then extracts the fields we care about.
 *
 * @param {string} xml
 */
export function parseFeed(xml) {
  const videos = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const id = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = decodeEntities(pick(block, /<title>([\s\S]*?)<\/title>/));
    const publishedAt = pick(block, /<published>([^<]+)<\/published>/);
    const url = pick(block, /<link rel="alternate" href="([^"]+)"/);
    const description = decodeEntities(pick(block, /<media:description>([\s\S]*?)<\/media:description>/));
    if (!id || !title) continue;
    videos.push({
      id,
      title: title.trim(),
      url: decodeEntities(url) || `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: publishedAt || new Date().toISOString(),
      description: description ? description.trim().slice(0, 500) : undefined,
    });
  }
  return videos;
}

function pick(s, re) {
  const m = re.exec(s);
  return m ? m[1] : '';
}

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/**
 * Decode CDATA sections and XML character references in a single pass, so an
 * escaped entity such as `&amp;lt;` becomes the literal text `&lt;` rather
 * than being decoded twice into `<`. CDATA content is kept verbatim.
 *
 * @param {string} s
 */
export function decodeEntities(s) {
  return s.replace(
    /<!\[CDATA\[([\s\S]*?)\]\]>|&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (match, cdata, ref) => {
      if (cdata !== undefined) return cdata;
      if (ref[0] === '#') {
        const hex = ref[1] === 'x' || ref[1] === 'X';
        const code = parseInt(ref.slice(hex ? 2 : 1), hex ? 16 : 10);
        try {
          return String.fromCodePoint(code);
        } catch {
          return match; // out-of-range code point
        }
      }
      return NAMED_ENTITIES[ref.toLowerCase()] ?? match;
    },
  );
}
