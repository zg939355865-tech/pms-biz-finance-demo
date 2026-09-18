import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const exe = 'C:/Program Files (x86)/Microsoft Edge/Application/msedge.exe';
const file = process.argv[2] || 'pages/procurement/purchase-order.html';
let browser = null;
for (let i = 0; i < 20 && !browser; i += 1) {
  if (!fs.existsSync(exe)) { await new Promise((r) => setTimeout(r, 3000)); continue; }
  try { browser = await chromium.launch({ executablePath: exe, headless: true }); } catch { await new Promise((r) => setTimeout(r, 3000)); }
}
if (!browser) { console.log('LAUNCH UNAVAILABLE'); process.exit(2); }
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERROR', m.text()); });
await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const row = page.locator('tbody > tr[data-row-status="新增"]:visible').first();
console.log('pending row index', await row.getAttribute('data-row-index'));
await row.locator('[data-row-select]').check();
await page.waitForTimeout(300);
console.log('checked', await page.locator('[data-page-view="list"] [data-row-select]:checked').count());
const audit = page.locator('[data-page-view="list"] [data-act="audit"]').first();
console.log('audit disabled', await audit.isDisabled());
await browser.close();
