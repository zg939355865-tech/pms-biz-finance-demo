import fs from 'node:fs';
import path from 'node:path';

const categories = ['服务采购', '物资消耗', '费用报销', '人工成本', '折旧摊销', '间接费用', '成本调整'];
const categoryColors = ['#1677ff', '#36cfc9', '#52c41a', '#faad14', '#597ef7', '#f759ab', '#8c8c8c'];
const seed = [
  ['PRJ2026001', '华中智能工厂一期', '实施交付类', '执行中', '项目交付部', [486000, 213500, 68200, 326400, 38500, 87600, -12000], '完整'],
  ['PRJ2026002', '研发知识中台建设', '产品研发类', '执行中', '技术研发部', [162000, 94500, 42600, 511200, 116800, 73200, 8000], '待补人工'],
  ['PRJ2026003', '智慧园区运营平台', '实施交付类', '执行中', '武汉交付部', [392000, 184300, 51900, 286600, 42800, 68100, 0], '完整'],
  ['PRJ2026004', 'AI客服场景孵化', '产品研发类', '执行中', 'AI产品部', [126000, 32700, 28400, 438000, 76400, 59500, -6500], '待补折旧'],
  ['PRJ2026005', '视觉算法能力升级', '技术研发类', '执行中', '算法研发部', [98000, 58600, 31900, 472000, 91300, 62400, 12000], '待分摊'],
  ['PRJ2026006', '东莞产线数字化改造', '实施交付类', '执行中', '东莞交付部', [428000, 276800, 74600, 312000, 36400, 84900, -9800], '完整'],
  ['PRJ2026007', '年度市场品牌推广', '市场活动类', '执行中', '市场营销部', [72000, 18500, 226800, 96500, 18600, 44300, 0], '未结账'],
  ['PRJ2026008', '总部协同管理优化', '管理提升类', '收尾中', '综合管理部', [116000, 24600, 85200, 158000, 22400, 51900, -3200], '完整'],
  ['PRJ2026009', '业财数据治理专项', '管理提升类', '执行中', '财务部', [148000, 31500, 37400, 226000, 29100, 48700, 4500], '待补人工'],
  ['PRJ2026010', '供应链协同平台', '实施交付类', '执行中', '采购部', [258000, 198400, 44600, 248000, 33700, 65300, -7600], '完整'],
  ['PRJ2026011', '仓储条码能力改造', '实施交付类', '执行中', '仓储部', [186000, 312600, 42800, 191000, 27800, 53900, 0], '待补折旧'],
  ['PRJ2026012', '客户运维服务提升', '运维服务类', '执行中', '运维服务部', [336000, 52600, 66800, 284000, 31600, 72900, -5000], '待分摊']
];

const money = (value) => Number(value.toFixed(2));
const pct = (value) => `${(value * 100).toFixed(1)}%`;
const sourceMeta = [
  ['服务采购', '服务结算单', 'SS'], ['物资消耗', '物资出库单', 'OUT'], ['费用报销', '费用报销单', 'EXP'],
  ['人工成本', '人工成本归集', 'LAB'], ['折旧摊销', '固定资产折旧', 'DEP'], ['间接费用', '间接费用分摊', 'ALLOC'], ['成本调整', '成本调整单', 'CA']
];

