import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GreetingForm } from './GreetingForm'

describe('GreetingForm', () => {
  it('greets by name', async () => {
    const user = userEvent.setup()
    render(<GreetingForm />)
    await user.type(screen.getByLabelText('Your name'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Say hello' }))
    expect(await screen.findByText('Hello, Ada!')).toBeInTheDocument()
  })

  it('shows an error when the name is empty', async () => {
    const user = userEvent.setup()
    render(<GreetingForm />)
    await user.click(screen.getByRole('button', { name: 'Say hello' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your name')
    expect(screen.getByLabelText('Your name')).toHaveAttribute('aria-invalid', 'true')
  })
})
