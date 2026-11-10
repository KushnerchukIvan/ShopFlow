import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('stock transfers', () => {
  test('creates a transfer, submits it, and completes it', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Transfers' }).click()
    await page.getByRole('link', { name: 'New transfer' }).click()
    await expect(page.getByRole('heading', { name: 'New transfer' })).toBeVisible()

    await page.getByLabel(/Source warehouse/).selectOption({ index: 1 })
    await page.getByLabel(/Destination warehouse/).selectOption({ index: 1 })
    await page.getByLabel(/Product/).selectOption({ index: 1 })
    await page.getByLabel(/Quantity/).fill('1')
    await page.getByRole('button', { name: 'Save draft' }).click()

    await expect(page).toHaveURL(/\/transfers\/\d+$/)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Submit transfer' }).click()
    await expect(page.getByText('In Transit', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Complete transfer' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Complete transfer' }).click()
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
    await expect(page.getByText('Transfer completed')).toBeVisible()
  })
})
