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
