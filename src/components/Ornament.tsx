import type { ReactElement } from 'react';

export function OrnamentDivider({ label }: { label: string }): ReactElement {
  return (
    <div className="ornament-divider my-10">
      <span className="ornament-line" aria-hidden />
      <span className="font-display text-[0.65rem] sm:text-xs tracking-[0.4em] text-gold-bright">
        ✦ {label} ✦
      </span>
      <span className="ornament-line" aria-hidden />
    </div>
  );
}
