import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from './code-block';

describe('CodeBlock', () => {
  it('renders code with its language and copies the raw source', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="const a = 1;" language="ts" />);

    expect(screen.getByText('ts')).toBeInTheDocument();
    expect(screen.getByText('const a = 1;').tagName).toBe('CODE');

    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    await expect(navigator.clipboard.readText()).resolves.toBe('const a = 1;');
  });

  it('renders highlighted children and keeps the scroll region focusable', () => {
    const { container } = render(
      <CodeBlock code="x">
        <code>
          <span className="hljs-keyword">x</span>
        </code>
      </CodeBlock>,
    );

    expect(container.querySelector('.hljs-keyword')).toBeInTheDocument();
    expect(container.querySelector('pre')).toHaveAttribute('tabindex', '0');
  });
});
