# Phase 01: Study the deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/`, study the 20 seeded Hebrew cards one at a time (flip, then "I knew it" or "Still learning"), see "X known, Y still learning" at the end, and have every answer saved to MongoDB through `PUT /api/words/[id]`.

**Architecture:**
- The data layer (`src/lib/db.ts` and `src/features/words/data.ts`) wraps the official `mongodb` driver and maps `_id` to a string `id`.
- Route Handlers serve `GET /api/words` and `PUT /api/words/[id]`, validated with Zod.
- The study page is a Server Component that reads the cards and passes them to a client `StudySession`. `StudySession` runs a `useReducer` session and writes each answer with `fetch` (PUT), followed by `router.refresh()`.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components, React Compiler), React 19.3, TypeScript strict, Tailwind v4, Zod 4, `mongodb` 7, Vitest 5 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/phase-01-study-the-deck-design.md` (project spec: `docs/superpowers/specs/project-design.md`, issue #1)

## Global Constraints

- Follow `.claude/skills/stack-conventions/SKILL.md` and `.claude/skills/quality-gates/SKILL.md`.
- Read the matching guide in `node_modules/next/dist/docs/` before using any Next.js API (see `AGENTS.md`).
- **Stack exception (required by the assignment):** the UI writes cards via `fetch` to `/api/words/[id]` (PUT) from event handlers, then calls `router.refresh()`. There are no Server Actions for cards. Reads stay in Server Components via `src/features/words/data.ts`. Never `fetch` in `useEffect`.
- **Data — Study (`/`):** the async Server Component `StudyDeck` calls `await connection()` and then `listCards()`, inside `<Suspense>` on the page. It is not cached. Writes go through `fetch` PUT `/api/words/[id]` from the answer handler, then `router.refresh()`. Session state lives in `useReducer` inside `StudySession`.
- **Data — Deck (`/deck`):** a static placeholder that reads no data in this phase.
- **Data — `GET /api/words`:** a Route Handler that calls `await connection()` and then `listCards()`. It is not cached.
- **No TanStack Query and no Zustand** in this phase.
- **PUT, not PATCH:** PUT replaces word, translation, example and status, all required. `id` and `createdAt` are kept.
- **MongoDB:** the official `mongodb` driver, no Mongoose. `MONGODB_URI` and `MONGODB_DB` are read on the server only, at call time. The collection is `cards`. Dev uses db `flipwise`; tests use db `flipwise_test`, never `flipwise`.
- Do not cache the Mongo client on `globalThis`; a module-level client is fine.
- Only `src/features/words/data.ts`, its test and `src/lib/db.ts` import `ObjectId`. Everything else uses a string `id`.
- Hebrew text (`word`, `example`) gets `lang="he" dir="rtl"`.
- **Approved dependency and config changes, and only these:**
  - add `mongodb` and `server-only`;
  - add a mongo service and env to `.github/workflows/ci.yml`;
  - set the web server env and add `globalSetup` in `playwright.config.ts`;
  - add `!.env.example` to `.gitignore`.
  - Do not change the Vitest, ESLint, TypeScript or Next.js config.
- **Local MongoDB** must be running at `mongodb://localhost:27017` (check with `mongosh --quiet --eval 'db.version()'`). If it isn't, run `brew services start mongodb-community`.
- **Formatting:** run `npx prettier --write <changed files>` before every commit (the pre-commit hook checks formatting, lint and types; never bypass it).
- **Copy, exactly:** the buttons are "I knew it" and "Still learning". The summary is "{known} known, {learning} still learning". The position line is "Card {n} of {total}". The save error is "Couldn't save your answer for {word}." The flip hint is "Show answer".

## Review Focus

1. **`router.refresh()` mid-session must not reset the session.** If the refresh shows the Suspense fallback or remounts `StudySession`, the deck restarts at card 1. This is pinned by the Task 7 e2e, which checks "Card n of 20" on every step through all 20 cards.
2. **A whitespace-only field in a PUT body** must give 400, not store an empty string. This is pinned by a Task 3 route test.
3. **A PUT body carrying `id`, `_id` or `createdAt`** must not change the card's id or its place in the order: unknown keys are stripped. This is pinned by a Task 3 route test.
4. **Answering an unflipped card, or answering twice quickly,** must not record or skip anything. This is pinned by the Task 4 reducer test, and the Task 5 test checks that the buttons are disabled.
5. **Hebrew is marked up for RTL:** the word and the example render with `lang="he" dir="rtl"`. This is pinned by a Task 5 component test.

---

## File map

| File | Responsibility |
|---|---|
| `src/features/words/schema.ts` | Zod `Status`, `Card`, `NewCard`, `CardReplacement`, and inferred types |
| `src/lib/db.ts` | Module-level `MongoClient`, `getCardsCollection()`, `closeDb()`, `CardDocument` type |
| `src/features/words/data.ts` | `toCard`, `listCards`, `replaceCard` (the only ObjectId user outside db.ts) |
| `src/features/words/seed.json` | The 20 seed cards |
| `src/features/words/seed.ts` | `seedDocuments()`, `resetToSeed(collection)` for tests |
| `scripts/seed.mts` | `npm run db:seed`: inserts the seed only into an empty collection |
| `src/app/api/words/route.ts` | `GET /api/words` |
| `src/app/api/words/[id]/route.ts` | `PUT /api/words/[id]` |
| `src/app/api/words/routes.test.ts` | Route Handler tests against `flipwise_test` |
| `src/features/study/studyReducer.ts` | Session state, actions and derived helpers |
| `src/features/study/Flashcard.tsx` | The flip card button |
| `src/features/study/StudySummary.tsx` | The end-of-session counts |
| `src/features/study/StudySession.tsx` | Client session: reducer, answer buttons, PUT, refresh, save error |
| `src/features/study/StudyDeck.tsx` | Async Server Component: reads the cards and renders `StudySession` |
| `src/components/SiteNav.tsx` | Header nav with `aria-current` |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/deck/page.tsx` | Shell, Study route, Deck placeholder |
| `e2e/mongo-env.ts`, `e2e/global-setup.ts`, `e2e/study.spec.ts` | E2E db settings, reset and flows |

---

### Task 1: Card schemas

**Files:**
- Create: `src/features/words/schema.ts`
- Test: `src/features/words/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Zod schemas plus types of the same name: `Status` (`'new' | 'known' | 'learning'`), `Card` (`{ id, word, translation, example, status }`), `NewCard` (`{ word, translation, example, status }`, status defaults to `'new'`) and `CardReplacement` (`{ word, translation, example, status }`, all required).
  - Import path `@/features/words/schema`.

