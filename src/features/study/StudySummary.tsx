type StudySummaryProps = { known: number; learning: number }

export function StudySummary({ known, learning }: StudySummaryProps) {
  return (
    <section aria-labelledby="study-summary" className="flex flex-col gap-2 text-center">
      <h2 id="study-summary" className="text-xl font-semibold">
        Session complete
      </h2>
      <p className="text-lg">
        {known} known, {learning} still learning
      </p>
    </section>
  )
}
