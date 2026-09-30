import type { ChannelData } from '../types';
import { fetchChannelData } from './channelData';

/**
 * Fetches the channel feed.
 *
 * Strategy:
 *   1. Read the bundled `videos.json` (generated at build time) so the page
 *      works without any backend.
 *   2. If `VITE_VIDEO_API` is configured, request the Cloudflare Worker in
 *      parallel and prefer its data. Either source can stand in for the other
 *      when it fails; the promise rejects only when both fail.
 */
export function loadChannelData(signal?: AbortSignal): Promise<ChannelData> {
  return fetchChannelData({
    staticUrl: `${import.meta.env.BASE_URL}videos.json`,
    liveUrl: (import.meta.env.VITE_VIDEO_API as string | undefined) || undefined,
    signal,
  });
}