- [ ] **Step 1: Write the failing test**

`src/features/words/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Card, CardReplacement, NewCard } from './schema'

const valid = {
  word: 'שלום',
  translation: 'hello',
  example: 'שלום, מה שלומך?',
  status: 'known',
}

describe('CardReplacement', () => {
  it('accepts a full card and trims the text fields', () => {
    const parsed = CardReplacement.parse({ ...valid, word: '  שלום  ', translation: ' hello ' })
    expect(parsed).toEqual(valid)
  })

  it.each(['word', 'translation', 'example', 'status'])('requires %s', (field) => {
    const body: Record<string, unknown> = { ...valid }
    delete body[field]
    expect(CardReplacement.safeParse(body).success).toBe(false)
  })

  it('rejects whitespace-only text', () => {
    expect(CardReplacement.safeParse({ ...valid, translation: '   ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(CardReplacement.safeParse({ ...valid, status: 'mastered' }).success).toBe(false)
  })

  it('rejects text over the max length', () => {
    expect(CardReplacement.safeParse({ ...valid, word: 'א'.repeat(101) }).success).toBe(false)
    expect(CardReplacement.safeParse({ ...valid, example: 'א'.repeat(301) }).success).toBe(false)
  })

  it('strips unknown keys such as id and createdAt', () => {
    const parsed = CardReplacement.parse({ ...valid, id: 'x', _id: 'y', createdAt: 'z' })
    expect(parsed).toEqual(valid)
  })
})

describe('NewCard', () => {
  it('defaults status to new', () => {
    const { status, ...fields } = valid
    expect(status).toBe('known')
    expect(NewCard.parse(fields).status).toBe('new')
  })
})

describe('Card', () => {
  it('requires a string id', () => {
    expect(Card.safeParse({ ...valid, id: 'abc' }).success).toBe(true)
    expect(Card.safeParse(valid).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/words/schema.test.ts`
Expected: FAIL with "Failed to resolve import "./schema"".

- [ ] **Step 3: Implement**

`src/features/words/schema.ts`:

```ts
import { z } from 'zod'

export const Status = z.enum(['new', 'known', 'learning'])
export type Status = z.infer<typeof Status>

const word = z
  .string()
  .trim()
  .min(1, 'Enter the Hebrew word')
  .max(100, 'Keep the word under 100 characters')
const translation = z
  .string()
  .trim()
  .min(1, 'Enter the translation')
  .max(100, 'Keep the translation under 100 characters')
const example = z
  .string()
  .trim()
  .min(1, 'Enter an example sentence')
  .max(300, 'Keep the example under 300 characters')

/** Body of POST /api/words (used from phase 02). */
export const NewCard = z.object({ word, translation, example, status: Status.default('new') })
export type NewCard = z.infer<typeof NewCard>

/** Body of PUT /api/words/[id]: replaces every editable field. */
export const CardReplacement = z.object({ word, translation, example, status: Status })
export type CardReplacement = z.infer<typeof CardReplacement>

/** A card as the app and the API see it. */
export const Card = z.object({
  id: z.string(),
  word: z.string(),
  translation: z.string(),
  example: z.string(),
  status: Status,
})
export type Card = z.infer<typeof Card>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/words/schema.test.ts && npm run lint && npm run typecheck`
Expected: all tests PASS; lint and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/words/schema.ts src/features/words/schema.test.ts
git commit -m "feat(words): card schemas"
```

---

### Task 2: MongoDB connection, data functions and seed

**Files:**
- Modify: `package.json` (dependencies plus a `db:seed` script), `package-lock.json`, `.gitignore`
- Create: `.env.example`, `src/lib/db.ts`, `src/features/words/data.ts`, `src/features/words/seed.json`, `src/features/words/seed.ts`, `scripts/seed.mts`
- Test: `src/features/words/data.test.ts`

**Interfaces:**
- Consumes: `Card`, `CardReplacement`, `Status` from Task 1.
- Produces:
  - `src/lib/db.ts`:
    - `type CardDocument = { word: string; translation: string; example: string; status: Status; createdAt: Date }` (no `_id`; the driver adds `WithId<>`);
    - `getCardsCollection(): Collection<CardDocument>`;
    - `closeDb(): Promise<void>`.
  - `src/features/words/data.ts`:
    - `toCard(doc: WithId<CardDocument>): Card`;
    - `listCards(): Promise<Card[]>` (oldest first);
    - `replaceCard(id: string, replacement: CardReplacement): Promise<Card | null>`.
  - `src/features/words/seed.ts`:
    - `seedDocuments(): CardDocument[]`;
    - `resetToSeed(collection: Collection<CardDocument>): Promise<void>`.
  - `src/features/words/seed.json`: an array of `{ word, translation, example }`.

- [ ] **Step 1: Install the approved dependencies and set up env files**

```bash
npm install mongodb@^7.7.0 server-only@^0.0.1
```

Append to `.gitignore`, right after the `.env*` line:

```
!.env.example
```

Create `.env.example`:

```
# Copy to .env.local. Server-only; never prefix these with NEXT_PUBLIC_.
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=flipwise
```

Then run `cp .env.example .env.local`. `.env.local` stays untracked.

In `package.json` `scripts`, add after `"start"`:

```json
"db:seed": "node --env-file=.env.local scripts/seed.mts",
```

- [ ] **Step 2: Write the failing test**

`src/features/words/data.test.ts`:

```ts
// @vitest-environment node
import { ObjectId } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'
import { toCard } from './data'

