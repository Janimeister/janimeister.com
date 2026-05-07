import { render, screen } from '../../test/test-utils';
import About from '../About';

describe('About', () => {
  it('renders the section heading', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: /who walks the lands/i })).toBeInTheDocument();
  });

  it('renders the bio text mentioning Janimeister', () => {
    render(<About />);
    expect(screen.getByText(/chronicler of fromsoftware boss kills/i)).toBeInTheDocument();
  });

  it('renders game tags', () => {
    render(<About />);
    expect(screen.getByText('Elden Ring')).toBeInTheDocument();
    expect(screen.getByText('Dark Souls')).toBeInTheDocument();
    expect(screen.getByText('Boss Kills')).toBeInTheDocument();
    expect(screen.getByText('No Cuts')).toBeInTheDocument();
  });

  it('has the about section with id="about"', () => {
    const { container } = render(<About />);
    const section = container.querySelector('#about');
    expect(section).toBeInTheDocument();
  });

  it('displays the initials avatar', () => {
    render(<About />);
    expect(screen.getByText('JM')).toBeInTheDocument();
  });
});
