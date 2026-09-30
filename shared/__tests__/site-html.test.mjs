import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsp, escapeHtml, renderNoscriptVideoList } from '../site-html.mjs';

function directive(csp, name) {
  return csp.split('; ').find((d) => d.startsWith(`${name} `));
}

describe('buildCsp', () => {
  test('only allows same-origin connections without a live feed', () => {
    const { csp, warning } = buildCsp(undefined);
    assert.equal(directive(csp, 'connect-src'), "connect-src 'self'");
    assert.equal(warning, undefined);
  });

  test('adds just the origin of the live feed', () => {
    const { csp } = buildCsp('https://janimeister-feed.example.workers.dev/videos?x=1');
    assert.equal(directive(csp, 'connect-src'), "connect-src 'self' https://janimeister-feed.example.workers.dev");
  });

  test('warns and stays locked down for invalid URLs', () => {
    for (const bad of ['not a url', 'javascript:alert(1)']) {
      const { csp, warning } = buildCsp(bad);
      assert.equal(directive(csp, 'connect-src'), "connect-src 'self'");
      assert.match(warning, /not a valid http\(s\) URL/);
    }
  });

  test('keeps the other directives strict', () => {
    const { csp } = buildCsp(undefined);
    assert.equal(directive(csp, 'script-src'), "script-src 'self'");
    assert.equal(directive(csp, 'object-src'), "object-src 'none'");
    assert.equal(directive(csp, 'img-src'), "img-src 'self' data: https://i.ytimg.com");
  });
});

describe('escapeHtml', () => {
  test('escapes markup-significant characters', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('renderNoscriptVideoList', () => {
  const video = {
    id: 'a',
    title: 'Malenia',
    url: 'https://www.youtube.com/watch?v=a',
    publishedAt: '2024-03-15T10:00:00.000Z',
  };

  test('renders a linked list inside <noscript>', () => {
    const html = renderNoscriptVideoList({ videos: [video] });
    assert.match(html, /^<noscript>/);
    assert.match(html, /<\/noscript>$/);
    assert.match(html, /<li><a href="https:\/\/www\.youtube\.com\/watch\?v=a">Malenia<\/a> <time datetime="2024-03-15T10:00:00.000Z">Mar 15, 2024<\/time><\/li>/);
  });

  test('escapes titles and URLs', () => {
    const html = renderNoscriptVideoList({
      videos: [{ ...video, title: '</noscript><script>alert(1)</script>', url: 'https://x.test/?a="b"&c' }],
    });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;/noscript&gt;&lt;script&gt;'));
    assert.ok(html.includes('href="https://x.test/?a=&quot;b&quot;&amp;c"'));
  });

  test('drops non-https links and malformed entries', () => {
    const html = renderNoscriptVideoList({
      videos: [{ ...video, url: 'javascript:alert(1)' }, { id: 'b' }, null, video],
    });
    assert.equal(html.match(/<li>/g).length, 1);
    assert.ok(!html.includes('javascript:'));
  });

  test('omits the date when it is unparseable', () => {
    const html = renderNoscriptVideoList({ videos: [{ ...video, publishedAt: 'nope' }] });
    assert.ok(!html.includes('<time'));
  });

  test('returns an empty string when there is nothing to render', () => {
    assert.equal(renderNoscriptVideoList({ videos: [] }), '');
    assert.equal(renderNoscriptVideoList(null), '');
    assert.equal(renderNoscriptVideoList({ videos: 'nope' }), '');
  });
});
