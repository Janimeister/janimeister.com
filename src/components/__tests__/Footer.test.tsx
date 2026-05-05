import { render, screen } from '../../test/test-utils';
import Footer from '../Footer';

describe('Footer', () => {
  it('renders the copyright text with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('renders the YouTube link', () => {
    render(<Footer />);
    const ytLink = screen.getByRole('link', { name: /youtube/i });
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/@janimeister');
    expect(ytLink).toHaveAttribute('target', '_blank');
    expect(ytLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('renders the About link', () => {
    render(<Footer />);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveAttribute('href', '#about');
  });

  it('has a footer navigation with aria-label', () => {
    render(<Footer />);
    expect(screen.getByRole('navigation', { name: /footer/i })).toBeInTheDocument();
  });
});
