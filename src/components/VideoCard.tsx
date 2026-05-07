import type { ReactElement } from 'react';
import type { Video } from '../types';

interface Props {
  video: Video;
  index: number;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function VideoCard({ video, index }: Props): ReactElement {
  // `hqdefault.jpg` is guaranteed to exist for every public YouTube video,
  // unlike `maxresdefault.jpg` which is missing for older uploads.
  const thumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  // Prefer eager-loading the first 3 tiles for LCP.
  const eager = index < 3;

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group frame-souls frame-souls-corners block overflow-hidden hover:shadow-ember transition-all duration-500 hover:-translate-y-1"
      aria-label={`Watch on YouTube: ${video.title}`}
    >
      <div className="relative aspect-video overflow-hidden bg-ash-3">
        <img
          src={thumb}
          alt=""
          width={480}
          height={360}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = `https://i.ytimg.com/vi/${video.id}/0.jpg`;
            }
          }}
        />
        {/* Vignette + play sigil */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ash via-ash/30 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/80 bg-ash/70 text-gold-bright shadow-ember">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </span>
        </div>
        <span
          aria-hidden
          className="absolute left-3 top-3 inline-flex items-center gap-1 border border-gold/40 bg-ash/70 px-2 py-0.5 font-display text-[0.6rem] tracking-[0.3em] uppercase text-gold-bright"
        >
          ✦ Vanquished
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display text-base text-parchment leading-snug line-clamp-2 group-hover:text-gold-bright transition-colors">
          {video.title}
        </h3>
        <p className="mt-3 flex items-center justify-between text-xs text-parchment-dim">
          <time dateTime={video.publishedAt}>{formatDate(video.publishedAt)}</time>
          <span className="font-display tracking-[0.25em] uppercase text-gold/70">
            Watch ▸
          </span>
        </p>
      </div>
    </a>
  );
}
