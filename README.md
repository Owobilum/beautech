# beautech

[![CI](https://github.com/Owobilum/beautech/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Owobilum/beautech/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/Owobilum/beautech/graph/badge.svg?token=VWU53HG5Z9)](https://codecov.io/github/Owobilum/beautech)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

This Nx monorepo contains the Owobilum design system:

- an accessible React component library built with Tailwind CSS v4 and Headless UI
- Storybook documentation for it, with automated tests
- a streaming AI chat app that consumes the library

The packages are versioned with Changesets and published to GitHub Packages.

## What's in here

| Project                                | What it is                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/styles`](packages/styles)   | `@owobilum/styles`: CSS design tokens and a light and dark theme, mapped to Tailwind utilities. CSS only.                                                                                                     |
| [`packages/ui`](packages/ui/README.md) | `@owobilum/ui`: React 19 components: Button, IconButton, CopyButton, Input/Textarea, Select, Drawer, NavList, Alert, EmptyState, Spinner, and chat building blocks (ChatMessage, MessageComposer, CodeBlock). |
| [`apps/storybook`](apps/storybook)     | Component documentation. Every story also runs as a browser test (interactions plus axe accessibility checks), and Chromatic checks visual regressions.                                                       |
| [`apps/chat`](apps/chat/README.md)     | A Next.js 16 chat app that streams Google Gemini responses. It is the library's reference consumer.                                                                                                           |
| [`apps/chat-e2e`](apps/chat-e2e)       | Playwright end-to-end tests for the chat app, run against a production build and a mock AI provider.                                                                                                          |

The projects depend on each other in one direction only: `styles` ← `ui` ← `storybook` and `chat`. ESLint (`@nx/enforce-module-boundaries`) enforces this, so the library can never import from an app.

## Highlights

- **Source inside the repo, compiled output outside it.** Workspace projects resolve `@owobilum/*` straight to TypeScript source through a custom `@owobilum/source` export condition, so there are no rebuilds between packages. External consumers only see the built `dist`.
- **Accessibility is enforced.** Every story runs in real Chromium with axe set to fail on violations, in both light and dark themes. The chat app adds landmarks, a focus-trapped mobile drawer, and a live region that announces status changes rather than streamed tokens.
- **The app drives the library.** UI the chat app needed (icon buttons, the message layout, the composer, code blocks, the dark theme) was added to `@owobilum/ui` as general-purpose components, not built inside the app. The library holds no chat state.
- **Streaming that holds up under failure.** Responses stream as NDJSON from a Route Handler. Stop cancels the upstream Gemini call, retries reuse the same message, and a pure reducer ignores stale events from earlier requests. See the [chat architecture notes](apps/chat/README.md#architecture).
- **Quality gates in CI.** Lint, typecheck, unit tests with coverage thresholds, story tests, a production build, e2e tests and visual regression, run for affected projects only.
- **Independent semver releases.** Changesets versions `@owobilum/ui` and `@owobilum/styles` separately and publishes them from CI.

## Tech stack

Nx 23 · TypeScript (strict) · React 19 · Tailwind CSS v4 · Headless UI · Vite · Next.js 16 · Storybook 10 · Vitest · Testing Library · Playwright · Chromatic · Codecov · Changesets · GitHub Actions

## Getting started

Prerequisites: **Node 24** (pinned in `.nvmrc`, so run `nvm use`) and npm.

```bash
git clone https://github.com/Owobilum/beautech.git
cd beautech
npm install
npx playwright install chromium   # once; used by the story tests and e2e tests
```

Run something:

```bash
npx nx storybook storybook               # component docs on http://localhost:6006
AI_PROVIDER=mock npx nx dev chat         # chat app on http://localhost:3000, no API key needed
```

To use real Gemini responses, add a `GEMINI_API_KEY` as described in the [chat app setup](apps/chat/README.md#setup).

## Everyday commands

Tasks run through Nx, which infers the targets from each project's config (there are no `project.json` files) and caches the results.

```bash
npx nx run-many -t lint typecheck test build   # everything
npx nx affected -t lint typecheck test build   # only projects changed vs. main

npx nx test ui                                 # one project
npx nx test ui -- -t "Button"                  # pass arguments through to Vitest
npx nx run-many -t test -p ui chat --coverage  # coverage, with thresholds enforced

npx nx run storybook:test                      # stories as browser tests (interactions plus axe)
npx nx e2e chat-e2e                            # Playwright against a production build
npx nx graph                                   # interactive project graph
```

## Workflow

1. Branch from `main` and open a pull request.
2. CI ([`ci.yml`](.github/workflows/ci.yml)) does the following:
   - checks formatting
   - runs `lint`, `typecheck`, `build`, `build-storybook` and `e2e` on the affected projects
   - runs `test --coverage` and uploads the report to Codecov
   - publishes Storybook to Chromatic, where you review visual changes
3. **A PR that changes `packages/ui` or `packages/styles` needs a changeset.** Run `npx changeset` and pick a semver bump. CI fails without one.
4. After a merge to `main`, the release workflow opens a "Version Packages" PR. Merging that PR publishes the new versions to GitHub Packages and updates each package's `CHANGELOG.md`.

## Using the library in another app

The packages are on GitHub Packages, so installing them needs an `.npmrc` with a `read:packages` token. After that, install `@owobilum/ui` and import its stylesheet into your Tailwind CSS entry:

```css
@import 'tailwindcss';
@import '@owobilum/ui/styles.css';
```

The full install, setup and component usage instructions are in the [`@owobilum/ui` README](packages/ui/README.md).

## Documentation

- [`SPEC.md`](SPEC.md): goals, scope and technical specification
- [`packages/ui/README.md`](packages/ui/README.md): library install and component API
- [`apps/chat/README.md`](apps/chat/README.md): chat app setup, architecture, trade-offs and known limitations
- [`CLAUDE.md`](CLAUDE.md): detailed contributor notes on repo conventions, tooling quirks and the release process
- Changelogs: [`@owobilum/ui`](packages/ui/CHANGELOG.md), [`@owobilum/styles`](packages/styles/CHANGELOG.md)

## Status

The library, Storybook, the chat app and CI and releases are in place. Deploying Storybook and the chat app to Vercel is still to come; live links will go here once they're up.

## License

[MIT](LICENSE)
