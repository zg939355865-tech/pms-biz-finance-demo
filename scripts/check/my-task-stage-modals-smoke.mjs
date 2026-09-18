import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from '../lib/playwright-smoke.mjs';

const text = {
  owner: '\u8d1f\u8d23\u4eba',
  currentStage: '\u5f53\u524d\u9636\u6bb5',
  taskType: '\u4efb\u52a1\u7c7b\u578b',
  survey: '\u8c03\u7814\u95ee\u5377',
  proposal: '\u9879\u76ee\u65b9\u6848',
  notice: '\u9879\u76ee\u5b9e\u65bd\u901a\u77e5',
  setup: '\u9879\u76ee\u7acb\u9879',
  milestone: '\u91cc\u7a0b\u7891\u8ba1\u5212',
  progress: '\u9879\u76ee\u8fdb\u5ea6\u586b\u62a5',
  ownTask: '\u6211\u53f8\u4efb\u52a1',
  crossCompanyTask: '\u8de8\u53f8\u4efb\u52a1',
  addSurvey: '\u65b0\u589e\u8c03\u7814\u95ee\u5377',
  addProposal: '\u65b0\u589e\u9879\u76ee\u65b9\u6848',
  addNotice: '\u65b0\u589e\u9879\u76ee\u5b9e\u65bd\u901a\u77e5',
  addSetup: '\u65b0\u589e\u9879\u76ee\u7acb\u9879',
  addPlan: '\u65b0\u589e\u9879\u76ee\u8ba1\u5212',
  requirementCode: '\u9700\u6c42\u7f16\u53f7',
  sourceCompany: '\u9700\u6c42\u6765\u6e90\u516c\u53f8',
  requirementOwner: '\u9700\u6c42\u63d0\u51fa\u4eba',
  customerCode: '\u5ba2\u6237\u7f16\u7801',
  customerName: '\u5ba2\u6237\u540d\u79f0',
  status: '\u72b6\u6001',
  projectName: '\u9879\u76ee\u540d\u79f0',
  projectStage: '\u9879\u76ee\u9636\u6bb5',
  projectType: '\u9879\u76ee\u7c7b\u578b',
  planStatus: '\u8ba1\u5212\u72b6\u6001',
  pendingReview: '\u5f85\u5ba1\u6838',
  workflowStatus: '\u6d41\u7a0b\u72b6\u6001',
  draft: '\u8349\u7a3f',
  agents: '\u667a\u80fd\u4f53',
  collaborationCompany: '\u534f\u4f5c\u516c\u53f8'
};

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function assertModal(
  target,
  title,
  readonlyLabels = [],
  expectedValues = {},
  dropdownLabels = [],
  editableTableFields = [],
  submitLabel = '提交'
) {
  await page.locator(`#project-proposal-task-table [data-target="${target}"]`).first().click();

  const modal = page.locator(`[data-overlay="${target}"]`);
  await modal.waitFor({ state: 'visible' });

  const actualTitle = (await modal.locator('.pro-modal-header h2').textContent())?.trim();
  assertEqual(actualTitle, title, `${target} title`);

  for (const label of readonlyLabels) {
    const isReadonly = await modal.evaluate((root, expectedLabel) => {
      const item = [...root.querySelectorAll('.form-item')].find((candidate) => {
        const itemLabel = candidate.querySelector('.form-label')?.textContent?.replace('*', '').trim();
        return itemLabel === expectedLabel;
      });
      const control = item?.querySelector('input, select, textarea');
      if (!control) return false;
      return control.matches('select') ? control.disabled : control.readOnly || control.disabled;
    }, label);

    if (!isReadonly) {
      throw new Error(`${target}: ${label} must be read-only`);
    }
  }

  for (const [label, expectedValue] of Object.entries(expectedValues)) {
    const actualValue = await modal.evaluate((root, expectedLabel) => {
      const item = [...root.querySelectorAll('.form-item')].find((candidate) => {
        const itemLabel = candidate.querySelector('.form-label')?.textContent?.replace('*', '').trim();
        return itemLabel === expectedLabel;
      });
      return item?.querySelector('input, select, textarea')?.value;
    }, label);
    assertEqual(actualValue, expectedValue, `${target}: ${label} default value`);
  }

  for (const label of dropdownLabels) {
    const dropdownIsUsable = await modal.evaluate((root, expectedLabel) => {
      const item = [...root.querySelectorAll('.form-item')].find((candidate) => {
        const itemLabel = candidate.querySelector('.form-label')?.textContent?.replace('*', '').trim();
        return itemLabel === expectedLabel;
      });
      const trigger = item?.querySelector('[data-multi-select] .schema-multi-trigger');
      return Boolean(trigger && !trigger.disabled);
    }, label);
    if (!dropdownIsUsable) throw new Error(`${target}: ${label} must be a usable dropdown`);
  }

  for (const fieldCode of editableTableFields) {
    const editableControls = modal.locator(
      `[data-component="EditableTable"] [data-column="${fieldCode}"] select[data-field="${fieldCode}"]`
    );
    if (await editableControls.count() === 0) {
      throw new Error(`${target}: ${fieldCode} editable table dropdown is missing`);
    }
    if (await editableControls.evaluateAll((controls) => controls.some((control) => control.disabled))) {
      throw new Error(`${target}: ${fieldCode} editable table dropdown must be enabled`);
    }
  }

  const submitButton = modal.locator('.pro-modal-footer [data-act="submit"]');
  if (await submitButton.count()) {
    assertEqual((await submitButton.textContent())?.trim(), submitLabel, `${target}: submit label`);
  }

  await modal.locator('.pro-modal-header [data-act="close"]').click();
  await modal.waitFor({ state: 'hidden' });
}

