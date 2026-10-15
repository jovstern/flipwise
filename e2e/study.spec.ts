import { expect, test } from '@playwright/test'

const TOTAL = 20
// Every third card (index 2, 5, 8, 11, 14, 17) is "Still learning": 6 learning, 14 known.
const isLearning = (index: number) => index % 3 === 2

test('studies the whole deck and stores every answer', async ({ page, request }) => {
  await page.goto('/')
  const knew = page.getByRole('button', { name: 'I knew it' })
  const learning = page.getByRole('button', { name: 'Still learning' })

  await expect(knew).toBeDisabled()
  await expect(learning).toBeDisabled()

  for (let index = 0; index < TOTAL; index++) {
    // Also proves router.refresh() after each save does not restart the session.
    await expect(page.getByText(`Card ${index + 1} of ${TOTAL}`)).toBeVisible()
    await page.getByRole('button', { name: /show answer/i }).click()
    await expect(knew).toBeEnabled()
    await (isLearning(index) ? learning : knew).click()
  }

  await expect(page.getByText('14 known, 6 still learning')).toBeVisible()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)

  const expected = Array.from({ length: TOTAL }, (_, index) =>
    isLearning(index) ? 'learning' : 'known',
  )
  await expect
    .poll(async () => {
      const res = await request.get('/api/words')
      const cards: { status: string }[] = await res.json()
      return cards.map((card) => card.status)
    })
    .toEqual(expected)
  await expect(page.getByText('14 known, 6 still learning')).toBeVisible()
})

test('flipping shows the translation and example in RTL Hebrew', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /show answer/i }).click()
  await expect(page.getByText('hello', { exact: true })).toBeVisible()
  const example = page.getByText('שלום, מה שלומך היום?')
  await expect(example).toBeVisible()
  await expect(example).toHaveAttribute('dir', 'rtl')
  await expect(example).toHaveAttribute('lang', 'he')
  await expect(page.getByText('Hello, how are you today?')).toBeVisible()
})

test('the header nav links Study and Deck', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Study' })).toHaveAttribute('aria-current', 'page')

  await nav.getByRole('link', { name: 'Deck' }).click()
  await expect(page).toHaveURL('/deck')
  await expect(page.getByRole('heading', { name: 'Deck' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Deck' })).toHaveAttribute('aria-current', 'page')
})
