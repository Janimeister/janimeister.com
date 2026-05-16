import { render, screen, fireEvent, waitFor } from '../../test/test-utils';
import ThirdPartyNotices, { markdownToHtml, NOTICES_HASH } from '../ThirdPartyNotices';

describe('markdownToHtml', () => {
  it('converts headings', () => {
    expect(markdownToHtml('# Title')).toContain('<h1>Title</h1>');
    expect(markdownToHtml('## Section')).toContain('<h2>Section</h2>');
    expect(markdownToHtml('### Sub')).toContain('<h3>Sub</h3>');
  });

  it('converts bold text', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts links', () => {
    const result = markdownToHtml('[React](https://react.dev)');
    expect(result).toContain('<a href="https://react.dev"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('>React</a>');
  });

  it('converts horizontal rules', () => {
    expect(markdownToHtml('---')).toContain('<hr />');
    expect(markdownToHtml('-----')).toContain('<hr />');
  });

  it('converts fenced code blocks', () => {
    const md = '```\nconst x = 1;\n```';
    const result = markdownToHtml(md);
    expect(result).toContain('<pre><code>');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('</code></pre>');
  });

  it('escapes HTML inside code blocks', () => {
    const md = '```\n<div>test</div>\n```';
    const result = markdownToHtml(md);
    expect(result).toContain('&lt;div&gt;');
  });

  it('passes through HTML details/summary tags', () => {
    const md = '<details>\n<summary>Click</summary>\nContent\n</details>';
    const result = markdownToHtml(md);
    expect(result).toContain('<details>');
    expect(result).toContain('<summary>Click</summary>');
    expect(result).toContain('</details>');
  });

  it('sanitizes summary content and strips details/summary attributes', () => {
    const md = '<details class="evil">\n<summary><script>alert(1)</script></summary>\n</details>';
    const result = markdownToHtml(md);
    expect(result).toContain('<details>');
    expect(result).not.toContain('class="evil"');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes quotes in link URLs', () => {
    const result = markdownToHtml('[link](https://example.com/?a="b")');
    expect(result).not.toContain('"b"');
    expect(result).toContain('&quot;b&quot;');
  });

  it('wraps regular text in paragraphs', () => {
    const result = markdownToHtml('Hello world');
    expect(result).toContain('<p>');
    expect(result).toContain('Hello world');
    expect(result).toContain('</p>');
  });

  it('converts inline code', () => {
    expect(markdownToHtml('Use `npm install`')).toContain('<code>npm install</code>');
  });
});

describe('NOTICES_HASH', () => {
  it('is #third-party-notices', () => {
    expect(NOTICES_HASH).toBe('#third-party-notices');
  });
});

describe('ThirdPartyNotices', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
    document.body.style.overflow = '';
  });

  it('does not render when hash does not match', () => {
    render(<ThirdPartyNotices />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when hash matches', async () => {
    window.location.hash = NOTICES_HASH;
    render(<ThirdPartyNotices />);
    expect(screen.getByRole('dialog', { name: /third party notices/i })).toBeInTheDocument();
    // Wait for async content load to settle
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('closes when close button is clicked', async () => {
    window.location.hash = NOTICES_HASH;
    render(<ThirdPartyNotices />);
    // Wait for content to load before interacting
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/close third party notices/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    window.location.hash = NOTICES_HASH;
    render(<ThirdPartyNotices />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks body scroll when open', async () => {
    window.location.hash = NOTICES_HASH;
    render(<ThirdPartyNotices />);
    expect(document.body.style.overflow).toBe('hidden');
    // Wait for content load to settle
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('responds to hashchange event', async () => {
    render(<ThirdPartyNotices />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    window.location.hash = NOTICES_HASH;
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Wait for async content load to settle
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });
});
