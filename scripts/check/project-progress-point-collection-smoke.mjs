import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = path.resolve('schemas/pages/project/project-progress.json');
const pagePath = path.resolve('pages/project-progress.html');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];

const detailRegion = schema.regions.find((region) => region.id === 'project-progress-detail');
const basicTab = detailRegion?.tabs?.find((tab) => tab.key === 'basic');
const detailForm = basicTab?.children?.find((child) => child.component === 'DetailForm');
const fields = detailForm?.fields || [];
const pointCollectionField = fields.find((field) => field.code === 'pointCollectionFile');

if (!pointCollectionField) {
  errors.push('基础信息缺少点位采集表字段。');
} else {
  if (pointCollectionField.label !== '点位采集表') errors.push('点位采集表字段名称不正确。');
  if (pointCollectionField.component !== 'upload') errors.push('点位采集表必须使用文件上传组件。');
  if (JSON.stringify(pointCollectionField.requiredWhen) !== JSON.stringify({ cumulativeProgress: '100' })) {
    errors.push('点位采集表累计进度100%必传规则不正确。');
  }
  if (fields.at(-1)?.code !== 'pointCollectionFile') errors.push('点位采集表未位于基础信息末行第三列。');
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  const detailUrl = new URL(pathToFileURL(pagePath));
  detailUrl.searchParams.set('sample', 'detail');
  detailUrl.searchParams.set('status', '草稿');
  detailUrl.searchParams.set('mode', '编辑');
  detailUrl.searchParams.set('tab', 'basic');
  await page.goto(detailUrl.href);

  const detail = page.locator('[data-page-view="detail"]');
  const upload = detail.locator('[data-field="pointCollectionFile"]');
  const uploadItem = upload.locator('xpath=ancestor::div[contains(@class,"form-item")]');
  const uploadLabel = uploadItem.locator('.form-label');
  const submit = detail.locator('[data-act="submit"]');

  if (await upload.count() !== 1) errors.push('生成页面未渲染点位采集表上传控件。');
  if (!(await upload.getAttribute('type'))?.includes('file')) errors.push('点位采集表未渲染为文件选择控件。');
  if (!(await uploadLabel.evaluate((element) => element.classList.contains('required')))) {
    errors.push('累计进度100%时点位采集表未显示必填标识。');
  }
  if (!(await upload.evaluate((element) => element.required))) errors.push('累计进度100%时上传控件未设为必填。');
  await page.screenshot({
    path: path.resolve('outputs/reports/visual/project-progress-point-collection.png'),
    fullPage: true
  });

  await submit.click();
  if (!(await detail.isVisible())) errors.push('累计进度100%且未上传时提交未被拦截。');

  await upload.setInputFiles({
    name: '点位采集表.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('prototype-file')
  });
  const uploadedName = await uploadItem.locator('[data-upload-display]').inputValue();
  if (uploadedName !== '点位采集表.xlsx') errors.push('上传后未显示点位采集表文件名。');
  await submit.click();
  if (await detail.isVisible()) errors.push('累计进度100%且已上传时仍无法提交。');

  await page.goto(detailUrl.href);
  await detail.locator('[data-field="cumulativeProgress"]').evaluate((element) => {
    element.value = '80';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (await upload.evaluate((element) => element.required)) errors.push('累计进度非100%时上传控件仍为必填。');
  if (await uploadLabel.evaluate((element) => element.classList.contains('required'))) {
    errors.push('累计进度非100%时点位采集表仍显示必填标识。');
  }
  await submit.click();
  if (await detail.isVisible()) errors.push('累计进度非100%且未上传时提交被错误拦截。');
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('项目进度填报点位采集表专项检查通过：100%必传、上传后可提交、非100%选填。');
