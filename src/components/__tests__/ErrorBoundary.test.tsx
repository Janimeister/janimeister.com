import { render, screen } from '../../test/test-utils';
import ErrorBoundary from '../ErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <p>content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('renders the fallback and keeps siblings mounted when a child throws', () => {
    render(
      <>
        <p>sibling</p>
        <ErrorBoundary fallback={<p>fallback</p>}>
          <Boom />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(screen.getByText('sibling')).toBeInTheDocument();
  });

  it('logs the caught error', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(consoleError).toHaveBeenCalledWith(
      'Section failed to render:',
      expect.objectContaining({ message: 'kaboom' }),
      expect.anything(),
    );
  });
});
