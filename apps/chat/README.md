# Owobilum Chat

[![codecov](https://codecov.io/github/Owobilum/beautech/graph/badge.svg?token=VWU53HG5Z9&flag=chat)](https://codecov.io/github/Owobilum/beautech?flags%5B0%5D=chat)

An AI chat app built with Next.js (App Router) and TypeScript on top of the
monorepo's component library, [`@owobilum/ui`](../../packages/ui/README.md).
Responses stream from Google Gemini through a server-side Route Handler.
Conversations are stored in the browser.

The app is deliberately small. The emphasis is on reliable async behaviour
(streaming, cancellation, retries, stale updates), reuse of the component
library, and tests.

## Setup

```bash
npm install                                   # from the repo root
cp apps/chat/.env.example apps/chat/.env.local
# set GEMINI_API_KEY in apps/chat/.env.local
npx nx dev chat                               # http://localhost:3000
```

No API key? Run against the scripted mock provider:

```bash
AI_PROVIDER=mock npx nx dev chat
```

### Environment variables

All of these are read on the server only. None are `NEXT_PUBLIC_`, so none
can reach the browser bundle.

| Variable         | Required | Description                                                                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | yes\*    | Google AI Studio key ([free tier](https://aistudio.google.com/apikey)).                                                      |
| `GEMINI_MODEL`   | no       | A model id, or a comma-separated fallback list. Defaults to `gemini-flash-latest,gemini-3.5-flash,gemini-flash-lite-latest`. |
| `AI_PROVIDER`    | no       | Set to `mock` for the offline scripted provider (\*then no key is needed).                                                   |

Without a key (and without the mock), the API answers `503 not_configured`
and the UI shows that error.

**Model fallback.** Models are tried in order. If a model fails with `404`
(retired), `429` (per-model quota) or `5xx` (overloaded) before any text has
streamed, the next one is used. The default chain starts with Google's
`gemini-flash-latest` alias, because pinned models get retired
(`gemini-2.5-flash` returns 404 for new API keys). The newest model is often
overloaded (503) on the free tier, so the widely available
`gemini-3.5-flash` comes next, then the lite alias. Upstream failures are logged
on the server as `[api/chat] <code> status=<http status> <message>`.

**Where to put the key.** Use `apps/chat/.env.local`, which Next.js loads.
A repo-root `.env.local` also works when you run through Nx (`nx dev chat`),
because Nx loads root `.env` files into every task. It is not picked up if
you run `next dev` directly.

### Commands

```bash
npx nx dev chat            # dev server
npx nx build chat          # production build
npx nx test chat           # unit + integration tests (Vitest, jsdom)
npx nx test chat --coverage  # with coverage + thresholds (HTML in test-output/vitest/coverage)
npx nx typecheck chat
npx nx lint chat
npx nx e2e chat-e2e        # Playwright against a production build + mock provider
```

E2E needs Chromium once: `npx playwright install chromium`.

## Architecture

```
src/
  app/
    layout.tsx, page.tsx, global.css   fonts, no-flash theme script, Tailwind + library styles
    api/chat/route.ts                  POST handler (Node runtime)
  lib/
    shared/chat-schema.ts              zod wire format, limits, error codes + copy (client + server)
    server/                            chat-handler (validation, NDJSON streaming), Gemini provider,
                                       mock provider, provider selection, typed errors
  features/
    chat/
      domain/        types, pure reducer, title derivation, selectors (incl. request history)
      store/         external store (useSyncExternalStore) + selector hook, provider
      api/           stream client (fetch + NDJSON parser), ChatController (request lifecycle)
      persistence/   versioned localStorage schema, merge-on-save, cross-tab sync
      hooks/         useStickToBottom
      components/    ChatApp, Sidebar, ConversationView, MessageItem, Markdown, StatusAnnouncer
    theme/           theme preference store + toggle
```

**UI library.** Every UI primitive comes from `@owobilum/ui`. Building this
app added these reusable pieces to the library, each documented in Storybook
and tested:

- `IconButton`, `CopyButton`, `Spinner`, `Drawer`
- `NavList` / `NavListItem`, `EmptyState`, `Alert`
- `ChatMessage`, `MessageComposer`, `CodeBlock`
- `Textarea` `autoResize`, a `subtle` button variant
- a dark theme in `@owobilum/styles`
- exported icons

The library stays presentational: no chat state, provider or persistence code
lives there. The app keeps only what is specific to it, such as Markdown
rendering (and its dependencies) and the chat layout.

### Wire protocol

`POST /api/chat` with `{ messages: { role: 'user' | 'assistant', content }[] }`.

- Validation is done with zod. Limits:
  - 8,000 characters per user message
  - 50 messages
  - 60,000 characters in total
- Failures:
  - an invalid request returns `400`, and an oversized one `413`
  - failures before the first token return JSON
    `{ error: { code, message, retryAfter? } }` with a real status: `429`
    rate limited (with `Retry-After`), `502` provider failure or empty reply,
    `503` not configured. The handler waits for the first chunk before
    responding so these can map to HTTP statuses.
- Otherwise the response is `application/x-ndjson`, one event per line:
  `{"type":"delta","text"}`, then `{"type":"done"}`, or
  `{"type":"error","code","message"}` if the stream fails partway.
- The client's abort propagates through `request.signal` to the Gemini SDK's
  `abortSignal`, so stopping a response also cancels the upstream call. The
  response stream uses `pull`, so the provider is read only as fast as the
  client reads.

### State and request lifecycle

- Assistant messages have an explicit status: `streaming`, `complete`,
  `error` or `stopped`. Partial text is kept for `error` and `stopped`.
- Each response attempt is addressed by a `StreamTarget`: conversation id,
  message id and request id. The reducer applies stream events only to a
  message that is still `streaming` for that same request id. That one rule
  makes all of these no-ops:
  - stale events
  - late deltas after a stop
  - events for a deleted conversation
  - events from an earlier attempt after a retry

  A request can therefore never write into the wrong conversation, even if
  you switch away while it streams (it keeps streaming in the background).

- `ChatController` owns the `AbortController`s, one per conversation:
  - **stop** aborts the request and marks the message stopped immediately
  - **delete** aborts its request
  - **unmount** aborts all requests
  - **retry** resets the same assistant message with a new request id and
    resends the same history, so messages are never duplicated
  - **duplicate submits** are rejected while a conversation is streaming
- **Re-render control.** State lives in a small external store, and
  components subscribe to slices through `useChatSelector`, with custom
  equality where they derive values:
  - the sidebar selects only ids and titles
  - each `MessageItem` selects only its own message
  - deltas are buffered and applied once per animation frame

  As a result a streamed token re-renders only the streaming message. A test
  verifies this with React's `Profiler`.

### Persistence

- **Hydration.** Server and first client renders use the same empty state.
  localStorage is read in an effect after mount, so there is no hydration
  mismatch and no browser API runs during SSR. A spinner shows until then,
  and the composer is disabled.
- **Format.** Data is stored versioned (`version: 1`) and validated with zod.
  Corrupt or unknown data falls back to an empty history instead of crashing.
- **Interrupted responses.** A response that was streaming when the page
  closed is restored as `stopped`, keeping its partial text.
- **Saves** are debounced (300 ms) and flushed on `pagehide`. Each save
  serializes the current snapshot, then merges it with what is already stored
  before writing: per conversation, the newer `updatedAt` wins, and
  deletions are kept as tombstones. A stale tab therefore can't overwrite
  newer conversations or bring back deleted ones. `storage` events merge
  other tabs' changes live.
- **Storage problems.** If storage is unavailable or full, the sidebar says
  so.

### Markdown safety

- Uses `react-markdown`, `remark-gfm` (tables) and `rehype-highlight`.
- No `rehype-raw`, so raw HTML is shown as inert text.
- Links are limited to absolute `http(s)` and `mailto` (`javascript:`,
  `data:` and relative URLs render as plain text). They open with
  `rel="noopener noreferrer nofollow"`.
- Images are dropped.
- Code blocks render through the library's `CodeBlock`. Wide tables and code
  scroll horizontally in keyboard-focusable regions.

### Accessibility

- Landmarks, a skip link to the message box, and visible focus rings (the
  library's focus tokens).
- The sidebar becomes a focus-trapped `Drawer` on small screens.
- A single polite live region announces "Assistant is responding…",
  "Response complete.", "Response stopped." and "Response failed: …". It never
  announces streamed tokens, and switching conversations announces nothing.
  Inline error alerts use `role="note"` so restored errors aren't announced
  on load.
- Focus returns to the composer after stop and retry. The send/stop button is
  one element, so focus survives the swap.
- Light, dark and system themes are applied before paint by an inline
  script. Motion is reduced or removed under `prefers-reduced-motion`.
- Auto-scroll follows streaming only while you're at the bottom. Scroll up
  and it stops, and a "Jump to latest" button appears.

## Testing

- **Unit and integration** (`npx nx test chat`, no network or API key):
  - reducer transitions and stale-event handling
  - title derivation and request-history trimming
  - NDJSON client: split chunks, malformed lines, missing `done`, aborts,
    HTTP errors
  - Route Handler: validation, limits, error mapping, mid-stream failures,
    abort propagation
  - Gemini error mapping
  - persistence: round trips, corrupt data, merge-on-save, tombstones, quota
  - controller: stop, retry, background streams, batching
  - Markdown safety
  - full-app flows with a fake streaming `fetch`
  - the render-isolation check
- **E2E** (`npx nx e2e chat-e2e`): Chromium against a production build with
  `AI_PROVIDER=mock`, covering:
  - creating a conversation and sending a message
  - incremental streaming
  - switching conversations and restoring after a reload
  - stopping a response
  - a failed request and its retry

The mock provider is deterministic, and prompt markers script its behaviour:
`[slow]`, `[error]`, `[fail-once]`, `[fail-mid]` and `[empty]`.

## Trade-offs

- **No state library.** The custom store is a reducer plus about 30 lines of
  subscription code, which is enough for selector-based subscriptions. Zustand
  or similar would add a dependency without solving another problem here.
- **Single route.** The open conversation lives in state and localStorage,
  not the URL. That keeps SSR trivial (nothing about it depends on the
  request) at the cost of deep links and browser-history navigation between
  conversations.
- **NDJSON rather than SSE or the AI SDK.** It is a tiny protocol that
  carries typed mid-stream errors and needs no extra dependencies. A
  disconnect is detected as a missing `done` event.
- **`rehype-highlight` rather than Shiki.** It is synchronous, so it can
  highlight on every streamed frame without flashing unhighlighted code, and
  it is lighter. Highlighting is less precise than Shiki's.
- **Re-parsing Markdown per frame.** It's simple and fast enough at chat
  lengths. Very long responses would benefit from memoising completed
  blocks.
- **Next.js consumes the library from source.** `transpilePackages` plus a
  Turbopack alias do this, because Next has no setting for custom resolve
  conditions (`@owobilum/source`). Nx also infers no `typecheck` target for
  Next apps, so it is declared explicitly.

## Known limitations

- History is per browser. There is no sync, export or search.
- Cross-tab sync is coarse: per conversation, the newer `updatedAt` wins, and
  a reply streaming in one tab appears in another only as saves land.
- There is no app-level rate limiting. The free Gemini tier's limits are
  surfaced as `rate_limited` errors with a retry.
- Context is trimmed oldest-first to fit request limits, with no
  summarisation.
- Deleting a conversation has no confirmation or undo.
- No Content-Security-Policy yet. The inline theme script and Next's inline
  hydration scripts would need nonces.
