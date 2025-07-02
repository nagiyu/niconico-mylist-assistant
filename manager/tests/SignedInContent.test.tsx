import { render, screen, fireEvent } from '@testing-library/react';
import SignedInContent from '@/app/components/auth/SignedInContent';
import { Session } from 'next-auth';

const mockSession: Session = {
  user: { name: 'Test User', email: 'test@example.com' },
  expires: 'fake-expires',
  // Add other properties if needed
};

describe('SignedInContent', () => {
  it('renders and paginates correctly', () => {
    // Render component with mock session
    render(<SignedInContent session={mockSession} />);

    // Check if welcome message is rendered
    expect(screen.getByText(/ようこそ、Test Userさん！/)).toBeInTheDocument();

    // Initially, page 1 should be active
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'true');

    // Check if pagination component is rendered
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('changes page when pagination is clicked', () => {
    render(<SignedInContent session={mockSession} />);

    // Click on page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    // Page 2 should be active
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'true');
  });
});
