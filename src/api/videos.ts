import type { ChannelData } from '../types';

/**
 * Fetches the channel feed.
 *
 * Strategy:
 *   1. Always read the bundled `videos.json` (generated at build time) so the
 *      first paint is instant and the page works without any backend.
 *   2. If `VITE_VIDEO_API` is configured, attempt a live refresh from the
 *      Cloudflare Worker. On any failure we silently fall back to the static
 *      data.
 */
export async function loadChannelData(signal?: AbortSignal): Promise<ChannelData> {
  const baseUrl = import.meta.env.BASE_URL;
  const staticUrl = `${baseUrl}videos.json`;
  const liveUrl = import.meta.env.VITE_VIDEO_API as string | undefined;

  const staticData = await fetch(staticUrl, { signal, cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`Static feed HTTP ${r.status}`);
      return r.json() as Promise<ChannelData>;
    });

  if (!liveUrl) return staticData;

  try {
    const live = await fetch(liveUrl, { signal });
    if (!live.ok) return staticData;
    const json = (await live.json()) as ChannelData;
    if (!json?.videos?.length) return staticData;
    return json;
  } catch {
    return staticData;
  }
}
