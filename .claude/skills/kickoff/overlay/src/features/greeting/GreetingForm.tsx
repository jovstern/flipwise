'use client'

import { useForm } from '@tanstack/react-form'
import { useId, useState } from 'react'
import { z } from 'zod'

const greetingSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
})

// Reference pattern for every form: TanStack Form + a Zod schema, label tied to the input,
// error announced with role="alert", aria-invalid and aria-describedby set.
export function GreetingForm() {
  const [greeting, setGreeting] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  const form = useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: greetingSchema },
    onSubmit: ({ value }) => {
      setGreeting(`Hello, ${value.name.trim()}!`)
    },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => {
          const error = field.state.meta.errors[0]?.message
          return (
            <div className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-sm font-medium">
                Your name
              </label>
              <input
                id={inputId}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="rounded border px-3 py-2"
              />
              {error ? (
                <p id={errorId} role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          )
        }}
      </form.Field>
      <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
        Say hello
      </button>
      {greeting ? <p aria-live="polite">{greeting}</p> : null}
    </form>
  )
}
