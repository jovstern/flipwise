import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '@/features/words/schema'
import { StudySession } from './StudySession'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const fetchMock = vi.fn()

const cards: Card[] = [
  { id: 'a1', word: 'שלום', translation: 'hello', example: 'שלום, מה שלומך?', status: 'new' },
  { id: 'b2', word: 'ספר', translation: 'book', example: 'קראתי ספר.', status: 'learning' },
]

beforeEach(() => {
  refresh.mockReset()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

function answerButtons() {
  return {
    knew: screen.getByRole('button', { name: 'I knew it' }),
    learning: screen.getByRole('button', { name: 'Still learning' }),
  }
}

describe('StudySession', () => {
  it('enables the answers only after the card is flipped', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument()
    expect(answerButtons().knew).toBeDisabled()
    expect(answerButtons().learning).toBeDisabled()
    expect(screen.queryByText('hello')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show answer/i }))

    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('שלום, מה שלומך?')).toBeInTheDocument()
    expect(answerButtons().knew).toBeEnabled()
    expect(answerButtons().learning).toBeEnabled()
  })

  it('marks the Hebrew word and example as RTL Hebrew', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    for (const el of screen.getAllByText('שלום')) {
      expect(el).toHaveAttribute('lang', 'he')
      expect(el).toHaveAttribute('dir', 'rtl')
    }
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    const example = screen.getByText('שלום, מה שלומך?')
    expect(example).toHaveAttribute('lang', 'he')
    expect(example).toHaveAttribute('dir', 'rtl')
  })

  it('sends a PUT with the full card and the answer, then refreshes', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/words/a1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({
      word: 'שלום',
      translation: 'hello',
      example: 'שלום, מה שלומך?',
      status: 'known',
    })
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
  })

  it('shows the counts after the last card', async () => {
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().learning)

    expect(await screen.findByText('1 known, 1 still learning')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'I knew it' })).not.toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).status).toBe('learning')
  })

  it('shows an inline error when saving fails and keeps going', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().learning)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save your answer for שלום.",
    )
    const word = within(screen.getByRole('alert')).getByText('שלום')
    expect(word).toHaveAttribute('lang', 'he')
    expect(word).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('shows the same error when the network fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    render(<StudySession cards={cards} />)
    await user.click(screen.getByRole('button', { name: /show answer/i }))
    await user.click(answerButtons().knew)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save your answer for שלום.",
    )
  })
})
