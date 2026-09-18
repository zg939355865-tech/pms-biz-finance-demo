import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
await page.route(/^https?:/, (route) => route.abort());
await page.goto(pathToFileURL(path.resolve('pages/income/income-contract-schema.html')).href, { waitUntil: 'load' });
await page.locator('[data-page-view="list"]').waitFor({ state: 'visible' });
await page.waitForTimeout(300);
await page.locator('[data-field="contractLevel"]').first().waitFor({ state: 'attached' }).catch(() => {});
await page.locator('[data-page-view="list"] [data-act="create"]').click();
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const detail = document.querySelector('[data-page-view="detail"]');
  const radios = Array.from(detail.querySelectorAll('[data-field="contractLevel"]')).map((r) => ({
    value: r.value, disabled: r.disabled, checked: r.checked,
    schemaDisabled: r.dataset.schemaDisabled, schemaReadonly: r.dataset.schemaReadonly
  }));
  const conditional = Array.from(detail.querySelectorAll('[data-readonly-when],[data-editable-when],[data-required-when]'))
    .map((c) => ({
      field: c.dataset.field,
      readonlyWhen: c.dataset.readonlyWhen,
      editableWhen: c.dataset.editableWhen,
      disabled: c.disabled
    }));
  return { detailEditable: detail.dataset.detailEditable, radios, conditional };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();