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
