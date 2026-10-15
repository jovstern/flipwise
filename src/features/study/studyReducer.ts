import type { Card } from '@/features/words/schema'

export type Answer = 'known' | 'learning'

export type StudyState = {
  queue: Card[]
  index: number
  flipped: boolean
  results: Record<string, Answer>
}

export type StudyAction = { type: 'flip' } | { type: 'answer'; answer: Answer }

export function initStudy(cards: Card[]): StudyState {
  return { queue: cards, index: 0, flipped: false, results: {} }
}

export function currentCard(state: StudyState): Card | undefined {
  return state.queue[state.index]
}

export function isFinished(state: StudyState): boolean {
  return state.index >= state.queue.length
}

export function countResults(state: StudyState): { known: number; learning: number } {
  const answers = Object.values(state.results)
  return {
    known: answers.filter((answer) => answer === 'known').length,
    learning: answers.filter((answer) => answer === 'learning').length,
  }
}

export function studyReducer(state: StudyState, action: StudyAction): StudyState {
  const card = currentCard(state)
  if (!card) return state

  switch (action.type) {
    case 'flip':
      return state.flipped ? state : { ...state, flipped: true }
    case 'answer':
      if (!state.flipped) return state
      return {
        ...state,
        index: state.index + 1,
        flipped: false,
        results: { ...state.results, [card.id]: action.answer },
      }
  }
}
