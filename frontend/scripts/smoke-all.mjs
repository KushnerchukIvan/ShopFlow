import { chromium } from 'playwright'

const baseURL = process.env.SHOPFLOW_URL ?? 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('401')) errors.push(`console: ${message.text()}`)
})

await page.goto(`${baseURL}/login`)
await page.getByLabel(/Email address/).fill('admin@example.test')
await page.getByLabel(/Password/).fill('ShopFlow!Demo2026')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor()

const first = async (path) => {
  const body = await page.evaluate(async (apiPath) => {
    const response = await fetch(`http://localhost:8000/api/v1${apiPath}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    return response.json()
  }, path)
  return body.data
}

const product = (await first('/products?per_page=1'))[0]
const warehouse = (await first('/warehouses?per_page=1'))[0]
const supplier = (await first('/suppliers?per_page=1'))[0]
const purchaseOrder = (await first('/purchase-orders?per_page=1'))[0]
const transfer = (await first('/transfers?per_page=1'))[0]
const adjustment = (await first('/adjustments?per_page=1'))[0]

const routes = [
  ['/', 'Good to see you'],
  ['/products', 'Products'],
  [`/products/${product.id}`, product.name],
  [`/products/${product.id}/edit`, 'Edit product'],
  ['/products/new', 'New product'],
  ['/categories', 'Categories'],
  ['/inventory', 'Inventory'],
  ['/stock-movements', 'Stock movements'],
  ['/warehouses', 'Warehouses'],
  [`/warehouses/${warehouse.id}`, warehouse.name],
  ['/suppliers', 'Suppliers'],
  [`/suppliers/${supplier.id}`, supplier.name],
  ['/purchase-orders', 'Purchase orders'],
  [`/purchase-orders/${purchaseOrder.id}`, purchaseOrder.order_number],
  ['/purchase-orders/new', 'New purchase order'],
  ['/transfers', 'Transfers'],
  [`/transfers/${transfer.id}`, transfer.transfer_number],
  ['/transfers/new', 'New transfer'],
  ['/adjustments', 'Stock adjustments'],
  [`/adjustments/${adjustment.id}`, adjustment.adjustment_number],
  ['/adjustments/new', 'New physical count'],
  ['/reports', 'Reports'],
  ['/users', 'Users'],
  ['/settings', 'Workspace settings'],
  ['/profile', 'My profile'],
]

for (const [path, heading] of routes) {
  await page.goto(`${baseURL}${path}`)
  try {
    await page.getByRole('heading', { name: heading, exact: false }).first().waitFor({ timeout: 10000 })
  } catch {
    errors.push(`missing heading "${heading}" at ${path}`)
  }
  await page.waitForTimeout(250)
}

await page.goto(`${baseURL}/reports`)
for (const tab of ['Top products', 'By warehouse', 'By category', 'Low stock', 'Movements', 'Purchase history']) {
  await page.getByRole('tab', { name: tab }).click()
  await page.waitForTimeout(400)
}

console.log(errors.length === 0 ? 'All pages loaded without console errors.' : errors.join('\n'))
await browser.close()
process.exitCode = errors.length === 0 ? 0 : 1
