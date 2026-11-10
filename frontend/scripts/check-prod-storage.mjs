import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:8080/login')
await page.getByLabel(/Email address/).fill('admin@example.test')
await page.getByLabel(/Password/).fill('ShopFlow!Demo2026')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.getByRole('heading', { name: /Good to see you/ }).waitFor({ timeout: 15000 })

const result = await page.evaluate(async () => {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZQAAAABJRU5ErkJggg=='
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  const form = new FormData()
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'prod-test.png')

  const cookie = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
  const token = decodeURIComponent(cookie)
  const upload = await fetch('/api/v1/products/1/image', {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: { Accept: 'application/json', 'X-XSRF-TOKEN': token },
  })
  if (!upload.ok) return { upload: upload.status, body: await upload.text() }

  const product = await (await fetch('/api/v1/products/1', { credentials: 'include', headers: { Accept: 'application/json' } })).json()
  const image = await fetch(product.data.image_url, { credentials: 'include' })
  return { upload: upload.status, image: image.status, url: product.data.image_url }
})

console.log(JSON.stringify(result))
await browser.close()
process.exitCode = result.upload === 200 && result.image === 200 ? 0 : 1
