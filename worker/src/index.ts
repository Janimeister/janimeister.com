/**
 * Cloudflare Worker that exposes the Janimeister YouTube feed as JSON.
 *
 * - Uses YouTube Data API v3 (playlistItems) to fetch all uploads (up to 200)
 * - Falls back to the RSS feed (15 videos) when YT_API_KEY is not set
 * - Caches at the edge for 10 minutes; serves stale-while-revalidate up to 1h
 * - CORS: allows `ALLOWED_ORIGIN` (configure in wrangler.toml) or `*`
 *
 * Secrets (set via `wrangler secret put`):
 *   YT_API_KEY  — YouTube Data API v3 key from Google Cloud Console
 */

interface Env {
  CHANNEL_ID?: string;
  ALLOWED_ORIGIN?: string;
  YT_API_KEY?: string;
}

interface PlaylistItemsResponse {
  items?: Array<{
    snippet: {
      publishedAt: string;
      title: string;
      description: string;
      thumbnails?: { high?: { url: string } };
      resourceId: { videoId: string };
    };
    contentDetails?: {
      videoPublishedAt?: string;
    };
  }>;
  nextPageToken?: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  description?: string;
}

const DEFAULT_CHANNEL = 'UCvCde3OAobvTuLdeiCpFDGw';
const MAX_PAGES = 4; // up to 200 videos (50 per page)

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGIN ?? '*';
    const allowOrigin =
      allowed === '*' ? '*' : allowed.split(',').map((s) => s.trim()).includes(origin) ? origin : '';

    const baseHeaders: Record<string, string> = {
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    };
    if (allowed !== '*') {
      baseHeaders['Vary'] = 'Origin';
    }
    if (allowOrigin) {
      baseHeaders['Access-Control-Allow-Origin'] = allowOrigin;
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...baseHeaders,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (req.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: baseHeaders });
    }

    if (url.pathname !== '/' && url.pathname !== '/videos' && url.pathname !== '/videos.json') {
      return new Response('Not Found', { status: 404, headers: baseHeaders });
    }

    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL;

    // Edge cache keyed by channel.
    const cache = caches.default;
    const cacheKey = new Request(`https://feed.cache/${channelId}`, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...baseHeaders,
          'X-Cache': 'HIT',
        },
      });
    }

    let videos: Video[];
    try {
      videos = env.YT_API_KEY
        ? await fetchViaApi(channelId, env.YT_API_KEY)
        : await fetchViaRss(channelId);
    } catch (err) {
      return json({ error: 'fetch_failed', message: String(err) }, 502, baseHeaders);
    }
    const payload = {
      channelId,
      channelTitle: 'Janimeister',
      channelUrl: 'https://www.youtube.com/@janimeister',
      fetchedAt: new Date().toISOString(),
      videos,
    };

    const body = JSON.stringify(payload);
    const response = new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...baseHeaders,
        'X-Cache': 'MISS',
      },
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

function json(obj: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

/** Fetch all uploads via YouTube Data API v3 (up to MAX_PAGES * 50 videos). */
async function fetchViaApi(channelId: string, apiKey: string): Promise<Video[]> {
  // The uploads playlist ID is the channel ID with "UC" replaced by "UU".
  if (!channelId.startsWith('UC')) {
    throw new Error(
      `CHANNEL_ID must be a canonical YouTube channel ID starting with "UC" (got "${channelId}"). ` +
        'Set it to the UC… ID found in the channel URL, not a handle or custom URL.',
    );
  }
  const uploadsPlaylistId = 'UU' + channelId.slice(2);
  const videos: Video[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    apiUrl.searchParams.set('part', 'snippet,contentDetails');
    apiUrl.searchParams.set('playlistId', uploadsPlaylistId);
    apiUrl.searchParams.set('maxResults', '50');
    apiUrl.searchParams.set('key', apiKey);
    if (pageToken) apiUrl.searchParams.set('pageToken', pageToken);

    const res = await fetch(apiUrl.toString(), {
      headers: { 'user-agent': 'janimeister-worker/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`YouTube API HTTP ${res.status}`);

    const data = (await res.json()) as PlaylistItemsResponse;
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

/** Fallback: fetch the RSS feed (returns only the 15 most recent videos). */
async function fetchViaRss(channelId: string): Promise<Video[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, {
    headers: { 'user-agent': 'janimeister-worker/1.0' },
    signal: AbortSignal.timeout(15_000),
    cf: { cacheTtl: 600, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) throw new Error(`RSS feed HTTP ${res.status}`);
  return parseFeed(await res.text());
}

function parseFeed(xml: string): Video[] {
  const videos: Video[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const id = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = decode(pick(block, /<title>([\s\S]*?)<\/title>/));
    const publishedAt = pick(block, /<published>([^<]+)<\/published>/);
    const link = pick(block, /<link rel="alternate" href="([^"]+)"/);
    const description = decode(pick(block, /<media:description>([\s\S]*?)<\/media:description>/));
    if (!id || !title) continue;
    videos.push({
      id,
      title: title.trim(),
      url: link || `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: publishedAt || new Date().toISOString(),
      description: description ? description.trim().slice(0, 500) : undefined,
    });
  }
  return videos;
}

function pick(s: string, re: RegExp): string {
  const m = re.exec(s);
  return m ? m[1] : '';
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
