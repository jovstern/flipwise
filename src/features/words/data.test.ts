// @vitest-environment node
import { ObjectId } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'
import { toCard } from './data'

vi.mock('server-only', () => ({}))

describe('toCard', () => {
  it('maps _id to a string id and drops createdAt', () => {
    const _id = new ObjectId()
    const card = toCard({
      _id,
      word: 'ספר',
      translation: 'book',
      example: 'קראתי ספר.',
      exampleTranslation: 'I read a book.',
      status: 'learning',
      createdAt: new Date(),
    })
    expect(card).toEqual({
      id: _id.toHexString(),
      word: 'ספר',
      translation: 'book',
      example: 'קראתי ספר.',
      exampleTranslation: 'I read a book.',
      status: 'learning',
    })
  })

  it('rejects a stored document with an unknown status', () => {
    expect(() =>
      toCard({
        _id: new ObjectId(),
        word: 'ספר',
        translation: 'book',
        example: 'קראתי ספר.',
        exampleTranslation: 'I read a book.',
        // @ts-expect-error -- simulates a corrupt stored document
        status: 'mastered',
        createdAt: new Date(),
      }),
    ).toThrow()
  })
})
