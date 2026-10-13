import { CodeBlock } from '@owobilum/ui';
import type { Element, ElementContent } from 'hast';
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

/**
 * Only absolute http(s) and mailto links survive; everything else
 * (javascript:, data:, vbscript:, relative paths…) is dropped and the link
 * renders as plain text.
 */
export function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  return /^(https?:\/\/|mailto:)/i.test(trimmed) ? trimmed : null;
}

function textOf(node: ElementContent | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

function languageOf(node: ElementContent | undefined): string | undefined {
  if (node?.type !== 'element') return undefined;
  const className = node.properties.className;
  const classes = Array.isArray(className) ? className : [];
  const language = classes
    .map(String)
    .find((name) => name.startsWith('language-'));
  return language?.slice('language-'.length);
}

const components: Components = {
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <span>{children}</span>
    ),
  pre: ({ node, children }) => {
    const code = (node as Element | undefined)?.children[0];
    return (
      <CodeBlock
        code={textOf(code).replace(/\n$/, '')}
        language={languageOf(code)}
      >
        {children}
      </CodeBlock>
    );
  },
  table: ({ children }) => (
    // Focusable so wide tables can be scrolled with the keyboard.
    <div className="table-scroll" role="region" aria-label="Table" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
};

/**
 * Renders untrusted Markdown (model output) safely: raw HTML is not
 * rendered (no rehype-raw), images are dropped (no tracking pixels or
 * layout shifts), and URLs pass through `safeUrl`.
 */
export const Markdown = memo(function Markdown({
  content,
}: {
  content: string;
}) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false }]]}
        urlTransform={safeUrl}
        disallowedElements={['img']}
        unwrapDisallowed
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
