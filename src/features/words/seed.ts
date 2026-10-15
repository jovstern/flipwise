import type { Collection } from 'mongodb'
import type { CardDocument } from '../../lib/db'
import seed from './seed.json'

// Fixed, one second apart, so "oldest first" is the file order.
const SEED_START = Date.UTC(2026, 0, 1)

export function seedDocuments(): CardDocument[] {
  return seed.map((card, index): CardDocument => ({
    ...card,
    status: 'new',
    createdAt: new Date(SEED_START + index * 1000),
  }))
}

/** Test helper: empties the collection and inserts the seed. */
export async function resetToSeed(collection: Collection<CardDocument>): Promise<void> {
  await collection.deleteMany({})
  await collection.insertMany(seedDocuments())
}
