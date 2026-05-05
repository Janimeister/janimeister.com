import { useEffect, useState, type ReactElement } from 'react';

const links = [
  { href: '#home', label: 'Bonfire' },
  { href: '#videos', label: 'Chronicles' },
  { href: '#about', label: 'The Tarnished' },
];

export default function Nav(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-30 transition-all duration-500',
        scrolled
          ? 'backdrop-blur-md bg-ash/80 border-b border-gold/25 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <a
          href="#home"
          className="font-display tracking-[0.3em] text-gold-bright hover:text-parchment transition-colors text-sm sm:text-base"
        >
          ✶ JANIMEISTER ✶
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-display text-xs tracking-[0.25em] uppercase text-parchment-dim hover:text-gold-bright transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://www.youtube.com/@janimeister"
              target="_blank"
              rel="noreferrer noopener"
              className="font-display text-xs tracking-[0.25em] uppercase border border-gold/60 text-gold-bright px-4 py-2 hover:bg-gold hover:text-ash transition-colors"
            >
              Subscribe
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="md:hidden text-gold-bright p-2"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-gold/20 bg-ash/95 backdrop-blur">
          <ul className="flex flex-col px-4 py-4 gap-3">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  onClick={() => setOpen(false)}
                  href={l.href}
                  className="block font-display text-sm tracking-[0.25em] uppercase text-parchment-dim hover:text-gold-bright"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="https://www.youtube.com/@janimeister"
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setOpen(false)}
                className="inline-block font-display text-sm tracking-[0.25em] uppercase border border-gold/60 text-gold-bright px-4 py-2"
              >
                Subscribe on YouTube
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
