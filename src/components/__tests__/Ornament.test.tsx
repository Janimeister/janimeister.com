import { render, screen } from '../../test/test-utils';
import { OrnamentDivider } from '../Ornament';

describe('OrnamentDivider', () => {
  it('renders the label text', () => {
    render(<OrnamentDivider label="Test Label" />);
    expect(screen.getByText(/test label/i)).toBeInTheDocument();
  });

  it('wraps the label with decorative markers', () => {
    render(<OrnamentDivider label="Chronicle" />);
    expect(screen.getByText(/✦ Chronicle ✦/)).toBeInTheDocument();
  });
});
