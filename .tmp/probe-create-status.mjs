import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const expense = JSON.parse(fs.readFileSync('schemas/pages/procurement/expense-contract.json', 'utf8'));
console.log('expense detailEditableStatuses:', JSON.stringify(expense.detailEditableStatuses));
console.log('expense createStatus:', JSON.stringify(expense.createStatus));
console.log('expense create action:', JSON.stringify(expense.pageActions.find((a) => a.code === 'create')));

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
await page.route(/^https?:/, (route) => route.abort());

for (const target of ['pages/procurement/expense-contract.html', 'pages/income/income-contract-schema.html']) {
  await page.goto(pathToFileURL(path.resolve(target)).href, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-act="create"]').first().click();
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => {
    const detail = document.querySelector('[data-page-view="detail"]');
    const field = (code) => detail && detail.querySelector('[data-field="' + code + '"]');
    const statusInput = detail && detail.querySelector('[data-schema-readonly="true"][data-field="status"]');
    return {
      detailEditable: detail ? detail.dataset.detailEditable : null,
      statusField: statusInput ? statusInput.value : null,
      disabledFieldCount: detail ? Array.from(detail.querySelectorAll('[data-field]')).filter((x) => x.disabled).length : null,
      totalFieldCount: detail ? detail.querySelectorAll('[data-field]').length : null
    };
  });
  console.log('\n' + target);
  console.log(' ', JSON.stringify(state));
}

await browser.close();