vi.mock('server-only', () => ({}))

describe('toCard', () => {
  it('maps _id to a string id and drops createdAt', () => {
    const _id = new ObjectId()
    const card = toCard({
      _id,
      word: 'ספר',
      translation: 'book',
      example: 'קראתי ספר.',
      status: 'learning',
      createdAt: new Date(),
    })
    expect(card).toEqual({
      id: _id.toHexString(),
      word: 'ספר',
      translation: 'book',
      example: 'קראתי ספר.',
      status: 'learning',
    })
  })

  it('rejects a stored document with an unknown status', () => {
    expect(() =>
      toCard({
        _id: new ObjectId(),
        word: 'ספר',
        translation: 'book',
        example: 'קראתי ספר.',
        // @ts-expect-error -- simulates a corrupt stored document
        status: 'mastered',
        createdAt: new Date(),
      }),
    ).toThrow()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/features/words/data.test.ts`
Expected: FAIL with "Failed to resolve import "./data"".

- [ ] **Step 4: Implement the connection and data functions**

`src/lib/db.ts`:

```ts
import 'server-only'
import { MongoClient, type Collection } from 'mongodb'
import type { Status } from '@/features/words/schema'

/** A card as stored in MongoDB. The driver adds `_id` (see `WithId`). */
export type CardDocument = {
  word: string
  translation: string
  example: string
  status: Status
  createdAt: Date
}

// Module-level client: the owner chose not to cache it on globalThis.
let client: MongoClient | undefined

function requireEnv(name: 'MONGODB_URI' | 'MONGODB_DB'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local.`)
  return value
}

export function getCardsCollection(): Collection<CardDocument> {
  client ??= new MongoClient(requireEnv('MONGODB_URI'))
  return client.db(requireEnv('MONGODB_DB')).collection<CardDocument>('cards')
}

export async function closeDb(): Promise<void> {
  await client?.close()
  client = undefined
}
```

`src/features/words/data.ts`:

```ts
import 'server-only'
import { ObjectId, type WithId } from 'mongodb'
import { getCardsCollection, type CardDocument } from '@/lib/db'
import { Card, type CardReplacement } from './schema'

const OBJECT_ID = /^[0-9a-f]{24}$/i

export function toCard({ _id, word, translation, example, status }: WithId<CardDocument>): Card {
  return Card.parse({ id: _id.toHexString(), word, translation, example, status })
}

/** All cards, oldest first. */
export async function listCards(): Promise<Card[]> {
  const docs = await getCardsCollection().find().sort({ createdAt: 1, _id: 1 }).toArray()
  return docs.map(toCard)
}

/** Replaces a card's editable fields. Returns null for a malformed or unknown id. */
export async function replaceCard(
  id: string,
  replacement: CardReplacement,
): Promise<Card | null> {
  if (!OBJECT_ID.test(id)) return null
  const doc = await getCardsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: replacement },
    { returnDocument: 'after' },
  )
  return doc ? toCard(doc) : null
}
```

`ObjectId.isValid` is not used because it accepts any 12-character string. The regex accepts only the 24-hex form.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/words/data.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Add the seed data, test helpers and seed script**

`src/features/words/seed.json`:

```json
[
  { "word": "שלום", "translation": "hello", "example": "שלום, מה שלומך היום?" },
  { "word": "ספר", "translation": "book", "example": "קראתי ספר מעניין בשבוע שעבר." },
  { "word": "בית", "translation": "house", "example": "הבית שלנו נמצא ליד הים." },
  { "word": "מים", "translation": "water", "example": "אני שותה הרבה מים בקיץ." },
  { "word": "חבר", "translation": "friend", "example": "הוא החבר הכי טוב שלי." },
  { "word": "עבודה", "translation": "work", "example": "אני נוסע לעבודה ברכבת." },
  { "word": "אוכל", "translation": "food", "example": "האוכל במסעדה הזאת טעים מאוד." },
  { "word": "זמן", "translation": "time", "example": "אין לי זמן לראות טלוויזיה." },
  { "word": "משפחה", "translation": "family", "example": "כל המשפחה נפגשת ביום שישי בערב." },
  { "word": "עיר", "translation": "city", "example": "תל אביב היא עיר שלא ישנה." },
  { "word": "שמש", "translation": "sun", "example": "השמש זורחת מוקדם בבוקר." },
  { "word": "לחם", "translation": "bread", "example": "קניתי לחם טרי במאפייה." },
  { "word": "ילד", "translation": "child", "example": "הילד משחק בגינה." },
  { "word": "רחוב", "translation": "street", "example": "הרחוב הזה שקט בלילה." },
  { "word": "שאלה", "translation": "question", "example": "יש לי שאלה על השיעור." },
  { "word": "תשובה", "translation": "answer", "example": "המורה נתנה תשובה ברורה." },
  { "word": "מחר", "translation": "tomorrow", "example": "נתראה מחר בבוקר." },
  { "word": "אהבה", "translation": "love", "example": "השיר הזה מדבר על אהבה." },
  { "word": "חלון", "translation": "window", "example": "תפתח את החלון, חם פה." },
  { "word": "מפתח", "translation": "key", "example": "שכחתי את המפתח בבית." }
]
```

`src/features/words/seed.ts` (no `server-only`: the Playwright global setup imports it too):

```ts
import type { Collection } from 'mongodb'
import type { CardDocument } from '../../lib/db'
import seed from './seed.json'

// Fixed, one second apart, so "oldest first" is the file order.
const SEED_START = Date.UTC(2026, 0, 1)

export function seedDocuments(): CardDocument[] {
  return seed.map(
    (card, index): CardDocument => ({
      ...card,
      status: 'new',
      createdAt: new Date(SEED_START + index * 1000),
    }),
  )
}

/** Test helper: empties the collection and inserts the seed. */
export async function resetToSeed(collection: Collection<CardDocument>): Promise<void> {
  await collection.deleteMany({})
  await collection.insertMany(seedDocuments())
}
```

`scripts/seed.mts`. This script is self-contained, because Node cannot import `seed.ts` without a tsconfig change. Keep the document shape in step with `seedDocuments()`.

```ts
import { MongoClient } from 'mongodb'
import seed from '../src/features/words/seed.json' with { type: 'json' }

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB
if (!uri || !dbName) {
  console.error('MONGODB_URI and MONGODB_DB must be set. Copy .env.example to .env.local.')
  process.exit(1)
}

// Same shape and timestamps as seedDocuments() in src/features/words/seed.ts.
const SEED_START = Date.UTC(2026, 0, 1)

const client = new MongoClient(uri)
try {
  const cards = client.db(dbName).collection('cards')
  const count = await cards.countDocuments()
  if (count > 0) {
    console.log(`${dbName}.cards already has ${count} cards; nothing seeded.`)
  } else {
    await cards.insertMany(
      seed.map((card, index) => ({
        ...card,
        status: 'new',
        createdAt: new Date(SEED_START + index * 1000),
      })),
    )
    console.log(`Seeded ${seed.length} cards into ${dbName}.cards.`)
  }
} finally {
  await client.close()
}
```

- [ ] **Step 7: Verify the seed script against the test db**

`--env-file` does not override variables that are already set, so this run targets `flipwise_test`:

```bash
mongosh --quiet flipwise_test --eval 'db.cards.drop()'
MONGODB_DB=flipwise_test npm run db:seed
MONGODB_DB=flipwise_test npm run db:seed
mongosh --quiet flipwise_test --eval 'db.cards.countDocuments()'
```

Expected:
- the first run prints "Seeded 20 cards into flipwise_test.cards.";
- the second prints "flipwise_test.cards already has 20 cards; nothing seeded.";
- the count is `20`.

Then seed the dev db: `npm run db:seed`.

- [ ] **Step 8: Lint, typecheck and commit**

Run: `npm run lint && npm run typecheck && npx vitest run src/features/words`
Expected: clean, all PASS.

```bash
git add package.json package-lock.json .gitignore .env.example src/lib/db.ts src/features/words/data.ts src/features/words/data.test.ts src/features/words/seed.json src/features/words/seed.ts scripts/seed.mts
git commit -m "feat(words): MongoDB data layer and seed"
```

---

### Task 3: `GET /api/words` and `PUT /api/words/[id]`

**Files:**
- Create: `src/app/api/words/route.ts`, `src/app/api/words/[id]/route.ts`
- Test: `src/app/api/words/routes.test.ts`

**Interfaces:**
- Consumes: `listCards` and `replaceCard` from `@/features/words/data`; `CardReplacement` and `Card` from `@/features/words/schema`; `getCardsCollection` and `closeDb` from `@/lib/db`; `resetToSeed` from `@/features/words/seed`.
- Produces:
  - `GET()` returns 200 with `Card[]`.
  - `PUT(request, ctx: RouteContext<'/api/words/[id]'>)` returns:
    - 200 with `Card`;
    - 400 with `{ error: string, issues?: ZodIssue[] }`;
    - 404 with `{ error: string }`.
  - Task 5 relies on the PUT body being `{ word, translation, example, status }`.

Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (the "With Cache Components" and "Route Context Helper" sections) and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md` first.

- [ ] **Step 1: Write the failing tests**

`src/app/api/words/routes.test.ts`. It is a single file on purpose: Vitest runs files in parallel, and they would race on `flipwise_test`.

```ts
// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Card } from '@/features/words/schema'
import { resetToSeed } from '@/features/words/seed'
import seed from '@/features/words/seed.json'
import { closeDb, getCardsCollection } from '@/lib/db'
import { PUT } from './[id]/route'
import { GET } from './route'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  process.env.MONGODB_URI ??= 'mongodb://localhost:27017'
  process.env.MONGODB_DB = 'flipwise_test'
})
beforeEach(async () => {
  await resetToSeed(getCardsCollection())
})
afterAll(async () => {
  await closeDb()
})

async function listViaApi() {
  const res = await GET()
  return { status: res.status, cards: z.array(Card).parse(await res.json()) }
}

function put(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/words/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return PUT(request, { params: Promise.resolve({ id }) })
}

const replacement = {
  word: 'שלום רב',
  translation: 'greetings',
  example: 'שלום רב לכולם.',
  status: 'known',
}

describe('GET /api/words', () => {
  it('returns every card with a string id, oldest first', async () => {
    const { status, cards } = await listViaApi()
    expect(status).toBe(200)
    expect(cards).toHaveLength(20)
    expect(cards.map((card) => card.word)).toEqual(seed.map((card) => card.word))
    for (const card of cards) {
      expect(card.id).toMatch(/^[0-9a-f]{24}$/)
      expect(card.status).toBe('new')
    }
  })
})

describe('PUT /api/words/[id]', () => {
  it('replaces the card, returns it and persists it', async () => {
    const { cards } = await listViaApi()
    const target = cards[3]
    const res = await put(target.id, replacement)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: target.id, ...replacement })

    const after = await listViaApi()
    expect(after.cards[3]).toEqual({ id: target.id, ...replacement })
  })

  it('ignores id, _id and createdAt in the body', async () => {
    const { cards } = await listViaApi()
    const target = cards[0]
    const res = await put(target.id, {
      ...replacement,
      id: 'ffffffffffffffffffffffff',
      _id: 'ffffffffffffffffffffffff',
      createdAt: '2099-01-01T00:00:00.000Z',
    })
    expect(res.status).toBe(200)
    const after = await listViaApi()
    expect(after.cards[0].id).toBe(target.id)
    expect(after.cards[0].word).toBe(replacement.word)
  })

  it.each([
    ['a missing field', { word: 'א', translation: 'a', example: 'א' }],
    ['an unknown status', { ...replacement, status: 'mastered' }],
    ['a whitespace-only field', { ...replacement, translation: '   ' }],
  ])('returns 400 with issues for %s', async (_label, body) => {
    const { cards } = await listViaApi()
    const res = await put(cards[0].id, body)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toEqual(expect.any(String))
    expect(json.issues.length).toBeGreaterThan(0)

    const after = await listViaApi()
    expect(after.cards[0]).toEqual(cards[0])
  })

  it('returns 400 for a body that is not JSON', async () => {
    const { cards } = await listViaApi()
    const res = await put(cards[0].id, '{not json')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toEqual(expect.any(String))
  })

  it.each([
    ['an unknown id', '0123456789abcdef01234567'],
    ['a malformed id', 'not-an-id'],
    ['a 12-character id', 'abcdefghijkl'],
  ])('returns 404 for %s', async (_label, id) => {
    const res = await put(id, replacement)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toEqual(expect.any(String))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/words/routes.test.ts`
Expected: FAIL with "Failed to resolve import "./[id]/route"".

- [ ] **Step 3: Implement the routes**

`src/app/api/words/route.ts`:

```ts
import { connection } from 'next/server'
import { listCards } from '@/features/words/data'

export async function GET() {
  // Request-time only: keeps the build from prerendering this route (and querying MongoDB).
  await connection()
  return Response.json(await listCards())
}
```

`src/app/api/words/[id]/route.ts`:

```ts
import { replaceCard } from '@/features/words/data'
import { CardReplacement } from '@/features/words/schema'

export async function PUT(request: Request, ctx: RouteContext<'/api/words/[id]'>) {
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = CardReplacement.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'The card is not valid.', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const card = await replaceCard(id, parsed.data)
  if (!card) return Response.json({ error: 'Card not found.' }, { status: 404 })
  return Response.json(card)
}
```

`RouteContext` is a global type generated by `next typegen`, which `npm run typecheck` runs.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/words/routes.test.ts && npm run lint && npm run typecheck`
Expected: all PASS; lint and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/words
git commit -m "feat(api): GET /api/words and PUT /api/words/[id]"
```

---

### Task 4: Study session reducer

**Files:**
- Create: `src/features/study/studyReducer.ts`
- Test: `src/features/study/studyReducer.test.ts`

**Interfaces:**
- Consumes: `Card` type from `@/features/words/schema`.
- Produces:
  - `type Answer = 'known' | 'learning'`
  - `type StudyState = { queue: Card[]; index: number; flipped: boolean; results: Record<string, Answer> }`
  - `type StudyAction = { type: 'flip' } | { type: 'answer'; answer: Answer }`
  - `initStudy(cards: Card[]): StudyState`
  - `studyReducer(state: StudyState, action: StudyAction): StudyState`
  - `currentCard(state: StudyState): Card | undefined`
  - `isFinished(state: StudyState): boolean`
  - `countResults(state: StudyState): { known: number; learning: number }`

- [ ] **Step 1: Write the failing test**

`src/features/study/studyReducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Card } from '@/features/words/schema'
import { countResults, currentCard, initStudy, isFinished, studyReducer } from './studyReducer'

const cards: Card[] = [
  { id: 'a', word: 'שלום', translation: 'hello', example: 'שלום לך.', status: 'new' },
  { id: 'b', word: 'ספר', translation: 'book', example: 'קראתי ספר.', status: 'known' },
]

describe('studyReducer', () => {
  it('starts on the first card, unflipped, with no results', () => {
    const state = initStudy(cards)
    expect(currentCard(state)).toEqual(cards[0])
    expect(state.flipped).toBe(false)
    expect(countResults(state)).toEqual({ known: 0, learning: 0 })
    expect(isFinished(state)).toBe(false)
  })

  it('flips the current card', () => {
    expect(studyReducer(initStudy(cards), { type: 'flip' }).flipped).toBe(true)
  })

  it('ignores an answer before the card is flipped', () => {
    const state = initStudy(cards)
    expect(studyReducer(state, { type: 'answer', answer: 'known' })).toBe(state)
  })

  it('records the answer, moves to the next card and unflips', () => {
    let state = studyReducer(initStudy(cards), { type: 'flip' })
    state = studyReducer(state, { type: 'answer', answer: 'learning' })
    expect(state.results).toEqual({ a: 'learning' })
    expect(currentCard(state)).toEqual(cards[1])
    expect(state.flipped).toBe(false)
  })

  it('ignores a second answer on the same card (double click)', () => {
    let state = studyReducer(initStudy(cards), { type: 'flip' })
    state = studyReducer(state, { type: 'answer', answer: 'known' })
    const again = studyReducer(state, { type: 'answer', answer: 'known' })
    expect(again).toBe(state)
    expect(again.results).toEqual({ a: 'known' })
  })

  it('finishes after the last card and counts the answers', () => {
    let state = initStudy(cards)
    state = studyReducer(studyReducer(state, { type: 'flip' }), { type: 'answer', answer: 'known' })
    state = studyReducer(studyReducer(state, { type: 'flip' }), {
      type: 'answer',
      answer: 'learning',
    })
    expect(isFinished(state)).toBe(true)
    expect(currentCard(state)).toBeUndefined()
    expect(countResults(state)).toEqual({ known: 1, learning: 1 })
  })

  it('ignores actions once finished', () => {
    let state = initStudy([cards[0]])
    state = studyReducer(studyReducer(state, { type: 'flip' }), { type: 'answer', answer: 'known' })
    expect(studyReducer(state, { type: 'flip' })).toBe(state)
  })

  it('treats an empty deck as finished', () => {
    expect(isFinished(initStudy([]))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/study/studyReducer.test.ts`
Expected: FAIL with "Failed to resolve import "./studyReducer"".

- [ ] **Step 3: Implement**

`src/features/study/studyReducer.ts`:

```ts
import type { Card } from '@/features/words/schema'

export type Answer = 'known' | 'learning'

export type StudyState = {
  queue: Card[]
  index: number
  flipped: boolean
  results: Record<string, Answer>
}

export type StudyAction = { type: 'flip' } | { type: 'answer'; answer: Answer }

export function initStudy(cards: Card[]): StudyState {
  return { queue: cards, index: 0, flipped: false, results: {} }
}

export function currentCard(state: StudyState): Card | undefined {
  return state.queue[state.index]
}

export function isFinished(state: StudyState): boolean {
  return state.index >= state.queue.length
}

export function countResults(state: StudyState): { known: number; learning: number } {
  const answers = Object.values(state.results)
  return {
    known: answers.filter((answer) => answer === 'known').length,
    learning: answers.filter((answer) => answer === 'learning').length,
  }
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  const card = currentCard(state)
  if (!card) return state

  switch (action.type) {
    case 'flip':
      return state.flipped ? state : { ...state, flipped: true }
    case 'answer':
      if (!state.flipped) return state
      return {
        ...state,
        index: state.index + 1,
        flipped: false,
        results: { ...state.results, [card.id]: action.answer },
      }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/study/studyReducer.test.ts && npm run lint && npm run typecheck`
Expected: PASS (8 tests); lint and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/study/studyReducer.ts src/features/study/studyReducer.test.ts
git commit -m "feat(study): session reducer"
```

---

### Task 5: Flashcard, summary and the study session

**Files:**
- Create: `src/features/study/Flashcard.tsx`, `src/features/study/StudySummary.tsx`, `src/features/study/StudySession.tsx`
- Test: `src/features/study/StudySession.test.tsx`

**Interfaces:**
- Consumes:
  - Task 4: `initStudy`, `studyReducer`, `currentCard`, `isFinished`, `countResults`, `Answer`.
  - Task 1: `Card` and `CardReplacement` types.
  - The `PUT /api/words/[id]` contract from Task 3.
- Produces:
  - `Flashcard({ card, flipped, onFlip }: { card: Card; flipped: boolean; onFlip: () => void })`
  - `StudySummary({ known, learning }: { known: number; learning: number })`
  - `StudySession({ cards }: { cards: Card[] })`, a client component that Task 6 renders from `StudyDeck`.

Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` for `router.refresh()`.

- [ ] **Step 1: Write the failing test**

`src/features/study/StudySession.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '@/features/words/schema'
import { StudySession } from './StudySession'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const fetchMock = vi.fn()

const cards: Card[] = [
  { id: 'a1', word: 'שלום', translation: 'hello', example: 'שלום, מה שלומך?', status: 'new' },
  { id: 'b2', word: 'ספר', translation: 'book', example: 'קראתי ספר.', status: 'learning' },
]

beforeEach(() => {
  refresh.mockReset()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

function answerButtons() {
  return {
    knew: screen.getByRole('button', { name: 'I knew it' }),
    learning: screen.getByRole('button', { name: 'Still learning' }),
  }
}

describe('StudySession', () => {
  it('enables the answers only after the card is flipped', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument()
    expect(answerButtons().knew).toBeDisabled()
    expect(answerButtons().learning).toBeDisabled()
    expect(screen.queryByText('hello')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show answer/i }))

    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('שלום, מה שלומך?')).toBeInTheDocument()
    expect(answerButtons().knew).toBeEnabled()
    expect(answerButtons().learning).toBeEnabled()
  })

  it('marks the Hebrew word and example as RTL Hebrew', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    for (const el of screen.getAllByText('שלום')) {
      expect(el).toHaveAttribute('lang', 'he')
      expect(el).toHaveAttribute('dir', 'rtl')
    }
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    const example = screen.getByText('שלום, מה שלומך?')
    expect(example).toHaveAttribute('lang', 'he')
    expect(example).toHaveAttribute('dir', 'rtl')
  })

  it('sends a PUT with the full card and the answer, then refreshes', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/words/a1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({
      word: 'שלום',
      translation: 'hello',
      example: 'שלום, מה שלומך?',
      status: 'known',
    })
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
  })

  it('shows the counts after the last card', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().learning)

    expect(await screen.findByText('1 known, 1 still learning')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I knew it' })).not.toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).status).toBe('learning')
  })

  it('shows an inline error when saving fails and keeps going', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().learning)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save your answer for שלום.",
    )
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('shows the same error when the network fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save your answer for שלום.",
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/study/StudySession.test.tsx`
Expected: FAIL with "Failed to resolve import "./StudySession"".

- [ ] **Step 3: Implement the presentational components**

`src/features/study/Flashcard.tsx`. Tailwind v4 has 3D utilities: `perspective-distant`, `transform-3d`, `backface-hidden` and `rotate-y-180`. The back face renders its content only when the card is flipped, so the answer is neither in the DOM nor read out before the flip.

```tsx
import type { Card } from '@/features/words/schema'

type FlashcardProps = { card: Card; flipped: boolean; onFlip: () => void }

export function Flashcard({ card, flipped, onFlip }: FlashcardProps) {
  const face =
    'col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm backface-hidden'

  return (
    <button
      type="button"
      onClick={onFlip}
      className="block w-full rounded-2xl perspective-distant focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
    >
      <span
        className={`grid min-h-64 transition-transform duration-500 transform-3d ${flipped ? 'rotate-y-180' : ''}`}
      >
        <span className={face} aria-hidden={flipped}>
          <span lang="he" dir="rtl" className="text-4xl font-semibold">
            {card.word}
          </span>
          <span className="text-sm text-gray-500">Show answer</span>
        </span>
        <span className={`${face} rotate-y-180`} aria-hidden={!flipped}>
          {flipped && (
            <>
              <span lang="he" dir="rtl" className="text-2xl font-semibold">
                {card.word}
              </span>
              <span className="text-xl">{card.translation}</span>
              <span lang="he" dir="rtl" className="text-gray-600">
                {card.example}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}
```

`src/features/study/StudySummary.tsx`:

```tsx
type StudySummaryProps = { known: number; learning: number }

export function StudySummary({ known, learning }: StudySummaryProps) {
  return (
    <section aria-labelledby="study-summary" className="flex flex-col gap-2 text-center">
      <h2 id="study-summary" className="text-xl font-semibold">
        Session complete
      </h2>
      <p className="text-lg">
        {known} known, {learning} still learning
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Implement `StudySession`**

`src/features/study/StudySession.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useReducer, useState } from 'react'
import type { Card, CardReplacement } from '@/features/words/schema'
import { Flashcard } from './Flashcard'
import { StudySummary } from './StudySummary'
import {
  countResults,
  currentCard,
  initStudy,
  isFinished,
  studyReducer,
  type Answer,
} from './studyReducer'

export function StudySession({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(studyReducer, cards, initStudy)
  const [saveError, setSaveError] = useState<string | null>(null)
  const card = currentCard(state)

  async function answer(result: Answer) {
    if (!card || !state.flipped) return
    // Advance first so the next card shows at once; the save happens in the background.
    dispatch({ type: 'answer', answer: result })
    const body: CardReplacement = {
      word: card.word,
      translation: card.translation,
      example: card.example,
      status: result,
    }
    try {
      const res = await fetch(`/api/words/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`PUT /api/words/${card.id} returned ${res.status}`)
      router.refresh()
    } catch {
      setSaveError(`Couldn't save your answer for ${card.word}.`)
    }
  }

  const error = saveError && (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
      {saveError}
    </p>
  )

  if (isFinished(state) || !card) {
    const { known, learning } = countResults(state)
    return (
      <div className="flex flex-col gap-4">
        {error}
        <StudySummary known={known} learning={learning} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Card {state.index + 1} of {state.queue.length}
      </p>
      <Flashcard key={card.id} card={card} flipped={state.flipped} onFlip={() => dispatch({ type: 'flip' })} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!state.flipped}
          onClick={() => answer('known')}
          className="rounded-lg bg-green-700 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          I knew it
        </button>
        <button
          type="button"
          disabled={!state.flipped}
          onClick={() => answer('learning')}
          className="rounded-lg bg-amber-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Still learning
        </button>
      </div>
      {error}
    </div>
  )
}
```

`key={card.id}` on `Flashcard` remounts it for each card, so the next card doesn't animate back from the flipped side.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/features/study && npm run lint && npm run typecheck`
Expected: all PASS; lint and typecheck clean. Run `npx prettier --write src/features/study` if the format check would complain.

- [ ] **Step 6: Commit**

```bash
git add src/features/study/Flashcard.tsx src/features/study/StudySummary.tsx src/features/study/StudySession.tsx src/features/study/StudySession.test.tsx
git commit -m "feat(study): flashcard, summary and study session"
```

---

### Task 6: Shell, Study page and Deck placeholder

**Files:**
- Create: `src/components/SiteNav.tsx`, `src/features/study/StudyDeck.tsx`, `src/app/deck/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/components/SiteNav.test.tsx`

**Interfaces:**
- Consumes: `listCards` (Task 2) and `StudySession` (Task 5).
- Produces:
  - A nav labelled "Main" with links "Study" (`/`) and "Deck" (`/deck`).
  - A page `h1` "Study" on `/` and "Deck" on `/deck`, which Task 7's e2e relies on.

Read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `04-linking-and-navigating.md` and `06-fetching-data.md` (the streaming / `<Suspense>` part) first.

- [ ] **Step 1: Write the failing test**

`src/components/SiteNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteNav } from './SiteNav'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

beforeEach(() => {
  nav.pathname = '/'
})

describe('SiteNav', () => {
  it('links Study and Deck', () => {
    render(<SiteNav />)
    expect(screen.getByRole('link', { name: 'Study' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Deck' })).toHaveAttribute('href', '/deck')
  })

  it.each([
    ['/', 'Study', 'Deck'],
    ['/deck', 'Deck', 'Study'],
  ])('on %s marks %s as the current page', (pathname, current, other) => {
    nav.pathname = pathname
    render(<SiteNav />)
    expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: other })).not.toHaveAttribute('aria-current')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/SiteNav.test.tsx`
Expected: FAIL with "Failed to resolve import "./SiteNav"".

- [ ] **Step 3: Implement `SiteNav`**

`src/components/SiteNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Study' },
  { href: '/deck', label: 'Deck' },
] as const

export function SiteNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main">
      <ul className="flex gap-4">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className="rounded px-2 py-1 text-gray-600 hover:text-gray-900 aria-[current=page]:font-semibold aria-[current=page]:text-gray-900"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/SiteNav.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire up the layout and the routes**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/SiteNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'flipwise',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
            <span className="text-lg font-semibold">flipwise</span>
            <SiteNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
```

`src/features/study/StudyDeck.tsx` (a Server Component; it has no `'use client'`):

```tsx
import { connection } from 'next/server'
import { listCards } from '@/features/words/data'
import { StudySession } from './StudySession'

export async function StudyDeck() {
  // Read the deck at request time; never prerender it at build time.
  await connection()
  const cards = await listCards()
  return <StudySession cards={cards} />
}
```

`src/app/page.tsx` (the home page no longer renders the greeting example):

```tsx
import { Suspense } from 'react'
import { StudyDeck } from '@/features/study/StudyDeck'

export default function StudyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Study</h1>
      <Suspense fallback={<p className="text-gray-600">Loading cards…</p>}>
        <StudyDeck />
      </Suspense>
    </main>
  )
}
```

`src/app/deck/page.tsx`:

```tsx
export default function DeckPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Deck</h1>
      <p className="text-gray-600">The deck is coming soon.</p>
    </main>
  )
}
```

Keep `src/features/greeting/`: `stack-conventions` names `GreetingForm.tsx` as the form reference. Task 7 deletes its e2e test.

- [ ] **Step 6: Verify the build and the dev app**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all clean. The build must not error about uncached data outside `<Suspense>`. If it does, apply the fix the build message names (stack-conventions), and do not disable Cache Components.

Then run `npm run dev`, open `http://localhost:3000`, and check:
- the first seeded card ("שלום") shows;
- clicking it flips to "hello";
- answering advances to "Card 2 of 20";
- the Deck link opens the placeholder.

Then stop the dev server. Answering here writes to the dev db `flipwise`, which is fine.

- [ ] **Step 7: Commit**

```bash
git add src/components src/features/study/StudyDeck.tsx src/app/layout.tsx src/app/page.tsx src/app/deck
git commit -m "feat: header nav, study page and deck placeholder"
```

---

### Task 7: End-to-end tests and CI database

**Files:**
- Create: `e2e/mongo-env.ts`, `e2e/global-setup.ts`, `e2e/study.spec.ts`
- Modify: `playwright.config.ts`, `.github/workflows/ci.yml`
- Delete: `e2e/greeting.spec.ts`

**Interfaces:**
- Consumes:
  - `resetToSeed` (Task 2) and the `CardDocument` type;
  - the UI copy and roles from Tasks 5 and 6;
  - `GET /api/words` (Task 3).
- Produces: nothing for later tasks.

- [ ] **Step 1: Point the e2e server at `flipwise_test` and reset it before each run**

`e2e/mongo-env.ts`:

```ts
/** The database the e2e web server and global setup use. Never the dev db. */
export const e2eMongo = {
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  db: 'flipwise_test',
}
```

`e2e/global-setup.ts`:

```ts
import { MongoClient } from 'mongodb'
import type { CardDocument } from '../src/lib/db'
import { resetToSeed } from '../src/features/words/seed'
import { e2eMongo } from './mongo-env'

export default async function globalSetup() {
  const client = new MongoClient(e2eMongo.uri)
  try {
    await resetToSeed(client.db(e2eMongo.db).collection<CardDocument>('cards'))
  } finally {
    await client.close()
  }
}
```

In `playwright.config.ts`:
- add `import { e2eMongo } from './e2e/mongo-env'`;
- add `globalSetup: './e2e/global-setup.ts',` after `reporter`;
- add `env` to `webServer`. Variables already in the process environment take precedence over `.env.local`, so the server uses the test db.

```ts
  webServer: {
    command: `npm run build && npx next start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: { MONGODB_URI: e2eMongo.uri, MONGODB_DB: e2eMongo.db },
  },
```

Delete `e2e/greeting.spec.ts`; the home page no longer shows the greeting.

- [ ] **Step 2: Write the e2e tests**

`e2e/study.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const TOTAL = 20
// Every third card (index 2, 5, 8, 11, 14, 17) is "Still learning": 6 learning, 14 known.
const isLearning = (index: number) => index % 3 === 2

test('studies the whole deck and stores every answer', async ({ page, request }) => {
  await page.goto('/')
  const knew = page.getByRole('button', { name: 'I knew it' })
  const learning = page.getByRole('button', { name: 'Still learning' })

  await expect(knew).toBeDisabled()
  await expect(learning).toBeDisabled()

  for (let index = 0; index < TOTAL; index++) {
    // Also proves router.refresh() after each save does not restart the session.
    await expect(page.getByText(`Card ${index + 1} of ${TOTAL}`)).toBeVisible()
    await page.getByRole('button', { name: /show answer/i }).click()
    await expect(knew).toBeEnabled()
    await (isLearning(index) ? learning : knew).click()
  }

  await expect(page.getByText('14 known, 6 still learning')).toBeVisible()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)

  const expected = Array.from({ length: TOTAL }, (_, index) =>
    isLearning(index) ? 'learning' : 'known',
  )
  await expect
    .poll(async () => {
      const res = await request.get('/api/words')
      const cards: { status: string }[] = await res.json()
      return cards.map((card) => card.status)
    })
    .toEqual(expected)
})

test('flipping shows the translation and example in RTL Hebrew', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /show answer/i }).click()
  await expect(page.getByText('hello')).toBeVisible()
  const example = page.getByText('שלום, מה שלומך היום?')
  await expect(example).toBeVisible()
  await expect(example).toHaveAttribute('dir', 'rtl')
  await expect(example).toHaveAttribute('lang', 'he')
})

test('the header nav links Study and Deck', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Study' })).toHaveAttribute('aria-current', 'page')

  await nav.getByRole('link', { name: 'Deck' }).click()
  await expect(page).toHaveURL('/deck')
  await expect(page.getByRole('heading', { name: 'Deck' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Deck' })).toHaveAttribute('aria-current', 'page')
})
```

The second test reads card 1 only and does not answer it. The first test writes statuses but never changes words or order, so the tests are independent even when they run in parallel.

- [ ] **Step 3: Run the e2e suite**

Run: `npm run e2e`
Expected: 3 tests PASS.
- If "Card n of 20" fails partway, the session is being reset by `router.refresh()` (Review Focus 1). Debug with `superpowers:systematic-debugging`; do not remove the refresh or the assertion.
- If the global setup can't import `seed.json`, report the error rather than changing the Playwright config beyond what Step 1 shows.

- [ ] **Step 4: Give CI a database**

In `.github/workflows/ci.yml`, under `jobs.check`, add this between `runs-on` and `steps`:

```yaml
    services:
      mongo:
        image: mongo:8
        ports:
          - 27017:27017
    env:
      MONGODB_URI: mongodb://localhost:27017
      MONGODB_DB: flipwise_test
```

- [ ] **Step 5: Run both gates**

Run: `npm run check && npm run e2e`
Expected: format, lint, typecheck, unit tests and build all pass; 3 e2e tests PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e playwright.config.ts .github/workflows/ci.yml
git commit -m "test(e2e): study flow and nav against flipwise_test; CI MongoDB service"
```
