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

    expect(screen.getByRole('status')).toHaveTextContent(/archives are silent/i);
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
