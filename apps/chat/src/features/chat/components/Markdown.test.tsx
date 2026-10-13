/* eslint-disable no-script-url -- these tests check that script URLs are neutralised */
import { render, screen } from '@testing-library/react';
import { Markdown, safeUrl } from './Markdown';

describe('Markdown', () => {
  it('renders headings, lists, tables and links', () => {
    render(
      <Markdown
        content={[
          '## Title',
          '',
          '- one',
          '- two',
          '',
          '| a | b |',
          '| - | - |',
          '| 1 | 2 |',
          '',
          '[docs](https://example.com)',
        ].join('\n')}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Title' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Table' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    const link = screen.getByRole('link', { name: /docs/ });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });

  it('highlights fenced code and offers to copy the raw source', () => {
    const { container } = render(
      <Markdown content={'```ts\nconst a = "x";\n```'} />,
    );

    expect(screen.getByText('ts')).toBeInTheDocument();
    expect(
      container.querySelector('code.hljs.language-ts'),
    ).toBeInTheDocument();
    expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
    expect(
      screen.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  });

  it('shows raw HTML as inert text instead of rendering it', () => {
    const { container } = render(
      <Markdown
        content={
          'Hello <script>alert(1)</script> <img src=x onerror="alert(1)"> <b>bold</b>\n\n<iframe src="https://evil.test"></iframe>'
        }
      />,
    );

    expect(
      container.querySelector('script, img, iframe, b, [onerror]'),
    ).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script>');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JAVASCRIPT:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['/relative/path'],
  ])('neutralises the unsafe link %s', (url) => {
    const { container } = render(<Markdown content={`[click](${url})`} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('click');
  });

  it('drops Markdown images', () => {
    const { container } = render(
      <Markdown content={'![tracker](https://evil.test/pixel.png)'} />,
    );

    expect(container.querySelector('img')).toBeNull();
  });
});

describe('safeUrl', () => {
  it('allows only absolute http(s) and mailto URLs', () => {
    expect(safeUrl('https://a.test')).toBe('https://a.test');
    expect(safeUrl('http://a.test')).toBe('http://a.test');
    expect(safeUrl('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(safeUrl(' javascript:x')).toBeNull();
    expect(safeUrl('#anchor')).toBeNull();
  });
});
