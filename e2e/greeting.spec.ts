import { expect, test } from '@playwright/test'

test('greets the user by name', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Your name').fill('Ada')
  await page.getByRole('button', { name: 'Say hello' }).click()
  await expect(page.getByText('Hello, Ada!')).toBeVisible()
})

test('asks for a name when none is given', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Say hello' }).click()
  // Scope to main: Next.js adds its own role="alert" route announcer to every page.
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Enter your name')
})
