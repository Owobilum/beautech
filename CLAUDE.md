# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

An Nx monorepo (npm workspaces: `packages/*`, `apps/*`) under the `@owobilum/*` package scope, building the React component library described in `SPEC.md`. Implemented so far:

- `packages/styles` (`@owobilum/styles`, Nx project `styles`): CSS-only, no build. `src/tokens.css` holds semantic CSS variables on `:root`, plus a dark theme (follows `prefers-color-scheme`, forced with `data-theme` on `<html>`; the `[data-theme='dark']` block and the media-query block must stay identical) (hex values sampled from Figma, which uses the Tailwind v3 palette — don't swap in v4's oklch palette, it renders more saturated); `src/theme.css` maps them to Tailwind utilities via `@theme inline`.
- `packages/ui` (`@owobilum/ui`, Nx project `ui`): React 19 + Headless UI, Vite library build. Components: `Button`, `IconButton`, `CopyButton`, `Spinner`, `Input`/`Textarea` (`autoResize`), `Select` (Headless UI Listbox), `Drawer` (Headless UI Dialog), `NavList`/`NavListItem`, `EmptyState`, `Alert`, and presentational chat pieces `ChatMessage`, `MessageComposer`, `CodeBlock` (no chat state in the library). `lib/use-auto-resize.ts` is shared by Textarea and MessageComposer. Form controls share `src/components/field/field.tsx` (internal): `FormField` wraps Headless UI `Field`/`Label`/`Description` for the label → control → helper/error stack and id wiring, and `controlStyles` holds the shared control look. Icons are inline SVGs in `src/lib/icons.tsx` (no icon-package dependency), exported publicly. `src/test-setup.ts` stubs `ResizeObserver` and `getAnimations`, which jsdom lacks and Listbox needs. `src/styles.css` (exported as `@owobilum/ui/styles.css`) imports the tokens/theme and `@source`s the package so the consumer's Tailwind generates component classes; `src` ships in the tarball for that reason.

- `apps/storybook` (Nx project `storybook`): Storybook 10 (react-vite) documenting `@owobilum/ui`; stories live here, not in `packages/ui`, so the published package has no Storybook dependency. `viteFinal` adds the Tailwind plugin and the `@owobilum/source` resolve condition (UI resolves to source, hot reload). `nx run storybook:test` runs every story as a Vitest browser-mode test in Playwright Chromium (needs `npx playwright install chromium` once): play-function interaction tests plus axe checks with `a11y.test: 'error'`, so contrast or labelling violations fail the run. Targets `storybook`/`build-storybook` are inferred by `@nx/storybook`. Visual regression testing is Chromatic: `nx run storybook:chromatic` (explicit target in `apps/storybook/package.json`, config in `apps/storybook/chromatic.config.json`) builds Storybook and uploads `storybook-static`; it needs `CHROMATIC_PROJECT_TOKEN` in the environment (never commit it). Every story is a snapshot (captured after its play function); diffs are reviewed in Chromatic, and `main` auto-accepts. The toolbar has a theme global (light by default for deterministic tests); dark variants are separate stories with `globals: { theme: 'dark' }`, so axe checks both themes.

- `apps/chat` (`@owobilum/chat`, Nx project `chat`, tag `scope:chat`): Next.js 16 App Router AI chat app consuming `@owobilum/ui` (see `apps/chat/README.md`). Gemini via a Route Handler streaming NDJSON (`src/lib/server`), shared zod wire schema in `src/lib/shared/chat-schema.ts`, client state in a `useSyncExternalStore` store + pure reducer (`src/features/chat`). `AI_PROVIDER=mock` swaps in a scripted provider (prompt markers `[slow]`, `[error]`, `[fail-once]`, `[fail-mid]`, `[empty]`). Nx infers no `typecheck` for Next apps, so it's an explicit target in `apps/chat/package.json`. Next can't use the `@owobilum/source` condition; `next.config.mjs` aliases `@owobilum/ui` to source via `turbopack.resolveAlias` + `transpilePackages`. Unit tests: Vitest/jsdom; server tests opt into `// @vitest-environment node`.
- `apps/chat-e2e` (Nx project `chat-e2e`): Playwright (Chromium) against a production build (`next start` on port 3100, `AI_PROVIDER=mock`); `e2e` depends on `chat:build`.

Node: `.nvmrc` pins 24 to match CI (Chromatic requires >=22).

Deployment: one Vercel project using Vercel Services (`vercel.json`). Service `chat` (`apps/chat`, Next.js) serves `/`, and service `storybook` (`apps/storybook`, static build) serves `/storybook/`. There are no bindings, because neither service calls the other. Each service installs and builds from the repo root (`cd ../.. && npm ci`, then `nx run …`), because npm workspaces need a root install. Storybook builds into `apps/storybook/vercel-output/storybook` (gitignored) so its files sit under the `/storybook/` prefix: a service receives the original request path, and Storybook's relative asset URLs need the trailing slash (`/storybook` redirects to `/storybook/`). Set `GEMINI_API_KEY` in the Vercel project's environment variables.

