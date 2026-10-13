export const DEFAULT_TITLE = 'New conversation';
const MAX_TITLE_LENGTH = 48;

/**
 * Deterministic title from the first user message: Markdown syntax and
 * whitespace collapsed, cut at a word boundary.
 */
export function deriveTitle(message: string): string {
  const text = message
    .replace(/```[\s\S]*?(```|$)/g, ' ') // fenced code blocks
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images → text
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '') // block markers
    .replace(/[*_~`]+/g, '') // emphasis and inline code
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return DEFAULT_TITLE;
  if (text.length <= MAX_TITLE_LENGTH) return text;

  const cut = text.slice(0, MAX_TITLE_LENGTH + 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base =
    lastSpace > MAX_TITLE_LENGTH / 2
      ? cut.slice(0, lastSpace)
      : cut.slice(0, MAX_TITLE_LENGTH);
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}
