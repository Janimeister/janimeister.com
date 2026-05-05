# Janimeister — Tarnished Chronicles

A personal site for the [Janimeister](https://www.youtube.com/@janimeister) YouTube channel,
chronicling FromSoftware boss kills (Elden Ring, Dark Souls).

- ⚛️ React 19 (Suspense + `use()` + `useDeferredValue` + `lazy`)
- 🎨 Tailwind CSS v4 (CSS-first `@theme` config) — custom Souls-inspired palette, animated embers, runic ornaments
- ⚡ Vite 6 build, deploys to GitHub Pages via Actions
- ☁️ Optional Cloudflare Worker for live YouTube RSS proxy with edge caching
- 🍪 First-party cookie/localStorage notice (one key, no tracking)
- 🧪 Playwright e2e tests (desktop + mobile)
- ♿ Accessible: skip-link, ARIA labels, reduced-motion support, semantic landmarks

## Local development

```bash
npm install
npm run dev
```

The site fetches the latest 15 videos from the channel's public RSS feed at
build time and writes `public/videos.json`. To refresh manually:

```bash
npm run fetch:videos
```

## Live updates via Cloudflare Worker (optional)

```bash
cd worker
npx wrangler deploy
```

Then expose the deployed URL as a GitHub Actions repository **variable** named
`VITE_VIDEO_API` (e.g. `https://janimeister-feed.<account>.workers.dev`). The
site will instantly hydrate with the static `videos.json` and revalidate from
the worker.

## Deploy

Push to `main`. The `Deploy to GitHub Pages` workflow handles everything:

1. Computes correct base path (project page vs custom domain)
2. Runs the build-time RSS fetch
3. Uploads & deploys to Pages

The workflow also runs daily on a cron so new uploads appear without a commit.

## Tests

The project uses two layers of testing, both running in CI via GitHub Actions on
every push and pull request.

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
- **navigation.spec.ts** — nav links, sticky header, footer, external link safety
- **videos.spec.ts** — video card structure, sorting, filtering, lazy loading
- **visual.spec.ts** — error-free load, meta tags, responsive layout, fonts

### CI workflow

The `Tests` workflow (`.github/workflows/test.yml`) runs two parallel jobs:

| Job | What it does |
|-----|-------------|
| **unit** | Lint (`tsc`) + Jest unit tests |
| **e2e** | Playwright browser tests on Chromium |

Failed e2e runs upload the Playwright HTML report as an artifact for debugging.

## Privacy

The site stores a single `localStorage` key: `janimeister.consent.v1`,
containing `{ acknowledged: true, decidedAt: <ISO> }`. There is no analytics,
no tracking pixels, and no third-party cookies set by the site itself.
Embedded thumbnails are loaded from `i.ytimg.com`, and any video link opens
on YouTube under their privacy policy.
