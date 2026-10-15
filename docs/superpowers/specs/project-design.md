# flipwise — project design

## Purpose

A small vocabulary flashcard app for studying Hebrew → English, built as a practice take-home
assignment ("Vocabulary Flashcard App", Next.js App Router). Success means every requirement of
the assignment is met and demoable, on our stack (`stack-conventions`).

**Users:** a single learner running the app locally. No accounts.

## Scope

- REST API at `/api/words`: list (GET), add (POST), replace one card (PUT).
- Study view (`/`): one card at a time, flip to reveal, "I knew it" / "Still learning",
  results summary at the end.
- Deck view (`/deck`): every card with its status, plus a form to add a card.
- Header nav between the two routes.
- Cards and their status persist in a local MongoDB.

## Out of scope

Auth and multiple users, multiple decks, deleting cards, an edit UI (PUT exists but only the
study flow uses it), spaced-repetition scheduling, deployment, i18n of the UI itself
(UI chrome is English).

## Assignment exception to the stack rules

The assignment requires the UI to write through the API. So, unlike the default stack rule,
**the app's own UI writes via `fetch` to `/api/words` from event handlers**, then calls
`router.refresh()`. There are no Server Actions for cards. Reads stay in Server Components
through `src/features/words/data.ts`. Never `fetch` in `useEffect`.

No TanStack Query, no Zustand: nothing polls, and no state is shared across distant parts of
the UI.

## Data model

MongoDB `flipwise.cards` (official `mongodb` driver, no Mongoose):

```
{ _id: ObjectId, word: string, translation: string, example: string, exampleTranslation: string,
  status: 'new' | 'known' | 'learning', createdAt: Date }
```

- `word` and `example` are Hebrew; `translation` and `exampleTranslation` are English.
- The data layer maps `_id` → string `id`. Nothing outside `src/features/words/data.ts` and
  `src/lib/db.ts` sees an `ObjectId`.
- Zod schemas in `src/features/words/schema.ts`: `Card` (with `id`), `NewCard`
  (word, translation, example, exampleTranslation: trimmed, non-empty, max lengths; status defaults to `new`),
  `CardReplacement` (word, translation, example, exampleTranslation, status, all required, for PUT).
  Types come from `z.infer`.

**Connection:** `src/lib/db.ts` (`import 'server-only'`) creates one module-level
`MongoClient` and exports `getCardsCollection()`. No `globalThis` caching (owner's choice);
hot reload in dev may open a few extra connections, which is accepted.

**Env** (server only, `.env.local`, with `.env.example` committed):
`MONGODB_URI=mongodb://localhost:27017`, `MONGODB_DB=flipwise`.

**Seed:** `npm run db:seed` inserts 20 Hebrew → English cards (word, translation, Hebrew
example sentence using the word) from `src/features/words/seed.json`, only if the collection
is empty. Tests use `MONGODB_DB=flipwise_test`, reset to the seed before each suite.

## API

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/words` | — | 200 `Card[]`, oldest first | — |
| POST | `/api/words` | `NewCard` | 201 `Card` | 400 invalid body |
| PUT | `/api/words/[id]` | `CardReplacement` | 200 `Card` | 400 invalid body, 404 unknown or malformed id |

PUT replaces all editable fields (word, translation, example, exampleTranslation, status); `id` and `createdAt`
are kept. Error bodies: `{ error: string, issues?: ZodIssue[] }`.

## Main flows

### Study (`/`)

1. The page (Server Component, in `<Suspense>`) reads all cards and passes them to the client
   `StudySession`. No cards → empty state linking to `/deck`.
2. `StudySession` state via `useReducer`:
   `{ queue: Card[], index, flipped, results: Record<id, 'known' | 'learning'> }`.
   Known/learning counts are derived from `results`, not stored.
3. `Flashcard` is a `<button>` showing the Hebrew word; click, tap, Space or Enter flips it
   to show translation + example and its English translation (CSS 3D transition; plain swap under
   `prefers-reduced-motion`). Hebrew text has `lang="he" dir="rtl"`.
4. "I knew it" / "Still learning" (enabled once flipped) record the result, advance at once,
   and send `PUT /api/words/[id]` with the full card and the new status. On failure, show an
   inline error with Retry; the session keeps going.
5. After the last card: summary "X known, Y still learning", with **Study again** (whole
   deck, fresh session, after `router.refresh()`) and **Review the Y still learning** (queue
   = only those cards; hidden when Y = 0).

### Deck (`/deck`)

1. The page reads all cards and renders a responsive grid: word (RTL), translation, example (RTL) and its English translation,
   status badge (New / Known / Learning).
2. "Add card" form (TanStack Form + Zod `NewCard`, the same schema as POST): Hebrew inputs
   use `dir="auto"`. On submit, `POST /api/words`; on success reset the form and
   `router.refresh()` so the card appears; on 400 show field errors, on other failures a
   form-level `role="alert"` error.

### Shell

Root layout with a header nav (Study, Deck; active link marked with `aria-current="page"`),
mobile-first Tailwind layout, a Hebrew-capable font via `next/font`, `error.tsx` for the
routes.

## Testing

- Vitest: the session reducer, the Zod schemas, `_id` ↔ `id` mapping.
- Route Handler tests calling `GET`, `POST` and `PUT` directly against `flipwise_test`.
- Playwright (`e2e/`): flip → answer → summary counts; Review-still-learning; add a card on
  `/deck` and see it listed; status set during study shows on `/deck`.