try {
  await page.goto(pathToFileURL(path.resolve('pages/my-task.html')).href);
  await page.locator('#task-type-tabs [data-tab="project-proposal"]').click();

  const table = page.locator('#project-proposal-task-table');
  assertEqual(await table.locator('tbody tr').count(), 6, 'task row count');
  assertEqual(await table.locator('tbody tr:not([hidden])').count(), 5, 'first page visible row count');
  assertEqual(
    (await page.locator('#task-type-tabs [data-tab="project-proposal"]').textContent())?.trim(),
    '\u9879\u76ee\u5468\u671f\u4efb\u52a1\uff086\uff09',
    'task tab label'
  );

  const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
  assertEqual(headers.slice(3, 6), [text.owner, text.currentStage, text.taskType], 'column order');

  const stages = (await table.locator('tbody [data-column="currentStage"]').allTextContents())
    .map((value) => value.trim());
  assertEqual(
    stages,
    [text.survey, text.proposal, text.notice, text.setup, text.milestone, text.progress],
    'current stage values'
  );

  const taskTypes = (await table.locator('tbody [data-column="taskType"]').allTextContents())
    .map((value) => value.trim());
  assertEqual(
    taskTypes,
    [
      text.crossCompanyTask,
      text.ownTask,
      text.crossCompanyTask,
      text.ownTask,
      text.crossCompanyTask,
      text.crossCompanyTask,
    ],
    'task type values'
  );
  assertEqual(
    (await table.locator('tbody [data-column="owner"]').nth(0).textContent())?.trim(),
    '\u9646\u5fd7\u519b/\u674e\u6768\u6d0b',
    'survey owner'
  );

  await assertModal('project-proposal-handle-modal', text.addProposal);
  await assertModal('survey-questionnaire-handle-modal', text.addSurvey, [text.requirementCode]);
  await assertModal('project-notice-handle-modal', text.addNotice, [text.requirementCode]);
  await assertModal(
    'project-setup-handle-modal',
    text.addSetup,
    [
      text.workflowStatus,
      text.sourceCompany,
      text.requirementOwner,
      text.customerCode,
      text.customerName,
    ],
    { [text.workflowStatus]: text.draft },
    [text.agents],
    ['company']
  );
  await assertModal(
    'milestone-plan-handle-modal',
    text.addPlan,
    [text.status, text.projectType, text.planStatus, text.projectStage],
    { [text.status]: text.pendingReview },
    [],
    [],
    '审核提交'
  );
  await table.locator('[data-act="page-next"]').click();
  assertEqual(await table.locator('tbody tr:not([hidden])').count(), 1, 'second page visible row count');
  await assertModal('project-progress-handle-modal', text.progress, [
    text.status,
    text.projectName,
    text.projectStage,
  ], {}, [], [], '审核提交');

  if (!(await page.locator('#task-type-tabs [data-tab="project-proposal"]').getAttribute('class'))
    ?.includes('active')) {
    throw new Error('task tab must remain active after closing a modal');
  }

  assertEqual(await table.locator('tbody tr').count(), 6, 'task rows after modal close');
  console.log('my-task stage modal smoke passed');
} finally {
  await browser.close();
}
