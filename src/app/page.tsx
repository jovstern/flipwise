import { GreetingForm } from '@/features/greeting/GreetingForm'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">flipwise</h1>
      <GreetingForm />
    </main>
  )
}
