import { use, useMemo, useState, useDeferredValue, type ReactElement } from 'react';
import type { ChannelData } from '../types';
import VideoCard from './VideoCard';

interface Props {
  channelPromise: Promise<ChannelData>;
}

type SortKey = 'newest' | 'oldest' | 'alpha';

/** Timestamp for sorting; unparseable dates sort as the oldest entries. */
function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export default function VideoSection({ channelPromise }: Props): ReactElement {
  // React 19 `use` — suspends the parent until resolved.
  const data = use(channelPromise);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const deferredQuery = useDeferredValue(query);

  const trimmedQuery = deferredQuery.trim();

  const filtered = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    const v = q
      ? data.videos.filter((video) => video.title.toLowerCase().includes(q))
      : data.videos.slice();
    v.sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      const t = timeOf(a.publishedAt) - timeOf(b.publishedAt);
      return sort === 'newest' ? -t : t;
    });
    return v;
  }, [data.videos, trimmedQuery, sort]);

  const fetchedAt = useMemo(() => {
    const date = new Date(data.fetchedAt);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }, [data.fetchedAt]);

  // Announced to screen readers as the result set changes. Kept mounted so
  // updates are reliably picked up by assistive technology.
  const resultsAnnouncement = !trimmedQuery
    ? ''
    : filtered.length === 0
      ? `No entries match “${trimmedQuery}”.`
      : `${filtered.length} of ${data.videos.length} entries match “${trimmedQuery}”.`;

  return (
    <div>
      <p role="status" aria-live="polite" className="sr-only">
        {resultsAnnouncement}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="heading-rune font-display text-3xl sm:text-4xl">
            The Archive
          </h2>
          <p className="mt-1 text-sm text-parchment-dim">
            <span className="font-display tracking-widest">{data.videos.length}</span> entries · last
            divined&nbsp;
            <time dateTime={data.fetchedAt}>{fetchedAt}</time>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative">
            <span className="sr-only">Search bosses</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Seek a fallen foe…"
              className="w-full sm:w-72 bg-ash-2 border border-gold/30 px-4 py-2 pr-9 font-serif text-parchment placeholder:text-parchment-dim/60 focus:border-gold focus:outline-none focus:shadow-gold transition"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold/70">⌕</span>
          </label>
          <label className="relative">
            <span className="sr-only">Sort entries</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none bg-ash-2 border border-gold/30 px-4 py-2 pr-9 font-serif text-parchment focus:border-gold focus:outline-none transition"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="alpha">A → Z</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold/70">▾</span>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="frame-souls frame-souls-corners py-12 text-center font-serif italic text-parchment-dim">
          {trimmedQuery ? (
            <>No entries match &ldquo;{trimmedQuery}&rdquo;. The archives are silent.</>
          ) : (
            <>No chronicles yet. The archives are silent.</>
          )}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v, i) => (
            <li
              key={v.id}
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              className="animate-fade-up"
            >
              <VideoCard video={v} index={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
