import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
await page.route(/^https?:/, (route) => route.abort());
await page.goto(pathToFileURL(path.resolve('pages/income/income-contract-schema.html')).href, { waitUntil: 'domcontentloaded' });

const listState = await page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const list = document.querySelector('[data-page-view="list"]');
  return {
    detailHidden: detail ? detail.hidden : null,
    detailEditableAttr: detail ? detail.dataset.detailEditable : null,
    listHidden: list ? list.hidden : null
  };
});
console.log('list view state:', JSON.stringify(listState));

await page.locator('[data-act="create"]').first().click();
await page.waitForTimeout(200);

const detailState = await page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const field = (code) => detail && detail.querySelector('[data-field="' + code + '"]');
  const save = document.querySelector('[data-act="save"]');
  const submit = document.querySelector('[data-act="submit"]');
  return {
    detailEditable: detail ? detail.dataset.detailEditable : null,
    detailMode: detail ? detail.dataset.detailMode : null,
    statusValue: field('status') ? field('status').value : null,
    contractLevelDisabled: field('contractLevel') ? field('contractLevel').disabled : null,
    parentContractDisabled: field('parentContract') ? field('parentContract').disabled : null,
    saveExists: Boolean(save),
    saveDisabled: save ? save.disabled : null,
    submitExists: Boolean(submit),
    submitDisabled: submit ? submit.disabled : null,
    submitNextStatus: submit ? submit.dataset.nextStatus : null
  };
});
console.log('detail view state:', JSON.stringify(detailState, null, 2));

await browser.close();