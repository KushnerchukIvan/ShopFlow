import { chromium } from 'playwright'

const baseURL = process.env.SHOPFLOW_URL ?? 'http://localhost:5173'
const password = 'ShopFlow!Demo2026'

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.goto(`${baseURL}/login`)
await page.getByLabel(/Email address/).fill('admin@example.test')
await page.getByLabel(/Password/).fill(password)
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor()
await page.waitForTimeout(1500)
await page.screenshot({ path: '../docs/dashboard.png', fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${baseURL}/inventory`)
await page.getByRole('heading', { name: 'Inventory' }).waitFor()
await page.waitForTimeout(1000)
await page.screenshot({ path: '../docs/inventory-mobile.png', fullPage: true })

await page.setViewportSize({ width: 1440, height: 1000 })
await page.goto(`${baseURL}/reports?tab=valuation`)
await page.getByRole('heading', { name: 'Reports' }).waitFor()
await page.waitForTimeout(1000)
await page.screenshot({ path: '../docs/reports.png', fullPage: true })

await browser.close()
console.log('Screenshots saved to docs/.')
