import { use, useMemo, useState, useDeferredValue, type ReactElement } from 'react';
import type { ChannelData } from '../types';
import VideoCard from './VideoCard';

interface Props {
  channelPromise: Promise<ChannelData>;
}

type SortKey = 'newest' | 'oldest' | 'alpha';

export default function VideoSection({ channelPromise }: Props): ReactElement {
  // React 19 `use` — suspends the parent until resolved.
  const data = use(channelPromise);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let v = q
      ? data.videos.filter((video) => video.title.toLowerCase().includes(q))
      : data.videos.slice();
    v.sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title);
      const t = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return sort === 'newest' ? -t : t;
    });
    return v;
  }, [data.videos, deferredQuery, sort]);

  const fetchedAt = useMemo(() => {
    try {
      return new Date(data.fetchedAt).toLocaleString();
    } catch {
      return '—';
    }
  }, [data.fetchedAt]);

  return (
    <div>
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
        <p
          role="status"
          className="frame-souls frame-souls-corners py-12 text-center font-serif italic text-parchment-dim"
        >
          No entries match &ldquo;{query}&rdquo;. The archives are silent.
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
