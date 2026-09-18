import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const pagePath = path.resolve('pages/material/inventory-location.html');
const reportDir = path.resolve('outputs/reports/visual/material');
fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
page.setDefaultTimeout(10000);

try {
  await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  expect(await page.locator('.page-title').first().innerText() === '库存地点', '页面标题不正确');
  const table = page.locator('[data-page-view="list"] [data-component="ProTable"]').first();
  expect(await table.locator('tbody tr:not([hidden])').count() === 5, '列表未固定显示 5 条记录');
  expect((await page.locator('#inventory-location-search .form-label').allTextContents()).map((x) => x.trim()).join(',') === '库存地点编码或名称', '查询条件错误');
  const searchLabel = page.locator('#inventory-location-search .form-label');
  const searchInput = page.locator('#inventory-location-search [data-field="keyword"]');
  const [labelBox, inputBox] = await Promise.all([searchLabel.boundingBox(), searchInput.boundingBox()]);
  const selectionBox = await table.locator('[data-row-select]').first().boundingBox();
  const queryButtonBox = await page.locator('#inventory-location-search [data-act="query"]').boundingBox();
  expect(Boolean(labelBox && inputBox && labelBox.x + labelBox.width < inputBox.x), '查询标签与输入框发生遮挡');
  expect(Boolean(labelBox && selectionBox && Math.abs(labelBox.x - selectionBox.x) <= 1), '查询标签未与表格复选框左边界对齐');
  expect(Boolean(inputBox && inputBox.width >= 240), '搜索框宽度不足 240px');
  expect(Boolean(inputBox && queryButtonBox && Math.abs(inputBox.y - queryButtonBox.y) <= 1), '查询按钮未与搜索框保持同一行');
  expect((await table.locator('thead th').allTextContents()).map((x) => x.trim()).join(',') === ',库存地点编码,库存地点名称,创建人,创建时间,操作', '列表字段或顺序错误');
  await table.locator('tbody tr:not([hidden]) a[data-act]').first().click();
  expect(await page.locator('[data-page-view="detail"]').isVisible(), '库存地点编码未进入详情');
  const bins = page.locator('[data-page-view="detail"] [data-component="EditableTable"][data-data-source="storageBins"]');
  expect(await page.locator('[data-page-view="detail"] [data-tab]').count() === 1, '库位信息不应作为独立页签');
  expect((await page.locator('[data-page-view="detail"] .form-label').allTextContents()).map((x) => x.trim()).join(',') === '库存地点编码,库存地点名称,创建人,创建时间,所属公司,备注', '基础信息字段或顺序错误');
  const company = page.locator('[data-page-view="detail"] [data-field="company"]');
  expect(await company.count() === 1 && await company.isDisabled() && await company.inputValue() === '昕彤赋能（武汉）设计研究有限公司', '所属公司未固定为默认公司');
  expect((await bins.locator('thead th').allTextContents()).map((x) => x.trim()).join(',') === ',序号,库位编码,是否默认库位,备注,操作', '库位信息字段或顺序错误');
  const defaultBins = bins.locator('select[data-field="isDefaultBin"]');
  expect(await defaultBins.count() >= 2, '库位样例不足');
  await defaultBins.nth(1).selectOption('是');
  expect((await defaultBins.evaluateAll((controls) => controls.filter((control) => control.value === '是').length)) === 1, '设置新默认库位后未自动取消原默认库位');
  await page.screenshot({ path: path.join(reportDir, 'inventory-location-detail.png'), fullPage: true });
  await page.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const materialMenu = page.locator('.menu-primary', { hasText: '物资管理' });
  await materialMenu.click();
  const section = materialMenu.locator('xpath=..');
  const item = section.locator('.submenu button', { hasText: '库存地点' });
  expect(await item.count() === 1, '物资管理中缺少库存地点菜单');
  expect(await item.getAttribute('data-path') === 'material/inventory-location.html', '库存地点菜单路径不正确');
  await item.click();
  expect((await page.locator('#contentFrame').getAttribute('src'))?.endsWith('material/inventory-location.html'), '菜单未加载库存地点页面');
} catch (error) {
  errors.push(error.message);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('库存地点页面回归通过：菜单、详情、库位与默认库位互斥有效');
