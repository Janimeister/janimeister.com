# Janimeister — Tarnished Chronicles

A personal site for the [Janimeister](https://www.youtube.com/@janimeister) YouTube channel,
chronicling FromSoftware boss kills (Elden Ring, Dark Souls).

Live site: [janimeister.com](https://janimeister.com).

- ⚛️ React 19 (Suspense + `use()` + `useDeferredValue` + `lazy`)
- 🎨 Tailwind CSS v4 (CSS-first `@theme` config) — custom Souls-inspired palette, animated embers, runic ornaments
- ⚡ Vite 8 and TypeScript 6, deployed to GitHub Pages via Actions
- ☁️ Optional Cloudflare Worker for a live YouTube API/RSS feed with edge caching
- 🍪 First-party cookie/localStorage notice (one key, no tracking)
- 🧪 Playwright e2e tests (desktop + mobile)
- ♿ Accessible: skip-link, ARIA labels, reduced-motion support, semantic landmarks

## Prerequisites

- **Node.js 24** and npm, matching the GitHub Actions workflows. Use this version for the current toolchain rather than relying on the older minimum in `package.json`.

## Local development

```bash
git clone https://github.com/Janimeister/janimeister.com.git
cd janimeister.com
npm ci
npm run fetch:videos
npm run dev
```

Open `http://localhost:5173/`. `npm run dev` does **not** generate the video feed, so fetch it first on a fresh checkout. To develop without a YouTube request, replace the fetch command with `node scripts/copy-e2e-fixture.mjs` to use the checked-in test videos.

The fetch script writes the git-ignored `public/videos.json`. With `YT_API_KEY` set, it uses the YouTube Data API v3 (up to 200 videos); without a key, it uses the public RSS feed (up to 15 videos). It reads optional `YT_API_KEY` and `YT_CHANNEL_ID` values from a root `.env` file or the shell environment. The channel defaults to Janimeister; an override must be a canonical `UC…` channel ID when using the API.

To refresh the feed manually:

```bash
npm run fetch:videos
```

If fetching fails, an existing `public/videos.json` is retained. With no existing file, the command fails. An API error does not trigger an RSS retry.

## Build and preview

```bash
npm run build
npm run preview
```

`npm run build` automatically fetches videos through its `prebuild` hook, then type-checks and builds into `dist/`. Preview serves the result at `http://localhost:4173/`.

`npm run build:ci` skips the fetch and does not create feed data. `npm run build:e2e` copies the test fixture to `public/videos.json` before building; fetch again when you want real videos after an end-to-end test run.

## Live updates via Cloudflare Worker (optional)

Review `CHANNEL_ID` and `ALLOWED_ORIGIN` in [worker/wrangler.toml](worker/wrangler.toml). From the repository root, use the explicit configuration path:

```bash
npx wrangler dev --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

To enable the Data API instead of RSS for the Worker, set its secret separately:

```bash
npx wrangler secret put YT_API_KEY --config worker/wrangler.toml
```

Then expose the deployed URL as a GitHub Actions repository **variable** named
`VITE_VIDEO_API` (e.g. `https://janimeister-feed.<account>.workers.dev`). The
browser first reads the static `videos.json`, then attempts the Worker request before displaying the resolved feed. It uses the static data if the Worker fails or returns no videos. The Worker can use the Data API or RSS and caches responses at the edge for ten minutes.

For local use, set `VITE_VIDEO_API` in `.env` and allow `http://localhost:5173` in the Worker's comma-separated `ALLOWED_ORIGIN` list. `VITE_VIDEO_API` is a public URL bundled into the client; keep `YT_API_KEY` in the build environment or Worker secret.

## Deploy

Configure GitHub Pages to use **GitHub Actions** as its source, then push to `main` or manually run [Deploy to GitHub Pages](.github/workflows/deploy.yml). Optional repository configuration:

- **Secret** `YT_API_KEY`: enables the Data API during the production feed fetch.
- **Variable** `VITE_VIDEO_API`: enables the separately deployed live-feed Worker.

The workflow:

1. Runs the reusable test workflow and waits for all three jobs to pass.
2. Computes the base path from the presence of `CNAME` or `public/CNAME` (currently `/` for the custom domain).
3. Fetches videos and builds the production site.
4. Adds a `404.html` fallback, then uploads `dist/` and deploys it to Pages.

The workflow also runs daily at 05:17 UTC so new uploads appear without a commit. It does not deploy the optional Worker.

## Tests

The project uses two layers of testing. CI runs on pull requests and manual dispatch, and the deployment workflow calls the same tests for pushes to `main` and scheduled deployments.

### Unit tests (Jest + Testing Library)

Component-level tests using React Testing Library and Jest with jsdom:

```bash
npm test              # run all unit tests
npm test -- --watch  # watch mode during development
```

Tests live alongside their components in `src/components/__tests__/` and
`src/hooks/__tests__/`.

### End-to-end tests (Playwright)

Full browser tests covering navigation, video loading, accessibility, and
responsive behaviour:

```bash
npm run test:e2e:install   # one-time browser download
npm run test:e2e           # run all e2e tests (builds the site first)
```

E2E tests are in `tests/` and run against both Chromium desktop and mobile Chrome
viewports. The suite includes:

- **home.spec.ts** — core page rendering, search, cookie consent, mobile menu
- **accessibility.spec.ts** — axe-core WCAG audit, skip link, keyboard focus, reduced motion
- **navigation.spec.ts** — nav links, sticky header, footer, external link safety, third-party notices dialog
- **videos.spec.ts** — video card structure, sorting, filtering, lazy loading
- **visual.spec.ts** — error-free load, meta tags, responsive layout, fonts

### CI workflow

The `Tests` workflow (`.github/workflows/test.yml`) runs three parallel jobs:

| Job | What it does |
|-----|-------------|
| **build** | Type check (`tsc`) + Vite build (skips live YouTube fetch via `build:ci`) |
| **unit** | Type check (`npm run lint`, which runs `tsc`) + Jest unit tests |
| **e2e** | Playwright browser tests on Chromium (uses checked-in fixture data via `build:e2e`) |

Failed e2e runs upload the Playwright HTML report as an artifact for debugging.

## Privacy

The site stores a single `localStorage` key: `janimeister.consent.v1`,
containing `{ acknowledged: true, decidedAt: <ISO> }`. There is no analytics,
no tracking pixels, and no third-party cookies set by the site itself.
Embedded thumbnails are loaded from `i.ytimg.com`, and any video link opens
on YouTube under their privacy policy.
