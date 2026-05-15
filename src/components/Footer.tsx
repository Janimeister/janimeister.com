import type { ReactElement } from 'react';
import { NOTICES_HASH } from './ThirdPartyNotices';

export default function Footer(): ReactElement {
  return (
    <footer className="relative z-10 border-t border-gold/15 bg-ash/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="font-display text-xs tracking-[0.3em] uppercase text-parchment-dim">
          ✶ Praise the Sun · {new Date().getFullYear()} ✶
        </p>
        <nav aria-label="Footer" className="flex gap-6 text-xs">
          <a
            href="https://www.youtube.com/@janimeister"
            target="_blank"
            rel="noreferrer noopener"
            className="font-display tracking-[0.25em] uppercase text-parchment-dim hover:text-gold-bright transition"
          >
            YouTube
          </a>
          <a
            href="#about"
            className="font-display tracking-[0.25em] uppercase text-parchment-dim hover:text-gold-bright transition"
          >
            About
          </a>
          <a
            href={NOTICES_HASH}
            className="font-display tracking-[0.25em] uppercase text-parchment-dim hover:text-gold-bright transition"
          >
            Third Party Notices
          </a>
        </nav>
      </div>
    </footer>
  );
}
