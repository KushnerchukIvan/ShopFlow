import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('authentication', () => {
  test('signs in and out with a demo administrator', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Total products')).toBeVisible()
    await expect(page.getByText('Low stock', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /ShopFlow Admin/ }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/Email address/).fill('admin@example.test')
    await page.getByLabel(/Password/).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText(/incorrect/i)
    await expect(page).toHaveURL(/\/login$/)
  })
})
