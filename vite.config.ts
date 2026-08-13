import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Base path: when deployed to GitHub Pages on a project repo, set
// `BASE_PATH=/<repo>/` in CI. Defaults to "/" for local dev / custom domains.
const base = process.env.BASE_PATH ?? '/';

// Content Security Policy, injected into the built index.html only.
// (Not applied in dev: @vitejs/plugin-react needs inline scripts there.)
// - img-src allows data: (inline noise texture) and i.ytimg.com (thumbnails)
// - style-src 'unsafe-inline' is required for React inline style attributes
// - connect-src https: allows the optional live-feed Cloudflare Worker
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "font-src 'self'",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function injectCsp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), injectCsp()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
