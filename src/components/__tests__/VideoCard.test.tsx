import { render, screen } from '../../test/test-utils';
import VideoCard from '../VideoCard';
import type { Video } from '../../types';

const mockVideo: Video = {
  id: 'abc123',
  title: 'Malenia Blade of Miquella - No Hit',
  url: 'https://www.youtube.com/watch?v=abc123',
  thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
  publishedAt: '2024-03-15T12:00:00Z',
};

describe('VideoCard', () => {
  it('renders the video title', () => {
    render(<VideoCard video={mockVideo} index={0} />);
    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
  });

  it('renders a link to the video', () => {
    render(<VideoCard video={mockVideo} index={0} />);
    const link = screen.getByRole('link', { name: new RegExp(mockVideo.title) });
    expect(link).toHaveAttribute('href', mockVideo.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('renders the thumbnail image with correct src', () => {
    const { container } = render(<VideoCard video={mockVideo} index={0} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain(`/vi/${mockVideo.id}/hqdefault.jpg`);
  });

  it('eager-loads images for the first 3 cards', () => {
    const { container, rerender } = render(<VideoCard video={mockVideo} index={0} />);
    let img = container.querySelector('img') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'eager');

    rerender(<VideoCard video={mockVideo} index={4} />);
    img = container.querySelector('img') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('formats and displays the publish date', () => {
    const { container } = render(<VideoCard video={mockVideo} index={0} />);
    const time = container.querySelector('time');
    expect(time).toBeInTheDocument();
    expect(time).toHaveAttribute('dateTime', mockVideo.publishedAt);
    expect(time?.textContent?.trim()).toBeTruthy();
  });

  it('has an accessible label including the video title', () => {
    render(<VideoCard video={mockVideo} index={0} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', `Watch on YouTube: ${mockVideo.title}`);
  });
});
