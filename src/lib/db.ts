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
