// Build-time fetch of the YouTube channel feed.
//
// Generates `public/videos.json` so the site has guaranteed static fallback
// data even if the live Cloudflare Worker is unreachable. Runs as `prebuild`.
//
// If the network is unavailable (e.g. offline CI), keeps the previous file
// when present and exits 0; only fails if there is no fallback at all.

import { writeFile, mkdir, access, constants as fsConstants } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHANNEL_ID = process.env.YT_CHANNEL_ID || 'UCvCde3OAobvTuLdeiCpFDGw';
const CHANNEL_TITLE = 'Janimeister';
const CHANNEL_URL = 'https://www.youtube.com/@janimeister';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const OUT = resolve(__dirname, '..', 'public', 'videos.json');

/**
 * Minimal, dependency-free XML feed parser specialised for YouTube's feed.
 * Pulls each <entry> block then extracts the fields we care about.
 */
function parseFeed(xml) {
  const videos = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const id = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = decode(pick(block, /<title>([\s\S]*?)<\/title>/));
    const publishedAt = pick(block, /<published>([^<]+)<\/published>/);
    const url = pick(block, /<link rel="alternate" href="([^"]+)"/);
    const description = decode(pick(block, /<media:description>([\s\S]*?)<\/media:description>/));
    if (!id || !title) continue;
    videos.push({
      id,
      title: title.trim(),
      url: url || `https://www.youtube.com/watch?v=${id}`,
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

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

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
    const res = await fetch(FEED_URL, {
      headers: { 'user-agent': 'janimeister-site-build/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const videos = parseFeed(xml);
    if (!videos.length) throw new Error('Feed parsed to zero entries');

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
    if (await fileExists(OUT)) {
      console.warn(`⚠ Live fetch failed (${err.message}); keeping existing ${OUT}.`);
      return;
    }
    // Last-ditch fallback so the build still succeeds.
    const data = {
      channelId: CHANNEL_ID,
      channelTitle: CHANNEL_TITLE,
      channelUrl: CHANNEL_URL,
      fetchedAt: new Date().toISOString(),
      videos: [],
    };
    await writeFile(OUT, JSON.stringify(data, null, 2), 'utf8');
    console.warn(`⚠ Live fetch failed (${err.message}); wrote empty placeholder.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
