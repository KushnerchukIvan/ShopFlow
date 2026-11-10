import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('stock adjustments', () => {
  test('creates a physical count and applies it', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Adjustments' }).click()
    await page.getByRole('link', { name: 'New count' }).click()
    await expect(page.getByRole('heading', { name: 'New physical count' })).toBeVisible()

    await page.getByLabel(/Warehouse/).selectOption({ index: 1 })
    await page.getByLabel(/Reason/).fill('E2E cycle count')
    await page.getByLabel(/Product/).selectOption({ index: 1 })
    await page.getByLabel(/Counted/).fill('5')
    await page.getByRole('button', { name: 'Save draft' }).click()

    await expect(page).toHaveURL(/\/adjustments\/\d+$/)
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Apply count' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Apply count' }).click()
    await expect(page.getByText('Submitted', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Stock adjustment applied')).toBeVisible()
  })
})
