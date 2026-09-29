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

import { fetchViaApi, fetchViaRss } from '../../shared/youtube-feed.mjs';

interface Env {
  CHANNEL_ID?: string;
  ALLOWED_ORIGIN?: string;
  YT_API_KEY?: string;
}

const DEFAULT_CHANNEL = 'UCvCde3OAobvTuLdeiCpFDGw';
const USER_AGENT = 'janimeister-worker/1.0';

// Only successful feed responses may be cached; errors must not be pinned in
// browsers or intermediaries after the upstream recovers.
const CACHE_OK = 'public, max-age=600, stale-while-revalidate=3600';
const CACHE_NONE = 'no-store';

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') ?? '';
    const allowed = env.ALLOWED_ORIGIN ?? '*';
    const allowOrigin =
      allowed === '*' ? '*' : allowed.split(',').map((s) => s.trim()).includes(origin) ? origin : '';

    const baseHeaders: Record<string, string> = {};
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
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { ...baseHeaders, 'Cache-Control': CACHE_NONE, Allow: 'GET, OPTIONS' },
      });
    }

    if (url.pathname !== '/' && url.pathname !== '/videos' && url.pathname !== '/videos.json') {
      return new Response('Not Found', {
        status: 404,
        headers: { ...baseHeaders, 'Cache-Control': CACHE_NONE },
      });
    }

    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL;

    // Edge cache keyed by channel + effective origin. When CORS is restricted
    // (ALLOWED_ORIGIN is not '*'), each allowed origin gets its own cache entry
    // so a response with origin A's Access-Control-Allow-Origin header is never
    // served to origin B. Requests with a disallowed or absent origin are cached
    // under a shared 'no-cors' key — their responses never include an
    // Access-Control-Allow-Origin header so cross-origin collisions can't occur,
    // and caching them prevents repeated upstream calls from burning API quota.
    const cache = caches.default;
    const cacheKeySuffix = allowed === '*' ? '' : allowOrigin ? `/${encodeURIComponent(allowOrigin)}` : '/no-cors';
    const cacheKey = new Request(`https://feed.cache/${channelId}${cacheKeySuffix}`, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...baseHeaders,
          'Cache-Control': CACHE_OK,
          'X-Cache': 'HIT',
        },
      });
    }

    let videos;
    try {
      videos = env.YT_API_KEY
        ? await fetchViaApi(channelId, env.YT_API_KEY, { userAgent: USER_AGENT })
        : await fetchViaRss(channelId, {
            userAgent: USER_AGENT,
            init: { cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit,
          });
    } catch (err) {
      // Log the underlying error but never leak internal details to clients.
      console.error('Feed fetch failed:', err);
      return json(
        { error: 'fetch_failed', message: 'Upstream feed unavailable' },
        502,
        { ...baseHeaders, 'Cache-Control': CACHE_NONE },
      );
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
        'Cache-Control': CACHE_OK,
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
