import type { ChannelData, Video } from '../types';

const CHANNEL_URL = 'https://www.youtube.com/@janimeister';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function toVideo(value: unknown): Video | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.id) || !isNonEmptyString(v.title)) return null;
  const fallbackUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
  return {
    id: v.id,
    title: v.title,
    // Only https links are rendered, so a bad feed can never inject another scheme.
    url: isNonEmptyString(v.url) && v.url.startsWith('https://') ? v.url : fallbackUrl,
    thumbnail: isNonEmptyString(v.thumbnail) ? v.thumbnail : '',
    publishedAt: isNonEmptyString(v.publishedAt) ? v.publishedAt : '',
    description: isNonEmptyString(v.description) ? v.description : undefined,
  };
}

/**
 * Validates an untrusted feed payload. Returns `null` when the payload is not a
 * feed at all; individual malformed videos are dropped rather than failing the
 * whole feed.
 */
export function parseChannelData(value: unknown): ChannelData | null {
  if (typeof value !== 'object' || value === null) return null;
  const d = value as Record<string, unknown>;
  if (!Array.isArray(d.videos)) return null;
  return {
    channelId: typeof d.channelId === 'string' ? d.channelId : '',
    channelTitle: isNonEmptyString(d.channelTitle) ? d.channelTitle : 'Janimeister',
    channelUrl: isNonEmptyString(d.channelUrl) && d.channelUrl.startsWith('https://') ? d.channelUrl : CHANNEL_URL,
    fetchedAt: typeof d.fetchedAt === 'string' ? d.fetchedAt : '',
    videos: d.videos.map(toVideo).filter((v): v is Video => v !== null),
  };
}

async function fetchFeed(url: string, init: RequestInit): Promise<ChannelData> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} from ${url}`);
  const data = parseChannelData(await res.json());
  if (!data) throw new Error(`Malformed feed from ${url}`);
  return data;
}

export interface FetchChannelOptions {
  /** Build-time `videos.json` bundled with the site. */
  staticUrl: string;
  /** Optional live feed (the Cloudflare Worker). */
  liveUrl?: string;
  signal?: AbortSignal;
}

/**
 * Loads the static and (optional) live feeds in parallel.
 *
 * Prefers a live feed that has videos, then the static feed, then an empty
 * live feed. Rejects only when neither source produced a valid feed.
 */
export async function fetchChannelData({ staticUrl, liveUrl, signal }: FetchChannelOptions): Promise<ChannelData> {
  const staticFeed = fetchFeed(staticUrl, { signal, cache: 'no-cache' });
  if (!liveUrl) return staticFeed;

  const [staticResult, liveResult] = await Promise.allSettled([
    staticFeed,
    fetchFeed(liveUrl, { signal }),
  ]);
  if (liveResult.status === 'fulfilled' && liveResult.value.videos.length > 0) return liveResult.value;
  if (staticResult.status === 'fulfilled') return staticResult.value;
  if (liveResult.status === 'fulfilled') return liveResult.value;
  throw staticResult.reason;
}
