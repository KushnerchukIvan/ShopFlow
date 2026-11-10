import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers'

test.describe('inventory operations', () => {
  test('records stock in and stock out and shows the ledger entries', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Inventory' }).click()
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()

    await page.getByRole('button', { name: 'Stock in', exact: true }).click()
    const inDialog = page.getByRole('dialog')
    await inDialog.getByLabel(/Product/).selectOption({ index: 1 })
    await inDialog.getByLabel(/Warehouse/).selectOption({ index: 1 })
    await inDialog.getByLabel(/Quantity/).fill('3')
    await inDialog.getByLabel(/Reason/).fill('E2E stock in')
    await inDialog.getByRole('button', { name: 'Add stock' }).click()
    await expect(page.getByText('Stock received')).toBeVisible()

    await page.getByRole('button', { name: 'Stock out', exact: true }).click()
    const outDialog = page.getByRole('dialog')
    await outDialog.getByLabel(/Product/).selectOption({ index: 1 })
    await outDialog.getByLabel(/Warehouse/).selectOption({ index: 1 })
    await outDialog.getByLabel(/Quantity/).fill('1')
    await outDialog.getByLabel(/Reason/).fill('E2E stock out')
    await outDialog.getByRole('button', { name: 'Remove stock' }).click()
    await expect(page.getByText('Stock removed')).toBeVisible()

    await page.getByRole('link', { name: 'Stock movements' }).click()
    await expect(page.getByRole('heading', { name: 'Stock movements' })).toBeVisible()
    await expect(page.getByText('E2E stock in').first()).toBeVisible()
    await expect(page.getByText('E2E stock out').first()).toBeVisible()
  })

  test('creates, updates, and archives a product', async ({ page }) => {
    const sku = `E2E-${Date.now()}`
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Products' }).click()
    await page.getByRole('link', { name: 'Add product' }).click()
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible()

    await page.getByLabel(/Product name/).fill('E2E Test Lamp')
    await page.getByLabel(/SKU/).fill(sku)
    await page.getByLabel(/Category/).selectOption({ index: 1 })
    await page.getByLabel(/Purchase price/).fill('12.50')
    await page.getByLabel(/Selling price/).fill('19.99')
    await page.getByLabel(/Minimum stock/).fill('2')
    await page.getByRole('button', { name: 'Create product' }).click()

    await expect(page.getByRole('heading', { name: 'E2E Test Lamp' })).toBeVisible()
    await expect(page.getByText('E2E Test Lamp')).toBeVisible()

    await page.getByRole('button', { name: 'Archive', exact: true }).click()
    await page.getByRole('button', { name: 'Archive product' }).click()
    await expect(page).toHaveURL(/\/products$/)
    await expect(page.getByText('Product archived')).toBeVisible()
  })
})
