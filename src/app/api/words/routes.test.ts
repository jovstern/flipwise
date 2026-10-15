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
// connection() throws outside a Next request scope; it only defers prerendering, so stub it here.
vi.mock('next/server', () => ({ connection: async () => {} }))

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
  exampleTranslation: 'Hello to everyone.',
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
    ['a missing field', { word: 'א', translation: 'a', example: 'א', exampleTranslation: 'a' }],
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
