import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const root = process.cwd();
const excludedPages = new Set(['pages/agent-cockpit.html']);
const pages = walk(path.join(root, 'pages'))
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !excludedPages.has(relative(file)))
  .sort();
const viewports = [
  { width: 1440, height: 1000 },
  { width: 2048, height: 1152 }
];
const errors = [];

verifyPublicResources();
verifyMenuPaths();

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});

for (const filePath of pages) {
  for (const viewport of viewports) {
    await verifyPage(browser, filePath, viewport);
  }
}

await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`All-page desktop check passed: ${pages.length} pages x ${viewports.length} desktop viewports; excluded by request: ${[...excludedPages].join(', ')}`);

function verifyPublicResources() {
  for (const filePath of pages) {
    const html = fs.readFileSync(filePath, 'utf8');
    const hasTokens = /prototype-resources\/components\/tokens\.css/.test(html);
    const hasPublicLayer = /prototype-resources\/components\/(?:components|legacy-page-bridge)\.css/.test(html);
    const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
    const hasExternalBlockingScript = /<script[^>]+src=["']https?:\/\//i.test(html);
    if (!hasTokens || !hasPublicLayer) {
      errors.push(`${relative(filePath)}: public tokens or component stylesheet missing`);
    }
    if (!hasViewport) errors.push(`${relative(filePath)}: viewport metadata missing`);
    if (hasExternalBlockingScript) errors.push(`${relative(filePath)}: external blocking script is not allowed in static delivery`);
  }
}

function verifyMenuPaths() {
  const menuFile = path.join(root, 'menu', 'index.html');
  const menuHtml = fs.readFileSync(menuFile, 'utf8');
  const paths = [...menuHtml.matchAll(/"path"\s*:\s*"([^"]+\.html)"/g)].map((match) => match[1]);
  for (const menuPath of new Set(paths)) {
    const target = path.join(root, 'pages', menuPath);
    if (!fs.existsSync(target)) errors.push(`menu/index.html: missing page ${menuPath}`);
  }
}

async function verifyPage(browser, filePath, viewport) {
  const label = `${relative(filePath)} @ ${viewport.width}`;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const pageErrors = [];
  await page.route(/^https?:/, (route) => route.abort());
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => ({
      title: document.title.trim(),
      textLength: (document.body?.innerText || '').replace(/\s+/g, '').length,
      globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      prohibitedToolbarCount: document.querySelectorAll(
        '[data-component="ProTable"] [data-act="refresh"]:not([hidden]), ' +
        '[data-component="ProTable"] [data-act="fullscreen"]:not([hidden]), ' +
        '[data-component="ProTable"] [data-act="columns"]:not([hidden])'
      ).length,
      duplicateWorkflowTabs: [...document.querySelectorAll('[role="tab"], .schema-tab')]
        .filter((element) => ['流程动态', '当前责任人', '流程图'].includes((element.textContent || '').trim()))
        .length,
      inaccessibleIconButtons: [...document.querySelectorAll('button')].filter((button) => {
        const style = getComputedStyle(button);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const text = (button.innerText || '').replace(/\s+/g, '').trim();
        return !text && !button.getAttribute('aria-label') && !button.getAttribute('title');
      }).length,
      verticalTableScrolls: [...document.querySelectorAll('.pro-table-scroll')].filter((element) => {
        const style = getComputedStyle(element);
        return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
      }).length,
      ellipsisWithoutTitle: [...document.querySelectorAll('.schema-cell-ellipsis')].filter((cell) => {
        const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        return text && !cell.getAttribute('title') && !cell.querySelector('input, select, textarea, button, .tag');
      }).length
    }));
    if (!metrics.title) errors.push(`${label}: document title missing`);
    if (metrics.textLength < 2) errors.push(`${label}: page body is blank`);
    if (metrics.globalOverflow) errors.push(`${label}: page-level horizontal overflow`);
    if (metrics.prohibitedToolbarCount) errors.push(`${label}: prohibited refresh/fullscreen/column-setting toolbar is visible`);
    if (metrics.duplicateWorkflowTabs) errors.push(`${label}: workflow inspection is duplicated as content tabs`);
    if (metrics.inaccessibleIconButtons) errors.push(`${label}: ${metrics.inaccessibleIconButtons} icon-only buttons have no accessible name`);
    if (metrics.verticalTableScrolls) errors.push(`${label}: table exposes internal vertical scrolling`);
    if (metrics.ellipsisWithoutTitle) errors.push(`${label}: ${metrics.ellipsisWithoutTitle} ellipsis cells have no hover title`);
    for (const message of pageErrors) errors.push(`${label}: ${message}`);
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
  } finally {
    await page.close();
  }
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}
