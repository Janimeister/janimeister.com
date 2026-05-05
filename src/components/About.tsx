import type { ReactElement } from 'react';
import { OrnamentDivider } from './Ornament';

export default function About(): ReactElement {
  return (
    <section id="about" className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
      <OrnamentDivider label="The Tarnished" />

      <div className="frame-souls frame-souls-corners relative px-6 py-10 sm:px-12 sm:py-14">
        <h2 className="heading-rune font-display text-3xl sm:text-4xl text-center">
          Who walks the lands?
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto sm:mx-0">
            <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border border-gold/60 p-1 shadow-gold">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-ember/40 via-blood/30 to-ash">
                <span className="font-display text-3xl sm:text-4xl text-gold-bright">JM</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-serif text-lg leading-relaxed text-parchment/90">
              I&apos;m <span className="text-gold-bright font-display tracking-wider">Janimeister</span>,
              chronicler of FromSoftware boss kills. From the gnarled spires of Stormveil to the
              flame-licked depths of Lothric, every entry here is a single attempt, a single fall,
              a single hard-won victory.
            </p>
            <p className="mt-4 font-serif text-base text-parchment/75">
              Drop by the channel for new chronicles — the bonfire is always lit.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {['Elden Ring', 'Dark Souls', 'Boss Kills', 'No Cuts'].map((tag) => (
                <span
                  key={tag}
                  className="border border-gold/40 px-3 py-1 text-xs font-display tracking-[0.25em] uppercase text-gold-bright/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
