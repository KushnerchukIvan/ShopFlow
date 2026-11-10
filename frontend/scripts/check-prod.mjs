import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:8080/login')
await page.getByLabel(/Email address/).fill('admin@example.test')
await page.getByLabel(/Password/).fill('ShopFlow!Demo2026')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor({ timeout: 15000 })
const products = await page.getByText('Total products', { exact: true }).isVisible()
const value = await page.getByText('Stock value', { exact: true }).isVisible()
console.log(`production browser login ok; kpis visible: ${products && value}`)
await browser.close()
