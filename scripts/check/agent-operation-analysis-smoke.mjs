import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedColumns = [
  '项目名称', '区域', '运营规模（万吨/日）', '项目状态', '项目经理', '技术负责人', '实施人员',
  'AI-OS配置人员', '算法工程师', '销售负责人', '控制开始时间', '操作'
];
const screenshotFieldCodes = [
  'projectCode', 'projectName', 'projectStatus', 'scale', 'region',
  'intelligentControlStartTime', 'intelligentControlEndTime', 'remainingUsageTime',
  'waterType', 'bioProcess', 'effluentCod', 'effluentAmmonia', 'effluentTn', 'effluentTp',
  'customerCode', 'customerName', 'operator', 'owner', 'projectManager', 'salesOwner',
  'technicalOwners', 'implementationPersonnel', 'aiOsConfigPersonnel', 'algorithmEngineers',
  'aiOsAddress', 'deployedAgents', 'controlStrategy', 'acceptanceReport'
];

const schemaPath = path.resolve('schemas/pages/report/agent-operation-analysis.json');
const pagePath = path.resolve('pages/project-overview.html');
const menuPath = path.resolve('menu/index.html');
const generatorSourcePath = path.resolve('scripts/generate/report-monitor-schemas.mjs');
const screenshotDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(screenshotDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const menuHtml = fs.readFileSync(menuPath, 'utf8');
const generatorSource = fs.readFileSync(generatorSourcePath, 'utf8');
const errors = [];
const tableSchema = schema.regions.find((region) => region.id === 'operation-table');
const searchSchema = schema.regions.find((region) => region.id === 'operation-search');
const detailSchema = schema.regions.find((region) => region.id === 'operation-detail');
const allDetailChildren = (detailSchema?.tabs || []).flatMap((tab) => tab.children || []);
const allDetailFields = allDetailChildren.flatMap((child) => child.fields || []);
const detailFieldCodes = new Set(allDetailFields.map((field) => field.code));
const effectTableSchema = allDetailChildren.find((child) => child.id === 'control-effect-detail-table');
const controlTimeModalSchema = schema.overlays?.find((overlay) => overlay.id === 'control-time-adjustment-modal');

if (tableSchema?.pageSize !== 5) errors.push('项目列表必须固定每页5条。');
if (JSON.stringify(searchSchema?.fields?.map((field) => field.label)) !== JSON.stringify(['项目名称', '项目状态']) || searchSchema?.collapsible !== false) errors.push('查询区只能显示项目名称和项目状态。');
if (JSON.stringify(tableSchema?.columns?.map((column) => column.label)) !== JSON.stringify(expectedColumns.slice(0, -1))) errors.push('项目列表字段或顺序不符合已确认蓝图。');
if (JSON.stringify(tableSchema?.rowActions?.map((action) => action.label)) !== JSON.stringify(['详情'])) errors.push('主列表操作列只能保留详情。');
if (tableSchema?.rowExpansion) errors.push('控制效果不得继续配置为主列表行展开区。');
const controlStartColumn = tableSchema?.columns?.find((column) => column.code === 'intelligentControlStartTime');
if (controlStartColumn?.format !== 'date' || controlStartColumn?.component !== 'date' || controlStartColumn?.sortable !== true) errors.push('控制开始时间必须按年月日显示并支持升降序。');
if (JSON.stringify(detailSchema?.tabs?.map((tab) => tab.label)) !== JSON.stringify(['基础信息', '团队&配置', '控制效果'])) errors.push('详情必须包含三个指定页签。');
if (screenshotFieldCodes.some((code) => !detailFieldCodes.has(code))) errors.push(`详情缺少截图字段：${screenshotFieldCodes.filter((code) => !detailFieldCodes.has(code)).join(',')}`);
const basicFields = detailSchema?.tabs?.find((tab) => tab.key === 'basic')?.children?.flatMap((child) => child.fields || []) || [];
if (basicFields.length !== 16 || basicFields.some((field) => field.readonly !== true)) errors.push('基础信息必须严格包含16个只读字段。');
if (detailSchema?.tabs?.flatMap((tab) => tab.children || []).filter((child) => child.component === 'DetailForm').some((form) => form.layoutColumns !== 3)) errors.push('详情表单桌面端必须统一为每行3个字段。');
const editableTeamCodes = new Set(['technicalOwners', 'implementationPersonnel', 'aiOsConfigPersonnel', 'algorithmEngineers', 'aiOsAddress']);
if ([...editableTeamCodes].some((code) => !allDetailFields.some((field) => field.code === code && field.readonly !== true))) errors.push('团队与AI-OS配置可编辑字段不完整。');
if (effectTableSchema?.component !== 'EditableTable' || effectTableSchema?.displayMode !== 'cards' || effectTableSchema?.dataSource !== 'controlEffects' || effectTableSchema?.metrics?.length !== 6) errors.push('控制效果卡片配置不完整。');
if (effectTableSchema?.cardsPerRow !== 1 || effectTableSchema?.metricColumns !== 3) errors.push('控制效果卡片必须配置为每行1张、指标每行3项。');
if (effectTableSchema?.trendChart?.enabled !== true || effectTableSchema?.trendChart?.defaultMetric !== 'waterEnergy' || effectTableSchema?.trendChart?.defaultType !== 'bar') errors.push('控制效果趋势图配置不完整。');
if (JSON.stringify(schema.pageActions?.map((action) => action.label)) !== JSON.stringify(['智控时间调整']) || schema.pageActions?.[0]?.target !== 'control-time-adjustment-modal' || schema.pageActions?.[0]?.requiresSingleSelection !== true) errors.push('列表页缺少单选启用的智控时间调整入口。');
if (tableSchema?.selectable !== true) errors.push('主列表必须提供项目复选框。');
if (JSON.stringify(controlTimeModalSchema?.fields?.map((field) => field.code)) !== JSON.stringify(['adjustedControlStartTime', 'adjustedControlEndTime'])) errors.push('智控时间调整弹窗字段不完整。');
if (['intelligentControlStartTime', 'intelligentControlEndTime'].some((code) => allDetailFields.find((field) => field.code === code)?.readonly === true)) errors.push('团队与配置中的智控起止时间必须可编辑。');
if (allDetailChildren.some((child) => child.title || child.showTitle !== false)) errors.push('页签直接内容区必须显式关闭重复标题。');
if (JSON.stringify(schema.uiConstraints) !== JSON.stringify({ listPageSize: 5, detailFormColumns: 3, tabSectionTitles: false, effectCardsPerRow: 1, effectMetricColumns: 3 })) errors.push('页面缺少完整的机器可验收布局约束。');
if (allDetailFields.find((field) => field.code === 'deployedAgents')?.displayOnly !== true) errors.push('已部署智能体必须配置为只读多值展示。');
if (/rowExpansion|waterEnergyBefore|waterEnergyAfter|toggle-control-effect/.test(generatorSource)) errors.push('页面生成源仍残留旧行展开或控制前后值结构。');
if (!menuHtml.includes('"name": "智能体运营分析"') || !menuHtml.includes('"path": "project-overview.html"')) errors.push('菜单未绑定智能体运营分析页面。');

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });

try {
  await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'domcontentloaded' });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) errors.push('1440px视口存在页面级横向溢出。');
  const table = page.locator('#operation-table');
  const renderedColumns = (await table.locator(':scope > .pro-table-scroll > table > thead th').allTextContents()).map((text) => text.trim()).filter(Boolean);
  if (JSON.stringify(renderedColumns) !== JSON.stringify(expectedColumns)) errors.push(`页面列表字段顺序错误：${JSON.stringify(renderedColumns)}`);
  const controlStartSort = table.locator('[data-act="sort-column"][data-sort-code="intelligentControlStartTime"]');
  if (await controlStartSort.count() !== 1) errors.push('控制开始时间表头缺少升降序图标。');
  else {
    await controlStartSort.click();
    const ascendingDates = await table.locator(':scope > .pro-table-scroll > table > tbody > tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').intelligentControlStartTime).filter(Boolean));
    if (JSON.stringify(ascendingDates) !== JSON.stringify([...ascendingDates].sort())) errors.push('控制开始时间升序排序无效。');
    if (await controlStartSort.locator('i.fa-sort-up').count() !== 1 || await controlStartSort.evaluate((button) => button.closest('th')?.getAttribute('aria-sort')) !== 'ascending') errors.push('升序图标或无障碍状态不正确。');
    await controlStartSort.click();
    const descendingDates = await table.locator(':scope > .pro-table-scroll > table > tbody > tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').intelligentControlStartTime).filter(Boolean));
    if (JSON.stringify(descendingDates) !== JSON.stringify([...descendingDates].sort().reverse())) errors.push('控制开始时间降序排序无效。');
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  const visibleRows = table.locator(':scope > .pro-table-scroll > table > tbody > tr[data-row-value]:visible');
  if (await visibleRows.count() !== 5) errors.push('首页必须恰好显示5条项目数据。');
  if (await table.locator('[data-act="toggle-control-effect"]').count()) errors.push('主列表仍存在控制效果展开入口。');
  if (await table.locator(':scope > .pro-table-scroll > table > tbody > tr[data-row-value] [data-act="view"]').count() !== 8) errors.push('每个项目必须提供详情入口。');
  const firstRow = visibleRows.first();
  if ((await firstRow.locator('[data-column="aiOsConfigPersonnelDisplay"]').textContent()).trim() !== '赵工、钱工') errors.push('列表AI-OS配置人员未显示人员姓名。');
  if ((await firstRow.locator('[data-column="intelligentControlStartTime"]').textContent()).trim() !== '2024-01-15') errors.push('列表控制开始时间未按YYYY-MM-DD显示。');
  const controlTimeButton = page.locator('[data-page-view="list"] .schema-list-header [data-act="open-control-time-adjustment"]');
  if (!await controlTimeButton.isVisible()) errors.push('列表右上角未展示智控时间调整按钮。');
  else {
    if (!await controlTimeButton.isDisabled()) errors.push('未勾选项目时智控时间调整按钮必须禁用。');
    await firstRow.locator('[data-row-select]').check();
    if (await controlTimeButton.isDisabled()) errors.push('单选项目后智控时间调整按钮未启用。');
    await controlTimeButton.click();
    const controlTimeModal = page.locator('[data-overlay="control-time-adjustment-modal"]');
    if (!await controlTimeModal.isVisible()) errors.push('智控时间调整弹窗未打开。');
    await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis-control-time-modal.png'), fullPage: true });
    if (await controlTimeModal.locator('[data-field="adjustedControlStartTime"]').inputValue() !== '2024-01-15' || await controlTimeModal.locator('[data-field="adjustedControlEndTime"]').inputValue() !== '2027-01-14') errors.push('弹窗未自动带出勾选项目的当前智控起止时间。');
    await controlTimeModal.locator('[data-field="adjustedControlStartTime"]').fill('2024-02-01');
    await controlTimeModal.locator('[data-field="adjustedControlEndTime"]').fill('2027-02-01');
    await controlTimeModal.locator('[data-act="confirm-control-time-adjustment"]').click();
    if (await controlTimeModal.isVisible()) errors.push('智控时间调整保存后弹窗未关闭。');
    if ((await firstRow.locator('[data-column="intelligentControlStartTime"]').textContent()).trim() !== '2024-02-01') errors.push('智控时间调整后列表未同步刷新。');
  }
  await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis.png'), fullPage: true });

  await firstRow.locator('[data-act="view"]').click();
  const detailView = page.locator('[data-page-view="detail"]');
  if (!await detailView.isVisible()) errors.push('详情入口未打开详情视图。');
  if (await detailView.locator('[data-tab]').count() !== 3) errors.push('详情页签数量不是3个。');
  const expectedBasicValues = {
    projectCode: 'PMS2024001', projectName: '广州水务智能控制项目',
    effluentCod: '32', effluentAmmonia: '2.8', effluentTn: '10', effluentTp: '0.3',
    customerCode: 'C001', customerName: '广州水务集团', operator: '广州智能运营公司', owner: '广州水务集团'
  };
  for (const [code, value] of Object.entries(expectedBasicValues)) {
    if (await detailView.locator(`[data-field="${code}"]`).first().inputValue() !== value) errors.push(`详情字段${code}未正确带入。`);
  }
  if (await detailView.locator('[data-tab-panel] h2.section-title').count()) errors.push('页签内容区仍重复显示左上角标题。');
  if (await detailView.locator('[data-tab-panel="basic"] input:not(:disabled)').count()) errors.push('基础信息字段必须全部只读。');
  const basicGridColumns = await detailView.locator('#operation-basic-form > .pro-detail-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
  if (basicGridColumns !== 3) errors.push(`基础信息桌面端实际布局不是每行3个字段，而是${basicGridColumns}列。`);
  await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis-detail.png'), fullPage: true });

  await detailView.locator('[data-tab="team-config"]').click();
  if (await detailView.locator('[data-field="intelligentControlStartTime"]').inputValue() !== '2024-02-01') errors.push('弹窗调整后的智控开始时间未同步到详情。');
  if (await detailView.locator('[data-field="intelligentControlEndTime"]').inputValue() !== '2027-02-01') errors.push('弹窗调整后的智控结束时间未同步到详情。');
  if (!await detailView.locator('[data-field="intelligentControlStartTime"]').isEnabled() || !await detailView.locator('[data-field="intelligentControlEndTime"]').isEnabled()) errors.push('详情智控起止时间未开放编辑。');
  await detailView.locator('[data-field="intelligentControlEndTime"]').fill('2027-03-01');
  await detailView.locator('[data-field="intelligentControlEndTime"]').dispatchEvent('change');
  if ((await page.locator('#operation-table tr[data-row-value]').first().evaluate((row) => JSON.parse(row.dataset.rowValue || '{}').intelligentControlEndTime)) !== '2027-03-01') errors.push('详情编辑智控结束时间后未同步回列表数据。');
  if (!await detailView.locator('[data-field="aiOsAddress"]').isEnabled()) errors.push('AI-OS地址必须支持配置。');
  for (const code of ['technicalOwners', 'implementationPersonnel', 'aiOsConfigPersonnel', 'algorithmEngineers']) {
    const field = detailView.locator(`[data-field="${code}"]`);
    if (!await field.isEnabled()) errors.push(`${code}必须支持多选配置。`);
  }
  if ((await detailView.locator('[data-field="deployedAgents"]').inputValue()).split(',').length < 2) errors.push('已部署智能体未按多个值展示。');
  if (await detailView.locator('[data-field="deployedAgents"]').locator('xpath=ancestor::div[@data-multi-select]//i[contains(@class,"fa-angle-down")]').isVisible()) errors.push('只读的已部署智能体不应显示下拉图标。');
  await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis-control-config.png'), fullPage: true });

  await detailView.locator('[data-tab="effect"]').click();
  const effectTable = detailView.locator('#control-effect-detail-table');
  if (!await effectTable.isVisible()) errors.push('控制效果页签未展示补录卡片。');
  const acceptanceReport = detailView.locator('input[type="file"][data-field="acceptanceReport"]');
  if (!await detailView.locator('[data-field="controlStrategy"]').isEnabled() || !await acceptanceReport.isEnabled()) errors.push('控制策略必须支持编辑，验收报告必须支持附件上传。');
  if (await detailView.getByText('整体进展', { exact: true }).count()) errors.push('控制效果页签仍显示整体进展。');
  if (!await detailView.locator('[data-field="controlStrategy"]').locator('xpath=ancestor::div[contains(@class,"pro-span-3")]').count() || !await acceptanceReport.locator('xpath=ancestor::div[contains(@class,"pro-span-3")]').count()) errors.push('控制策略和验收报告必须上下独占一行。');
  const summaryPositions = await detailView.locator('#operation-effect-summary-form .form-item').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
  if (summaryPositions.length !== 2 || Math.abs(summaryPositions[0] - summaryPositions[1]) < 10) errors.push('控制策略和验收报告的实际布局不是上下排列。');
  const uploadChooserPromise = page.waitForEvent('filechooser');
  await acceptanceReport.locator('xpath=ancestor::div[contains(@class,"schema-file-upload")]').locator('[data-act="upload"]').click();
  const uploadChooser = await uploadChooserPromise;
  await uploadChooser.setFiles({ name: '项目验收报告.pdf', mimeType: 'application/pdf', buffer: Buffer.from('prototype acceptance report') });
  if (await detailView.locator('[data-upload-display]').inputValue() !== '项目验收报告.pdf') errors.push('验收报告上传后未回显附件文件名。');
  const effectRows = effectTable.locator(':scope > [data-effect-card-list] > [data-effect-card]');
  const effectChart = effectTable.locator('[data-effect-chart]');
  if (!await effectChart.isVisible()) errors.push('控制效果页签未展示指标趋势图。');
  if (await effectChart.locator('[data-effect-chart-metric] option').count() !== 6) errors.push('趋势图未提供完整的6项指标选择。');
  if (await effectChart.locator('[data-act="effect-chart-type"]').count() !== 2 || !await effectChart.locator('[data-act="export-effect-chart"]').isVisible()) errors.push('趋势图缺少柱状图、折线图切换或导出操作。');
  if (await effectChart.locator('[data-effect-chart-svg] .schema-effect-chart-bar').count() !== 2) errors.push('默认柱状图未按2条控制效果记录绘制。');
  if (await effectChart.locator('[data-effect-chart-svg] text[y="274"]').first().isVisible()) errors.push('趋势图仍显示底部评估周期坐标。');
  await effectChart.locator('[data-act="effect-chart-type"][data-chart-type="line"]').click();
  if (await effectChart.locator('[data-effect-chart-svg] .schema-effect-chart-line').count() !== 1 || await effectChart.locator('[data-effect-chart-svg] .schema-effect-chart-point').count() !== 2) errors.push('折线图切换未生效。');
  await effectChart.locator('[data-effect-chart-metric]').selectOption('pacConsumption');
  if (!((await effectChart.locator('[data-effect-chart-summary]').textContent()) || '').includes('吨水PAC药耗')) errors.push('指标选择未驱动图表数据更新。');
  const chartDownloadPromise = page.waitForEvent('download');
  await effectChart.locator('[data-act="export-effect-chart"]').click();
  const chartDownload = await chartDownloadPromise;
  if (!chartDownload.suggestedFilename().endsWith('.png')) errors.push('趋势图导出文件不是PNG格式。');
  else await chartDownload.saveAs(path.join(screenshotDir, 'agent-operation-analysis-effect-chart-export.png'));
  if (await effectRows.count() !== 2) errors.push('控制效果页签未加载当前项目的2张记录卡片。');
  const effectCardBoxes = await effectRows.evaluateAll((cards) => cards.map((card) => ({ x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y })));
  if (effectCardBoxes.length > 1 && Math.abs(effectCardBoxes[0].y - effectCardBoxes[1].y) < 10) errors.push('控制效果卡片必须每行只显示一张。');
  const metricGridColumns = await effectRows.first().locator('.schema-effect-metric-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
  if (metricGridColumns !== 3) errors.push(`控制效果卡片指标实际布局不是每行3项，而是${metricGridColumns}列。`);
  if (await effectTable.locator('.schema-effect-card-index').count()) errors.push('控制效果卡片不得显示记录序号。');
  if (await effectRows.first().locator('[data-effect-meta-value="createdBy"]').textContent() !== '林佳' || await effectRows.first().locator('[data-effect-meta-value="createdTime"]').textContent() !== '2026-05-06 10:20:00') errors.push('控制效果卡片未显示新增人员或新增时间。');
  if (await effectRows.first().locator('[data-effect-edit-control]:not(:disabled)').count()) errors.push('控制效果卡片默认应为只读展示。');
  await effectRows.first().locator('[data-act="edit-effect-card"]').click({ force: true });
  const energyInput = effectRows.first().locator('[data-field="waterEnergy"]');
  if (!await energyInput.isEnabled()) errors.push('点击编辑后控制效果字段未进入可编辑状态。');
  await energyInput.fill('0.3555');
  await effectRows.first().locator('[data-act="save-effect-card"]').click({ force: true });
  if (await energyInput.isEnabled() || await energyInput.inputValue() !== '0.3555') errors.push('控制效果保存后未立即转为展示状态。');
  await effectChart.locator('[data-effect-chart-metric]').selectOption('waterEnergy');
  if (!((await effectChart.locator('[data-effect-chart-summary]').textContent()) || '').includes('0.3555')) errors.push('控制效果编辑保存后图表未同步刷新。');

  await effectTable.locator('[data-act="add-effect-card"]').click();
  const newRow = effectTable.locator('[data-new-card="true"]');
  if (!await newRow.isVisible()) errors.push('新增控制效果未创建新卡片。');
  if (await newRow.locator('[data-field="waterEnergy"]').inputValue() !== '') errors.push('新增控制效果卡片不得复制上一期指标。');
  if (await newRow.locator('[data-field="createdBy"]').inputValue() !== '林佳' || !await newRow.locator('[data-field="createdTime"]').inputValue()) errors.push('新增卡片未自动写入新增人员和新增时间。');
  const cancelNewRow = newRow.locator('[data-act="cancel-effect-card"]');
  if (!await cancelNewRow.count()) errors.push('新增卡片未提供取消操作。');
  else await cancelNewRow.click({ force: true });

  const savedRow = effectTable.locator(':scope > [data-effect-card-list] > [data-effect-card]').first();
  const removeEffect = savedRow.locator('[data-act="remove-effect-card"]');
  if (!await removeEffect.count()) errors.push('控制效果记录未提供删除操作。');
  else {
    await removeEffect.click({ force: true });
    const deleteConfirm = page.locator('[data-delete-confirm]');
    if (!await deleteConfirm.isVisible()) errors.push('删除控制效果前必须二次确认。');
    else await deleteConfirm.locator('[data-act="cancel-delete"]').last().click();
  }
  await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis-control-effect.png'), fullPage: true });

  await page.goto(pathToFileURL(menuPath).href, { waitUntil: 'domcontentloaded' });
  const reportMenu = page.locator('.menu-section').filter({ has: page.locator('.menu-primary', { hasText: '报表管理' }) });
  await reportMenu.locator('.menu-primary').click();
  await reportMenu.locator('.submenu button', { hasText: '智能体运营分析' }).click();
  await page.waitForFunction(() => document.querySelector('#contentFrame')?.getAttribute('src')?.endsWith('project-overview.html'));
  const menuFrame = page.frameLocator('#contentFrame');
  if (!await menuFrame.locator('[data-page-view="list"] h1', { hasText: '智能体运营分析' }).isVisible()) errors.push('从菜单进入后未正确加载智能体运营分析页面。');
  await menuFrame.locator('#operation-table tbody tr[data-row-value]:visible [data-act="view"]').first().click();
  const framedDetail = menuFrame.locator('[data-page-view="detail"]');
  if (!await framedDetail.isVisible()) errors.push('完整菜单环境下无法进入详情。');
  const framedBasicColumns = await framedDetail.locator('#operation-basic-form > .pro-detail-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
  if (framedBasicColumns !== 3) errors.push(`完整菜单环境下基础信息不是每行3个字段，而是${framedBasicColumns}列。`);
  await framedDetail.locator('[data-tab="effect"]').click();
  const framedCards = framedDetail.locator('#control-effect-detail-table [data-effect-card-list] > [data-effect-card]');
  const framedCardBoxes = await framedCards.evaluateAll((cards) => cards.map((card) => ({ x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y })));
  if (framedCardBoxes.length > 1 && Math.abs(framedCardBoxes[0].y - framedCardBoxes[1].y) < 10) errors.push('完整菜单环境下控制效果卡片不是每行1张。');
  if (await framedDetail.locator('[data-tab-panel] h2.section-title').count()) errors.push('完整菜单环境下页签内容仍出现重复标题。');
  await page.setViewportSize({ width: 2048, height: 1200 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) errors.push('2048px视口存在页面级横向溢出。');
  if (!await framedDetail.getByText('验收报告', { exact: true }).isVisible()) errors.push('2048px视口未正常展示验收报告。');
  await page.screenshot({ path: path.join(screenshotDir, 'agent-operation-analysis-menu-detail.png'), fullPage: true });
} finally {
  await browser.close();
}

if (browserErrors.length) errors.push(`浏览器错误：${browserErrors.join(' | ')}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Agent operation analysis smoke check passed.');
