import { render, screen } from '../../test/test-utils';
import Hero from '../Hero';

describe('Hero', () => {
  it('renders the main heading', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1, name: /janimeister/i })).toBeInTheDocument();
  });

  it('renders the tagline text', () => {
    render(<Hero />);
    expect(screen.getByText(/chronicle of fallen bosses/i)).toBeInTheDocument();
  });

  it('renders the "Enter the Archive" link pointing to #videos', () => {
    render(<Hero />);
    const archiveLink = screen.getByRole('link', { name: /enter the archive/i });
    expect(archiveLink).toHaveAttribute('href', '#videos');
  });

  it('renders the YouTube external link', () => {
    render(<Hero />);
    const ytLink = screen.getByRole('link', { name: /watch on youtube/i });
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/@janimeister');
    expect(ytLink).toHaveAttribute('target', '_blank');
    expect(ytLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('renders stat cards', () => {
    render(<Hero />);
    expect(screen.getByText('FromSoft')).toBeInTheDocument();
    expect(screen.getByText('Boss Kills')).toBeInTheDocument();
    expect(screen.getByText('Undying')).toBeInTheDocument();
  });

  it('has the hero section with id="home"', () => {
    const { container } = render(<Hero />);
    const section = container.querySelector('#home');
    expect(section).toBeInTheDocument();
  });
});
