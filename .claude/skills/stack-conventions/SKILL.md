---
name: stack-conventions
description: Required stack and coding rules for this Next.js project (App Router, Server Components and Next.js caching, React Compiler, TypeScript strict, Tailwind, Radix, TanStack Form, Zod; TanStack Query and Zustand only when justified). Read before writing a plan, writing code, or reviewing code.
---

# Stack conventions

These are rules, not suggestions. A plan, change or review that breaks one is wrong even if
it works. If a rule truly cannot apply, stop and ask the user; do not work around it.

## Next.js knowledge comes from the installed docs

This Next.js is newer than your training data. Before using any Next.js API, config option
or file convention, read the matching guide in `node_modules/next/dist/docs/` (see
`AGENTS.md`). Do not write Next.js code from memory, and do not add a Next.js skill or
copy docs into this repo: the bundled docs always match the installed version.

## Stack

- **Framework:** Next.js, App Router only (`src/app/`). No Pages Router, no Express or other
  separate server: server code lives in Server Components, Server Actions and Route Handlers.
- **Language:** TypeScript, strict. **UI:** latest React with the React Compiler
  (`reactCompiler: true` in `next.config.ts`). Cache Components are on.
- **Styling:** Tailwind utility classes. No CSS-in-JS, no per-component `.css` files.
- **Primitives:** Radix (`radix-ui`) for anything interactive with accessibility behavior:
  dialog, popover, dropdown, select, tabs, tooltip, toast, switch, checkbox. Never hand-roll.
- **Data and caching:** Next.js's own (Server Components, Cache Components, Server Actions).
  TanStack Query only when needed (see Data).
- **Forms:** TanStack Form + Zod. **Validation at every boundary:** Zod.

## Server and client components

- Components are Server Components by default. Add `'use client'` only to the smallest
  component that needs state, effects, event handlers or browser APIs, as low in the tree as
  possible. Never put `'use client'` on a page or layout to make an error go away.
- Pass server data to client components as props (serializable only). Never import
  server-only modules (database, secrets) into a client component; mark them with
  `import 'server-only'`.
- Secrets are read only on the server. Only `NEXT_PUBLIC_*` variables may reach the browser,
  and nothing secret is ever named that way.

## Data

Next.js is the default data layer. Pick by what the screen needs:

| Need | Use |
|---|---|
| Data shown when the page loads | Read it in a Server Component (async component, direct call to the data function in `src/features/<feature>/data.ts`). Wrap slow parts in `<Suspense>`. |
| Caching it | Cache Components: `'use cache'`, `cacheLife`, `cacheTag`, per the installed docs. |
| Filters, search, tabs, selected item | URL search params, read by the page. Changing them re-renders on the server. |
| Writes from this app's UI | A Server Action in `actions.ts` next to the feature, validated with Zod, called from the form's `onSubmit` or a button. After it, `updateTag` / `revalidateTag` / `refresh()` so the page shows fresh data. |
| Optimistic UI | `useOptimistic` around the Server Action call. |
| Pending state | `useTransition` / the form's submitting state; `Suspense` / `loading.tsx` for reads. |
| An endpoint something outside the app calls (webhook, third party) | A Route Handler (`route.ts`). Not for the app's own UI. |

- Never `fetch` inside `useEffect`. Never copy server data into `useState` or Zustand.
- Parse anything that crosses a boundary (request bodies, action input, external API
  responses, stored JSON) with a Zod schema. Infer the type from the schema (`z.infer`).
- When the build reports uncached data outside `<Suspense>`, use the fix it names; do not
  disable Cache Components or mark a route blocking to silence it.

### TanStack Query: only when needed

It is not installed by default. Add it only when a screen needs one of these, and nothing in
the table above can do it:

- polling or a live status (a job that runs for a while),
- infinite scroll or "load more" held on the client,
- refetch on window focus or in the background while the user stays on the page,
- one optimistic update shared by several client components, with rollback on error.

"We might need it later", "it's familiar" or "to cache data" are not reasons: Next.js caches.
When it is justified:
- The plan says so in its Global Constraints, naming the screen and which reason above
  applies. The user approves it with the plan.
- Install `@tanstack/react-query` and `@tanstack/eslint-plugin-query` (add
  `...pluginQuery.configs['flat/recommended']` to `eslint.config.mjs`).
- Copy `.claude/skills/stack-conventions/react-query/query-client.ts` to `src/lib/` and
  `providers.tsx` to `src/app/`. Wrap only the subtree that needs it, not the whole app,
  unless several routes do.
- Query keys and fetch functions live together as `queryOptions(...)` factories in the
  feature folder. Prefetch on the server with `getQueryClient()` + `HydrationBoundary` when
  the data is needed on first paint. Mutations still go through Server Actions, called from
  `useMutation`, which invalidates the query on success.
- Never cache the same data in both Next.js and TanStack Query.

The same applies to Zustand: add it only when the plan names the shared client state that
`useState`, lifted state or context cannot handle.

## React

- **No manual memoization.** Never import `useMemo`, `useCallback` or `memo`; the compiler
  does it and lint fails the import.
- **`useEffect` is only for syncing with something outside React** (a subscription, a
  browser API, a third-party widget). Never to fetch, derive state, or react to a prop change.
- Derived values are computed during render, not stored in state.
- Pick the primitive that matches the job: `useTransition` / `useDeferredValue` for
  non-urgent updates, `useOptimistic` for optimistic UI, `use` to read a promise passed from
  a Server Component, `Suspense` for loading, `error.tsx` / error boundaries for failures,
  `useId` for label and aria ids, `ref` as a plain prop (no `forwardRef`), a new `key` to
  reset state.
- Routing: `next/link` for navigation, `next/image` for images, `loading.tsx`,
  `error.tsx` and `not-found.tsx` per route segment where they matter.
- One component per file, named export, file named after the component (route files such as
  `page.tsx` keep Next's default export).

## Forms

Every form uses TanStack Form with a Zod schema. Follow
`src/features/greeting/GreetingForm.tsx`: label tied to the input, error shown with
`role="alert"`, `aria-invalid` and `aria-describedby` set. A form that saves data submits to a
Server Action that validates with the same schema.

## Client state

Choose the smallest that works: `useState` / `useReducer` → lifted state or context for one
subtree → Zustand only when distant parts of the app share state (one small store per
concern, read through selectors, created per request if it is used during server rendering).
State that belongs in the URL (filters, tabs, selected item) goes in search params.

## TypeScript

No `any`. No `@ts-ignore`. `@ts-expect-error` only with a written reason. No non-null `!`
to silence the compiler; narrow instead.

## Structure

- `src/app/` holds routes only: pages, layouts, route files. Keep them thin.
- `src/features/<feature>/` holds a feature's components, actions, queries, schemas and
  tests together. `src/lib/` holds cross-feature helpers. `src/components/` holds shared UI.
- Unit tests sit next to the file as `*.test.tsx` (Vitest). Browser tests live in `e2e/`
  (Playwright). Async Server Components are tested through e2e, not Vitest.

## Never

- Disable a lint rule inline without a comment giving the reason.
- Add a dependency that duplicates one above (another form, fetching, state, UI or
  validation library).
- Skip or delete a failing test to get a green run.
