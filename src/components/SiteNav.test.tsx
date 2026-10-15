import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteNav } from './SiteNav'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

beforeEach(() => {
  nav.pathname = '/'
})

describe('SiteNav', () => {
  it('links Study and Deck', () => {
    render(<SiteNav />)
    expect(screen.getByRole('link', { name: 'Study' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Deck' })).toHaveAttribute('href', '/deck')
  })

  it.each([
    ['/', 'Study', 'Deck'],
    ['/deck', 'Deck', 'Study'],
  ])('on %s marks %s as the current page', (pathname, current, other) => {
    nav.pathname = pathname
    render(<SiteNav />)
    expect(screen.getByRole('link', { name: current })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: other })).not.toHaveAttribute('aria-current')
  })
})
