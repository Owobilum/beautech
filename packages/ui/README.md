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

## Development

```bash
npx nx run ui:test
npx nx run ui:build
```
