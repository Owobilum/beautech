# React Component Library — Technical Specification

## 1. Overview

Build a production-quality, reusable React component library in an Nx monorepo.

The project should demonstrate senior frontend engineering practices including:

- Component library architecture
- Design-system implementation from Figma
- Tailwind CSS v4
- Headless UI
- TypeScript
- Storybook documentation
- Unit and E2E testing
- Semantic versioning
- Package publishing
- CI/CD
- Consumption from both monorepo and external applications

The library should be framework-agnostic and consumable by React applications, including Next.js and Vite-based applications.

The library is consumed inside the monorepo by an AI chat application (`apps/chat`, see §5). The chat app is the library's reference consumer: it builds its interface from `@owobilum/ui` components, and reusable UI it needs (icon buttons, message layout, composer, conversation list, code blocks, empty and error states, dark theme) is added to the library rather than implemented in the app.

---

## 2. Goals

### Primary goals

- Build a reusable React component library.
- Implement a design system based on a Figma design.
- Centralize design tokens and styling.
- Provide comprehensive component documentation.
- Provide automated unit, accessibility, and E2E testing.
- Publish the library as a versioned package.
- Demonstrate consumption both internally and externally.
- Build an AI chat application that consumes the library and drives its growth.

### Non-goals

- Building a complete design system with every possible component.
- Building a production SaaS application (the chat app is a portfolio-quality reference consumer, without auth, databases or billing).
- Supporting multiple frontend frameworks directly.
- Creating unnecessary infrastructure before the core library works.

---

## 3. Technology Stack

### Monorepo

- Nx
- npm workspaces
- TypeScript

### UI

- React
- TypeScript
- Tailwind CSS v4
- Headless UI
- Lucide React for icons where appropriate

### Development

- Vite
- Storybook
- ESLint
- Prettier

### Testing

- Vitest
- React Testing Library
- Storybook interaction tests
- Playwright
- Accessibility testing

### Release

- Changesets
- Semantic Versioning
- npm and/or GitHub Packages

### Deployment

- Vercel for Storybook and the chat application
- GitHub Actions for CI/CD and package publishing

---

# 4.Repository Architecture

```text
component-library/
├── apps/
│   ├── storybook/
│   ├── chat/         # Next.js AI chat app consuming @owobilum/ui
│   └── chat-e2e/     # Playwright e2e tests for the chat app
│
├── packages/
│   ├── ui/
│   └── styles/
│
├── .github/
│   └── workflows/
│
├── nx.json
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## 5. Chat Application

`apps/chat` is a Next.js (App Router) AI chat application that consumes the component library. It shows that the library works in a real product and is the main driver for new components.

### Library consumption

- The app imports UI only through `@owobilum/ui`'s public exports and `@owobilum/ui/styles.css`.
- When the app needs reusable UI that the library lacks, the component is added to the library with tests and Storybook stories, then consumed from the app.
- The library stays free of application concerns: no chat state, AI provider integration, persistence, or business logic.

### Scope

- Conversation sidebar and chat panel, with responsive layout and light and dark themes.
- Streaming assistant responses from Google Gemini through a server-side Route Handler. The API key never reaches the browser.
- Stop, retry and error handling for rate limits, network failures, empty responses and interrupted streams.
- Create, switch and delete conversations, with titles derived from the first message and persistence in localStorage.
- Safe Markdown rendering with syntax-highlighted code blocks and copy actions.
- Accessibility: keyboard operation, focus management, and status announcements that don't read out every streamed token.

### Testing

- Vitest and React Testing Library for domain logic, streaming, persistence and components, with the AI provider mocked.
- Playwright e2e (`apps/chat-e2e`) against a deterministic mock provider, with no API key or quota needed.

### Out of scope

Authentication, database persistence, file or voice input, tools or agents, multiple providers, sharing, and billing.
