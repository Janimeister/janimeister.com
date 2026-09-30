import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, parseFeed, fetchViaApi, fetchViaRss } from '../youtube-feed.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function entry({ id = 'abc123', title = 'Malenia', published = '2024-03-15T10:00:00+00:00', description = '' } = {}) {
  return `<entry>
    <yt:videoId>${id}</yt:videoId>
    <title>${title}</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/>
    <published>${published}</published>
    <media:group><media:description>${description}</media:description></media:group>
  </entry>`;
}

describe('decodeEntities', () => {
  test('decodes the predefined XML entities', () => {
    assert.equal(decodeEntities('&lt;b&gt; &quot;Tom&quot; &amp; Jerry&apos;s &#39;x&#39;'), `<b> "Tom" & Jerry's 'x'`);
  });

  test('decodes an escaped entity only once', () => {
    assert.equal(decodeEntities('&amp;lt;'), '&lt;');
    assert.equal(decodeEntities('&amp;amp;'), '&amp;');
  });

  test('decodes decimal and hex character references', () => {
    assert.equal(decodeEntities('Let&#8217;s go &#x2014; &#X1F525;'), 'Let’s go — 🔥');
  });

  test('keeps unknown and out-of-range references verbatim', () => {
    assert.equal(decodeEntities('&nbsp; &#99999999;'), '&nbsp; &#99999999;');
  });

  test('unwraps CDATA without decoding its contents', () => {
    assert.equal(decodeEntities('<![CDATA[Fish &amp; Chips]]> &amp;'), 'Fish &amp; Chips &');
  });
});

describe('parseFeed', () => {
  test('extracts videos from feed entries', () => {
    const videos = parseFeed(`<feed>${entry({ description: 'One &amp; done' })}${entry({ id: 'def456', title: 'Radahn' })}</feed>`);
    assert.equal(videos.length, 2);
    assert.deepEqual(videos[0], {
      id: 'abc123',
      title: 'Malenia',
      url: 'https://www.youtube.com/watch?v=abc123',
      thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      publishedAt: '2024-03-15T10:00:00+00:00',
      description: 'One & done',
    });
    assert.equal(videos[1].title, 'Radahn');
  });

  test('decodes titles once', () => {
    const [video] = parseFeed(entry({ title: 'Gael &amp;amp; Friede &amp; &lt;3' }));
    assert.equal(video.title, 'Gael &amp; Friede & <3');
  });

  test('skips entries without an id or title', () => {
    assert.deepEqual(parseFeed(entry({ id: '' }) + entry({ title: '' })), []);
  });

  test('truncates long descriptions to 500 characters', () => {
    const [video] = parseFeed(entry({ description: 'x'.repeat(800) }));
    assert.equal(video.description.length, 500);
  });
});

describe('fetchViaApi', () => {
  test('rejects channel handles before making a request', async () => {
    globalThis.fetch = mock.fn();
    await assert.rejects(fetchViaApi('@janimeister', 'key', { userAgent: 'test' }), /starting with "UC"/);
    assert.equal(globalThis.fetch.mock.callCount(), 0);
  });

  test('pages through the uploads playlist', async () => {
    const item = (id) => ({
      snippet: {
        publishedAt: '2024-01-01T00:00:00Z',
        title: ` ${id} title `,
        description: '',
        resourceId: { videoId: id },
      },
      contentDetails: { videoPublishedAt: '2023-12-31T00:00:00Z' },
    });
    const pages = [
      { items: [item('a')], nextPageToken: 'p2' },
      { items: [item('b')] },
    ];
    globalThis.fetch = mock.fn(async () => Response.json(pages.shift()));

    const videos = await fetchViaApi('UCabc', 'secret', { userAgent: 'test' });

    assert.deepEqual(videos.map((v) => v.id), ['a', 'b']);
    assert.equal(videos[0].title, 'a title');
    assert.equal(videos[0].publishedAt, '2023-12-31T00:00:00Z');
    assert.equal(videos[0].thumbnail, 'https://i.ytimg.com/vi/a/hqdefault.jpg');
    const [firstUrl] = globalThis.fetch.mock.calls[0].arguments;
    assert.match(firstUrl, /playlistId=UUabc/);
    const [secondUrl] = globalThis.fetch.mock.calls[1].arguments;
    assert.match(secondUrl, /pageToken=p2/);
  });

  test('throws on HTTP errors', async () => {
    globalThis.fetch = mock.fn(async () => new Response('quota', { status: 403 }));
    await assert.rejects(fetchViaApi('UCabc', 'secret', { userAgent: 'test' }), /HTTP 403/);
  });
});

describe('fetchViaRss', () => {
  test('merges extra init options and sets the user agent', async () => {
    globalThis.fetch = mock.fn(async () => new Response(entry()));
    const videos = await fetchViaRss('UCabc', { userAgent: 'ua/1.0', init: { cf: { cacheTtl: 600 } } });
    assert.equal(videos.length, 1);
    const [url, init] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://www.youtube.com/feeds/videos.xml?channel_id=UCabc');
    assert.deepEqual(init.cf, { cacheTtl: 600 });
    assert.equal(init.headers['user-agent'], 'ua/1.0');
    assert.ok(init.signal instanceof AbortSignal);
  });

  test('throws on HTTP errors', async () => {
    globalThis.fetch = mock.fn(async () => new Response('', { status: 500 }));
    await assert.rejects(fetchViaRss('UCabc', { userAgent: 'test' }), /RSS feed HTTP 500/);
  });
});
