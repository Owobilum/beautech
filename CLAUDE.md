# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

An Nx monorepo (npm workspaces) under the `@owobilum/*` package scope. `packages/` is currently empty (just `.gitkeep`) — the example packages this template shipped with were deleted. `SPEC.md` describes a planned React component library (Storybook, Tailwind v4, Headless UI, apps/ui/styles, Playwright e2e, Changesets) to be built there, but that work hasn't started — don't assume any of it is implemented.

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
npx nx run @owobilum/source:local-registry   # start local verdaccio registry for testing publishes
```

For a single package once one exists: `npx nx run <pkg>:test`, and pass vitest args through, e.g. `npx nx run <pkg>:test -- src/lib/foo.spec.ts` or `-- -t "test name"`.

## Architecture

**Scope & source resolution.** New packages should be named `@owobilum/<name>`. `tsconfig.base.json` sets `customConditions: ["@owobilum/source"]`; give each package's `exports` map an `"@owobilum/source"` condition pointing at `./src/index.ts` alongside the normal `import`/`default` condition pointing at `./dist/index.js`, so packages resolve each other straight to source inside the workspace (no build needed between dependent packages during dev) while external consumers only see compiled `dist`.

**Module boundaries.** `eslint.config.mjs` enforces `@nx/enforce-module-boundaries` via `depConstraints` keyed on `nx.tags` in each package's `package.json` (currently only `scope:shared` exists, for a future base/shared library). When adding packages, tag them (`scope:<name>`) and add a matching `depConstraints` entry restricting what that tag may import.

**Release scope.** `nx.json`'s `release.projects` excludes `utils` and `@owobilum/source` (the workspace root) — new publishable packages will need to be included by default (only explicit exclusions are listed). `preVersionCommand` builds all projects first.

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
