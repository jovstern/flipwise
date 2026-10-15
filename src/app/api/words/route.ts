import { connection } from 'next/server'
import { listCards } from '@/features/words/data'

export async function GET() {
  // Request-time only: keeps the build from prerendering this route (and querying MongoDB).
  await connection()
  return Response.json(await listCards())
}
