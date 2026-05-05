import type { ReactElement } from 'react';

/**
 * Decorative animated embers that drift up from the bottom of the page.
 * Pure CSS — generated once and reused. Pointer-events disabled so they
 * never interfere with interaction.
 */
const EMBERS = Array.from({ length: 22 }, (_, i) => {
  const left = (i * 53) % 100;
  const delay = (i * 0.7) % 9;
  const duration = 7 + ((i * 1.3) % 6);
  const drift = ((i % 5) - 2) * 30;
  const size = 2 + (i % 4);
  return { left, delay, duration, drift, size, key: i };
});

export default function EmberField(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {EMBERS.map((e) => (
        <span
          key={e.key}
          style={{
            left: `${e.left}%`,
            bottom: '-20px',
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            ['--drift' as string]: `${e.drift}px`,
          }}
          className="absolute rounded-full bg-ember-bright shadow-ember animate-ember-rise"
        />
      ))}
    </div>
  );
}