CI (`.github/workflows/ci.yml`, no Nx Cloud): `checks` runs `nx format:check` and `nx affected -t lint typecheck build build-storybook e2e` then `nx affected -t test --coverage` (base from `nrwl/nx-set-shas`, falling back to the pre-push commit), installing Playwright Chromium for story tests and chat e2e, and uploads the `ui`/`chat` lcov reports to Codecov (flags `ui`/`chat`, carried forward when unaffected; `codecov.yml`; needs the `CODECOV_TOKEN` repo secret). Coverage is off by default; with `--coverage`, `ui` and `chat` enforce Vitest `coverage.thresholds` (set a few points under current numbers — raise them as coverage improves, don't lower them to pass) and write `test-output/vitest/coverage` (HTML + repo-relative `lcov.info`); `chromatic` runs `nx run storybook:chromatic` with the `CHROMATIC_PROJECT_TOKEN` repo secret.

Text tokens must meet WCAG AA (story tests enforce it): use `muted-foreground` for secondary text, `disabled-foreground` only on disabled controls, `danger-strong` (not `danger`) for error text, and `placeholder` only for native `placeholder` attributes (axe doesn't check those; placeholder-like text rendered as real content must use `muted-foreground`).

ESLint is v10, newer than the peer ranges of `eslint-plugin-react`/`jsx-a11y`/`import`; root `package.json` `overrides` relax them, and `packages/ui/eslint.config.mjs` sets `settings.react.version` because the plugin's auto-detect crashes on ESLint 10.

## Commands

Nx projects in this workspace are expected to have no `project.json` — targets (`build`, `test`, `lint`, `typecheck`, `serve`, `dev`, `preview`) are inferred by the plugins declared in `nx.json` (`@nx/js/typescript`, `@nx/vite`, `@nx/eslint`, `@nx/vitest`) from each package's `package.json`, `vite.config.mts`, and `eslint.config.mjs`.

```bash
npm install                                  # install deps (npm workspaces)

npx nx run-many -t build                     # build all packages
npx nx run-many -t test                      # test all packages
npx nx run-many -t lint                      # lint all packages
npx nx run-many -t typecheck                 # typecheck all packages
npx nx run-many -t test -p ui chat --coverage  # coverage + thresholds (HTML in <project>/test-output/vitest/coverage)

npx nx affected -t build test lint           # only affected projects (CI-style)
npx nx graph                                 # visualize the project graph

npx changeset                                # add a changeset (needed in PRs that change a published package)
npx nx run beatech:local-registry            # local verdaccio registry (writes the repo's gitignored .npmrc, not ~/.npmrc)
```

For a single package once one exists: `npx nx run <pkg>:test`, and pass vitest args through, e.g. `npx nx run <pkg>:test -- src/lib/foo.spec.ts` or `-- -t "test name"`.

## Architecture

**Scope & source resolution.** New packages should be named `@owobilum/<name>`. `tsconfig.base.json` sets `customConditions: ["@owobilum/source"]`; give each package's `exports` map an `"@owobilum/source"` condition pointing at `./src/index.ts` alongside the normal `import`/`default` condition pointing at `./dist/index.js`, so packages resolve each other straight to source inside the workspace (no build needed between dependent packages during dev) while external consumers only see compiled `dist`.

**Module boundaries.** `eslint.config.mjs` enforces `@nx/enforce-module-boundaries` via `depConstraints` keyed on `nx.tags` in each package's `package.json` (`scope:styles` may import nothing; `scope:ui` may import `scope:styles` and `scope:shared`, the latter reserved for a future shared library; `scope:chat` may import `ui`/`styles`/`shared`; the rule covers `.ts/.tsx/.js/.jsx`). When adding packages, tag them (`scope:<name>`) and add a matching `depConstraints` entry restricting what that tag may import.

**Releases (Changesets).** `@owobilum/ui` and `@owobilum/styles` are versioned independently (`.changeset/config.json`; only `src/**` and `package.json` changes count). PRs that change them need a changeset (CI runs `changeset status`). On `main`, `.github/workflows/release.yml` (changesets/action) opens a "chore: version packages" PR (`npm run version-packages` = `changeset version` + lockfile sync); merging it runs `npm run release` (build, `changeset publish`) to **GitHub Packages** (`publishConfig.registry` = `https://npm.pkg.github.com`, auth via the workflow's `GITHUB_TOKEN`; packages inherit the repo's visibility, and consumers need an `.npmrc` with a `read:packages` token — see `packages/ui/README.md`). The bot's PR is created with `GITHUB_TOKEN`, so CI doesn't run on it automatically: close and reopen it to trigger checks. Changesets 3 needs Node >=22.11 and its `init`/`add` commands are interactive; write changeset files by hand when scripting. To rehearse a release against Verdaccio, temporarily remove `publishConfig.registry` from both packages first — it overrides `npm_config_registry`, so otherwise the rehearsal publishes to GitHub Packages for real. Then `npm run version-packages`, `npm_config_registry=http://localhost:4873/ npm run release`, and revert everything (including the git tags it creates).

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
