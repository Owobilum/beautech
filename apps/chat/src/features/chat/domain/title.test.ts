import { DEFAULT_TITLE, deriveTitle } from './title';

describe('deriveTitle', () => {
  it('uses short messages as-is, with whitespace collapsed', () => {
    expect(deriveTitle('  How do   closures\nwork?  ')).toBe(
      'How do closures work?',
    );
  });

  it('cuts long messages at a word boundary', () => {
    const title = deriveTitle(
      'Can you explain the difference between React Server Components and client components in detail?',
    );

    expect(title).toBe('Can you explain the difference between React…');
    expect(title.length).toBeLessThanOrEqual(49);
  });

  it('strips Markdown syntax and code blocks', () => {
    expect(deriveTitle('## **Fix** this `bug`\n```js\nconst a = 1;\n```')).toBe(
      'Fix this bug',
    );
    expect(deriveTitle('See [the docs](https://example.com)')).toBe(
      'See the docs',
    );
  });

  it('falls back for messages with no text', () => {
    expect(deriveTitle('```\ncode only\n```')).toBe(DEFAULT_TITLE);
  });

  it('is deterministic', () => {
    expect(deriveTitle('Same input')).toBe(deriveTitle('Same input'));
  });
});
