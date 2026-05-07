import { useState, type ReactElement } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CONSENT_KEY = 'janimeister.consent.v1';

interface Consent {
  acknowledged: boolean;
  decidedAt: string;
}

export default function CookieNotice(): ReactElement | null {
  const [consent, setConsent] = useLocalStorage<Consent | null>(CONSENT_KEY, null);
  const [details, setDetails] = useState(false);

  if (consent?.acknowledged) return null;

  const acknowledge = () => {
    setConsent({ acknowledged: true, decidedAt: new Date().toISOString() });
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-title"
      className="fixed inset-x-2 bottom-2 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md"
    >
      <div className="frame-souls frame-souls-corners p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <p
          id="consent-title"
          className="font-display text-xs tracking-[0.35em] uppercase text-gold-bright"
        >
          ✦ A Note from the Bonfire ✦
        </p>
        <p className="mt-3 text-sm text-parchment/90 leading-relaxed">
          This site stores <strong className="text-gold-bright">one</strong> small entry in your
          browser&apos;s <code className="text-rune">localStorage</code> — solely to remember that
          you&apos;ve seen this notice. <span className="text-parchment-dim">No analytics. No
          tracking. No third-party cookies.</span>
        </p>
        {details && (
          <dl className="mt-3 space-y-2 text-xs text-parchment-dim">
            <div>
              <dt className="font-display tracking-[0.2em] uppercase text-gold/80">Key</dt>
              <dd className="font-mono">{CONSENT_KEY}</dd>
            </div>
            <div>
              <dt className="font-display tracking-[0.2em] uppercase text-gold/80">Stored</dt>
              <dd>Acknowledgement flag &amp; timestamp.</dd>
            </div>
            <div>
              <dt className="font-display tracking-[0.2em] uppercase text-gold/80">Embedded videos</dt>
              <dd>
                Thumbnails are loaded from i.ytimg.com. Following a video link
                opens YouTube, which has its own privacy policy.
              </dd>
            </div>
          </dl>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={acknowledge}
            data-testid="consent-accept"
            className="border border-gold bg-gold text-ash font-display text-xs tracking-[0.3em] uppercase px-4 py-2 hover:bg-gold-bright transition"
          >
            Understood
          </button>
          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            aria-expanded={details}
            className="font-display text-xs tracking-[0.3em] uppercase text-parchment-dim hover:text-gold-bright transition"
          >
            {details ? 'Hide details' : 'Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
