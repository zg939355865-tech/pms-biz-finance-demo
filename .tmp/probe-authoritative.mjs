import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(8000);
await page.route(/^https?:/, (route) => route.abort());
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

const read = () => page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const statusInput = detail && detail.querySelector('[data-schema-readonly="true"][data-field="status"]');
  const radio = detail && detail.querySelector('[data-field="contractLevel"]');
  return {
    detailHidden: detail ? detail.hidden : null,
    detailEditable: detail ? detail.dataset.detailEditable ?? '(absent)' : null,
    status: statusInput ? statusInput.value : null,
    contractLevelDisabled: radio ? radio.disabled : null
  };
});

for (const target of ['pages/income/income-contract-schema.html', 'pages/procurement/expense-contract.html']) {
  console.log('\n=== ' + target + ' ===');
  await page.goto(pathToFileURL(path.resolve(target)).href, { waitUntil: 'load' });
  await page.locator('[data-page-view="list"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  console.log('before click:', JSON.stringify(await read()));
  await page.locator('[data-page-view="list"] [data-act="create"]').click();
  await page.waitForTimeout(600);
  console.log('after  click:', JSON.stringify(await read()));
}

await browser.close();