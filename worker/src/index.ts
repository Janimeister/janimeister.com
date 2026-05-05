/**
 * Cloudflare Worker that exposes the Janimeister YouTube feed as JSON.
 *
 * - Pulls https://www.youtube.com/feeds/videos.xml?channel_id=...
 * - Parses entries with regex (no deps; the feed is stable & well-formed)
 * - Caches at the edge for 10 minutes; serves stale-while-revalidate up to 1h
 * - CORS: allows `ALLOWED_ORIGIN` (configure in wrangler.toml) or `*`
 */

interface Env {
  CHANNEL_ID?: string;
  ALLOWED_ORIGIN?: string;
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

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGIN ?? '*';
    const allowOrigin =
      allowed === '*' ? '*' : allowed.split(',').map((s) => s.trim()).includes(origin) ? origin : '';

    const baseHeaders: Record<string, string> = {
      'Vary': 'Origin',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    };
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
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    // Edge cache keyed by request URL.
    const cache = caches.default;
    const cacheKey = new Request(`https://feed.cache/${channelId}`, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...baseHeaders,
          'X-Cache': 'HIT',
        },
      });
    }

    let xml: string;
    try {
      const upstream = await fetch(feedUrl, {
        headers: { 'user-agent': 'janimeister-worker/1.0' },
        cf: { cacheTtl: 600, cacheEverything: true },
      });
      if (!upstream.ok) {
        return json({ error: 'upstream', status: upstream.status }, 502, baseHeaders);
      }
      xml = await upstream.text();
    } catch (err) {
      return json({ error: 'fetch_failed', message: String(err) }, 502, baseHeaders);
    }

    const videos = parseFeed(xml);
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
