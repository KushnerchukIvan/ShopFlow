import { expect, type Page } from '@playwright/test'

export const demoPassword = 'ShopFlow!Demo2026'

export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/Email address/).fill(email)
  await page.getByLabel(/Password/).fill(demoPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible()
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, 'admin@example.test')
}
