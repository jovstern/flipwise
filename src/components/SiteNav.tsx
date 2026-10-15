'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Study' },
  { href: '/deck', label: 'Deck' },
] as const

export function SiteNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main">
      <ul className="flex gap-4">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className="rounded px-2 py-1 text-gray-600 hover:text-gray-900 aria-[current=page]:font-semibold aria-[current=page]:text-gray-900"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
