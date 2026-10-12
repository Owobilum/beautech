# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

An Nx monorepo (npm workspaces: `packages/*`, `apps/*`) under the `@owobilum/*` package scope, building the React component library described in `SPEC.md`. Implemented so far:

- `packages/styles` (`@owobilum/styles`, Nx project `styles`): CSS-only, no build. `src/tokens.css` holds semantic CSS variables on `:root` (hex values sampled from Figma, which uses the Tailwind v3 palette — don't swap in v4's oklch palette, it renders more saturated); `src/theme.css` maps them to Tailwind utilities via `@theme inline`.
- `packages/ui` (`@owobilum/ui`, Nx project `ui`): React 19 + Headless UI, Vite library build. Only `Button` exists. `src/styles.css` (exported as `@owobilum/ui/styles.css`) imports the tokens/theme and `@source`s the package so the consumer's Tailwind generates component classes; `src` ships in the tarball for that reason.

- `apps/storybook` (Nx project `storybook`): Storybook 10 (react-vite) documenting `@owobilum/ui`; stories live here, not in `packages/ui`, so the published package has no Storybook dependency. `viteFinal` adds the Tailwind plugin and the `@owobilum/source` resolve condition (UI resolves to source, hot reload). `nx run storybook:test` runs every story as a Vitest browser-mode test in Playwright Chromium (needs `npx playwright install chromium` once): play-function interaction tests plus axe checks with `a11y.test: 'error'`, so contrast or labelling violations fail the run. Targets `storybook`/`build-storybook` are inferred by `@nx/storybook`. Visual regression testing is Chromatic: `nx run storybook:chromatic` (explicit target in `apps/storybook/package.json`, config in `apps/storybook/chromatic.config.json`) builds Storybook and uploads `storybook-static`; it needs `CHROMATIC_PROJECT_TOKEN` in the environment (never commit it). Every story is a snapshot (captured after its play function); diffs are reviewed in Chromatic, and `main` auto-accepts.

Node: `.nvmrc` pins 24 to match CI (Chromatic requires >=22).

Not started yet: demo app, Playwright e2e, Changesets, Vercel (Storybook deploy is pending a Vercel account), CI changes.

Text tokens must meet WCAG AA (story tests enforce it): use `muted-foreground` for secondary text, `disabled-foreground` only on disabled controls.

ESLint is v10, newer than the peer ranges of `eslint-plugin-react`/`jsx-a11y`/`import`; root `package.json` `overrides` relax them, and `packages/ui/eslint.config.mjs` sets `settings.react.version` because the plugin's auto-detect crashes on ESLint 10.

## Commands

Nx projects in this workspace are expected to have no `project.json` — targets (`build`, `test`, `lint`, `typecheck`, `serve`, `dev`, `preview`) are inferred by the plugins declared in `nx.json` (`@nx/js/typescript`, `@nx/vite`, `@nx/eslint`, `@nx/vitest`) from each package's `package.json`, `vite.config.mts`, and `eslint.config.mjs`.

```bash
npm install                                  # install deps (npm workspaces)

npx nx run-many -t build                     # build all packages
npx nx run-many -t test                      # test all packages
npx nx run-many -t lint                      # lint all packages
npx nx run-many -t typecheck                 # typecheck all packages

npx nx affected -t build test lint           # only affected projects (CI-style)
npx nx graph                                 # visualize the project graph

npx nx release --dry-run                     # preview version/publish
npx nx run beatech:local-registry            # start local verdaccio registry for testing publishes
```

For a single package once one exists: `npx nx run <pkg>:test`, and pass vitest args through, e.g. `npx nx run <pkg>:test -- src/lib/foo.spec.ts` or `-- -t "test name"`.

## Architecture

**Scope & source resolution.** New packages should be named `@owobilum/<name>`. `tsconfig.base.json` sets `customConditions: ["@owobilum/source"]`; give each package's `exports` map an `"@owobilum/source"` condition pointing at `./src/index.ts` alongside the normal `import`/`default` condition pointing at `./dist/index.js`, so packages resolve each other straight to source inside the workspace (no build needed between dependent packages during dev) while external consumers only see compiled `dist`.

**Module boundaries.** `eslint.config.mjs` enforces `@nx/enforce-module-boundaries` via `depConstraints` keyed on `nx.tags` in each package's `package.json` (`scope:styles` may import nothing; `scope:ui` may import `scope:styles` and `scope:shared`, the latter reserved for a future shared library; the rule covers `.ts/.tsx/.js/.jsx`). When adding packages, tag them (`scope:<name>`) and add a matching `depConstraints` entry restricting what that tag may import.

**Release scope.** `nx.json`'s `release.projects` is `["*", "!beatech"]` (everything except the workspace root). `preVersionCommand` builds all projects first.

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
