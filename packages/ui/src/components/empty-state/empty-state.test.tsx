import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders a heading, description and action', () => {
    render(
      <EmptyState
        title="No conversations"
        description="Start one to see it here."
        headingLevel={3}
      >
        <button type="button">New chat</button>
      </EmptyState>,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'No conversations' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start one to see it here.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New chat' }),
    ).toBeInTheDocument();
  });
});
