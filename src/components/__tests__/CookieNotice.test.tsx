import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import CookieNotice from '../CookieNotice';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CookieNotice', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('renders the consent dialog when no prior consent', () => {
    render(<CookieNotice />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/a note from the bonfire/i)).toBeInTheDocument();
  });

  it('does not render when consent has been given', () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({ acknowledged: true, decidedAt: '2024-01-01T00:00:00Z' })
    );
    const { container } = render(<CookieNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismisses the notice when "Understood" is clicked', async () => {
    render(<CookieNotice />);
    const acceptBtn = screen.getByTestId('consent-accept');

    await user.click(acceptBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'janimeister.consent.v1',
      expect.stringContaining('"acknowledged":true')
    );
  });

  it('toggles the details section', async () => {
    render(<CookieNotice />);
    const detailsBtn = screen.getByRole('button', { name: /details/i });

    expect(detailsBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/janimeister\.consent\.v1/)).not.toBeInTheDocument();

    await user.click(detailsBtn);

    expect(detailsBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('janimeister.consent.v1')).toBeInTheDocument();

    await user.click(detailsBtn);
    expect(detailsBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('describes what data is stored in details', async () => {
    render(<CookieNotice />);
    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.getByText(/acknowledgement flag/i)).toBeInTheDocument();
    expect(screen.getByText(/i\.ytimg\.com/i)).toBeInTheDocument();
  });
});
