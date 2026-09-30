// Build-time fetch of the YouTube channel feed.
//
// Generates `public/videos.json` so the site has guaranteed static fallback
// data even if the live Cloudflare Worker is unreachable. Runs as `prebuild`.
//
// Uses YouTube Data API v3 when YT_API_KEY is set (up to 200 videos).
// Falls back to the RSS feed (15 videos) when the key is absent.
//
// If the network is unavailable (e.g. offline local dev), keeps the previous
// file when one already exists and exits 0. Fails the build when the fetch
// fails and no previous file is present (e.g. fresh CI checkout).

import { writeFile, mkdir, access, constants as fsConstants } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchViaApi, fetchViaRss } from '../shared/youtube-feed.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHANNEL_ID = process.env.YT_CHANNEL_ID || 'UCvCde3OAobvTuLdeiCpFDGw';
const CHANNEL_TITLE = 'Janimeister';
const CHANNEL_URL = 'https://www.youtube.com/@janimeister';
const OUT = resolve(__dirname, '..', 'public', 'videos.json');
const USER_AGENT = 'janimeister-site-build/1.0';

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true });
  try {
    const apiKey = process.env.YT_API_KEY;
    let videos;
    if (apiKey) {
      console.log('Using YouTube Data API v3...');
      videos = await fetchViaApi(CHANNEL_ID, apiKey, { userAgent: USER_AGENT });
    } else {
      console.warn('⚠ YT_API_KEY not set; falling back to RSS feed (15 videos max).');
      videos = await fetchViaRss(CHANNEL_ID, { userAgent: USER_AGENT });
    }
    if (!videos.length) throw new Error('Feed returned zero entries');

    const data = {
      channelId: CHANNEL_ID,
      channelTitle: CHANNEL_TITLE,
      channelUrl: CHANNEL_URL,
      fetchedAt: new Date().toISOString(),
      videos,
    };
    await writeFile(OUT, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✔ Wrote ${videos.length} videos to ${OUT}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (await fileExists(OUT)) {
      console.warn(`⚠ Live fetch failed (${message}); keeping existing ${OUT}.`);
      return;
    }
    // No existing file to fall back to — fail the build so a deploy is never
    // published with an empty video list.
    throw err instanceof Error ? err : new Error(message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
