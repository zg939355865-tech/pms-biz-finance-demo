import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from '../lib/playwright-smoke.mjs';

const pagePath = path.resolve('pages/my-task.html');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function assertWbsTaskDataVisible(source) {
  const tabs = page.locator('#task-type-tabs');
  const activeTab = tabs.locator(':scope > .pro-tabs > [data-tab="wbs"]');
  const panel = tabs.locator(':scope > .pro-tab-panels > [data-tab-panel="wbs"]');
  const rows = panel.locator('#wbs-task-table tbody tr[data-row-value]');

  if (!(await activeTab.evaluate((node) => node.classList.contains('active')))) {
    throw new Error(`${source}: WBS tab was not restored`);
  }
  if (await panel.isHidden()) {
    throw new Error(`${source}: WBS panel is hidden`);
  }
  if ((await rows.count()) !== 4) {
    throw new Error(`${source}: expected 4 WBS task rows`);
  }
  if (!(await rows.first().isVisible())) {
    throw new Error(`${source}: WBS task rows are not visible`);
  }

  const content = (await rows.allTextContents()).join('\n');
  for (const expected of [
    '\u667a\u80fd\u4f53\u90e8\u7f72',
    'OS\u914d\u7f6e',
    '\u9879\u76ee\u6d4b\u9a8c\u8054\u8c03',
    '\u667a\u80fd\u4f53\u8bad\u7ec3',
  ]) {
    if (!content.includes(expected)) {
      throw new Error(`${source}: missing task row ${expected}`);
    }
  }
}

try {
  await page.goto(pathToFileURL(pagePath).href);
  await assertWbsTaskDataVisible('initial page');

  const firstDetails = page.locator('#wbs-task-table [data-target="project-plan-view-modal"]').first();
  await firstDetails.click();
  const modal = page.locator('[data-overlay="project-plan-view-modal"]');
  if (await modal.isHidden()) throw new Error('WBS detail modal did not open');

  const documentsTab = modal.locator('[data-tab="project-related-documents"]');
  await documentsTab.click();
  const documentsPanel = modal.locator('[data-tab-panel="project-related-documents"]');
  const documentRows = documentsPanel.locator('#project-related-documents-table tbody tr[data-row-value]');
  if (await documentsPanel.isHidden()) throw new Error('project related documents panel is hidden');
  if ((await documentRows.count()) !== 4) {
    throw new Error('expected 4 project related document rows');
  }
  const documentContent = (await documentRows.allTextContents()).join('\n');
  for (const expected of ['项目需求', '调研问卷', '项目方案', '项目实施通知']) {
    if (!documentContent.includes(expected)) {
      throw new Error(`missing project related document type ${expected}`);
    }
  }

  await modal.locator('.pro-modal-header [data-act="close"]').click();
  if (!(await modal.isHidden())) throw new Error('top close did not hide modal');
  await assertWbsTaskDataVisible('top close');

  await firstDetails.click();
  await modal.locator('.pro-modal-footer [data-act="close"]').click();
  if (!(await modal.isHidden())) throw new Error('footer close did not hide modal');
  await assertWbsTaskDataVisible('footer close');

  console.log('PASS my-task modal close restores WBS task data');
} finally {
  await browser.close();
}
