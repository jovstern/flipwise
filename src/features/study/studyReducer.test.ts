import { describe, expect, it } from 'vitest'
import type { Card } from '@/features/words/schema'
import { countResults, currentCard, initStudy, isFinished, studyReducer } from './studyReducer'

const cards: Card[] = [
  {
    id: 'a',
    word: 'שלום',
    translation: 'hello',
    example: 'שלום לך.',
    exampleTranslation: 'Hello to you.',
    status: 'new',
  },
  {
    id: 'b',
    word: 'ספר',
    translation: 'book',
    example: 'קראתי ספר.',
    exampleTranslation: 'I read a book.',
    status: 'known',
  },
]

describe('studyReducer', () => {
  it('starts on the first card, unflipped, with no results', () => {
    const state = initStudy(cards)
    expect(currentCard(state)).toEqual(cards[0])
    expect(state.flipped).toBe(false)
    expect(countResults(state)).toEqual({ known: 0, learning: 0 })
    expect(isFinished(state)).toBe(false)
  })

  it('flips the current card', () => {
    expect(studyReducer(initStudy(cards), { type: 'flip' }).flipped).toBe(true)
  })

  it('ignores an answer before the card is flipped', () => {
    const state = initStudy(cards)
    expect(studyReducer(state, { type: 'answer', answer: 'known' })).toBe(state)
  })

  it('records the answer, moves to the next card and unflips', () => {
    let state = studyReducer(initStudy(cards), { type: 'flip' })
    state = studyReducer(state, { type: 'answer', answer: 'learning' })
    expect(state.results).toEqual({ a: 'learning' })
    expect(currentCard(state)).toEqual(cards[1])
    expect(state.flipped).toBe(false)
  })

  it('ignores a second answer on the same card (double click)', () => {
    let state = studyReducer(initStudy(cards), { type: 'flip' })
    state = studyReducer(state, { type: 'answer', answer: 'known' })
    const again = studyReducer(state, { type: 'answer', answer: 'known' })
    expect(again).toBe(state)
    expect(again.results).toEqual({ a: 'known' })
  })

  it('finishes after the last card and counts the answers', () => {
    let state = initStudy(cards)
    state = studyReducer(studyReducer(state, { type: 'flip' }), { type: 'answer', answer: 'known' })
    state = studyReducer(studyReducer(state, { type: 'flip' }), {
      type: 'answer',
      answer: 'learning',
    })
    expect(isFinished(state)).toBe(true)
    expect(currentCard(state)).toBeUndefined()
    expect(countResults(state)).toEqual({ known: 1, learning: 1 })
  })

  it('ignores actions once finished', () => {
    let state = initStudy([cards[0]])
    state = studyReducer(studyReducer(state, { type: 'flip' }), { type: 'answer', answer: 'known' })
    expect(studyReducer(state, { type: 'flip' })).toBe(state)
  })

  it('treats an empty deck as finished', () => {
    expect(isFinished(initStudy([]))).toBe(true)
  })
})
