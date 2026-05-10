import type { ReactElement } from 'react';

export default function Hero(): ReactElement {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-[92vh] items-center justify-center px-4 pt-24 pb-12"
    >
      {/* Sigil glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      >
        <div className="absolute h-[55vmin] w-[55vmin] rounded-full bg-ember/20 blur-3xl animate-flicker" />
        <SigilSVG className="h-[80vmin] max-h-[820px] w-[80vmin] max-w-[820px] text-gold/15" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center animate-fade-up">
        <p className="font-display text-xs tracking-[0.2em] sm:tracking-[0.6em] text-gold-bright/80 mb-6">
          ✦ A TARNISHED&apos;S CHRONICLE ✦
        </p>

        <h1 className="heading-rune font-display text-4xl sm:text-7xl lg:text-8xl font-black leading-[0.95]">
          Janimeister
        </h1>

        <p className="mt-8 font-serif italic text-lg sm:text-xl text-parchment/85 max-w-2xl mx-auto leading-relaxed">
          A chronicle of fallen bosses across the lands of FromSoftware —
          captured, catalogued, and shared from a single bonfire.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#videos"
            className="group relative inline-flex items-center gap-2 border border-gold bg-ash-2/60 px-6 py-3 font-display text-xs tracking-[0.3em] uppercase text-gold-bright hover:bg-gold hover:text-ash transition-colors shadow-gold"
          >
            <span aria-hidden>▾</span>
            Enter the Archive
            <span aria-hidden>▾</span>
          </a>
          <a
            href="https://www.youtube.com/@janimeister"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 border border-blood/70 bg-blood/20 px-6 py-3 font-display text-xs tracking-[0.3em] uppercase text-parchment hover:bg-blood/60 transition-colors"
          >
            <YouTubeIcon className="h-4 w-4" /> Watch on YouTube
          </a>
        </div>

        <dl className="mt-14 grid grid-cols-3 gap-2 sm:gap-8 w-full max-w-xl mx-auto">
          {[
            { label: 'Realms', value: 'FromSoft' },
            { label: 'Format', value: 'Boss Kills' },
            { label: 'Status', value: 'Undying' },
          ].map((s) => (
            <div key={s.label} className="frame-souls frame-souls-corners px-2 py-3 sm:px-4 sm:py-4 min-w-0">
              <dt className="font-display text-[0.55rem] sm:text-xs tracking-[0.1em] sm:tracking-[0.25em] text-parchment-dim uppercase truncate">
                {s.label}
              </dt>
              <dd className="mt-1 font-display text-xs sm:text-lg text-gold-bright truncate">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SigilSVG({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="0.5">
      <circle cx="100" cy="100" r="95" />
      <circle cx="100" cy="100" r="78" strokeDasharray="2 4" />
      <circle cx="100" cy="100" r="55" />
      <path d="M100 18 L106 90 L172 100 L106 110 L100 182 L94 110 L28 100 L94 90 Z" />
      <g transform="translate(100 100)">
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1="-95"
            x2="0"
            y2="-78"
            transform={`rotate(${i * 30})`}
          />
        ))}
      </g>
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}
