import { chromium } from '../../scripts/lib/playwright-smoke.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.goto(pathToFileURL(path.resolve('menu/index.html')).href);
 await page.evaluate(()=>openPage('期末结账','结账助手','period-close/closing-assistant.html'));
 const frame=page.frameLocator('#contentFrame');
 await frame.locator('#closing-check-config-table').waitFor();
 for(const width of [1440,2048]) {
  await page.setViewportSize({width,height:1100});
  await frame.locator('[data-act="add-row"]').click();
  const row=frame.locator('#closing-check-config-table tbody tr').first();
  await row.locator('select[data-field="checkModule"]').selectOption('固资');
  await page.screenshot({path:`outputs/reports/visual/closing-assistant-fixed-asset-${width}.png`,fullPage:true});
  await row.locator('[data-act="cancel-row"]').evaluate(el=>el.click());
 }
 console.log('Iframe menu entry and asset option passed at 1440px / 2048px.');
} finally {await browser.close();}
