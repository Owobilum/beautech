import type { Meta, StoryObj } from '@storybook/react-vite';

type Token = { name: string; usage: string };

const groups: { title: string; tokens: Token[] }[] = [
  {
    title: 'Surfaces & text',
    tokens: [
      { name: 'background', usage: 'Page background' },
      { name: 'foreground', usage: 'Primary text' },
      { name: 'surface', usage: 'Cards, controls' },
      { name: 'surface-foreground', usage: 'Text on surfaces' },
      { name: 'muted', usage: 'Subtle fills, hover backgrounds' },
      { name: 'muted-foreground', usage: 'Secondary text, labels' },
      { name: 'disabled-foreground', usage: 'Text on disabled controls' },
    ],
  },
  {
    title: 'Borders & focus',
    tokens: [
      { name: 'border', usage: 'Dividers, card borders' },
      { name: 'border-strong', usage: 'Control borders' },
      { name: 'border-hover', usage: 'Control borders on hover' },
      { name: 'ring', usage: 'Focus ring' },
      { name: 'ring-danger', usage: 'Focus ring on danger controls' },
    ],
  },
  {
    title: 'Primary',
    tokens: [
      { name: 'primary', usage: 'Primary actions' },
      { name: 'primary-hover', usage: 'Primary hover / pressed' },
      { name: 'primary-foreground', usage: 'Text on primary' },
      { name: 'primary-muted', usage: 'Ghost hover' },
      { name: 'primary-disabled', usage: 'Disabled fill' },
      { name: 'primary-disabled-foreground', usage: 'Disabled text' },
    ],
  },
  {
    title: 'Danger',
    tokens: [
      { name: 'danger', usage: 'Destructive actions' },
      { name: 'danger-hover', usage: 'Danger hover / pressed' },
      { name: 'danger-foreground', usage: 'Text on danger' },
      { name: 'danger-muted', usage: 'Outline danger hover' },
      { name: 'danger-disabled', usage: 'Disabled fill' },
      { name: 'danger-disabled-foreground', usage: 'Disabled text' },
    ],
  },
  {
    title: 'Code',
    tokens: [
      { name: 'code-background', usage: 'Code block fill' },
      { name: 'code-foreground', usage: 'Code block text' },
    ],
  },
];

function Swatch({ name, usage }: Token) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-12 shrink-0 rounded-lg border border-border"
        style={{ backgroundColor: `var(--${name})` }}
      />
      <div className="min-w-0 text-sm">
        <code className="font-semibold text-foreground">{name}</code>
        <p className="text-muted-foreground">{usage}</p>
      </div>
    </div>
  );
}

function ColorTokens() {
  return (
    <div className="space-y-8">
      <p className="max-w-prose text-sm text-surface-foreground">
        Semantic color tokens from <code>@owobilum/styles</code>. Each is a CSS
        variable (<code>--primary</code>) and a Tailwind color, so it works with
        any color utility: <code>bg-primary</code>,{' '}
        <code>text-primary-foreground</code>, <code>border-border</code>,{' '}
        <code>ring-ring</code>.
      </p>
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {group.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.tokens.map((token) => (
              <Swatch key={token.name} {...token} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: 'Foundations/Colors',
  component: ColorTokens,
  tags: ['!autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ColorTokens>;

export default meta;

export const Colors: StoryObj<typeof meta> = {};

export const DarkColors: StoryObj<typeof meta> = {
  globals: { theme: 'dark' },
};
