import { chromium } from 'playwright'

const baseURL = 'https://fast-drama-rotation-agencies.trycloudflare.com'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('401')) errors.push(message.text())
})

await page.goto(`${baseURL}/login`)
await page.getByLabel(/Email address/).fill('admin@shopflow.local')
await page.getByLabel(/Password/).fill('DFKBUVWAXesvAbv6dYQKF5eN')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor({ timeout: 20000 })
await page.getByRole('link', { name: 'Inventory' }).click()
await page.getByRole('heading', { name: 'Inventory' }).waitFor({ timeout: 15000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: '../docs/tunnel-live.png', fullPage: false })

console.log(`public browser login ok; console errors: ${errors.length}`)
if (errors.length) console.log(errors.join('\n'))
await browser.close()
process.exitCode = errors.length === 0 ? 0 : 1
