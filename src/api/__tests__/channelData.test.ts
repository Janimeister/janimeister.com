import { fetchChannelData, parseChannelData } from '../channelData';

const video = {
  id: 'vid1',
  title: 'Radahn',
  url: 'https://www.youtube.com/watch?v=vid1',
  thumbnail: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
  publishedAt: '2024-05-01T12:00:00Z',
};

function feed(videos: unknown[] = [video], extra: Record<string, unknown> = {}) {
  return {
    channelId: 'UC123',
    channelTitle: 'Janimeister',
    channelUrl: 'https://www.youtube.com/@janimeister',
    fetchedAt: '2024-06-01T10:00:00Z',
    videos,
    ...extra,
  };
}

describe('parseChannelData', () => {
  it('accepts a well-formed feed unchanged', () => {
    expect(parseChannelData(feed())).toEqual(feed());
  });

  it.each([null, undefined, 'text', 42, [], {}, { videos: null }, { videos: {} }])(
    'rejects payloads that are not a feed (%p)',
    (payload) => {
      expect(parseChannelData(payload)).toBeNull();
    },
  );

  it('drops videos without an id or title', () => {
    const result = parseChannelData(feed([video, null, 'x', { id: 'a' }, { title: 'b' }, { id: ' ', title: 'c' }]));
    expect(result?.videos).toEqual([video]);
  });

  it('replaces non-https video links with the YouTube watch URL', () => {
    const result = parseChannelData(feed([{ ...video, url: 'javascript:alert(1)' }, { ...video, id: 'v 2', url: undefined }]));
    expect(result?.videos.map((v) => v.url)).toEqual([
      'https://www.youtube.com/watch?v=vid1',
      'https://www.youtube.com/watch?v=v%202',
    ]);
  });

  it('fills in missing optional fields', () => {
    const result = parseChannelData({ videos: [{ id: 'a', title: 'A', publishedAt: 5 }] });
    expect(result).toEqual({
      channelId: '',
      channelTitle: 'Janimeister',
      channelUrl: 'https://www.youtube.com/@janimeister',
      fetchedAt: '',
      videos: [
        {
          id: 'a',
          title: 'A',
          url: 'https://www.youtube.com/watch?v=a',
          thumbnail: '',
          publishedAt: '',
          description: undefined,
        },
      ],
    });
  });
});

describe('fetchChannelData', () => {
  const originalFetch = globalThis.fetch;
  let routes: Record<string, () => Promise<unknown>>;

  const ok = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body });
  const httpError = (status: number) => async () => ({ ok: false, status, json: async () => ({}) });
  const networkError = () => async () => {
    throw new TypeError('Failed to fetch');
  };

  beforeEach(() => {
    routes = {};
    globalThis.fetch = jest.fn((url: string) => {
      const route = routes[url];
      if (!route) throw new Error(`unexpected fetch ${url}`);
      return route();
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the static feed when no live feed is configured', async () => {
    routes['/videos.json'] = ok(feed());
    await expect(fetchChannelData({ staticUrl: '/videos.json' })).resolves.toEqual(feed());
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects when the static feed fails and there is no live feed', async () => {
    routes['/videos.json'] = httpError(500);
    await expect(fetchChannelData({ staticUrl: '/videos.json' })).rejects.toThrow('Feed HTTP 500');
  });

  it('rejects when the static feed is malformed', async () => {
    routes['/videos.json'] = ok({ videos: null });
    await expect(fetchChannelData({ staticUrl: '/videos.json' })).rejects.toThrow('Malformed feed');
  });

  it('prefers the live feed when it has videos', async () => {
    const live = feed([{ ...video, id: 'live' }]);
    routes['/videos.json'] = ok(feed());
    routes['https://live.test'] = ok(live);
    await expect(fetchChannelData({ staticUrl: '/videos.json', liveUrl: 'https://live.test' })).resolves.toEqual(live);
  });

  it.each([
    ['fails', httpError(502)],
    ['is unreachable', networkError()],
    ['is malformed', ok('nope')],
    ['has no videos', ok(feed([]))],
  ])('falls back to the static feed when the live feed %s', async (_, liveRoute) => {
    routes['/videos.json'] = ok(feed());
    routes['https://live.test'] = liveRoute;
    await expect(fetchChannelData({ staticUrl: '/videos.json', liveUrl: 'https://live.test' })).resolves.toEqual(feed());
  });

  it('falls back to the live feed when the static feed fails', async () => {
    const live = feed([{ ...video, id: 'live' }]);
    routes['/videos.json'] = httpError(404);
    routes['https://live.test'] = ok(live);
    await expect(fetchChannelData({ staticUrl: '/videos.json', liveUrl: 'https://live.test' })).resolves.toEqual(live);
  });

  it('uses an empty live feed rather than failing when the static feed is down', async () => {
    routes['/videos.json'] = networkError();
    routes['https://live.test'] = ok(feed([]));
    await expect(fetchChannelData({ staticUrl: '/videos.json', liveUrl: 'https://live.test' })).resolves.toEqual(feed([]));
  });

  it('rejects with the static error when both feeds fail', async () => {
    routes['/videos.json'] = httpError(500);
    routes['https://live.test'] = httpError(502);
    await expect(fetchChannelData({ staticUrl: '/videos.json', liveUrl: 'https://live.test' })).rejects.toThrow(
      'Feed HTTP 500 from /videos.json',
    );
  });

  it('requests the static feed with cache revalidation', async () => {
    routes['/videos.json'] = ok(feed());
    await fetchChannelData({ staticUrl: '/videos.json' });
    expect(globalThis.fetch).toHaveBeenCalledWith('/videos.json', expect.objectContaining({ cache: 'no-cache' }));
  });
});
