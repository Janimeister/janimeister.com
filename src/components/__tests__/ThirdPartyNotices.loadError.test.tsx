// Make every ?raw dynamic import reject so we can test the error UI and retry path.
// This jest.mock is hoisted before all imports, so the component module loads
// normally (it doesn't import at module scope) but the lazy useEffect import fails.
jest.mock('../../THIRD_PARTY_NOTICES.md?raw', () => {
  throw new Error('chunk load failed');
});

import { render, screen, fireEvent, waitFor } from '../../test/test-utils';
import ThirdPartyNotices, { NOTICES_HASH } from '../ThirdPartyNotices';

describe('ThirdPartyNotices load error', () => {
  beforeEach(() => {
    window.location.hash = NOTICES_HASH;
  });

  afterEach(() => {
    window.location.hash = '';
    document.body.style.overflow = '';
  });

  it('shows error message and Retry button when import fails', async () => {
    render(<ThirdPartyNotices />);
    await waitFor(() =>
      expect(screen.queryByText(/failed to load notices/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /retry loading third-party notices/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('clears error state and re-attempts import when Retry is clicked', async () => {
    render(<ThirdPartyNotices />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /retry loading third-party notices/i }),
      ).toBeInTheDocument(),
    );

    // Click Retry: calls setLoadError(false), which hides the error UI while the
    // import is re-attempted. Verify the error disappears first (proving the state
    // was cleared), then reappears (proving the import was re-attempted and failed).
    fireEvent.click(screen.getByRole('button', { name: /retry loading third-party notices/i }));

    // Intermediate state: error UI gone (loadError reset to false → loading state).
    await waitFor(() =>
      expect(screen.queryByText(/failed to load notices/i)).not.toBeInTheDocument(),
    );

    // Final state: import fails again, error reappears.
    await waitFor(() =>
      expect(screen.getByText(/failed to load notices/i)).toBeInTheDocument(),
    );
  });

  it('shows a Reload page button alongside Retry for stale-chunk recovery', async () => {
    render(<ThirdPartyNotices />);
    await waitFor(() =>
      expect(screen.queryByText(/failed to load notices/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /reload page to fix third-party notices/i }),
    ).toBeInTheDocument();
  });
});
