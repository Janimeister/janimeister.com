import { render, screen, act } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import VideoArchive from '../VideoArchive';
import type { ChannelData } from '../../types';

const data: ChannelData = {
  channelId: 'UC123',
  channelTitle: 'Janimeister',
  channelUrl: 'https://www.youtube.com/@janimeister',
  fetchedAt: '2024-06-01T10:00:00Z',
  videos: [
    {
      id: 'vid1',
      title: 'Radahn General of the Stars',
      url: 'https://www.youtube.com/watch?v=vid1',
      thumbnail: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
      publishedAt: '2024-05-01T12:00:00Z',
    },
  ],
};

async function renderArchive(load: () => Promise<ChannelData>) {
  await act(async () => {
    render(<VideoArchive load={load} />);
  });
}

describe('VideoArchive', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // React and the error boundary log caught errors; keep test output clean.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('shows a loading skeleton while the feed is pending', async () => {
    await renderArchive(() => new Promise(() => {}));
    expect(screen.getByRole('status', { name: /summoning chronicles/i })).toBeInTheDocument();
  });

  it('renders the videos once the feed loads', async () => {
    await renderArchive(() => Promise.resolve(data));
    expect(await screen.findByText('Radahn General of the Stars')).toBeInTheDocument();
  });

  it('shows a contained error with a YouTube link when the feed fails', async () => {
    await renderArchive(() => Promise.reject(new Error('Feed HTTP 500')));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/archive could not be summoned/i);
    const link = screen.getByRole('link', { name: /watch on youtube/i });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/@janimeister/videos');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('retries the load when "Try again" is pressed', async () => {
    const load = jest
      .fn<Promise<ChannelData>, []>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(data);
    await renderArchive(load);

    const retry = await screen.findByRole('button', { name: /try again/i });
    // act() flushes the re-render React schedules once the new promise settles.
    await act(async () => {
      await userEvent.click(retry);
    });

    expect(await screen.findByText('Radahn General of the Stars')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
