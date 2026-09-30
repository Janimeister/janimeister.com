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

- **Node.js 24** and npm, matching the GitHub Actions workflows and the `engines` field in `package.json`.

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
browser requests the static `videos.json` and the Worker in parallel and prefers the Worker's data. It uses the static data if the Worker fails or returns no videos, and the Worker's data if the static file fails. If neither loads, the video section shows a retry button and a link to the channel while the rest of the page stays usable. The Worker can use the Data API or RSS and caches successful responses at the edge for ten minutes; error responses are sent with `Cache-Control: no-store`.

The build adds the Worker's origin to the page's Content Security Policy (`connect-src`), so the site can only connect to itself and that origin.

For local use, set `VITE_VIDEO_API` in `.env` and allow `http://localhost:5173` in the Worker's comma-separated `ALLOWED_ORIGIN` list. `VITE_VIDEO_API` is a public URL bundled into the client; keep `YT_API_KEY` in the build environment or Worker secret.

## Deploy

Configure GitHub Pages to use **GitHub Actions** as its source, then push to `main` or manually run [Deploy to GitHub Pages](.github/workflows/deploy.yml). Optional repository configuration:

- **Secret** `YT_API_KEY`: enables the Data API during the production feed fetch.
- **Variable** `VITE_VIDEO_API`: enables the separately deployed live-feed Worker.

The workflow:

1. Runs the reusable test workflow and waits for all three jobs to pass.
2. Computes the base path from the presence of `public/CNAME` (currently `/` for the custom domain).
3. Fetches videos and builds the production site. The build also renders the video list into a `<noscript>` block, so it can be read without JavaScript.
4. Adds a `404.html` fallback, then uploads `dist/` and deploys it to Pages.

The workflow also runs daily at 05:17 UTC so new uploads appear without a commit. It does not deploy the optional Worker.

## Tests

The project uses three layers of testing. CI runs on pull requests and manual dispatch, and the deployment workflow calls the same tests for pushes to `main` and scheduled deployments.

### Unit tests (Jest + Testing Library)

Component-level tests using React Testing Library and Jest with jsdom:

```bash
npm test              # run all unit tests
npm test -- --watch  # watch mode during development
```

Tests live alongside their code in `src/components/__tests__/`,
`src/hooks/__tests__/` and `src/api/__tests__/`.

### Node tests (shared build helpers + Worker)

The YouTube feed fetching and parsing code in `shared/` is used by both the build script and the Worker. It is tested together with the Worker and the build-time HTML helpers using Node's built-in test runner (the Worker's TypeScript runs through Node's type stripping):

```bash
npm run test:node
```

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
- **resilience.spec.ts** — feed failure fallback and retry, invalid dates, `<noscript>` fallback, CSP

### CI workflow

The `Tests` workflow (`.github/workflows/test.yml`) runs three parallel jobs:

| Job | What it does |
|-----|-------------|
| **build** | Type check (`tsc`) + Vite build (skips live YouTube fetch via `build:ci`) |
| **unit** | Jest unit tests and Node tests for `shared/` and the Worker (type checking is handled by the build job) |
| **e2e** | Playwright browser tests on Chromium (uses checked-in fixture data via `build:e2e`) |

CI uses Node.js 24 and installs the exact npm version declared in `package.json` (`npm@11.19.0`). Actions are pinned to reviewed commit SHAs and updated through Dependabot. Playwright rejects focused (`test.only`) tests in CI and uploads HTML reports for every completed, non-cancelled run, including successful retries.

## Privacy

The site stores a single `localStorage` key: `janimeister.consent.v1`,
containing `{ acknowledged: true, decidedAt: <ISO> }`. There is no analytics,
no tracking pixels, and no third-party cookies set by the site itself.
Embedded thumbnails are loaded from `i.ytimg.com`, and any video link opens
on YouTube under their privacy policy.
