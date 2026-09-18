import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';
import { listFilesRecursive } from '../lib/file-utils.mjs';

const root = process.cwd();
const schemas = listFilesRecursive('schemas/pages', (filePath) => filePath.endsWith('.json'))
  .map((filePath) => ({ filePath, schema: JSON.parse(fs.readFileSync(filePath, 'utf8')) }))
  .filter(({ schema }) => containsCreateAction(schema));
const errors = [];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});

for (const { filePath, schema } of schemas) {
  const outputPath = schema.outputPath;
  if (!outputPath || !fs.existsSync(outputPath)) {
    errors.push(`${filePath}: create page output is missing`);
    continue;
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(pathToFileURL(path.resolve(root, outputPath)).href);
    const createButton = page.locator('[data-page-view="list"] [data-act="create"]:visible').first();
    if (!await createButton.count()) {
      errors.push(`${outputPath}: visible create action is missing`);
      continue;
    }

    const initialBusinessValues = await captureBusinessValues(page);
    await createButton.click();
    if (!await page.locator('[data-page-view="detail"]').isVisible()) {
      errors.push(`${outputPath}: create action did not open the detail view`);
      continue;
    }

    const createValues = await captureBusinessValues(page);
    const populated = createValues.filter((field) => field.populated);
    if (populated.length) {
      errors.push(`${outputPath}: create detail inherited business values (${populated.map(formatField).join(', ')})`);
    }

    const backButton = page.locator('[data-page-view="detail"] [data-act="back-list"]:visible').first();
    if (await backButton.count()) await backButton.click();
    const editButton = page.locator('[data-page-view="list"] [data-act="edit"]:visible').first();
    if (await editButton.count() && initialBusinessValues.some((field) => field.populated)) {
      await editButton.click();
      const restoredValues = await captureBusinessValues(page);
      const restored = restoredValues.some((field) =>
        field.populated && initialBusinessValues.some((initial) =>
          initial.code === field.code && initial.value === field.value && initial.populated
        )
      );
      if (!restored) errors.push(`${outputPath}: draft edit did not restore existing business values`);
    }
  } catch (error) {
    errors.push(`${outputPath}: ${error.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Create detail standard smoke passed: ${schemas.length} create-enabled Schema pages`);

function containsCreateAction(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.code === 'create' || value.event === 'create' || value.action === 'create') return true;
  return Object.values(value).some((item) =>
    Array.isArray(item) ? item.some(containsCreateAction) : containsCreateAction(item)
  );
}

async function captureBusinessValues(page) {
  return page.locator('[data-page-view="detail"] [data-field]').evaluateAll((controls) =>
    controls.map((control) => {
      const item = control.closest('.form-item');
      const label = String(item?.querySelector('.form-label')?.textContent || '').trim();
      const code = String(control.dataset.field || '');
      const preserved =
        control.dataset.preserveOnCreate === 'true' ||
        control.dataset.defaultToday === 'true' ||
        /(status|state)$/i.test(code) ||
        /^(creator|createdBy|createdAt|createTime|createdTime|company|createdCompany|ownerCompany)$/i.test(code) ||
        /状态$/.test(label) ||
        /^(创建人|创建时间|创建公司|所属公司|项目所属公司|项目主责公司)$/.test(label);
      const value = control.matches('[role="switch"]')
        ? control.getAttribute('aria-checked') || 'false'
        : control.matches('input[type="checkbox"],input[type="radio"]')
          ? String(control.checked)
          : String(control.value || '').trim();
      const populated = !preserved && (
        control.matches('[role="switch"]') ? value === 'true' :
        control.matches('input[type="checkbox"],input[type="radio"]') ? value === 'true' :
        Boolean(value)
      );
      return { code, label, value, populated };
    })
  );
}

function formatField(field) {
  return `${field.label || field.code}=${field.value}`;
}
