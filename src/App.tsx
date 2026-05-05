import { Suspense, lazy, useMemo, type ReactElement } from 'react';
import { loadChannelData } from './api/videos';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Footer from './components/Footer';
import EmberField from './components/EmberField';
import CookieNotice from './components/CookieNotice';
import { OrnamentDivider } from './components/Ornament';

// Lazy-load the heaviest section so it streams in.
const VideoSection = lazy(() => import('./components/VideoSection'));

export default function App(): ReactElement {
  // Stable promise — created once per mount.
  const channelPromise = useMemo(() => loadChannelData(), []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <EmberField />
      <a
        href="#videos"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-gold focus:px-3 focus:py-1 focus:text-ash"
      >
        Skip to videos
      </a>

      <Nav />

      <main className="relative z-10">
        <Hero />

        <section id="videos" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-20">
          <OrnamentDivider label="Chronicle of Fallen Bosses" />
          <Suspense fallback={<VideosSkeleton />}>
            <VideoSection channelPromise={channelPromise} />
          </Suspense>
        </section>

        <About />
      </main>

      <Footer />
      <CookieNotice />
    </div>
  );
}

function VideosSkeleton(): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Summoning chronicles"
      className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="frame-souls frame-souls-corners aspect-video animate-pulse rounded-sm"
        />
      ))}
    </div>
  );
}
