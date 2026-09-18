import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const cases = [
  { file: 'pages/fixed-asset/fixed-asset-ledger.html', title: '固资台账', table: 'fixed-asset-ledger-table', create: '新增转固', pickerButton: '选择即时库存', picker: 'fixed-asset-inventory-picker', confirm: 'confirm-select-inventory', selectionMode: 'multi' },
  { file: 'pages/fixed-asset/fixed-asset-return.html', title: '固资变更', table: 'fixed-asset-return-table', create: '新增', pickerButton: '选择', picker: 'fixed-asset-return-picker', confirm: 'confirm-select-asset', selectionMode: 'single' }
];
const reportDir = path.resolve('outputs/reports/visual/fixed-asset');
fs.mkdirSync(reportDir, { recursive: true });
const errors = [];
const ledgerSearchFields = ['fixedAssetSn', 'assetName', 'status', 'assetCategory', 'fixedAssetCode', 'capitalizationDateStart', 'capitalizationDateEnd'];
const ledgerListFields = ['fixedAssetSn', 'status', 'capitalizationDate', 'assetName', 'assetCategory', 'fixedAssetCode', 'useDepartment', 'user', 'acquiredDate', 'creator', 'createdAt'];
const ledgerDetailFields = ['fixedAssetSn', 'status', 'capitalizationDate', 'assetName', 'assetCategory', 'fixedAssetCode', 'useDepartment', 'user', 'project', 'acquiredDate', 'depreciationMethod', 'originalValue', 'usefulLifeMonths', 'salvageValuePct', 'accumulatedDepreciationCost', 'currentMonthDepreciationCost', 'remark', 'assetCreator', 'assetCreatedAt', 'assetCompany'];
const capitalizationColumns = ['sequence', 'purchaseName', 'specification', 'unit', 'warehouse', 'storageBin', 'fixedAssetSn', 'assetName', 'assetCategory', 'useDepartment', 'user', 'project', 'acquiredDate', 'depreciationMethod', 'originalValue', 'usefulLifeMonths', 'salvageValuePct', 'remark'];
const assetStatuses = ['在用', '闲置', '报废', '出售', '其它'];
const depreciationMethods = ['年限平均法', '工作量法', '双倍余额递减法', '年数总和法', '不计提折旧'];
const changeSearchFields = ['changeNo', 'status', 'fixedAssetSn', 'assetName', 'fixedAssetCode', 'changeDateStart', 'changeDateEnd'];
const changeListFields = ['changeNo', 'status', 'changeDate', 'fixedAssetSn', 'assetName', 'fixedAssetCode', 'changeReason', 'creator', 'createdAt'];
const changeBasicFields = ['changeNo', 'status', 'changeDate', 'fixedAssetSn', 'assetName', 'fixedAssetCode', 'changeReason', 'creator', 'createdAt', 'auditor', 'auditedAt', 'company', 'remark'];
const beforeChangeFields = ['beforeFixedAssetSn', 'beforeStatus', 'beforeCapitalizationDate', 'beforeAssetName', 'beforeAssetCategory', 'beforeFixedAssetCode', 'beforeUseDepartment', 'beforeUser', 'beforeProject', 'beforeAcquiredDate', 'beforeDepreciationMethod', 'beforeOriginalValue', 'beforeUsefulLifeMonths', 'beforeSalvageValuePct', 'beforeAccumulatedDepreciationCost', 'beforeCurrentMonthDepreciationCost'];
const afterChangeFields = beforeChangeFields.map((code) => code.replace(/^before/, 'after'));
const editableAfterCodes = ['afterStatus', 'afterAssetName', 'afterAssetCategory', 'afterUseDepartment', 'afterUser', 'afterProject'];
const lockedAfterCodes = ['afterAcquiredDate', 'afterDepreciationMethod', 'afterUsefulLifeMonths', 'afterSalvageValuePct'];
const pickerSearchFields = ['fixedAssetCode', 'assetName', 'assetCategory', 'fixedAssetSn', 'status'];
const pickerListFields = ['fixedAssetSn', 'assetName', 'fixedAssetCode', 'assetCategory', 'status', 'useDepartment'];
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });

