import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('purchase orders', () => {
  test('creates an order, submits it, and receives it in full', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Purchase orders' }).click()
    await page.getByRole('link', { name: 'New order' }).click()
    await expect(page.getByRole('heading', { name: 'New purchase order' })).toBeVisible()

    await page.getByLabel(/Supplier/).selectOption({ index: 1 })
    await page.getByLabel(/Receiving warehouse/).selectOption({ index: 1 })
    await page.getByLabel(/Product/).selectOption({ index: 1 })
    await page.getByLabel(/Quantity/).fill('2')
    await page.getByRole('button', { name: 'Create draft' }).click()

    await expect(page).toHaveURL(/\/purchase-orders\/\d+$/)
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Submit order' }).click()
    await expect(page.getByText('Ordered', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Receive goods' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Record receipt' }).click()
    await expect(page.getByText('Received', { exact: true })).toBeVisible()
    await expect(page.getByText('Receipt recorded')).toBeVisible()
  })
})
