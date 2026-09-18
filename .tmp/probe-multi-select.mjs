import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from '../scripts/lib/playwright-smoke.mjs';

const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function run(file, warehouseValue) {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.route(/^https?:/, (route) => route.abort());

  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
  await page.locator('[data-page-view="list"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);

  // 1. create
  await page.locator('[data-page-view="list"] [data-act="create"]').click();
  await page.waitForTimeout(300);
  const afterCreate = await page.evaluate(() => {
    const detail = document.querySelector('[data-page-view="detail"]');
    const table = detail && detail.querySelector('[data-component="EditableTable"]');
    const tbody = table && table.querySelector('tbody');
    const rows = tbody ? tbody.querySelectorAll('tr[data-row-value]').length : -1;
    const warehouse = detail && detail.querySelector('[data-field="warehouse"]');
    return { rows, warehouse: warehouse ? warehouse.value : null, hidden: detail ? detail.hidden : null };
  });
  log(`[${file}] after create: detailRows=${afterCreate.rows} warehouse=${afterCreate.warehouse}`);

  // 2. open picker
  const openBtn = page.locator('[data-page-view="detail"] [data-act="open"][aria-label*="即时库存"]');
  const openCount = await openBtn.count();
  log(`[${file}] open buttons (即时库存): ${openCount}, disabled=${openCount ? await openBtn.first().isDisabled() : '-'}`);
  if (openCount) {
    if (await openBtn.first().isDisabled()) {
      // try setting warehouse
      await page.evaluate(() => {
        const detail = document.querySelector('[data-page-view="detail"]');
        const w = detail && detail.querySelector('[data-field="warehouse"]');
        if (w) { w.value = w.querySelector('option:nth-child(2)') ? w.querySelector('option:nth-child(2)').value : '武汉中心仓'; w.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(200);
      log(`[${file}] warehouse set -> ${await page.evaluate(() => document.querySelector('[data-page-view="detail"] [data-field="warehouse"]').value)}, openBtn disabled=${await openBtn.first().isDisabled()}`);
    }
    await openBtn.first().click();
    await page.waitForTimeout(300);
  }

  const pickerState = await page.evaluate(() => {
    const overlay = document.querySelector('[data-overlay="inventory-picker"],[data-overlay="other-inventory-picker"],[data-overlay="order-line-picker"]');
    if (!overlay || overlay.hidden) return { open: false };
    const boxes = Array.from(overlay.querySelectorAll('[data-row-select]'));
    return { open: true, total: boxes.length, disabledCount: boxes.filter((b) => b.disabled).length, hiddenRows: Array.from(overlay.querySelectorAll('tr[data-row-value]')).filter((tr) => tr.hidden).length };
  });
  log(`[${file}] picker: ${JSON.stringify(pickerState)}`);

  // 3. check 3 rows
  const checked = await page.evaluate(() => {
    const overlay = document.querySelector('[data-overlay="inventory-picker"],[data-overlay="other-inventory-picker"],[data-overlay="order-line-picker"]');
    if (!overlay) return 0;
    const boxes = Array.from(overlay.querySelectorAll('[data-row-select]')).filter((b) => !b.disabled);
    boxes.slice(0, 3).forEach((b) => { b.click(); });
    return boxes.slice(0, 3).length;
  });
  await page.waitForTimeout(300);
  const confirmState = await page.evaluate(() => {
    const overlay = document.querySelector('[data-overlay="inventory-picker"],[data-overlay="other-inventory-picker"],[data-overlay="order-line-picker"]');
    const btn = overlay && overlay.querySelector('[data-act^="confirm-"]');
    return btn ? { disabled: btn.disabled, act: btn.dataset.act } : null;
  });
  log(`[${file}] checked=${checked} confirmBtn=${JSON.stringify(confirmState)}`);

  // 4. confirm
  if (confirmState && !confirmState.disabled) {
    await page.evaluate(() => {
      const overlay = document.querySelector('[data-overlay="inventory-picker"],[data-overlay="other-inventory-picker"],[data-overlay="order-line-picker"]');
      overlay.querySelector('[data-act^="confirm-"]').click();
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const detail = document.querySelector('[data-page-view="detail"]');
      const table = detail && detail.querySelector('[data-component="EditableTable"]');
      const tbody = table && table.querySelector('tbody');
      return { rows: tbody ? tbody.querySelectorAll('tr[data-row-value]').length : -1, overlayHidden: document.querySelector('[data-overlay="inventory-picker"],[data-overlay="other-inventory-picker"],[data-overlay="order-line-picker"]').hidden };
    });
    log(`[${file}] AFTER CONFIRM: detailRows=${after.rows} overlayHidden=${after.overlayHidden}`);
  }

  if (errors.length) log(`[${file}] ERRORS:\n  ` + errors.slice(0, 8).join('\n  '));
  await browser.close();
}

await run('pages/material/material-outbound.html');
await run('pages/procurement/purchase-receipt.html');
fs.writeFileSync('.tmp/probe-multi-out.txt', out.join('\n'), 'utf8');
