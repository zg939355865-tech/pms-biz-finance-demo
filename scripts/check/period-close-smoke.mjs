import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

await verifyAssistant();
if (!process.argv.includes('--assistant-only')) await verifyPeriodClose();
verifyMenu();

await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 3000)),
]);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(process.argv.includes('--assistant-only') ? 'Closing assistant smoke passed: module options, assistant loop, menu and desktop layout.' : 'Period close smoke passed: assistant loop, close gate, Yonyou sync, menu and desktop layout.');

async function openPage(relativePath) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(`${relativePath}: pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${relativePath}: console: ${message.text()}`);
  });
  await page.goto(pathToFileURL(path.resolve(relativePath)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  return page;
}

async function descriptionPairsAligned(root, expectedColumns) {
  const result = await root.evaluate((element) => {
    const terms = [...element.querySelectorAll('.pro-description-grid > dt')];
    const values = [...element.querySelectorAll('.pro-description-grid > dd')];
    return {
      declaredColumns: Number(element.dataset.descriptionColumns || 0),
      aligned: terms.length === values.length && terms.every((term, index) => Math.abs(term.getBoundingClientRect().top - values[index].getBoundingClientRect().top) < 2),
    };
  });
  return result.declaredColumns === expectedColumns && result.aligned;
}

async function verifyAssistant() {
  const page = await openPage('pages/period-close/closing-assistant.html');
  const runtime = await page.evaluate(() => window.PMS_PAGE_SCHEMA || null);
  expect(runtime?.periodCloseConfig?.mode === 'closing-assistant', '结账助手未暴露期间检查运行契约');
  expect(runtime?.periodCloseConfig?.rangeBoundary === 'inclusive', '结账助手未声明当前期间闭区间');
  expect(await page.locator('#closing-check-config-table tbody > tr[data-row-value]').count() === 3, '结账助手未展示三条结账检查配置');
  expect(await page.locator('#closing-check-config-table thead th').allTextContents().then((columns) => JSON.stringify(columns.map((column) => column.trim())) === JSON.stringify(['序号', '检查模块', '检查事项', '执行SQL脚本', '检查时间', '检查结果', '影响结账？', '配置人', '操作'])), '结账检查配置字段不符合要求');
  expect(await page.locator('#unfinished-document-table tbody > tr[data-row-value]').count() === 6, '结账助手未生成6张未完成单据');
  expect(await page.locator('#unfinished-document-table thead th').allTextContents().then((columns) => JSON.stringify(columns.map((column) => column.trim())) === JSON.stringify(['序号', '检查模块', '单据类型', '单据号', '业务日期', '状态'])), '待完成单据字段不符合要求');
  expect((await page.locator('#unfinished-document-table .section-title').textContent())?.trim() === '待完成单据', '未完成单据标题未调整为待完成单据');
  expect(await page.locator('#unfinished-document-table [data-act="export"]').count() === 1, '待完成单据未展示导出按钮');
  expect(await page.locator('#closing-check-config-table thead .schema-sequence-col, #unfinished-document-table thead .schema-sequence-col').count() === 2, '两张列表未保留序号列');
  const headerActionsAligned = await page.locator('#closing-check-config-table, #unfinished-document-table').evaluateAll((tables) => tables.every((table) => {
    const title = table.querySelector('.pro-section-header .section-title');
    const action = table.querySelector('.pro-section-header .pro-section-extra .btn');
    if (!title || !action) return false;
    const titleRect = title.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    return Math.abs((titleRect.top + titleRect.height / 2) - (actionRect.top + actionRect.height / 2)) < 2;
  }));
  expect(headerActionsAligned, '区块标题与右侧操作按钮未垂直对齐');
  const sectionTitlesAligned = await page.locator('#current-period-info, #closing-check-config-table, #unfinished-document-table').evaluateAll((sections) => {
    const lefts = sections.map((section) => section.querySelector('.section-title')?.getBoundingClientRect().left);
    return lefts.length === 3 && lefts.every((left) => Number.isFinite(left) && Math.abs(left - lefts[0]) < 2);
  });
  expect(sectionTitlesAligned, '当前会计期间、结账检查配置和待完成单据标题未左对齐');
  const sequenceColumnsFixed = await page.locator('#closing-check-config-table, #unfinished-document-table').evaluateAll((tables) => tables.every((table) => {
    const scroll = table.querySelector('.pro-table-scroll');
    const header = table.querySelector('thead .schema-sequence-col');
    const cell = table.querySelector('tbody [data-column="sequence"]');
    return Boolean(scroll && header && cell && getComputedStyle(header).position === 'sticky' && getComputedStyle(cell).position === 'sticky');
  }));
  expect(sequenceColumnsFixed, '两张列表的序号列未固定在左侧');
  expect(await descriptionPairsAligned(page.locator('#current-period-info'), 2), '当前会计期间标签和值未按两列成对对齐');
  const currentPeriodValues = await page.locator('#current-period-info .pro-description-grid').evaluate((element) => {
    const terms = [...element.querySelectorAll('dt')];
    const values = [...element.querySelectorAll('dd')];
    return Object.fromEntries(terms.map((term, index) => [term.textContent?.trim(), values[index]?.textContent?.trim()]));
  });
  expect(currentPeriodValues['年度'] === '2026', '当前会计期间年度未展示为2026');
  expect(currentPeriodValues['会计期间'] === '9', '当前会计期间会计期间未展示为9');
  expect(await page.locator('#current-period-info').getByText('检查人', { exact: true }).count() === 1, '当前会计期间未展示检查人');
  expect(await page.locator('#current-period-info').getByText('最近检查时间', { exact: true }).count() === 0, '当前会计期间仍展示最近检查时间');
  expect(await page.locator('#assistant-stats, #assistant-progress-panel, #assistant-progress').count() === 0, '结账助手仍展示统计卡或检查完成度');
  expect(await page.locator('#domain-check-table, #unfinished-search, [data-component="ProSearchForm"], [data-component="Tabs"], [data-tab="overview"], [data-tab="history"], #history-search, #check-history-table').count() === 0, '结账助手仍展示已删除的汇总、查询或页签区');
  expect(await page.locator('.schema-list-header .page-title').evaluate((node) => getComputedStyle(node).fontSize) === '20px', '页面标题未使用公共20px字号');
  expect(await page.locator('#unfinished-document-table tbody > tr[data-row-value]:visible').count() === 5, '未完成单据首屏未固定显示5条');
  expect((await page.locator('[data-act="run-closing-check"]').textContent())?.trim() === '开始检查', '页面操作未调整为开始检查');
  expect(await page.locator('[data-act="run-closing-check"]').isEnabled(), '开始检查按钮不可用');
  const existingConfigRow = page.locator('#closing-check-config-table tbody > tr[data-row-value]').first();
  expect(await existingConfigRow.locator('[data-act="edit-row"], [data-act="remove-row"]').count() === 2, '已有检查配置未提供编辑和删除操作');
  expect(await existingConfigRow.locator('td.actions').evaluate((cell) => getComputedStyle(cell).display !== 'none'), '已有检查配置操作列未显示');
  expect(await existingConfigRow.locator('td.actions').evaluate((cell) => cell.getBoundingClientRect().width <= 144), '检查配置操作列未收窄至144px');
  await existingConfigRow.locator('[data-act="edit-row"]').evaluate((button) => button.click());
  expect(await existingConfigRow.locator('[data-act="save-row"], [data-act="cancel-row"]').count() === 2, '已有检查配置进入编辑态后未提供保存和取消操作');
  await existingConfigRow.locator('[data-act="cancel-row"]').evaluate((button) => button.click());
  await page.locator('#closing-check-config-table [data-act="add-row"]').click();
  const newConfigRow = page.locator('#closing-check-config-table tbody > tr').first();
  expect(await newConfigRow.locator('[data-field]:not(:disabled)').count() === 3, '新增配置未仅开放检查模块、检查事项和执行SQL脚本编辑');
  const checkModule = newConfigRow.locator('select[data-field="checkModule"]');
  expect(await checkModule.count() === 1, '检查模块未使用单选下拉框');
  expect(JSON.stringify(await checkModule.locator('option').allTextContents()) === JSON.stringify(['采购', '物资', '收入', '固资']), '检查模块下拉选项不符合采购、物资、收入、固资的顺序');
  await checkModule.selectOption('采购');
  await newConfigRow.locator('[data-field="checkItem"]').fill('测试检查事项');
  await newConfigRow.locator('[data-field="sqlScript"]').fill('TEST_CLOSE_CHECK');
  await newConfigRow.locator('[data-act="save-row"]').evaluate((button) => button.click());
  expect(await page.locator('#closing-check-config-table tbody > tr[data-row-value]').count() === 4, '新增配置保存后未保留');
  expect(await newConfigRow.locator('[data-act="edit-row"], [data-act="remove-row"]').count() === 2, '检查配置保存后未提供编辑和删除操作');
  await newConfigRow.locator('[data-act="edit-row"]').evaluate((button) => button.click());
  await newConfigRow.locator('select[data-field="checkModule"]').selectOption('固资');
  await newConfigRow.locator('[data-act="save-row"]').evaluate((button) => button.click());
  expect(JSON.parse(await newConfigRow.getAttribute('data-row-value')).checkModule === '固资', '固资检查模块未保存到配置行');
  await newConfigRow.locator('[data-act="edit-row"]').evaluate((button) => button.click());
  expect(await newConfigRow.locator('select[data-field="checkModule"]').inputValue() === '固资', '重新编辑未保留固资选项');
  await newConfigRow.locator('[data-act="cancel-row"]').evaluate((button) => button.click());
  await newConfigRow.locator('[data-act="remove-row"]').evaluate((button) => button.click());
  await page.locator('[data-overlay="shared-delete-confirm"] [data-act="confirm-delete"]').click();
  expect(await page.locator('#closing-check-config-table tbody > tr[data-row-value]').count() === 3, '检查配置删除后未移除对应行');
  const originalCheckTime = (await page.locator('#closing-check-config-table tbody > tr[data-row-value]').first().locator('[data-column="checkTime"]').textContent())?.trim();

  await page.screenshot({ path: path.join(reportDir, 'closing-assistant-initial.png'), fullPage: true });
  await page.locator('[data-act="run-closing-check"]').click();
  expect(await page.locator('[data-act="run-closing-check"]').isDisabled(), '检查执行中按钮未禁用');
  await page.waitForTimeout(900);

  expect(await page.locator('#closing-check-config-table [data-column="checkResult"] .tag:text-is("通过")').count() === 3, '三条结账检查配置未全部通过');
  expect((await page.locator('#closing-check-config-table tbody > tr[data-row-value]').first().locator('[data-column="checkTime"]').textContent())?.trim() !== originalCheckTime, '开始检查后未同步更新检查时间');
  expect(await page.locator('#unfinished-document-table').isVisible(), '全部通过后待完成单据列表未保留显示');
  expect(await page.locator('#unfinished-document-table tbody > tr[data-row-value]').count() === 0, '全部通过后待完成单据未清空');
  expect(await page.locator('#unfinished-document-table tbody').getByText('暂无待完成单据', { exact: true }).count() === 1, '待完成单据未展示空列表状态');
  await page.screenshot({ path: path.join(reportDir, 'closing-assistant-passed.png'), fullPage: true });

  for (const width of [1440, 2048]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(!overflow, `结账助手在${width}px视口出现页面级横向滚动`);
  }
  await page.close();
}

async function verifyPeriodClose() {
  const page = await openPage('pages/period-close/period-close.html');
  const runtime = await page.evaluate(() => window.PMS_PAGE_SCHEMA || null);
  expect(runtime?.periodCloseConfig?.mode === 'period-close', '期末结算未暴露结账运行契约');
  expect(runtime?.periodCloseConfig?.currentPeriod === '202609', '期末结算未声明当前会计期间');
  expect(runtime?.periodCloseConfig?.reverseCloseAllowed === true, '期末结算未启用反结账');
  const table = page.locator('#period-close-table');
  expect(await table.locator('tbody > tr[data-row-value]').count() === 12, '期末结算未准备12条期间样例');
  expect(await table.locator('tbody > tr[data-row-value]:visible').count() === 1, '默认未仅显示当前会计期间');
  expect(await page.locator('[data-act="period-close"]').isDisabled(), '未选择期间时结账按钮未禁用');
  expect(await page.locator('[data-act="period-reverse-close"]').isDisabled(), '未选择期间时反结账按钮未禁用');
  expect(await page.locator('#period-close-stats').count() === 0, '期末结算仍展示概览卡片');
  expect(await page.locator('[data-page-view="list"] [data-field="overallStatus"], [data-page-view="list"] [data-field="domainCloseStatus"]').count() === 0, '查询区仍展示已移除状态条件');
  expect(await table.locator('.schema-action-col').count() === 0, '期末结算仍展示失败原因操作列');
  expect(JSON.stringify(await table.locator('thead th').allTextContents()) === JSON.stringify(['', '年度', '会计期间', '核算主体', '开始日期', '结束日期', '是否开启', '结账标识', '结账人员', '结账时间']), '列表字段未按年度和会计期间拆分展示');
  const aligned = await page.locator('[data-component="ProSearchForm"]').evaluate((form) => {
    const field = form.querySelector('.form-item');
    const selection = document.querySelector('#period-close-table .schema-select-col');
    return form.dataset.firstFieldAlignment === 'selection-control'
      && Math.abs((field?.getBoundingClientRect().left || 0) - (selection?.getBoundingClientRect().left || 0)) < 2;
  });
  expect(aligned, '查询条件首项未与列表选择框左侧对齐');
  const periodSelect = page.locator('[data-page-view="list"] [data-component="ProSearchForm"] select[data-field="accountingPeriod"]');
  expect(await periodSelect.count() === 1, '会计期间查询条件未使用下拉选择');
  expect((await periodSelect.inputValue()) === '9', '会计期间查询条件未默认第9期');
  expect(JSON.stringify(await periodSelect.locator('option').evaluateAll((options) => options.map((option) => option.value))) === JSON.stringify(['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']), '会计期间查询条件未提供1-12期');
  const fixedPeriodColumn = await table.evaluate((root) => {
    const scroll = root.querySelector('.pro-table-scroll');
    const cells = [...root.querySelectorAll('tbody > tr[data-row-value]:not([hidden]) [data-column="year"], tbody > tr[data-row-value]:not([hidden]) [data-column="periodMonth"]')];
    if (!scroll || cells.length !== 2) return false;
    const before = cells.map((cell) => cell.getBoundingClientRect().left);
    scroll.scrollLeft = 120;
    const after = cells.map((cell) => cell.getBoundingClientRect().left);
    return cells.every((cell, index) => cell.classList.contains('schema-fixed-left') && Math.abs(before[index] - after[index]) < 1);
  });
  expect(fixedPeriodColumn, '年度和会计期间列未冻结在表格左侧');
  await page.screenshot({ path: path.join(reportDir, 'period-close-initial.png'), fullPage: true });

  const currentRow = table.locator('tbody > tr[data-row-value*="P202609"]');
  expect((await currentRow.locator('[data-column="year"]').textContent())?.trim() === '2026', '列表年度未单独展示');
  expect((await currentRow.locator('[data-column="periodMonth"]').textContent())?.trim() === '9', '列表会计期间未单独展示月份');
  expect((await currentRow.locator('[data-column="isOpened"]').textContent())?.trim() === '是', '是否开启未由会计期间自动带出为是');
  expect((await currentRow.locator('[data-column="closingFlag"]').textContent())?.trim() === 'N', '未结账期间的结账标识未显示N');
  await currentRow.locator('[data-row-select]').check();
  expect(await page.locator('[data-act="period-close"]').isEnabled(), '是否开启为是且结账标识为N时结账按钮未启用');
  expect(await page.locator('[data-act="period-reverse-close"]').isDisabled(), '未结账的当前期间错误启用反结账');
  await page.locator('[data-act="period-close"]').click();
  const confirm = page.locator('[data-overlay="period-close-confirm-modal"]');
  expect(await confirm.isVisible(), '结账确认弹窗未显示');
  expect(JSON.stringify(await confirm.locator('[data-component="ProDescriptionList"] dt').allTextContents()) === JSON.stringify(['核算主体', '年度+会计期间']), '结账确认信息未仅展示核算主体及年度+会计期间');
  expect((await confirm.locator('[data-component="ProDescriptionList"] dd').nth(1).textContent())?.trim() === '2026 + 9', '结账确认未展示年度+会计期间');
  expect(await descriptionPairsAligned(confirm.locator('[data-component="ProDescriptionList"]'), 2), '结账确认信息标签和值未按两列成对对齐');
  const closeModuleTable = confirm.locator('#period-close-module-table');
  expect(JSON.stringify(await closeModuleTable.locator('thead th').allTextContents()) === JSON.stringify(['', '结账模块', '凭证数', '同步状态（Y/N）', '失败原因']), '结账模块列表字段不符合要求');
  expect(JSON.stringify(await closeModuleTable.locator('tbody [data-column="closeModule"]').allTextContents()) === JSON.stringify(['采购检查', '物资检查', '收入检查']), '结账模块未与检查模块保持一致');
  expect(await confirm.locator('[data-act="confirm-period-close"]').isDisabled(), '未勾选结账模块时确认结账按钮未禁用');
  await page.screenshot({ path: path.join(reportDir, 'period-close-confirm.png') });

  await closeModuleTable.locator('[data-row-select]').first().check();
  expect(await confirm.locator('[data-act="confirm-period-close"]').isEnabled(), '勾选结账模块后确认结账按钮未启用');
  await confirm.locator('[data-act="confirm-period-close"]').click();
  expect(await page.locator('[data-overlay="yonyou-sync-progress-modal"]').count() === 0, '页面仍保留独立用友同步进度弹窗');
  await page.waitForTimeout(1100);
  expect(await page.locator('[data-overlay="yonyou-sync-result-drawer"]').count() === 0, '用友同步仍保留独立结果抽屉');
  const partiallyClosedValue = JSON.parse((await currentRow.getAttribute('data-row-value')) || '{}');
  expect(partiallyClosedValue.procurementCloseStatus === '已结账' && partiallyClosedValue.closingFlag === 'N', '仅勾选采购检查后未仅更新对应模块状态');
  expect(JSON.stringify(await closeModuleTable.locator('tbody [data-column="syncFlag"]').allTextContents()) === JSON.stringify(['Y', 'N', 'N']), '仅完成采购同步后模块同步状态未正确更新');
  expect(await confirm.isVisible(), '同步完成后未保留原结账确认弹窗');
  expect(((await confirm.locator('.pro-modal-header h2').textContent()) || '').includes('部分同步成功'), '原结账确认弹窗未体现同步状态');
  expect(JSON.stringify(await closeModuleTable.locator('tbody [data-column="failureReason"]').allTextContents()) === JSON.stringify(['-', '-', '-']), '原结账确认弹窗未展示失败原因列');
  expect(await confirm.getByText('完成', { exact: true }).isEnabled(), '同步完成后原结账确认弹窗未提供完成入口');
  await page.screenshot({ path: path.join(reportDir, 'period-close-success.png'), fullPage: true });
  await confirm.getByText('完成', { exact: true }).click();

  await currentRow.locator('[data-row-select]').check();
  expect(await page.locator('[data-act="period-close"]').isEnabled(), '模块未全部结账时未允许继续结账');
  await page.locator('[data-act="period-close"]').click();
  const remainingConfirm = page.locator('[data-overlay="period-close-confirm-modal"]');
  const remainingModuleTable = remainingConfirm.locator('#period-close-module-table');
  expect((await remainingModuleTable.locator('tbody > tr').first().locator('[data-row-select]').isDisabled()), '已同步模块仍允许重复结账');
  await remainingModuleTable.locator('[data-act="select-all"]').check();
  await remainingConfirm.locator('[data-act="confirm-period-close"]').click();
  await page.waitForTimeout(1100);
  const closedRowValue = JSON.parse((await currentRow.getAttribute('data-row-value')) || '{}');
  expect(closedRowValue.closingFlag === 'Y' && closedRowValue.closingUser === '财务-李婷', '全部模块结账后未更新整体结账标识及结账人员');
  expect(JSON.stringify(await remainingModuleTable.locator('tbody [data-column="syncFlag"]').allTextContents()) === JSON.stringify(['Y', 'Y', 'Y']), '三个模块同步状态均为Y后未保留同步结果');
  expect(((await remainingConfirm.locator('.pro-modal-header h2').textContent()) || '').includes('同步成功'), '全部模块同步后原结账确认弹窗未体现成功状态');
  await remainingConfirm.getByText('完成', { exact: true }).click();

  await currentRow.locator('[data-row-select]').check();
  expect(await page.locator('[data-act="period-close"]').isDisabled(), '结账标识为Y时错误启用结账');
  expect(await page.locator('[data-act="period-reverse-close"]').isEnabled(), '是否开启为是且结账标识为Y时未启用反结账');
  await page.locator('[data-act="period-reverse-close"]').click();
  const reverseConfirm = page.locator('[data-overlay="period-reverse-close-confirm-modal"]');
  expect(await reverseConfirm.isVisible(), '反结账确认弹窗未显示');
  expect(JSON.stringify(await reverseConfirm.locator('[data-component="ProDescriptionList"] dt').allTextContents()) === JSON.stringify(['核算主体', '年度+会计期间']), '反结账确认信息不符合展示要求');
  const reverseModuleTable = reverseConfirm.locator('#period-reverse-close-module-table');
  expect(JSON.stringify(await reverseModuleTable.locator('thead th').allTextContents()) === JSON.stringify(['', '结账模块', '凭证数', '同步状态（Y/N）', '失败原因']), '反结账模块列表字段不符合要求');
  await reverseModuleTable.locator('[data-row-select]').first().check();
  await reverseConfirm.locator('[data-act="confirm-period-reverse-close"]').click();
  const reversedValue = JSON.parse((await currentRow.getAttribute('data-row-value')) || '{}');
  expect(reversedValue.closingFlag === 'N' && reversedValue.periodStatus === '已启动', '反结账未恢复结账标识或会计期间开启状态');

  await page.locator('[data-page-view="list"] [data-component="ProSearchForm"] [data-field="accountingPeriod"]').selectOption('8');
  await page.locator('[data-act="query"]').click();
  const historyRow = table.locator('tbody > tr[data-row-value*="P202608"]');
  expect((await historyRow.locator('[data-column="isOpened"]').textContent())?.trim() === '否', '历史会计期间未自动带出是否开启为否');
  await historyRow.locator('[data-row-select]').check();
  expect(await page.locator('[data-act="period-close"]').isDisabled() && await page.locator('[data-act="period-reverse-close"]').isDisabled(), '历史会计期间错误允许结账或反结账');

  for (const width of [1440, 2048]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(!overflow, `期末结算在${width}px视口出现页面级横向滚动`);
  }
  await page.close();
}

function verifyMenu() {
  const html = fs.readFileSync('menu/index.html', 'utf8');
  const masterIndex = html.indexOf('"name": "主数据"');
  const closeIndex = html.indexOf('"name": "期末结账"', masterIndex + 1);
  const reportIndex = html.indexOf('"name": "报表管理"');
  expect(masterIndex >= 0 && closeIndex > masterIndex && reportIndex > closeIndex, '期末结账一级菜单未位于主数据下方');
  expect(html.includes('"path": "period-close/closing-assistant.html"'), '菜单缺少结账助手页面路径');
  expect(html.includes('"name": "期末结算"') && html.includes('"path": "period-close/period-close.html"'), '菜单缺少期末结算页面路径');
}
