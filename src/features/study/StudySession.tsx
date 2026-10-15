'use client'

import { useRouter } from 'next/navigation'
import { useReducer, useRef, useState } from 'react'
import type { Card, CardReplacement } from '@/features/words/schema'
import { Flashcard } from './Flashcard'
import { StudySummary } from './StudySummary'
import {
  countResults,
  currentCard,
  initStudy,
  isFinished,
  studyReducer,
  type Answer,
} from './studyReducer'

export function StudySession({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(studyReducer, cards, initStudy)
  const [saveError, setSaveError] = useState<string | null>(null) // word whose save failed
  const answeredId = useRef<string | null>(null) // guards against a double click sending two PUTs
  const card = currentCard(state)

  async function answer(result: Answer) {
    if (!card || !state.flipped || answeredId.current === card.id) return
    answeredId.current = card.id
    // Advance first so the next card shows at once; the save happens in the background.
    dispatch({ type: 'answer', answer: result })
    const body: CardReplacement = {
      word: card.word,
      translation: card.translation,
      example: card.example,
      status: result,
    }
    try {
      const res = await fetch(`/api/words/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`PUT /api/words/${card.id} returned ${res.status}`)
      router.refresh()
    } catch {
      setSaveError(card.word)
    }
  }

  const error = saveError && (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
      Couldn&apos;t save your answer for{' '}
      <bdi lang="he" dir="rtl">
        {saveError}
      </bdi>
      .
    </p>
  )

  if (isFinished(state) || !card) {
    const { known, learning } = countResults(state)
    return (
      <div className="flex flex-col gap-4">
        {error}
        <StudySummary known={known} learning={learning} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Card {state.index + 1} of {state.queue.length}
      </p>
      <Flashcard
        key={card.id}
        card={card}
        flipped={state.flipped}
        onFlip={() => dispatch({ type: 'flip' })}
      />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!state.flipped}
          onClick={() => answer('known')}
          className="rounded-lg bg-green-700 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          I knew it
        </button>
        <button
          type="button"
          disabled={!state.flipped}
          onClick={() => answer('learning')}
          className="rounded-lg bg-amber-600 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Still learning
        </button>
      </div>
      {error}
    </div>
  )
}
