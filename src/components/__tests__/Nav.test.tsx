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

  it('closes the mobile menu on Escape and returns focus to the toggle', async () => {
    const { user } = renderWithUser(<Nav />);
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    await user.click(toggle);
    expect(document.getElementById('mobile-menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(document.getElementById('mobile-menu')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('closes the mobile menu when pressing outside the header', async () => {
    const { user } = renderWithUser(
      <>
        <Nav />
        <p>Page content</p>
      </>,
    );
    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    expect(document.getElementById('mobile-menu')).toBeInTheDocument();

    await user.click(screen.getByText('Page content'));
    expect(document.getElementById('mobile-menu')).not.toBeInTheDocument();
  });

  it('keeps the mobile menu open when pressing inside it', async () => {
    const { user } = renderWithUser(<Nav />);
    await user.click(screen.getByRole('button', { name: /toggle menu/i }));

    await user.click(document.getElementById('mobile-menu')!);
    expect(document.getElementById('mobile-menu')).toBeInTheDocument();
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
