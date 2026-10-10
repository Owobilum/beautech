# @owobilum/ui

Accessible React components for the `@owobilum` design system, built on
[Headless UI](https://headlessui.com) and styled with Tailwind CSS v4.

## Install

```bash
npm install @owobilum/ui react react-dom tailwindcss
```

## Setup

Import Tailwind and the library styles in your app's main stylesheet. This adds
the design tokens, the theme utilities (`bg-primary`, `text-primary-foreground`, …)
and a `@source` so Tailwind generates the classes the components use.

```css
@import 'tailwindcss';
@import '@owobilum/ui/styles.css';
```

The font stack expects [Inter](https://rsms.me/inter/); load it in your app.

## Usage

```tsx
import { Button } from '@owobilum/ui';

<Button>Save</Button>
<Button variant="secondary" leadingIcon={<SearchIcon />}>Search</Button>
<Button variant="danger" size="lg" loading>Delete</Button>
```

| Prop           | Type                                                                  | Default     |
| -------------- | --------------------------------------------------------------------- | ----------- |
| `variant`      | `'primary' \| 'secondary' \| 'danger' \| 'danger-outline' \| 'ghost'` | `'primary'` |
| `size`         | `'sm' \| 'md' \| 'lg' \| 'xl'`                                        | `'md'`      |
| `loading`      | `boolean` (focusable, `aria-busy`, activation blocked)                | `false`     |
| `leadingIcon`  | `ReactNode`                                                           | —           |
| `trailingIcon` | `ReactNode` (replaced by the spinner while loading)                   | —           |

All native `<button>` attributes and `ref` are forwarded. `type` defaults to
`"button"`. Icon-only buttons need an `aria-label`.

## Development

```bash
npx nx run ui:test
npx nx run ui:build
```
