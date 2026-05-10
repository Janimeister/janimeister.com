// Copies the checked-in e2e fixture to public/videos.json so that
// `build:e2e` (used by Playwright's webServer) doesn't need a live
// network connection to YouTube.
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '..', 'tests', 'fixtures', 'videos.json');
const dest = resolve(__dirname, '..', 'public', 'videos.json');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`✔ Copied e2e fixture → ${dest}`);
