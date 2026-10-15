import { Suspense } from 'react'
import { StudyDeck } from '@/features/study/StudyDeck'

export default function StudyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Study</h1>
      <Suspense fallback={<p className="text-gray-600">Loading cards…</p>}>
        <StudyDeck />
      </Suspense>
    </main>
  )
}
