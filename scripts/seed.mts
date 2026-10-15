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
