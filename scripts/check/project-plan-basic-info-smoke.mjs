import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedFields = [
  ['projectCode', '项目编码'],
  ['projectName', '项目名称'],
  ['status', '状态'],
  ['projectType', '项目类型'],
  ['planStatus', '计划状态'],
  ['customerCode', '客户编码'],
  ['customerName', '客户名称'],
  ['salesOwner', '销售负责人'],
  ['projectManager', '项目经理'],
  ['plannedStart', '计划开工日期'],
  ['plannedFinish', '计划完工日期'],
  ['plannedCycle', '项目周期(天)'],
  ['actualStart', '实际开工日期'],
  ['actualFinish', '实际完工日期'],
  ['actualCycle', '实际周期(天)'],
  ['projectStage', '项目阶段'],
  ['collaborationCompany', '协作公司'],
  ['owner', '负责人'],
  ['creator', '创建人'],
  ['createdAt', '创建时间'],
  ['company', '项目主责公司']
];

const schemaPath = path.resolve('schemas/pages/project/project-plan.json');
const pagePath = path.resolve('pages/project-plan.html');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];

const detailRegion = schema.regions.find((region) => region.id === 'project-plan-detail');
const basicTab = detailRegion?.tabs?.find((tab) => tab.key === 'basic');
const detailForm = basicTab?.children?.find((child) => child.component === 'DetailForm');
const schemaFields = detailForm?.fields || [];

if (!detailForm) {
  errors.push('Project plan basic tab must use DetailForm.');
} else {
  const actualSchema = schemaFields.map((field) => [field.code, field.label]);
  if (JSON.stringify(actualSchema) !== JSON.stringify(expectedFields)) {
    errors.push(`Project plan basic field order mismatch: ${JSON.stringify(actualSchema)}`);
  }

  const editableFields = schemaFields.filter((field) => field.readonly !== true).map((field) => field.code);
  if (editableFields.length) {
    errors.push(`Project plan basic fields must be readonly: ${editableFields.join(', ')}`);
  }

  const creator = schemaFields.find((field) => field.code === 'creator');
  if (creator?.value !== '系统生成') {
    errors.push('Project plan creator must display 系统生成.');
  }

  if (schemaFields.some((field) => field.code === 'estimatedAmount')) {
    errors.push('Project plan basic info must not include estimatedAmount.');
  }
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  const url = new URL(pathToFileURL(pagePath));
  url.searchParams.set('sample', 'detail');
  url.searchParams.set('tab', 'basic');
  await page.goto(url.href);

  const form = page.locator(
    '[data-page-view="detail"] [data-tab-panel="basic"] [data-component="DetailForm"]'
  );
  if (await form.count() !== 1) {
    errors.push('Generated detail page must render one shared DetailForm in the basic tab.');
  } else {
    const rendered = await form.locator('.form-item').evaluateAll((items) =>
      items.map((item) => ({
        label: item.querySelector('.form-label')?.textContent?.trim() || '',
        code: item.querySelector('[data-field]')?.getAttribute('data-field') || ''
      }))
    );
    const actualRendered = rendered.map(({ code, label }) => [code, label]);
    if (JSON.stringify(actualRendered) !== JSON.stringify(expectedFields)) {
      errors.push(`Generated project plan basic fields mismatch: ${JSON.stringify(actualRendered)}`);
    }

    for (const [code] of expectedFields) {
      const control = form.locator(`[data-field="${code}"]`);
      if (await control.count() !== 1) {
        errors.push(`Missing generated project plan field: ${code}`);
        continue;
      }
      const locked = await control.evaluate((element) =>
        element.matches('select') ? element.disabled : element.readOnly || element.disabled
      );
      if (!locked) errors.push(`Generated project plan field is editable: ${code}`);
    }
  }
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Project plan basic info smoke passed: ${expectedFields.length} fields.`);
