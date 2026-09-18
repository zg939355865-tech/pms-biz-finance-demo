import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedHeaders = ['文档类型', '文档名称'];
const expectedTypes = ['设备验收单', '点位采集表', '算法上传', '培训记录表', '验收报告'];
const expectedNames = ['设备验收单.pdf', '点位采集表.xlsx', '曝气智能体算法包.zip', '培训记录表.xlsx', '项目验收报告.pdf'];

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  await page.goto(pathToFileURL(path.resolve('pages/requirement-trace.html')).href);
  await page.locator('tbody .btn-link').first().click();
  await page.getByRole('tab', { name: '项目执行', exact: true }).click();

  const section = page.locator('[data-section="document-attachments"]');
  await section.waitFor({ state: 'visible' });

  assertEqual(
    (await page.locator('.modal-body > .info-section .section-title').allTextContents()).map((value) => value.trim()),
    ['执行进度', '文档附件'],
    'project execution section order'
  );
  assertEqual(
    (await page.locator('.modal-body > .info-section').first().locator('thead th').allTextContents()).map((value) => value.trim()),
    ['项目阶段', '负责人', '实际开工日期', '当前进度'],
    'execution headers remain unchanged'
  );
  assertEqual((await section.locator('.section-title').textContent())?.trim(), '文档附件', 'section title');
  assertEqual(
    (await section.locator('thead th').allTextContents()).map((value) => value.trim()),
    expectedHeaders,
    'document headers'
  );
  assertEqual(
    (await section.locator('tbody tr td:first-child').allTextContents()).map((value) => value.trim()),
    expectedTypes,
    'document types'
  );
  assertEqual(
    (await section.locator('.document-name-cell > span').allTextContents()).map((value) => value.trim()),
    expectedNames,
    'document names'
  );
  assertEqual(await section.locator('.document-link').count(), 0, 'document names are not clickable');
  assertEqual(await page.locator('.document-preview-overlay').count(), 0, 'document preview dialog is removed');

  const downloadButtons = section.locator('.document-download-btn');
  assertEqual(await downloadButtons.count(), 5, 'download button count');
  assertEqual(
    await downloadButtons.first().evaluate((element) => getComputedStyle(element).color),
    'rgb(37, 99, 235)',
    'download button color'
  );
  assertEqual(
    await downloadButtons.first().evaluate((element) => getComputedStyle(element).cursor),
    'pointer',
    'download button cursor'
  );

  const downloadPromise = page.waitForEvent('download');
  await downloadButtons.first().click();
  const download = await downloadPromise;
  assertEqual(download.suggestedFilename(), expectedNames[0], 'download file name');

  const hasHorizontalOverflow = await page.locator('.modal-body').evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1
  );
  assertEqual(hasHorizontalOverflow, false, 'modal horizontal overflow');

  await fs.mkdir(path.resolve('outputs/reports/visual'), { recursive: true });
  await page.screenshot({
    path: path.resolve('outputs/reports/visual/requirement-trace-document-attachments.png'),
    fullPage: true
  });
  console.log('requirement trace document attachment smoke passed');
} finally {
  await browser.close();
}
