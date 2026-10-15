# Phase 01: Study the deck — design

Issue: #1. Project spec: `docs/superpowers/specs/project-design.md`.

## Outcome

Open `/`, flip through the 20 seeded Hebrew cards one at a time, answer each with "I knew it" or
"Still learning", and see "X known, Y still learning" at the end. Every answer is stored in
MongoDB through `PUT /api/words/[id]`. A header nav links Study and a placeholder Deck page.

**Left to later phases:** POST and the deck grid (#2); Study again, Review still learning, Retry
on a failed PUT, Space/Enter, reduced motion, the empty-deck state and `error.tsx` (#3). The
summary in this phase shows the counts only, with no buttons.

## Approved changes to dependencies and configuration

1. Dependencies: `mongodb` and `server-only`.
2. `.github/workflows/ci.yml`: a `mongo` service container, with `MONGODB_URI` and
   `MONGODB_DB=flipwise_test` in the job env.
3. `playwright.config.ts`: the web server runs with `MONGODB_DB=flipwise_test`, and a
   `globalSetup` resets that db to the seed before the run.
4. `.gitignore`: `!.env.example`, so the example env file can be committed.

The Vitest config does not change. Route tests use `// @vitest-environment node` and
`vi.mock('server-only', () => ({}))` in the test file.

## Data layer

- **`src/lib/db.ts`** (`import 'server-only'`): a module-level `MongoClient`, created on first
  use. `getCardsCollection()` reads `MONGODB_URI` and `MONGODB_DB` when called, not at import,
  so tests can point it at `flipwise_test`. Collection `cards`. Exports the `CardDocument` type
  (`_id: ObjectId`, `word`, `translation`, `example`, `status`, `createdAt: Date`).
- **`src/features/words/schema.ts`**: Zod `Status` (`'new' | 'known' | 'learning'`), `Card`
  (with string `id`), `NewCard` (word, translation and example trimmed, non-empty, with max
  lengths; status defaults to `new`) and `CardReplacement` (word, translation, example and
  status, all required). Types come from `z.infer`. `NewCard` is defined now to match the
  project spec; nothing uses it until #2.
- **`src/features/words/data.ts`** (`import 'server-only'`):
  - `toCard(doc)` maps `_id` to `id` and drops `createdAt`.
  - `listCards()` returns `Card[]` sorted by `createdAt`, then `_id`.
  - `replaceCard(id, replacement)` returns `Card | null`. It returns `null` for an id that is
    not a valid ObjectId or matches no card. It keeps `_id` and `createdAt`.
- **Seed:**
  - `src/features/words/seed.json` holds 20 cards. Each has a Hebrew word, its English
    translation and a Hebrew example sentence that uses the word.
  - `src/features/words/seed.ts` exports `seedDocuments()`, which turns the JSON into
    documents with status `new` and a `createdAt` one second apart in file order, so the order
    is stable. It also exports `resetToSeed(collection)` (delete all, insert the seed) for
    tests.
  - `scripts/seed.mts` is run by `npm run db:seed` as
    `node --env-file=.env.local scripts/seed.mts`. It loads `seed.json` itself and inserts only
    if the collection is empty, printing what it did. Node cannot import the `.ts` helper
    without a tsconfig change, so the script repeats the few lines that build the documents.
- **`.env.example`**: `MONGODB_URI=mongodb://localhost:27017` and `MONGODB_DB=flipwise`.

## API

| Route | Behavior |
|---|---|
| `GET /api/words` (`src/app/api/words/route.ts`) | `await connection()`, then 200 with `listCards()`. |
| `PUT /api/words/[id]` (`src/app/api/words/[id]/route.ts`) | Invalid JSON or a body failing `CardReplacement`: 400 with `{ error, issues? }`. `replaceCard` returns `null`: 404 with `{ error }`. Otherwise 200 with the `Card`. |

Nothing is cached. `connection()` keeps the build from prerendering the GET route, so the build
never queries the database. It is called in the route and the page, not in `data.ts`, so tests
can call the data functions outside a request.

## Study UI

- **`src/app/page.tsx`**: a thin page. It renders `<Suspense>` around an async `StudyDeck`,
  which calls `await connection()` and `listCards()`, then renders `<StudySession cards>`.
- **`src/features/study/studyReducer.ts`**:
  - State: `{ queue: Card[], index, flipped, results: Record<id, 'known' | 'learning'> }`.
  - Actions: `flip` (sets `flipped`) and `answer` (requires `flipped`; records the result,
    moves `index` forward and clears `flipped`).
  - Helpers: `isFinished(state)` and `countResults(state)`. Counts are always derived from
    `results` and never stored.
- **`src/features/study/StudySession.tsx`** (`'use client'`):
  - Holds the reducer state.
  - On answer it dispatches first, so the next card appears at once, then sends
    `PUT /api/words/[id]` with the card's word, translation and example and the new status.
  - On a 2xx response it calls `router.refresh()`. Otherwise, or on a network error, it shows
    an inline `role="alert"`: "Couldn't save your answer for <word>." The session continues.
  - When finished it renders `StudySummary`. Above the card it shows the position, e.g. "Card 3
    of 20".
- **`src/features/study/Flashcard.tsx`** (`'use client'`, presentational):
  - A `<button>` whose accessible name is the Hebrew word plus "show answer" until it is
    flipped.
  - The front shows the word. The back shows the word, the translation and the example.
  - Hebrew text gets `lang="he" dir="rtl"`.
  - The flip is a Tailwind 3D rotation: `perspective`, `transform-3d`, `backface-hidden` and
    `rotate-y-180`.
- **Answer buttons:** "I knew it" and "Still learning" are disabled until the card is flipped.
- **`src/features/study/StudySummary.tsx`**: "X known, Y still learning".
- **Shell:**
  - `src/components/SiteNav.tsx` (`'use client'`) uses `usePathname` to set
    `aria-current="page"` on the active link, and is rendered in the root layout's header.
  - `src/app/deck/page.tsx` is a placeholder ("The deck is coming soon").
  - The greeting example leaves the home page and its e2e test is deleted. The
    `src/features/greeting/` folder and its unit test stay, because `stack-conventions` names
    `GreetingForm.tsx` as the reference for every form.

## Testing

- **Vitest:**
  - `schema.test.ts`: valid and invalid `CardReplacement`, trimming, and the default for
    `NewCard`.
  - `studyReducer.test.ts`: flip, the answer guard, advancing, finishing and counts.
  - `data.test.ts` (node environment): `toCard`.
  - `StudySession.test.tsx`, with `fetch` stubbed and `next/navigation` mocked:
    - the buttons are disabled until the card is flipped;
    - each answer sends a PUT with the right URL and body;
    - the summary counts are correct;
    - a failed PUT shows the alert and the session continues.
  - `SiteNav.test.tsx`: `aria-current` on the active link.
- **Route tests:** `src/app/api/words/routes.test.ts`, node environment, against
  `flipwise_test`, reset with `resetToSeed` before each test. It is one file, because Vitest
  runs files in parallel and they would race on the shared db. It covers:
  - GET returns 20 cards with string `id`s, oldest first;
  - PUT returns 200 with the card and the change persists;
  - PUT returns 400 for a missing field, a bad status and invalid JSON;
  - PUT returns 404 for an unknown and for a malformed id.
- **Playwright** (`e2e/study.spec.ts`, with `e2e/global-setup.ts` resetting `flipwise_test`):
  - On the first card the answer buttons are disabled. Flip each card and answer the 20 cards
    in a known pattern (e.g. every third card "Still learning"). Expect the summary counts, then
    check `request.get('/api/words')` for the stored statuses.
  - The nav reaches Deck and marks it current.

## Error handling

- The API validates every body with Zod. A malformed id and an unknown id are both 404.
- A read failure on `/` has no `error.tsx` in this phase (that comes in #3), so it falls back to
  Next's default error page.
