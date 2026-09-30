import { render, screen, act } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import VideoSection from '../VideoSection';
import type { ChannelData } from '../../types';

const mockData: ChannelData = {
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
    {
      id: 'vid2',
      title: 'Artorias of the Abyss',
      url: 'https://www.youtube.com/watch?v=vid2',
      thumbnail: 'https://i.ytimg.com/vi/vid2/hqdefault.jpg',
      publishedAt: '2024-04-15T12:00:00Z',
    },
    {
      id: 'vid3',
      title: 'Gwyn Lord of Cinder',
      url: 'https://www.youtube.com/watch?v=vid3',
      thumbnail: 'https://i.ytimg.com/vi/vid3/hqdefault.jpg',
      publishedAt: '2024-03-10T12:00:00Z',
    },
  ],
};

async function renderVideoSection(data: ChannelData = mockData) {
  const promise = Promise.resolve(data);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Loading...</div>}>
        <VideoSection channelPromise={promise} />
      </Suspense>
    );
  });
  return result;
}

describe('VideoSection', () => {
  const user = userEvent.setup();

  it('renders the section heading and video count', async () => {
    await renderVideoSection();
    expect(screen.getByText('The Archive')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders all video cards', async () => {
    await renderVideoSection();
    expect(screen.getByText('Radahn General of the Stars')).toBeInTheDocument();
    expect(screen.getByText('Artorias of the Abyss')).toBeInTheDocument();
    expect(screen.getByText('Gwyn Lord of Cinder')).toBeInTheDocument();
  });

  it('filters videos by search query', async () => {
    await renderVideoSection();

    const searchInput = screen.getByPlaceholderText(/seek a fallen foe/i);
    await user.type(searchInput, 'Artorias');

    expect(screen.getByText('Artorias of the Abyss')).toBeInTheDocument();
    expect(screen.queryByText('Radahn General of the Stars')).not.toBeInTheDocument();
    expect(screen.queryByText('Gwyn Lord of Cinder')).not.toBeInTheDocument();
  });

  it('shows empty state when no videos match search', async () => {
    await renderVideoSection();

    const searchInput = screen.getByPlaceholderText(/seek a fallen foe/i);
    await user.type(searchInput, 'Nonexistent Boss');

    expect(screen.getByText(/no entries match “nonexistent boss”\. the archives are silent/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No entries match “Nonexistent Boss”.');
  });

  it('announces the number of matching entries to screen readers', async () => {
    await renderVideoSection();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('');

    await user.type(screen.getByPlaceholderText(/seek a fallen foe/i), 'of the');
    expect(status).toHaveTextContent('2 of 3 entries match “of the”.');
  });

  it('ignores surrounding whitespace in the search query', async () => {
    await renderVideoSection();
    await user.type(screen.getByPlaceholderText(/seek a fallen foe/i), '  gwyn  ');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 entries match “gwyn”.');
  });

  it('shows an empty-archive message when the feed has no videos', async () => {
    await renderVideoSection({ ...mockData, videos: [] });
    expect(screen.getByText(/no chronicles yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no entries match/i)).not.toBeInTheDocument();
  });

  it('sorts videos with unparseable dates as the oldest', async () => {
    const withBadDate = {
      ...mockData,
      videos: [{ ...mockData.videos[0], id: 'bad', title: 'Undated Boss', publishedAt: 'garbage' }, ...mockData.videos],
    };
    await renderVideoSection(withBadDate);

    let items = screen.getAllByRole('listitem');
    expect(items[items.length - 1]).toHaveTextContent('Undated Boss');
    expect(items[0]).toHaveTextContent('Radahn General of the Stars');

    await user.selectOptions(screen.getByDisplayValue('Newest first'), 'oldest');
    items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Undated Boss');
    expect(items[1]).toHaveTextContent('Gwyn Lord of Cinder');
  });

  it('sorts videos by oldest first', async () => {
    await renderVideoSection();

    const sortSelect = screen.getByDisplayValue('Newest first');
    await user.selectOptions(sortSelect, 'oldest');

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Gwyn Lord of Cinder');
    expect(items[2]).toHaveTextContent('Radahn General of the Stars');
  });

  it('sorts videos alphabetically', async () => {
    await renderVideoSection();

    const sortSelect = screen.getByDisplayValue('Newest first');
    await user.selectOptions(sortSelect, 'alpha');

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Artorias of the Abyss');
    expect(items[1]).toHaveTextContent('Gwyn Lord of Cinder');
    expect(items[2]).toHaveTextContent('Radahn General of the Stars');
  });

  it('displays the fetched-at timestamp', async () => {
    await renderVideoSection();
    const times = screen.getAllByRole('time');
    const fetchedTime = times.find(el => el.getAttribute('dateTime') === mockData.fetchedAt);
    expect(fetchedTime).toBeInTheDocument();
  });
});
