import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from '../lib/playwright-smoke.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(pathToFileURL(path.resolve('pages/cross-company-ledger.html')).href);

  const tabLabels = (await page.locator('#task-type-tabs [data-tab]').allTextContents())
    .map((value) => value.trim());
  assert(JSON.stringify(tabLabels) === JSON.stringify(['WBS任务', '项目周期任务']), 'tab labels must not show counts');
  assert(
    await page.locator('#task-type-tabs [data-record-count]').count() === 0,
    'main task record count statistics must be hidden'
  );

  const rowValues = await page.locator('tr[data-row-value]').evaluateAll((rows) =>
    rows.map((row) => JSON.parse(row.dataset.rowValue || '{}'))
  );
  const taskRows = rowValues.filter((row) => row.collaborationType || row.taskType);
  assert(taskRows.length > 0, 'cross-company ledger must contain task rows');
  assert(
    taskRows.every((row) => row.collaborationType === '跨司任务' || row.taskType === '跨司任务'),
    'cross-company ledger must only contain cross-company tasks'
  );

  await page.locator('#task-type-tabs [data-tab="project-proposal"]').click();
  const cycleTable = page.locator('#project-proposal-task-table');
  const cycleStages = (await cycleTable.locator('[data-column="currentStage"]').allTextContents())
    .map((value) => value.trim());
  for (const stage of ['调研问卷', '项目方案', '项目实施通知', '项目立项', '里程碑计划', '项目进度填报']) {
    assert(cycleStages.includes(stage), `missing synchronized lifecycle stage: ${stage}`);
  }
  const surveyRow = cycleTable.locator('tbody tr[data-row-value]').filter({ hasText: '调研问卷' }).first();
  assert((await surveyRow.locator('[data-column="owner"]').textContent())?.trim() === '陆志军/李杨洋', 'survey owner mismatch');

  for (const [target, title] of [
    ['project-setup-handle-modal', '新增项目立项'],
    ['milestone-plan-handle-modal', '新增项目计划'],
    ['project-progress-handle-modal', '项目进度填报'],
  ]) {
    const action = cycleTable.locator(`[data-target="${target}"]:not(:disabled)`).first();
    if (!await action.isVisible()) await cycleTable.locator('[data-act="page-next"]').click();
    await action.click();
    const modal = page.locator(`[data-overlay="${target}"]`);
    await modal.waitFor({ state: 'visible' });
    assert((await modal.locator('h2').textContent())?.trim() === title, `${target} title mismatch`);
    if (target === 'project-setup-handle-modal') {
      const status = modal.locator('[data-field="status"]');
      assert(await status.isDisabled(), 'project setup status must be disabled');
      assert(await status.inputValue() === '草稿', 'project setup status must default to draft');
      assert(await modal.locator('[data-multi-select] .schema-multi-trigger').isEnabled(), 'agent dropdown must be enabled');
      const companyDropdowns = modal.locator(
        '[data-component="EditableTable"] [data-column="company"] select[data-field="company"]'
      );
      assert(await companyDropdowns.count() > 0, 'collaboration company dropdown must exist');
      assert(
        await companyDropdowns.evaluateAll((controls) => controls.every((control) => !control.disabled)),
        'collaboration company dropdown must be editable'
      );
    }
    if (target === 'milestone-plan-handle-modal') {
      for (const code of ['status', 'projectType', 'planStatus', 'projectStage']) {
        assert(await modal.locator(`[data-field="${code}"]`).isDisabled(), `milestone ${code} must be disabled`);
      }
      assert(await modal.locator('[data-field="status"]').inputValue() === '待审核', 'milestone status mismatch');
      assert(
        (await modal.locator('.pro-modal-footer [data-act="submit"]').textContent())?.trim() === '审核提交',
        'milestone submit action must be named audit submit'
      );
    }
    if (target === 'project-progress-handle-modal') {
      for (const code of ['status', 'projectName', 'projectStage']) {
        assert(await modal.locator(`[data-field="${code}"]`).isDisabled(), `progress ${code} must be disabled`);
      }
      assert(
        (await modal.locator('.pro-modal-footer [data-act="submit"]').textContent())?.trim() === '审核提交',
        'progress submit action must be named audit submit'
      );
    }
    await modal.locator('[data-act="close"]').first().click();
  }

  const completedCycleRow = cycleTable.locator('tbody tr[data-row-status="已完成"]').first();
  const completedCycleAction = completedCycleRow.locator('td.actions .btn');
  assert((await completedCycleAction.textContent())?.trim() === '详情', 'completed lifecycle task must show Detail');
  assert(await completedCycleAction.isEnabled(), 'completed lifecycle View must be enabled');
  await completedCycleAction.click();
  const readonlyModal = page.locator(`[data-overlay="${await completedCycleAction.getAttribute('data-target')}"]`);
  await readonlyModal.waitFor({ state: 'visible' });
  assert(await readonlyModal.locator('.pro-modal-footer [data-act="save"], .pro-modal-footer [data-act="submit"]').count() === 0, 'readonly modal must not show save or submit');
  const editableControlCount = await readonlyModal.locator('input:not([type="hidden"]), select, textarea').evaluateAll((controls) =>
    controls.filter((control) => !control.disabled && !control.readOnly).length
  );
  assert(editableControlCount === 0, 'completed lifecycle detail controls must be read-only');
  assert(
    await readonlyModal.locator('[data-multi-select] .schema-multi-trigger:not(:disabled)').count() === 0,
    'completed lifecycle multi-select must be disabled'
  );
  await readonlyModal.locator('[data-act="close"]').first().click();

  await page.locator('#task-type-tabs [data-tab="wbs"]').click();
  const unfinishedWbsRow = page.locator('#wbs-task-table tbody tr[data-row-status="未完成"]').first();
  const unfinishedWbsAction = unfinishedWbsRow.locator('td.actions .btn');
  const completedWbsRow = page.locator('#wbs-task-table tbody tr[data-row-status="已完成"]').first();
  const completedWbsAction = completedWbsRow.locator('td.actions .btn');
  assert((await unfinishedWbsAction.textContent())?.trim() === '详情', 'unfinished WBS task must show Detail');
  assert((await completedWbsAction.textContent())?.trim() === '详情', 'completed WBS task must show Detail');
  assert(
    await unfinishedWbsAction.locator('.fa-eye').count() === 1
      && await completedWbsAction.locator('.fa-eye').count() === 1,
    'WBS View actions must use the same eye icon'
  );
  assert(
    await unfinishedWbsAction.getAttribute('class') === await completedWbsAction.getAttribute('class'),
    'WBS View actions must use the same button style'
  );
  assert(await unfinishedWbsAction.isEnabled(), 'unfinished WBS View must be enabled');
  assert(await completedWbsAction.isEnabled(), 'completed WBS View must be enabled');
  await completedWbsAction.click();
  await page.locator('[data-overlay="project-plan-view-modal"]').waitFor({ state: 'visible' });
  await page.locator('[data-overlay="project-plan-view-modal"] [data-act="close"]').first().click();

  console.log('cross-company ledger task smoke passed');
} finally {
  await browser.close();
}
