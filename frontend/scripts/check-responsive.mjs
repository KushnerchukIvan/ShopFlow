import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 320, height: 800 } })
const baseURL = process.env.SHOPFLOW_URL ?? 'http://localhost:5173'

await page.goto(`${baseURL}/login`)
await page.getByLabel(/Email address/).fill('admin@example.test')
await page.getByLabel(/Password/).fill('ShopFlow!Demo2026')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor()

const results = []
for (const path of ['/', '/products', '/categories', '/inventory', '/stock-movements', '/warehouses', '/suppliers', '/purchase-orders', '/purchase-orders/new', '/transfers/new', '/adjustments/new', '/reports', '/users', '/settings']) {
  await page.goto(`${baseURL}${path}`)
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  results.push(`${path}: ${overflow ? 'OVERFLOW' : 'ok'}`)
}

await page.goto(`${baseURL}/inventory`)
await page.waitForTimeout(800)
await page.screenshot({ path: '../docs/inventory-320.png', fullPage: true })
await page.getByRole('button', { name: 'Open navigation' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: '../docs/mobile-menu-320.png' })

console.log(results.join('\n'))
await browser.close()
