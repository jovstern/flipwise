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
