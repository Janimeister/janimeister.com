import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Nav from '../Nav';

describe('Nav', () => {
  it('renders the brand name', () => {
    render(<Nav />);
    expect(screen.getByText(/janimeister/i)).toBeInTheDocument();
  });

  it('renders desktop navigation links', () => {
    render(<Nav />);
    expect(screen.getByText('Bonfire')).toBeInTheDocument();
    expect(screen.getByText('Chronicles')).toBeInTheDocument();
    expect(screen.getByText('The Tarnished')).toBeInTheDocument();
  });

  it('renders subscribe link pointing to YouTube', () => {
    render(<Nav />);
    const subscribe = screen.getByRole('link', { name: /subscribe/i });
    expect(subscribe).toHaveAttribute('href', 'https://www.youtube.com/@janimeister');
    expect(subscribe).toHaveAttribute('target', '_blank');
    expect(subscribe).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('renders a mobile menu toggle button', () => {
    render(<Nav />);
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on mobile menu button click', async () => {
    const { user } = renderWithUser(<Nav />);
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('has proper aria-label on the nav element', () => {
    render(<Nav />);
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });
});

// Helper that sets up userEvent
function renderWithUser(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  };
}
