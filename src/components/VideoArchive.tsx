import { Suspense, lazy, useMemo, useState, type ReactElement } from 'react';
import type { ChannelData } from '../types';
import ErrorBoundary from './ErrorBoundary';

// Lazy-load the heaviest section so it streams in.
const VideoSection = lazy(() => import('./VideoSection'));

interface Props {
  load: () => Promise<ChannelData>;
}

/**
 * Loads the channel feed and renders the video grid. A failed load is
 * contained here with a retry option, so the rest of the page stays usable.
 */
export default function VideoArchive({ load }: Props): ReactElement {
  const [attempt, setAttempt] = useState(0);
  // Stable promise per attempt; `attempt` is a dependency so retrying refetches.
  const channelPromise = useMemo(() => {
    const promise = load();
    // The feed can reject before the lazy VideoSection chunk arrives to `use()`
    // it; mark it handled so the browser doesn't report an unhandled rejection.
    // The error still reaches the ErrorBoundary via `use()`.
    promise.catch(() => {});
    return promise;
  }, [load, attempt]);

  return (
    <ErrorBoundary
      key={attempt}
      fallback={<VideosError onRetry={() => setAttempt((n) => n + 1)} />}
    >
      <Suspense fallback={<VideosSkeleton />}>
        <VideoSection channelPromise={channelPromise} />
      </Suspense>
    </ErrorBoundary>
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

function VideosError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="frame-souls frame-souls-corners mt-10 px-6 py-12 text-center"
    >
      <p className="font-serif italic text-lg text-parchment/85">
        The archive could not be summoned.
      </p>
      <p className="mt-2 text-sm text-parchment-dim">
        The chronicles are still on the channel while the bonfire rekindles.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="border border-gold bg-ash-2/60 px-5 py-2 font-display text-xs tracking-[0.3em] uppercase text-gold-bright hover:bg-gold hover:text-ash transition-colors"
        >
          Try again
        </button>
        <a
          href="https://www.youtube.com/@janimeister/videos"
          target="_blank"
          rel="noreferrer noopener"
          className="border border-blood/70 bg-blood/20 px-5 py-2 font-display text-xs tracking-[0.3em] uppercase text-parchment hover:bg-blood/60 transition-colors"
        >
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
