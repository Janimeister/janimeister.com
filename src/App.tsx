import type { ReactElement } from 'react';
import { loadChannelData } from './api/videos';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Footer from './components/Footer';
import EmberField from './components/EmberField';
import CookieNotice from './components/CookieNotice';
import ThirdPartyNotices from './components/ThirdPartyNotices';
import VideoArchive from './components/VideoArchive';
import { OrnamentDivider } from './components/Ornament';

export default function App(): ReactElement {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <EmberField />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-gold focus:px-3 focus:py-1 focus:text-ash"
      >
        Skip to main content
      </a>

      <Nav />

      {/* tabIndex lets the skip link move keyboard focus, not just scroll. */}
      <main id="main" tabIndex={-1} className="relative z-10 focus:outline-none">
        <Hero />

        <section id="videos" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-20">
          <OrnamentDivider label="Chronicle of Fallen Bosses" />
          <VideoArchive load={loadChannelData} />
        </section>

        <About />
      </main>

      <Footer />
      <CookieNotice />
      <ThirdPartyNotices />
    </div>
  );
}
