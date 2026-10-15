import { connection } from 'next/server'
import { listCards } from '@/features/words/data'
import { StudySession } from './StudySession'

export async function StudyDeck() {
  // Read the deck at request time; never prerender it at build time.
  await connection()
  const cards = await listCards()
  return <StudySession cards={cards} />
}
