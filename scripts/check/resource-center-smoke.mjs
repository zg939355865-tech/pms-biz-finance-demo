import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';
import { componentRegistry } from '../lib/component-registry.mjs';

const htmlPath = path.resolve(process.argv[2] || 'prototype-resources/index.html');
const outputDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors = [];
const resourceManifest = JSON.parse(fs.readFileSync(path.resolve('prototype-resources/manifest.json'), 'utf8'));
const officialNames = new Set(resourceManifest.categories.flatMap((category) => category.components.map((component) => component.name)));
const officialComponentCount = officialNames.size;
const pmsComponentCount = Object.values(componentRegistry.categories).flat().filter((name) => !officialNames.has(name)).length;

await verifyDesktop();
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Resource center visual smoke passed: desktop');

async function verifyDesktop() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(`desktop page error: ${error.message}`));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  if (await page.locator('[data-resource-component]').count() !== officialComponentCount) errors.push(`official component count is not ${officialComponentCount}`);
  if (await page.locator('[data-resource-pms]').count() !== pmsComponentCount) errors.push(`PMS component count is not ${pmsComponentCount}`);
  await page.locator('#componentSearch').fill('AutoComplete');
  if (!await page.locator('[data-resource-component="AutoComplete"]').isVisible()) errors.push('component search failed');
  await page.locator('#componentSearch').fill('');
  await page.locator('[data-view="samples"]').click();
  if (!await page.locator('[data-view-panel="samples"]').isVisible()) errors.push('sample view did not open');
  await page.locator('[data-preview]').first().click();
  if (!await page.locator('#previewOverlay').isVisible()) errors.push('page preview did not open');
  await page.locator('[data-close="preview"]').click();
  await page.locator('[data-view="rules"]').click();
  if (!await page.locator('[data-view-panel="rules"]').isVisible()) errors.push('rules view did not open');
  await page.locator('[data-view="components"]').click();
  await page.locator('[data-resource-component="Modal"] [data-action="modal"]').click();
  if (!await page.locator('#modalOverlay').isVisible()) errors.push('modal demo did not open');
  await page.locator('[data-close="modal"]').first().click();
  await page.screenshot({ path: path.join(outputDir, 'resource-center-desktop.png'), fullPage: true });
  await page.close();
}
