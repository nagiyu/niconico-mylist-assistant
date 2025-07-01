import { render, screen } from '@testing-library/react';
import SearchDialog from '@/app/components/dialog/SearchDialog';

// Mock props for SearchDialog
const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onAdd: jest.fn(),
  registeredMusicIds: [],
};

describe('SearchDialog', () => {
  it('does not render ID, Title, or Delete button in search results', () => {
    render(<SearchDialog {...defaultProps} />);

    // The removed elements should not be found
    expect(screen.queryByText(/ID:/)).toBeNull();
    expect(screen.queryByText(/タイトル/)).toBeNull();
    expect(screen.queryByText(/削除/)).toBeNull();
  });
});
