import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
await page.route(/^https?:/, (route) => route.abort());

const read = () => page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const radio = detail && detail.querySelector('[data-field="contractLevel"]');
  return {
    detailEditable: detail ? detail.dataset.detailEditable ?? '(absent)' : null,
    contractLevelDisabled: radio ? radio.disabled : null
  };
});

const load = async () => {
  await page.goto(pathToFileURL(path.resolve('pages/income/income-contract-schema.html')).href, { waitUntil: 'load' });
  await page.locator('[data-page-view="list"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
};

await load();
await page.setViewportSize({ width: 2048, height: 1200 });
await page.waitForTimeout(200);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(200);
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(400);
console.log('A) viewport switch then create:', JSON.stringify(await read()));

await load();
await page.setViewportSize({ width: 2048, height: 1200 });
await page.screenshot({ path: 'outputs/reports/visual/income-contract/.tmp-probe-2048.png', fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: 'outputs/reports/visual/income-contract/.tmp-probe-1440.png', fullPage: true });
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(400);
console.log('B) viewport+screenshot create:', JSON.stringify(await read()));

await browser.close();