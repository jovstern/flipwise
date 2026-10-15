import type { Card } from '@/features/words/schema'

type FlashcardProps = { card: Card; flipped: boolean; onFlip: () => void }

export function Flashcard({ card, flipped, onFlip }: FlashcardProps) {
  const face =
    'col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm backface-hidden'

  return (
    <button
      type="button"
      onClick={onFlip}
      className="block w-full rounded-2xl perspective-distant focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
    >
      <span
        className={`grid min-h-64 transition-transform duration-500 transform-3d ${flipped ? 'rotate-y-180' : ''}`}
      >
        <span className={face} aria-hidden={flipped}>
          <span lang="he" dir="rtl" className="text-4xl font-semibold">
            {card.word}
          </span>
          <span className="text-sm text-gray-500">Show answer</span>
        </span>
        <span className={`${face} rotate-y-180`} aria-hidden={!flipped}>
          {flipped && (
            <>
              <span lang="he" dir="rtl" className="text-2xl font-semibold">
                {card.word}
              </span>
              <span className="text-xl">{card.translation}</span>
              <span lang="he" dir="rtl" className="text-gray-600">
                {card.example}
              </span>
              <span className="text-sm text-gray-500">{card.exampleTranslation}</span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}