const projectRows = seed.map((item, projectIndex) => {
  const [projectCode, projectName, projectType, projectStatus, costDepartment, amounts, dataCompleteness] = item;
  const directCost = amounts.slice(0, 5).reduce((sum, value) => sum + value, 0);
  const indirectCost = amounts[5];
  const adjustmentAmount = amounts[6];
  const collectedCost = directCost + indirectCost + adjustmentAmount;
  const categoryRows = categories.map((costCategory, index) => ({
    id: `${projectCode}-C${index + 1}`,
    costCategory,
    amount: amounts[index],
    share: pct(Math.abs(amounts[index]) / Math.max(collectedCost, 1)),
    sourceStatus: index === 3 && dataCompleteness === '待补人工' ? '待补录' : index === 4 && dataCompleteness === '待补折旧' ? '待同步' : index === 5 && dataCompleteness === '待分摊' ? '待分摊' : '已归集',
    updatedAt: `2026-09-${String(20 + (projectIndex + index) % 9).padStart(2, '0')} 16:30:00`
  }));
  const sourceRows = sourceMeta.filter((_, index) => amounts[index] !== 0).map(([costCategory, sourceType, prefix], index) => ({
    id: `${projectCode}-S${index + 1}`,
    costDate: `2026-09-${String(3 + (projectIndex * 2 + index * 3) % 25).padStart(2, '0')}`,
    accountingPeriod: '202609', costCategory, sourceType,
    sourceNo: `${prefix}202609${String(projectIndex + 1).padStart(2, '0')}${String(index + 1).padStart(2, '0')}`,
    costDepartment, costObject: projectName,
    attributionMethod: index < 5 ? '直接归集' : index === 5 ? '规则分摊' : '成本调整',
    costAmount: amounts[index],
    voucherNo: index === 2 && dataCompleteness !== '完整' ? '-' : `记-${String(projectIndex + 8).padStart(3, '0')}`,
    financeStatus: index === 3 && dataCompleteness === '待补人工' ? '待接入' : index === 4 && dataCompleteness === '待补折旧' ? '待同步' : index === 5 && dataCompleteness === '待分摊' ? '待分摊' : '已记账'
  }));
  return {
    id: projectCode, company: '昕彤赋能（武汉）设计研究有限公司', year: '2026', periodMonth: '09', yearPeriod: '2026-09', accountingPeriod: '202609', costDate: '2026-09-30',
    projectCode, projectName, projectType, projectStatus, projectManager: ['张伟', '李娜', '周凯', '王敏'][projectIndex % 4], costDepartment,
    serviceCost: amounts[0], materialCost: amounts[1], expenseCost: amounts[2], laborCost: amounts[3], depreciationCost: amounts[4], indirectCost,
    adjustmentAmount, directCost, collectedCost, dataCompleteness, costCategory: categories.filter((_, index) => amounts[index] !== 0), categoryRows, sourceRows
  };
});

const publicCost = [68000, 82000, 56000, 62000, 74000, 70000, 53000, 48000, 51000, 59000, 55000, 64000];
const departmentRows = projectRows.map((project, index) => {
  const publicAmount = publicCost[index];
  const collectedCost = project.collectedCost + publicAmount;
  const publicSource = {
    id: `PUB-${index + 1}`, costDate: '2026-09-30', accountingPeriod: '202609', costCategory: '间接费用', sourceType: '部门公共费用池',
    sourceNo: `POOL202609${String(index + 1).padStart(2, '0')}`, costDepartment: project.costDepartment, costObject: project.costDepartment,
    attributionMethod: '部门归集', costAmount: publicAmount, voucherNo: `记-${String(index + 60).padStart(3, '0')}`, financeStatus: project.dataCompleteness === '未结账' ? '未结账' : '已记账'
  };
  return {
    id: `DEPT${String(index + 1).padStart(3, '0')}`, company: project.company, year: '2026', periodMonth: '09', yearPeriod: '2026-09', accountingPeriod: '202609', costDate: '2026-09-30',
    departmentCode: `D${String(index + 1).padStart(3, '0')}`, departmentName: project.costDepartment,
    organizationScope: index < 8 ? '总部' : '区域组织', departmentManager: ['陈晨', '林峰', '何静', '赵磊'][index % 4],
    serviceCost: project.serviceCost, materialCost: project.materialCost, expenseCost: project.expenseCost,
    laborCost: project.laborCost, depreciationCost: project.depreciationCost, indirectCost: project.indirectCost + publicAmount,
    adjustmentAmount: project.adjustmentAmount, projectAttributedCost: project.collectedCost, publicCost: publicAmount, collectedCost,
    projectCount: 1, dataCompleteness: project.dataCompleteness, costBearingType: ['项目归集', '部门公共成本'], costCategory: project.costCategory,
    projectContributionRows: [{ id: `${project.projectCode}-D`, projectCode: project.projectCode, projectName: project.projectName, projectManager: project.projectManager, projectCost: project.collectedCost, share: pct(project.collectedCost / collectedCost), dataCompleteness: project.dataCompleteness }],
    sourceRows: [...project.sourceRows, publicSource]
  };
});

