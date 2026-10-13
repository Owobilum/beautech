# @owobilum/ui

Accessible React components for the `@owobilum` design system, built on
[Headless UI](https://headlessui.com) and styled with Tailwind CSS v4.

## Install

The packages are published to [GitHub Packages](https://github.com/Owobilum/beautech/packages),
which requires authentication to install. Add an `.npmrc` to your app:

```ini
@owobilum:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must be a GitHub token with the `read:packages` scope (a
personal access token locally; in another repo's GitHub Actions, grant that
repo access in the package settings and use the workflow's `GITHUB_TOKEN`).

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

### Input and Textarea

```tsx
import { Input, Textarea } from '@owobilum/ui';

<Input label="Company name" description="Enter your registered company name." />
<Input label="Subdomain" error="Only lowercase letters and hyphens are allowed." />
<Input label="Password" type="password" />
<Textarea label="Description" description="Max 500 characters." />
```

| Prop                                   | Type                                                     |
| -------------------------------------- | -------------------------------------------------------- |
| `label`                                | `ReactNode` (associated with the control)                |
| `description`                          | `ReactNode` (helper text, linked via `aria-describedby`) |
| `error`                                | `ReactNode` (sets `aria-invalid`, replaces description)  |
| `className`                            | `string`, applied to the field wrapper                   |
| `inputClassName` / `textareaClassName` | `string`, applied to the control                         |

All other native attributes and `ref` go to the `<input>` / `<textarea>`.
`type="password"` adds a show/hide toggle. Without a `label`, pass
`aria-label`.

### Select

```tsx
import { Select } from '@owobilum/ui';

<Select
  label="Member role"
  options={[
    {
      value: 'admin',
      label: 'Admin',
      description: 'Can manage members and billing',
    },
    { value: 'member', label: 'Member', description: 'Can view and comment' },
  ]}
  value={role}
  onChange={setRole}
/>;
```

Single-select dropdown on Headless UI's Listbox (arrow keys, type-ahead,
Escape). Props: `options` (`{ value, label, description?, disabled? }[]`),
`value` / `defaultValue` / `onChange`, `placeholder`, `name` (submits with a
form), `disabled`, plus `label`, `description` and `error` as above.

### Theming

`@owobilum/styles` ships light and dark tokens. Dark follows the OS
(`prefers-color-scheme`) by default. To force a theme, set
`data-theme="dark"` or `data-theme="light"` on `<html>`. Components need no
changes because they only use semantic tokens. A `dark:` variant is
available for app-specific styles.

### Icon buttons, copy and loading

```tsx
import { CopyButton, IconButton, Spinner, TrashIcon } from '@owobilum/ui';

<IconButton label="Delete" icon={<TrashIcon />} />
<CopyButton text={code} label="Copy code" />
<Spinner label="Loading messages" />
```

- **`IconButton`**: the `label` prop is required and becomes the accessible
  name and tooltip. It takes the same `variant`s as `Button` (default
  `subtle`), `size` `sm` / `md` / `lg`, and `loading`.
- **`CopyButton`**: copies `text`, which can also be a function read at click
  time. It shows a check mark and announces "Copied" (or "Copy failed")
  through a live region.
- **`Spinner`**: with a `label` it becomes a `role="status"`; without one it
  is decorative.

Button also has a `subtle` variant for low-emphasis neutral actions.
`Textarea` accepts `autoResize` and `maxRows` so it grows with its content.

### Chat building blocks

These components are presentational only. The app owns messages, streaming
and persistence.

```tsx
import { ChatMessage, CodeBlock, MessageComposer } from '@owobilum/ui';

<ChatMessage from="user">How do I reverse a string?</ChatMessage>
<ChatMessage
  from="assistant"
  avatar={<Avatar />}
  status={streaming && <Spinner />}
  actions={<CopyButton text={reply} label="Copy response" size="sm" />}
>
  <CodeBlock language="ts" code={source} />
</ChatMessage>

<MessageComposer
  value={draft}
  onValueChange={setDraft}
  onSubmit={send}
  onStop={stop}
  busy={streaming}
  maxLength={8000}
/>
```

- **`ChatMessage`**: renders an `<article>` named "You" or "Assistant"
  (override with `author`). User messages are bubbles; assistant messages are
  full width. It has `status` and `actions` slots, and long words wrap.
- **`MessageComposer`**: an auto-growing text box. Enter submits and
  Shift+Enter inserts a newline; Enter during IME composition is ignored.
  While `busy`, the send button becomes a stop button and typing stays
  enabled. Near `maxLength` a counter appears, and over the limit the box is
  invalid and won't submit.
- **`CodeBlock`**: shows a language label and a copy button, and scrolls
  horizontally (keyboard-focusable). It takes already-highlighted
  `children`, so pick your own highlighter.

### Navigation and feedback

- **`NavList` / `NavListItem`**: a sidebar list. The current item has
  `aria-current="page"`. Trailing `actions` stay in the tab order and only
  appear on hover where hover exists.
- **`Drawer`**: a modal side panel built on Headless UI Dialog. It traps
  focus, closes on Escape or a backdrop click, and returns focus.
- **`EmptyState`**: `icon`, `title`, `description` and an action slot.
- **`Alert`**: `info` alerts use `role="status"` and `danger` alerts use
  `role="alert"`, unless you pass a `role`. Accepts an `action`.

The library's icons (`SendIcon`, `StopIcon`, `CopyIcon`, `TrashIcon`,
`PlusIcon`, `MenuIcon`, `SunIcon`, `MoonIcon`, …) are exported as well.

## Development

```bash
npx nx run ui:test
npx nx run ui:build
```
