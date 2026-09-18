import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
await page.route(/^https?:/, (route) => route.abort());

const read = () => page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const statusInput = detail && detail.querySelector('[data-schema-readonly="true"][data-field="status"]');
  const radio = detail && detail.querySelector('[data-field="contractLevel"]');
  const parent = detail && detail.querySelector('[data-field="parentContract"]');
  return {
    detailEditable: detail ? detail.dataset.detailEditable ?? '(absent)' : null,
    status: statusInput ? statusInput.value : null,
    contractLevelDisabled: radio ? radio.disabled : null,
    parentContractDisabled: parent ? parent.disabled : null
  };
});

const load = async () => {
  await page.goto(pathToFileURL(path.resolve('pages/income/income-contract-schema.html')).href, { waitUntil: 'load' });
  await page.locator('[data-page-view="list"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
};

const filters = async () => {
  await page.locator('#contract-search [data-field="status"]').selectOption('审核');
  await page.locator('#contract-search [data-act="query"]').click();
  await page.locator('#contract-search [data-act="reset"]').click();
  await page.locator('#contract-search [data-field="businessStatus"]').selectOption('已关闭');
  await page.locator('#contract-search [data-act="query"]').click();
  await page.locator('#contract-search [data-act="reset"]').click();
  await page.locator('#contract-search [data-field="contractLevel"]').selectOption('子合同');
  await page.locator('#contract-search [data-act="query"]').click();
  await page.locator('#contract-search [data-act="reset"]').click();
};

const selectAndClear = async () => {
  const index = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#contract-table tbody tr[data-row-index]'));
    return rows.findIndex((row) => JSON.parse(row.dataset.rowValue || '{}').status === '新增');
  });
  await page.locator('#contract-table tbody tr[data-row-index]').nth(index).locator('[data-row-select]').check();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    document.querySelectorAll('#contract-table [data-row-select]').forEach((b) => { if (b.checked) b.click(); });
  });
  await page.waitForTimeout(150);
};

await load();
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(400);
console.log('A) create only            :', JSON.stringify(await read()));

await load();
await filters();
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(400);
console.log('B) filters then create    :', JSON.stringify(await read()));

await load();
await filters();
await selectAndClear();
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(400);
console.log('C) filters+select then create:', JSON.stringify(await read()));

await browser.close();