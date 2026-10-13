import { render, screen } from '@testing-library/react';
import { Alert } from './alert';

describe('Alert', () => {
  it('uses role="alert" for danger and role="status" for info', () => {
    render(
      <>
        <Alert variant="danger" title="Request failed" />
        <Alert>Saved</Alert>
      </>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('allows overriding the role and renders an action', () => {
    render(
      <Alert
        variant="danger"
        role="note"
        action={<button type="button">Retry</button>}
      >
        Network error
      </Alert>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Network error');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
