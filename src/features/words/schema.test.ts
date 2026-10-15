import { describe, expect, it } from 'vitest'
import { Card, CardReplacement, NewCard } from './schema'

const valid = {
  word: 'שלום',
  translation: 'hello',
  example: 'שלום, מה שלומך?',
  status: 'known',
}

describe('CardReplacement', () => {
  it('accepts a full card and trims the text fields', () => {
    const parsed = CardReplacement.parse({ ...valid, word: '  שלום  ', translation: ' hello ' })
    expect(parsed).toEqual(valid)
  })

  it.each(['word', 'translation', 'example', 'status'])('requires %s', (field) => {
    const body: Record<string, unknown> = { ...valid }
    delete body[field]
    expect(CardReplacement.safeParse(body).success).toBe(false)
  })

  it('rejects whitespace-only text', () => {
    expect(CardReplacement.safeParse({ ...valid, translation: '   ' }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(CardReplacement.safeParse({ ...valid, status: 'mastered' }).success).toBe(false)
  })

  it('rejects text over the max length', () => {
    expect(CardReplacement.safeParse({ ...valid, word: 'א'.repeat(101) }).success).toBe(false)
    expect(CardReplacement.safeParse({ ...valid, example: 'א'.repeat(301) }).success).toBe(false)
  })

  it('strips unknown keys such as id and createdAt', () => {
    const parsed = CardReplacement.parse({ ...valid, id: 'x', _id: 'y', createdAt: 'z' })
    expect(parsed).toEqual(valid)
  })
})

describe('NewCard', () => {
  it('defaults status to new', () => {
    const { status, ...fields } = valid
    expect(status).toBe('known')
    expect(NewCard.parse(fields).status).toBe('new')
  })
})

describe('Card', () => {
  it('requires a string id', () => {
    expect(Card.safeParse({ ...valid, id: 'abc' }).success).toBe(true)
    expect(Card.safeParse(valid).success).toBe(false)
  })
})