for (const test of cases) {
  for (const width of [1440, 2048]) {
    console.log(`checking ${test.title}@${width}`);
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(5000);
    page.on('pageerror', (error) => errors.push(`${test.title}@${width}: ${error.message}`));
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(pathToFileURL(path.resolve(test.file)).href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    if ((await page.locator('h1').first().textContent())?.trim() !== test.title) errors.push(`${test.title}@${width}: 页面标题不正确`);
    const table = page.locator(`#${test.table}`);
    if (!await table.isVisible()) errors.push(`${test.title}@${width}: 主列表不可见`);
    if (await table.locator('tbody > tr:visible:not([data-filter-empty-row])').count() !== 5) errors.push(`${test.title}@${width}: 首页不是固定 5 条记录`);
    if (!await table.getByText('5条/页', { exact: true }).count()) errors.push(`${test.title}@${width}: 缺少固定页容量标记`);
    if (test.selectionMode === 'multi') {
      const searchFields = await page.locator('[data-page-view="list"] [data-component="ProSearchForm"] [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      const listFields = await table.locator('tbody > tr').first().locator('[data-column]').evaluateAll((nodes) => nodes.map((node) => node.dataset.column));
      if (searchFields.join(',') !== ledgerSearchFields.join(',')) errors.push(test.title + '@' + width + ': 查询字段或顺序不正确: ' + searchFields.join(','));
      if (listFields.join(',') !== ledgerListFields.join(',')) errors.push(test.title + '@' + width + ': 列表字段或顺序不正确: ' + listFields.join(','));
      const statusOptions = await page.locator('[data-page-view="list"] [data-field="status"] option').evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));
      if (statusOptions.join(',') !== assetStatuses.join(',')) errors.push(test.title + '@' + width + ': 状态选项不正确: ' + statusOptions.join(','));
      const sampleStatuses = await table.locator('tbody > tr[data-row-value]').evaluateAll((rows) => Array.from(new Set(rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').status))));
      if (sampleStatuses.sort().join(',') !== [...assetStatuses].sort().join(',')) errors.push(test.title + '@' + width + ': 样例未覆盖五种资产状态');
      await table.locator('[data-column="fixedAssetSn"] a').first().click();
      const viewDetail = page.locator('[data-page-view="detail"]');
      const viewFields = await viewDetail.locator('#fixed-asset-view-basic [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      if (viewFields.join(',') !== ledgerDetailFields.join(',')) errors.push(test.title + '@' + width + ': 详情字段或顺序不正确: ' + viewFields.join(','));
      if (await viewDetail.locator('#fixed-asset-view-basic [data-field]:not(:disabled)').count()) errors.push(test.title + '@' + width + ': 查看详情存在可编辑字段');
      if (!(await viewDetail.locator('#fixed-asset-view-basic [data-field="project"]').inputValue())) errors.push(test.title + '@' + width + ': 查看详情项目未回填');
      const depreciationLabel = await viewDetail.locator('#fixed-asset-view-basic [data-field="currentMonthDepreciationCost"]').locator('xpath=ancestor::div[contains(@class,"form-item")]/label').textContent();
      if (depreciationLabel?.trim() !== '月折旧成本') errors.push(test.title + '@' + width + ': 月折旧成本标签不正确');
      if (!(await viewDetail.locator('#fixed-asset-view-basic [data-field="assetCompany"]').inputValue())) errors.push(test.title + '@' + width + ': 查看详情所属公司未回填');
      if (await viewDetail.locator('#capitalization-items').isVisible()) errors.push(test.title + '@' + width + ': 查看详情不应显示转固明细');
      if (width === 1440) await page.screenshot({ path: path.join(reportDir, 'fixed-asset-ledger-view.png'), fullPage: true });
      await viewDetail.getByRole('button', { name: '返回列表' }).click();
    } else {
      const searchFields = await page.locator('[data-page-view="list"] [data-component="ProSearchForm"] [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      const listFields = await table.locator('tbody > tr').first().locator('[data-column]').evaluateAll((nodes) => nodes.map((node) => node.dataset.column));
      if (searchFields.join(',') !== changeSearchFields.join(',')) errors.push(test.title + '@' + width + ': 查询字段或顺序不正确: ' + searchFields.join(','));
      if (listFields.join(',') !== changeListFields.join(',')) errors.push(test.title + '@' + width + ': 列表字段或顺序不正确: ' + listFields.join(','));
      const statuses = await table.locator('tbody > tr[data-row-status]:visible').evaluateAll((rows) => Array.from(new Set(rows.map((row) => row.dataset.rowStatus))));
      if (statuses.sort().join(',') !== ['新增', '审核'].sort().join(',')) errors.push(test.title + '@' + width + ': 首屏未覆盖新增与审核两种单据状态');
      const auditButton = page.locator('[data-page-view="list"] [data-act="audit"]');
      const reverseAuditButton = page.locator('[data-page-view="list"] [data-act="reverse-audit"]');
      if (await auditButton.count() !== 1 || await reverseAuditButton.count() !== 1) errors.push(test.title + '@' + width + ': 缺少审核或反审核按钮');
      const pendingCandidate = table.locator('tbody > tr[data-row-status="新增"]:visible').first();
      const pendingRow = table.locator(`tbody > tr[data-row-index="${await pendingCandidate.getAttribute('data-row-index')}"]`);
      await pendingRow.locator('[data-row-select]').check();
      if (await auditButton.isDisabled() || !await reverseAuditButton.isDisabled()) errors.push(test.title + '@' + width + ': 新增记录操作门禁不正确');
      await auditButton.click();
      if (await page.locator('[data-overlay="audit-fixed-asset-change-modal"]').count()) errors.push(test.title + '@' + width + ': 审核仍存在确认弹窗');
      if (await pendingRow.getAttribute('data-row-status') !== '审核') errors.push(test.title + '@' + width + ': 审核后状态未变为审核');
      const auditedValue = JSON.parse((await pendingRow.getAttribute('data-row-value')) || '{}');
      if (auditedValue.auditor !== '管理员') errors.push(test.title + '@' + width + ': 审核后未写入审核人');
      if (!auditedValue.auditedAt) errors.push(test.title + '@' + width + ': 审核后未写入审核时间');
      const approvedCandidate = table.locator('tbody > tr[data-row-status="审核"]:visible').first();
      const approvedRow = table.locator(`tbody > tr[data-row-index="${await approvedCandidate.getAttribute('data-row-index')}"]`);
      await approvedRow.locator('[data-row-select]').check();
      if (await reverseAuditButton.isDisabled() || !await auditButton.isDisabled()) errors.push(test.title + '@' + width + ': 审核记录操作门禁不正确');
      await reverseAuditButton.click();
      if (await page.locator('[data-overlay="reverse-fixed-asset-change-modal"]').count()) errors.push(test.title + '@' + width + ': 反审核仍存在确认弹窗');
      if (await approvedRow.getAttribute('data-row-status') !== '新增') errors.push(test.title + '@' + width + ': 反审核后状态未回到新增');
      const reversedValue = JSON.parse((await approvedRow.getAttribute('data-row-value')) || '{}');
      if (reversedValue.auditor || reversedValue.auditedAt) errors.push(test.title + '@' + width + ': 反审核后审核人或审核时间未清空');
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) errors.push(`${test.title}@${width}: 存在页面级横向溢出`);
    if (width === 1440) await page.screenshot({ path: path.join(reportDir, `${path.basename(test.file, '.html')}.png`), fullPage: true });

    await page.getByRole('button', { name: test.create }).click();
    if (!await page.locator('[data-page-view="detail"]').isVisible()) errors.push(`${test.title}@${width}: 新增未进入详情`);
    if (test.selectionMode === 'multi') {
      const detail = page.locator('[data-page-view="detail"]');
      if (!await detail.locator('.pro-tab', { hasText: '基础信息' }).count()) errors.push(test.title + '@' + width + ': 页签未改为基础信息');
      if (await detail.locator('[data-field="remark"]:visible').count()) errors.push(test.title + '@' + width + ': 新增基础信息仍显示备注');
      const createBasic = detail.locator('#fixed-asset-create-basic');
      if (await createBasic.getByText('创建人', { exact: true }).count() !== 1 || await createBasic.getByText('创建时间', { exact: true }).count() !== 1) errors.push(test.title + '@' + width + ': 新增基础信息创建人或创建时间重复');
      const detailColumns = await detail.locator('#capitalization-items template[data-editable-row-template]').evaluate((template) => Array.from(template.content.querySelectorAll('[data-column]')).map((node) => node.dataset.column));
      if (detailColumns.join(',') !== capitalizationColumns.join(',')) errors.push(test.title + '@' + width + ': 转固明细字段或顺序不正确: ' + detailColumns.join(','));
      const fixedColumns = await detail.locator('#capitalization-items thead .schema-fixed-left').count();
      if (fixedColumns !== 3) errors.push(test.title + '@' + width + ': 转固明细左侧固定区域不是复选框、序号、物资名称');
      const templateContract = await detail.locator('#capitalization-items template[data-editable-row-template]').evaluate((template) => ({
        userIsSelect: Boolean(template.content.querySelector('[data-column="user"] select[data-field="user"]')),
        projectIsSelect: Boolean(template.content.querySelector('[data-column="project"] select[data-field="project"]')),
        methodOptions: Array.from(template.content.querySelectorAll('[data-field="depreciationMethod"] option')).map((node) => node.value).filter(Boolean)
      }));
      if (!templateContract.userIsSelect) errors.push(test.title + '@' + width + ': 使用人员不是下拉选择');
      if (!templateContract.projectIsSelect) errors.push(test.title + '@' + width + ': 项目不是下拉选择');
      if (templateContract.methodOptions.join(',') !== depreciationMethods.join(',')) errors.push(test.title + '@' + width + ': 折旧方法选项不正确: ' + templateContract.methodOptions.join(','));
    } else {
      const detail = page.locator('[data-page-view="detail"]');
      const tabLabels = await detail.locator('.pro-tab').allTextContents();
      if (tabLabels.map((label) => label.trim()).join(',') !== '基础信息') errors.push(test.title + '@' + width + ': 未仅保留基础信息页签: ' + tabLabels.join(','));
      const sectionIds = await detail.locator('[data-tab-panel="basic-info"] > [data-component="DetailForm"]').evaluateAll((nodes) => nodes.map((node) => node.id));
      if (sectionIds.join(',') !== 'fixed-asset-return-basic,fixed-asset-change-before,fixed-asset-change-after') errors.push(test.title + '@' + width + ': 三段信息未按基础信息、变更前、变更后纵向排列: ' + sectionIds.join(','));
      const pickerButton = detail.locator('#fixed-asset-return-basic [data-field="fixedAssetSn"]').locator('xpath=ancestor::div[contains(@class,"schema-picker")]').locator('[data-act="open"][data-target="fixed-asset-return-picker"]');
      if (await pickerButton.count() !== 1) errors.push(test.title + '@' + width + ': 固定资产SN字段缺少台账选择按钮');
      if (await detail.locator('.schema-detail-header [data-act="open"][data-target="fixed-asset-return-picker"]').count()) errors.push(test.title + '@' + width + ': 右上角仍显示选择固资台账');
      const basicFields = await detail.locator('#fixed-asset-return-basic [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      const beforeFields = await detail.locator('#fixed-asset-change-before [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      const afterFields = await detail.locator('#fixed-asset-change-after [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      if (basicFields.join(',') !== changeBasicFields.join(',')) errors.push(test.title + '@' + width + ': 基础信息字段或顺序不正确');
      if (beforeFields.join(',') !== beforeChangeFields.join(',')) errors.push(test.title + '@' + width + ': 变更前字段或顺序不正确');
      if (afterFields.join(',') !== afterChangeFields.join(',')) errors.push(test.title + '@' + width + ': 变更后字段或顺序不正确');
      const beforeTitle = ((await detail.locator('#fixed-asset-change-before .section-title').textContent()) || '').trim();
      const afterTitle = ((await detail.locator('#fixed-asset-change-after .section-title').textContent()) || '').trim();
      if (beforeTitle !== '变更前') errors.push(test.title + '@' + width + ': 变更前区块标题不正确: ' + beforeTitle);
      if (afterTitle !== '变更后') errors.push(test.title + '@' + width + ': 变更后区块标题不正确: ' + afterTitle);
      if (await detail.locator('#fixed-asset-change-before [data-field]:not([data-schema-readonly="true"])').count()) errors.push(test.title + '@' + width + ': 变更前存在可编辑字段');
      const actualEditableAfterCodes = await detail.locator('#fixed-asset-change-after [data-field]:not([data-schema-readonly="true"])').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      if (actualEditableAfterCodes.join(',') !== editableAfterCodes.join(',')) errors.push(test.title + '@' + width + ': 变更后可编辑字段边界不正确: ' + actualEditableAfterCodes.join(','));
      for (const code of lockedAfterCodes) {
        if (await detail.locator(`#fixed-asset-change-after [data-field="${code}"][data-schema-readonly="true"]`).count() !== 1) errors.push(`${test.title}@${width}: ${code} 未设置为只读`);
      }
    }
    await page.getByRole('button', { name: test.pickerButton, exact: true }).click();
    const overlay = page.locator(`[data-overlay="${test.picker}"]`);
    if (!await overlay.isVisible()) errors.push(`${test.title}@${width}: 选择弹窗未打开`);
    if (test.selectionMode === 'multi') {
      if (await overlay.locator('[data-component="ProSearchForm"] [data-field="storageBin"]').count()) errors.push(test.title + '@' + width + ': 即时库存弹窗仍有库位查询条件');
      const pickerColumns = await overlay.locator('tbody > tr').first().locator('[data-column]').evaluateAll((nodes) => nodes.map((node) => node.dataset.column));
      if (pickerColumns.indexOf('currentQuantity') !== pickerColumns.indexOf('warehouse') - 1) errors.push(test.title + '@' + width + ': 库存余量未放在库存地点前');
      if (width === 1440) await page.screenshot({ path: path.join(reportDir, 'fixed-asset-ledger-picker.png'), fullPage: true });
    } else {
      const pickerSearchCodes = await overlay.locator('[data-component="ProSearchForm"] [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
      const pickerColumnCodes = await overlay.locator('tbody > tr').first().locator('[data-column]').evaluateAll((nodes) => nodes.map((node) => node.dataset.column));
      if (pickerSearchCodes.join(',') !== pickerSearchFields.join(',')) errors.push(test.title + '@' + width + ': 台账弹窗查询字段或顺序不正确: ' + pickerSearchCodes.join(','));
      if (pickerColumnCodes.join(',') !== pickerListFields.join(',')) errors.push(test.title + '@' + width + ': 台账弹窗列表字段或顺序不正确: ' + pickerColumnCodes.join(','));
    }
    const rows = overlay.locator('tbody > tr:visible:not([data-filter-empty-row])');
    if (!await rows.count()) errors.push(`${test.title}@${width}: 选择弹窗无可选数据`);
    if (test.selectionMode === 'single' && await overlay.locator('[data-act="select-all"]').count()) errors.push(`${test.title}@${width}: 单选弹窗不应显示全选`);
    await rows.first().locator('[data-row-select]').check();
    await overlay.locator(`[data-act="${test.confirm}"]`).click();
    if (await overlay.isVisible()) errors.push(`${test.title}@${width}: 确认选择后弹窗未关闭`);
    if (test.selectionMode === 'multi') {
      const detailRows = page.locator('#capitalization-items tbody > tr:visible:not([data-filter-empty-row])');
      if (await detailRows.count() !== 5) errors.push(test.title + '@' + width + ': 库存余量 5 未拆分为 5 条转固明细');
      const splitValues = await detailRows.evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (splitValues.some((row) => row.unitQuantity !== 1)) errors.push(test.title + '@' + width + ': 拆分明细单位数量不全为 1');
      if (splitValues.some((row) => row.salvageValuePct !== 0)) errors.push(test.title + '@' + width + ': 拆分明细残值率未默认为 0');
      if (splitValues.some((row) => row.project !== '通用项目')) errors.push(test.title + '@' + width + ': 拆分明细项目未默认为通用项目');
      if (splitValues.some((row) => row.status !== '在用')) errors.push(test.title + '@' + width + ': 转固明细状态未自动设为在用');
      if (!await detailRows.first().locator('select[data-field="user"]').count()) errors.push(test.title + '@' + width + ': 实际转固行使用人员不是下拉选择');
      if (await detailRows.first().locator('select[data-field="project"]').inputValue() !== '通用项目') errors.push(test.title + '@' + width + ': 实际转固行项目默认值不正确');
      if (width === 1440) {
        await page.locator('#capitalization-items .pro-table-scroll').evaluate((node) => { node.scrollLeft = 1250; });
        await page.screenshot({ path: path.join(reportDir, 'fixed-asset-ledger-detail-project.png'), fullPage: true });
      }
    }
    if (test.selectionMode === 'single') {
      const detail = page.locator('[data-page-view="detail"]');
      for (const code of ['fixedAssetSn', 'assetName', 'fixedAssetCode', 'beforeFixedAssetSn', 'beforeAssetName', 'beforeFixedAssetCode', 'afterFixedAssetSn', 'afterAssetName', 'afterFixedAssetCode']) {
        if (!(await detail.locator(`[data-field="${code}"]`).inputValue())) errors.push(`${test.title}@${width}: 选择台账后 ${code} 未回填`);
      }
      for (const afterCode of editableAfterCodes) {
        const beforeCode = afterCode.replace(/^after/, 'before');
        const beforeValue = await detail.locator(`[data-field="${beforeCode}"]`).inputValue();
        const afterField = detail.locator(`[data-field="${afterCode}"]`);
        const afterValue = await afterField.inputValue();
        if (beforeValue !== afterValue) errors.push(`${test.title}@${width}: ${afterCode} 未默认复制变更前数据`);
        const tagName = await afterField.evaluate((node) => node.tagName.toLowerCase());
        if (tagName === 'select') {
          const alternative = await afterField.locator('option').evaluateAll((options, current) => options.map((option) => option.value).find((value) => value && value !== current) || '', afterValue);
          if (alternative) await afterField.selectOption(alternative);
        } else {
          await afterField.fill(`${afterValue}（调整）`);
        }
        if (await afterField.inputValue() === afterValue) errors.push(`${test.title}@${width}: ${afterCode} 不支持调整`);
      }
      for (const afterCode of lockedAfterCodes) {
        const beforeCode = afterCode.replace(/^after/, 'before');
        if (await detail.locator(`[data-field="${beforeCode}"]`).inputValue() !== await detail.locator(`[data-field="${afterCode}"]`).inputValue()) errors.push(`${test.title}@${width}: ${afterCode} 未默认显示变更前数据`);
      }
      if (width === 1440) {
        await page.screenshot({ path: path.join(reportDir, 'fixed-asset-return-detail-sections.png'), fullPage: true });
      }
    }
    if (width === 1440) await page.screenshot({ path: path.join(reportDir, `${path.basename(test.file, '.html')}-detail.png`), fullPage: true });
    await page.close();
    console.log(`checked ${test.title}@${width}`);
  }
}

const menu = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
menu.setDefaultTimeout(5000);
await menu.route(/^https?:/, (route) => route.abort());
console.log('checking fixed asset menu');
await menu.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
console.log('menu loaded');
const moduleButton = menu.locator('.menu-primary', { hasText: '固资管理' });
await moduleButton.click({ noWaitAfter: true });
console.log('fixed asset module opened');
const menuItems = (await moduleButton.locator('xpath=..').locator('.submenu button').allTextContents()).map((item) => item.trim());
if (menuItems.join(',') !== '固资台账,固资变更') errors.push(`菜单: 固资管理子菜单不正确：${menuItems.join(',')}`);
for (const [name, target] of [['固资台账', 'fixed-asset/fixed-asset-ledger.html'], ['固资变更', 'fixed-asset/fixed-asset-return.html']]) {
  const item = moduleButton.locator('xpath=..').locator('.submenu button', { hasText: name });
  await item.click({ noWaitAfter: true });
  if (!(await menu.locator('#contentFrame').getAttribute('src'))?.endsWith(target)) errors.push(`菜单: ${name} 路由不正确`);
}
await menu.close();
console.log('fixed asset menu checked');
await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Fixed asset pages smoke passed: menu, picker, list pagination and desktop layout');
process.exit(0);