const sumBy = (rows, code) => rows.reduce((sum, row) => sum + Number(row[code] || 0), 0);
const categoryChartData = (rows) => [
  ['服务采购', 'serviceCost'], ['物资消耗', 'materialCost'], ['费用报销', 'expenseCost'], ['人工成本', 'laborCost'],
  ['折旧摊销', 'depreciationCost'], ['间接费用', 'indirectCost'], ['成本调整', 'adjustmentAmount']
].map(([label, code], index) => ({ label, value: sumBy(rows, code), color: categoryColors[index] }));

const searchField = (code, label, component, options = [], extra = {}) => ({ code, label, component, ...(options.length ? { options } : {}), ...extra });
const sourceColumns = [
  ['costDate', '成本日期', 'date', 132], ['accountingPeriod', '会计期间', 'text', 104], ['costCategory', '成本类别', 'text', 116],
  ['sourceType', '来源单据', 'text', 136], ['sourceNo', '来源单号', 'text', 176], ['costDepartment', '归集部门', 'text', 144],
  ['costObject', '成本对象', 'text', 200], ['attributionMethod', '归集方式', 'text', 112], ['costAmount', '成本金额（元）', 'money', 144],
  ['voucherNo', '凭证号', 'text', 112], ['financeStatus', '财务状态', 'tag', 104]
].map(([code, label, component, width]) => ({ code, label, component, width, editable: false }));
const commonSearch = [
  searchField('company', '所属公司', 'select', ['昕彤赋能（武汉）设计研究有限公司']),
  searchField('accountingPeriod', '会计期间', 'date-range', [], { filterCodes: ['costDate'] })
];
const commonBase = (pageCode, pageName, menuPath, outputPath, regions, overlays, mockData = {}) => ({
  schemaVersion: 'pms-page-schema-v2', policyProfile: 'utility-page', policyVersion: 'pms-policy-v1', domain: 'cost', module: '成本分析',
  pageType: 'dashboard', workflowActions: false, toastEnabled: false, pageCode, pageName, menuPath, template: 'dashboard-page', outputPath,
  businessScenario: '按已归集成本事实分析指定会计期间的成本规模、构成、来源完整性，并穿透至来源单据。',
  resourceReference: { center: 'prototype-resources/index.html', baseline: 'pms-resource-center-v1', pageSamples: ['数据看板页', '标准列表页'], components: ['PageHeader', 'Space', 'ProSearchForm', 'ProStatCard', 'ProChartCard', 'ProTable', 'ProDetailDrawer', 'Descriptions', 'ProTabsDetail', 'EditableTable', 'Tag'] },
  uiConstraints: { noPageSizeSelector: true, desktopOnly: true, noBusinessPageVerticalScroll: true }, pageActions: [], regions, overlays, mockData
});

