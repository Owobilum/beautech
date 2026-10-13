import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('is a named status region when labelled', () => {
    render(<Spinner label="Loading messages" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading messages');
  });

  it('is decorative without a label', () => {
    const { container } = render(<Spinner />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
