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
export async function replaceCard(id: string, replacement: CardReplacement): Promise<Card | null> {
  if (!OBJECT_ID.test(id)) return null
  const doc = await getCardsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: replacement },
    { returnDocument: 'after' },
  )
  return doc ? toCard(doc) : null
}
