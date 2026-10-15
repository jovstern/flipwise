# flipwise

A Hebrew → English vocabulary flashcard app (practice take-home assignment): study one card at
a time and flip it, mark it known or still learning, and manage the deck. Single local user. Out of
scope: auth, multiple decks, deleting cards, spaced repetition, deployment.

@AGENTS.md

## Commands

- `npm run dev` — start the app
- `npm run check` — format, lint, typecheck, unit tests, build
- `npm run e2e` — browser tests (recorded)

## How work happens

- The roadmap is the GitHub issues labelled `phase`. Each runs with `/phase`: one branch, one
  PR, closed by merging. Do not write feature code outside it; for a small fix, use
  Superpowers' bounded path on a branch and open a PR.
- The product spec is `docs/superpowers/specs/project-design.md`.
- Superpowers preferences for this project:
  - No git worktrees: work in place on the phase branch.
  - When finishing a branch, always push and open a pull request; never merge locally.
  - Specs and plans are named `phase-NN-<slug>` (see `/phase`).

## Hard rules

- Follow `.claude/skills/stack-conventions/SKILL.md` and
  `.claude/skills/quality-gates/SKILL.md`.
- Never push to `main`, merge a pull request, or bypass a hook or check. The user merges.
- Every pull request carries a demo GIF (`pr-demo` skill).
- Ask before adding a dependency or changing lint, TypeScript, Next.js or CI configuration.

## Project specifics

- **Stack exception (required by the assignment):** the UI writes cards via `fetch` to
  `/api/words` (POST) and `/api/words/[id]` (PUT) from event handlers, then `router.refresh()`.
  No Server Actions for cards. Reads stay in Server Components via `src/features/words/data.ts`.
- **PUT, not PATCH:** PUT replaces word, translation, example and status (all required).
- **MongoDB** (official `mongodb` driver, no Mongoose): `MONGODB_URI` and `MONGODB_DB` in
  `.env.local` (local: `mongodb://localhost:27017`, db `flipwise`, collection `cards`).
  Tests use db `flipwise_test`, never `flipwise`. `npm run db:seed` seeds only an empty collection.
- Do not cache the Mongo client on `globalThis` (owner's choice); a module-level client is fine.
- Only `data.ts` and `src/lib/db.ts` see `ObjectId`; everything else uses a string `id`.
- Hebrew text (`word`, `example`) gets `lang="he" dir="rtl"`; Hebrew inputs use `dir="auto"`.
