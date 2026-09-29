import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildCsp, renderNoscriptVideoList } from './shared/site-html.mjs';

// Base path: when deployed to GitHub Pages on a project repo, set
// `BASE_PATH=/<repo>/` in CI. Defaults to "/" for local dev / custom domains.
const base = process.env.BASE_PATH ?? '/';

// Content Security Policy, injected into the built index.html only.
// (Not applied in dev: @vitejs/plugin-react needs inline scripts there.)
function injectCsp(liveApiUrl: string | undefined): Plugin {
  const { csp, warning } = buildCsp(liveApiUrl);
  return {
    name: 'inject-csp',
    apply: 'build',
    buildStart() {
      if (warning) this.warn(warning);
    },
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

// Renders the build-time feed as a plain list inside <noscript>, so the
// archive is readable without JavaScript and visible to non-rendering crawlers.
// Skipped when public/videos.json doesn't exist (e.g. `build:ci`).
function injectNoscriptVideos(): Plugin {
  let publicDir = '';
  return {
    name: 'inject-noscript-videos',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    transformIndexHtml(html) {
      if (!publicDir) return html;
      let data: unknown;
      try {
        data = JSON.parse(readFileSync(resolve(publicDir, 'videos.json'), 'utf8'));
      } catch {
        return html;
      }
      const noscript = renderNoscriptVideoList(data);
      return noscript ? html.replace('<div id="root"></div>', `<div id="root"></div>\n${noscript}`) : html;
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv also picks up VITE_* variables from the shell (as set in CI).
  const liveApiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_VIDEO_API || undefined;

  return {
    base,
    plugins: [react(), tailwindcss(), injectCsp(liveApiUrl), injectNoscriptVideos()],
    build: {
      target: 'es2022',
      // Source maps aren't published; the source is on GitHub.
      sourcemap: false,
    },
    server: {
      port: 5173,
    },
  };
});