const projectTotal = sumBy(projectRows, 'collectedCost');
const currentYear = String(new Date().getFullYear());
const currentAccountingPeriod = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const projectSchema = commonBase('project-cost-analysis', '项目成本', '成本分析/项目成本', 'pages/cost/project-cost-analysis.html', [
  { id: 'project-cost-search', component: 'ProSearchForm', labelAlign: 'left', labelWidth: 96, searchPaddingLeft: 16, fields: [
    searchField('accountingPeriodRange', '会计期间范围', 'date-range', [], { rangeGranularity: 'month', startValue: currentAccountingPeriod, endValue: currentAccountingPeriod, filterCodes: ['yearPeriod'] }),
    searchField('projectCode', '项目', 'select', projectRows.map((row) => ({ label: `${row.projectCode} ${row.projectName}`, value: row.projectCode }))),
    searchField('costCategory', '成本类型', 'select', categories)
  ] },
  { id: 'project-cost-trend-chart', component: 'ProChartCard', title: '会计月成本趋势', chartType: 'line', chartWidth: 1200, valueUnit: '万元', data: [
    { label: '4月', value: 2650000 }, { label: '5月', value: 3180000 }, { label: '6月', value: 3960000 }, { label: '7月', value: 4280000 }, { label: '8月', value: 5020000 }, { label: '9月', value: projectTotal }
  ] },
  { id: 'project-cost-table', component: 'ProTable', title: '项目成本汇总', pageSize: 5, showPageSize: true, selectable: false, headerActions: false, rowActions: [], rows: projectRows,
    footerSummary: { label: '合计', columns: ['collectedCost', 'serviceCost', 'materialCost', 'expenseCost', 'laborCost', 'depreciationCost', 'indirectCost'].map((column) => ({ column, precision: 2 })) },
    columns: [
      { code: 'yearPeriod', label: '年度-会计期间', width: 136 },
      { code: 'projectCode', label: '项目编码', component: 'link', link: true, linkAction: 'open', target: 'project-cost-drawer', fixed: 'left', width: 152 },
      { code: 'projectName', label: '项目名称', width: 208 }, { code: 'projectType', label: '项目类型', width: 120 }, { code: 'projectStatus', label: '项目状态', component: 'tag', width: 104 },
      { code: 'projectManager', label: '项目经理', width: 104 },
      ...[['collectedCost', '成本总计'], ['serviceCost', '服务采购'], ['materialCost', '物资消耗'], ['expenseCost', '费用报销'], ['laborCost', '人工成本'], ['depreciationCost', '折旧摊销'], ['indirectCost', '间接费用']].map(([code, label]) => ({ code, label, component: 'money', width: 128 }))
    ] }
], [{
  id: 'project-cost-drawer', component: 'ProDetailDrawer', title: '项目成本明细', bindRowData: true, bindTitleField: 'projectName', actions: [{ code: 'close', label: '关闭' }], children: [
    { component: 'Descriptions', title: '项目成本概览', layoutColumns: 2, fields: [
      { code: 'projectCode', label: '项目编码' }, { code: 'projectName', label: '项目名称' }, { code: 'projectManager', label: '项目经理' }, { code: 'costDepartment', label: '归集部门' },
      { code: 'accountingPeriod', label: '会计期间' }, { code: 'collectedCost', label: '已归集成本（元）' }, { code: 'directCost', label: '直接成本（元）' }, { code: 'indirectCost', label: '间接费用（元）' },
      { code: 'adjustmentAmount', label: '成本调整（元）' }, { code: 'dataCompleteness', label: '数据完整性' }
    ] },
    { component: 'ProTabsDetail', tabs: [
      { key: 'category', label: '成本类别汇总', children: [{ id: 'project-category-detail-table', component: 'EditableTable', title: '成本类别汇总', dataSource: 'categoryRows', pagination: false, showPageSize: false, selectable: false, rowActions: [], columns: [
        { code: 'costCategory', label: '成本类别', editable: false, width: 136 }, { code: 'amount', label: '金额（元）', component: 'money', editable: false, width: 144 }, { code: 'share', label: '占比', editable: false, width: 96 },
        { code: 'sourceStatus', label: '归集状态', component: 'tag', editable: false, width: 112 }, { code: 'updatedAt', label: '最新归集时间', component: 'datetime', editable: false, width: 168 }
      ] }] },
      { key: 'source', label: '成本来源明细', children: [{ id: 'project-source-detail-table', component: 'EditableTable', title: '成本来源明细', dataSource: 'sourceRows', pagination: false, showPageSize: false, selectable: false, rowActions: [], columns: sourceColumns }] }
    ] }
  ]
}]);

const departmentTotal = sumBy(departmentRows, 'collectedCost');
const departmentSchema = commonBase('department-cost-analysis', '部门成本', '成本分析/部门成本', 'pages/cost/department-cost-analysis.html', [
  { id: 'department-cost-search', component: 'ProSearchForm', fields: [
    searchField('accountingPeriodRange', '会计期间范围', 'date-range', [], { span: 2, rangeGranularity: 'month', startValue: currentAccountingPeriod, endValue: currentAccountingPeriod, filterCodes: ['yearPeriod'] }),
    searchField('departmentName', '部门', 'multi-select', departmentRows.map((row) => row.departmentName)),
    searchField('costCategory', '成本类型', 'select', categories)
  ] },
  { id: 'department-cost-trend-chart', component: 'ProChartCard', title: '会计月成本趋势', chartType: 'line', chartWidth: 1200, valueUnit: '万元', data: [
    { label: '4月', value: 2380000 }, { label: '5月', value: 2860000 }, { label: '6月', value: 3510000 }, { label: '7月', value: 4070000 }, { label: '8月', value: 4680000 }, { label: '9月', value: departmentTotal }
  ] },
  { id: 'department-cost-table', component: 'ProTable', title: '部门成本汇总', pageSize: 5, showPageSize: true, selectable: false, headerActions: false, rowActions: [], rows: departmentRows,
    footerSummary: { label: '合计', columns: ['collectedCost', 'serviceCost', 'materialCost', 'expenseCost', 'laborCost', 'depreciationCost', 'indirectCost'].map((column) => ({ column, precision: 2 })) },
    columns: [
      { code: 'yearPeriod', label: '年度-会计期间', width: 136 },
      { code: 'departmentCode', label: '部门编码', component: 'link', link: true, linkAction: 'open', target: 'department-cost-drawer', fixed: 'left', width: 128 },
      { code: 'departmentName', label: '部门名称', width: 152 },
      ...[['collectedCost', '成本总计'], ['serviceCost', '服务采购'], ['materialCost', '物资消耗'], ['expenseCost', '费用报销'], ['laborCost', '人工成本'], ['depreciationCost', '折旧摊销'], ['indirectCost', '间接费用']].map(([code, label]) => ({ code, label, component: 'money', width: 128 }))
    ] }
], [{
  id: 'department-cost-drawer', component: 'ProDetailDrawer', title: '部门成本明细', bindRowData: true, bindTitleField: 'departmentName', actions: [{ code: 'close', label: '关闭' }], children: [
    { component: 'Descriptions', title: '部门成本概览', layoutColumns: 2, fields: [
      { code: 'departmentCode', label: '部门编码' }, { code: 'departmentName', label: '部门名称' }, { code: 'departmentManager', label: '部门负责人' }, { code: 'organizationScope', label: '组织范围' },
      { code: 'accountingPeriod', label: '会计期间' }, { code: 'collectedCost', label: '部门成本合计（元）' }, { code: 'projectAttributedCost', label: '项目归集成本（元）' }, { code: 'publicCost', label: '部门公共成本（元）' },
      { code: 'projectCount', label: '涉及项目数' }, { code: 'dataCompleteness', label: '数据完整性' }
    ] },
    { component: 'ProTabsDetail', tabs: [
      { key: 'project', label: '项目贡献明细', children: [{ id: 'department-project-detail-table', component: 'EditableTable', title: '项目贡献明细', dataSource: 'projectContributionRows', pagination: false, showPageSize: false, selectable: false, rowActions: [], columns: [
        { code: 'projectCode', label: '项目编码', editable: false, width: 152 }, { code: 'projectName', label: '项目名称', editable: false, width: 208 }, { code: 'projectManager', label: '项目经理', editable: false, width: 112 },
        { code: 'projectCost', label: '项目归集成本（元）', component: 'money', editable: false, width: 160 }, { code: 'share', label: '部门成本占比', editable: false, width: 112 }, { code: 'dataCompleteness', label: '数据完整性', component: 'tag', editable: false, width: 112 }
      ] }] },
      { key: 'source', label: '成本来源明细', children: [{ id: 'department-source-detail-table', component: 'EditableTable', title: '成本来源明细', dataSource: 'sourceRows', pagination: false, showPageSize: false, selectable: false, rowActions: [], columns: sourceColumns }] }
    ] }
  ]
}]);

const requestedSchema = process.argv[2];
for (const [file, schema] of [
  ['schemas/pages/cost/project-cost-analysis.json', projectSchema],
  ['schemas/pages/cost/department-cost-analysis.json', departmentSchema]
].filter(([file]) => !requestedSchema || file.includes(`/${requestedSchema}-cost-analysis.json`))) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  console.log(`Schema generated: ${file}`);
}
