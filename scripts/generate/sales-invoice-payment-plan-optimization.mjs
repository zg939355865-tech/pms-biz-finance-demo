import fs from 'node:fs';

const schemaPath = 'schemas/pages/income/sales-invoice.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const detail = schema.regions.find((region) => region.id === 'sales-invoice-detail');
const basic = detail?.tabs?.find((tab) => tab.key === 'basic');

if (!basic) throw new Error('未找到销项开票基础信息页签。');

schema.policyProfile = 'auditable-list-detail';
schema.policyVersion = 'pms-policy-v4';
Object.assign(schema, {
  workflowActions: false,
  approvalOverlay: false,
  detailReviewEnabled: false,
  detailWorkflowLinksEnabled: false,
  saveDraftEnabled: true,
  detailSaveEnabled: true,
  detailSubmitEnabled: true,
  submitNextStatus: '待审核',
  auditPendingStatus: '待审核',
  auditCompletedStatus: '已审核',
  reverseAuditNextStatus: '草稿'
});

// 收入链路脚本的默认列表与已确认的销项开票列表不一致；在同一后置优化中固定，避免重建时回退。
schema.regions = schema.regions.filter((region) => region.id !== 'income-chain');
const search = schema.regions.find((region) => region.id === 'search');
if (search) search.fields = [
  { code: 'invoiceNo', label: '发票号码', component: 'input' },
  { code: 'status', label: '状态', component: 'multi-select', options: ['草稿', '待审核', '已审核', '已作废'] },
  { code: 'invoiceType', label: '类型', component: 'select', options: ['蓝字', '红字'] },
  { code: 'contractName', label: '合同名称', component: 'input' },
  { code: 'projectName', label: '项目名称', component: 'input' },
  { code: 'invoiceDate', label: '业务日期', component: 'date-range' }
];
const invoiceTable = schema.regions.find((region) => region.id === 'invoice-table');
if (invoiceTable) {
  Object.assign(invoiceTable, {
    dataSource: 'invoices', pageSize: 5, showRecordCount: true, showPageSize: false,
    selectable: true, keepOperationColumn: true, operationColumnWidth: 80, minWidth: 1440,
    rowActions: [{ code: 'delete', label: '删除', type: 'link', enabledStatuses: ['草稿'] }],
    columns: [
      { code: 'invoiceNo', label: '发票号码', component: 'link', fixed: 'left', width: 160 },
      { code: 'status', label: '状态', component: 'tag', align: 'center', width: 88 },
      { code: 'invoiceType', label: '类型', component: 'tag', align: 'center', width: 88 },
      { code: 'invoiceDate', label: '发票日期', component: 'date', width: 128 },
      { code: 'invoiceAmount', label: '本次开票金额', component: 'money', align: 'right', width: 136 },
      { code: 'contractName', label: '合同名称', component: 'text', width: 220 },
      { code: 'projectName', label: '项目名称', component: 'text', width: 220 },
      { code: 'customer', label: '客户名称', component: 'text', width: 180 },
      { code: 'creator', label: '创建人', component: 'text', width: 128 },
      { code: 'createdAt', label: '创建时间', component: 'datetime', width: 168 }
    ]
  });
}
schema.pageActions = [
  { code: 'audit', label: '审核', type: 'default', requiresSelection: true, requiresSingleSelection: true, target: 'audit-invoice-modal' },
  { code: 'reverse-audit', label: '反审核', type: 'default', requiresSelection: true, requiresSingleSelection: true, target: 'reverse-audit-invoice-modal' },
  { code: 'void', label: '作废', type: 'danger', ghost: true, requiresSelection: true, requiresSingleSelection: true, target: 'void-invoice-modal' },
  { code: 'batch-delete', label: '批量删除', type: 'danger', ghost: true, requiresSelection: true },
  { code: 'create', label: '新增销项开票', type: 'primary', target: 'sales-invoice-detail' }
];

const fields = [
  { code: 'invoiceNo', label: '发票号码', component: 'input', required: true },
  { code: 'status', label: '状态', component: 'input', readonly: true, value: '草稿' },
  { code: 'invoiceType', label: '类型', component: 'select', required: true, options: ['蓝字', '红字'], value: '蓝字' },
  { code: 'invoiceDate', label: '发票日期', component: 'date', required: true, defaultToday: true },
  { code: 'contractName', label: '合同名称', component: 'picker', target: 'contract-picker', required: true },
  { code: 'contractAmount', label: '合同金额', component: 'number', readonly: true, precision: 2 },
  { code: 'projectName', label: '项目名称', component: 'picker', target: 'project-picker', required: true },
  { code: 'customer', label: '客户名称', component: 'input', readonly: true },
  { code: 'invoiceAmount', label: '本次开票金额', component: 'number', readonly: true, precision: 2, summarySource: { table: 'invoiceBasis', column: 'currentInvoiceAmount', precision: 2 } },
  { code: 'creator', label: '创建人', component: 'input', readonly: true, value: '开票专员-周凯' },
  { code: 'createdAt', label: '创建时间', component: 'input', readonly: true },
  { code: 'reviewer', label: '审核人', component: 'input', readonly: true },
  { code: 'reviewedAt', label: '审核时间', component: 'input', readonly: true },
  { code: 'company', label: '所属公司', component: 'input', readonly: true, value: '昕彤赋能（武汉）' },
  { code: 'remark', label: '备注', component: 'input' }
];

const invoiceBasis = {
  id: 'invoice-basis-table',
  component: 'EditableTable',
  title: '开票依据',
  showTitle: true,
  dataSource: 'invoiceBasis',
  pagination: false,
  selectable: true,
  keepOperationColumn: true,
  operationColumnWidth: 88,
  minWidth: 1120,
  footerSummary: {
    label: '合计',
    columns: [
      { column: 'netInvoicedAmount', precision: 2 },
      { column: 'uninvoicedAmount', precision: 2 },
      { column: 'currentInvoiceAmount', precision: 2 }
    ]
  },
  actions: [
    { code: 'open-payment-plan-picker', label: '选择收款计划', type: 'default', target: 'payment-plan-picker', requiresDetailFields: ['contractName'] },
    { code: 'batch-delete', label: '删除选中明细', type: 'danger', ghost: true, requiresSelection: true }
  ],
  rowActions: [{ code: 'remove-row', label: '删除', type: 'link' }],
  columns: [
    { code: 'sequence', label: '序号', component: 'text', editable: false, align: 'center', width: 72, fixed: 'left' },
    { code: 'planName', label: '计划名称', component: 'text', editable: false, width: 240 },
    { code: 'planAmount', label: '计划金额', component: 'money', editable: false, align: 'right', width: 144 },
    { code: 'netInvoicedAmount', label: '已净开票金额', component: 'money', editable: false, align: 'right', width: 152 },
    { code: 'uninvoicedAmount', label: '未开票金额', component: 'money', editable: false, align: 'right', width: 144 },
    {
      code: 'currentInvoiceAmount', label: '本次开票金额', component: 'number', precision: 2, align: 'right', width: 152,
      signByConditions: {
        negativeWhen: [{ scope: 'detail', field: 'invoiceType', value: '红字' }],
        minimumAbsolute: 0.01
      }
    }
  ]
};

basic.children = [
  { component: 'DetailForm', showTitle: false, layoutColumns: 3, fields },
  invoiceBasis
];
schema.uiConstraints = { ...(schema.uiConstraints || {}), tabSectionTitles: true };

schema.detailOnlyFields = ['planName', 'planAmount', 'netInvoicedAmount', 'uninvoicedAmount', 'currentInvoiceAmount'];
schema.pageActions = (schema.pageActions || []).map((action) => action.code === 'create'
  ? { ...action, target: 'sales-invoice-detail' }
  : action);
schema.overlays = (schema.overlays || []).filter((overlay) => !['approval-modal', 'blue-invoice-picker', 'payment-plan-picker'].includes(overlay.id));
[
  ['audit-invoice-modal', '确认销项开票审核', '已审核'],
  ['reverse-audit-invoice-modal', '确认销项开票反审核', '待审核'],
  ['void-invoice-modal', '确认作废销项发票', '已作废']
].forEach(([id, title, nextStatus]) => {
  if (!schema.overlays.some((overlay) => overlay.id === id)) schema.overlays.push({
    id, component: 'ProModalForm', title,
    fields: [{ code: 'comment', label: '处理说明', component: 'textarea', required: true }],
    actions: [{ code: 'close', label: '取消' }, { code: 'confirm-status', label: '确认', type: 'primary', nextStatus }]
  });
});
schema.overlays.push({
  id: 'payment-plan-picker',
  component: 'ProDataSelectModal',
  title: '选择收款计划',
  size: 'wide',
  selectionMode: 'multiple',
  appendSelectionTo: 'invoiceBasis',
  contextFilterMap: { contractName: 'contractName' },
  children: [
    { component: 'ProSearchForm', fields: [{ code: 'planName', label: '计划名称', component: 'input' }] },
    {
      component: 'ProTable', dataSource: 'availablePaymentPlans', pagination: false, showRecordCount: true, showPageSize: false,
      selectable: true, selectionMode: 'multiple', keepOperationColumn: false, rowActions: [], minWidth: 760,
      columns: [
        { code: 'planName', label: '计划名称', component: 'text', width: 260 },
        { code: 'planAmount', label: '计划金额', component: 'money', align: 'right', width: 152 },
        { code: 'netInvoicedAmount', label: '已净开票金额', component: 'money', align: 'right', width: 152 },
        { code: 'uninvoicedAmount', label: '未开票金额', component: 'money', align: 'right', width: 152 }
      ]
    }
  ],
  actions: [{ code: 'close', label: '取消' }, { code: 'confirm-selection', label: '确认选择', type: 'primary', requiresSelection: true }]
});

schema.mockData = schema.mockData || {};
const invoiceStatuses = ['草稿', '待审核', '已审核', '已作废'];
schema.mockData.invoices = Array.from({ length: 12 }, (_, index) => {
  const source = schema.mockData.invoices?.[index] || {};
  const sequence = String(index + 1).padStart(4, '0');
  const isFirstContract = index % 2 === 0;
  const amount = 80000 + index * 10000;
  return {
    id: source.id || `SI${index + 1}`,
    invoiceNo: source.invoiceNo || `INV202609${sequence}`,
    status: invoiceStatuses[index % invoiceStatuses.length],
    invoiceType: index === 4 ? '红字' : '蓝字',
    invoiceDate: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
    invoiceAmount: index === 4 ? -amount : amount,
    contractName: isFirstContract ? '水务智能化年度框架合作协议' : '数字孪生平台服务合同',
    projectName: isFirstContract ? '武汉东湖水厂智能化改造项目' : '长沙水厂AI节能控制项目',
    customer: isFirstContract ? '武汉东湖水务有限公司' : '长沙水务有限公司',
    creator: '开票专员-周凯',
    createdAt: `2026-09-04 10:${String(index + 1).padStart(2, '0')}:00`
  };
});
schema.mockData.invoiceBasis = [];
schema.mockData.availablePaymentPlans = [
  { id: 'PLAN-001', contractName: '水务智能化年度框架合作协议', planName: '第一期预付款计划', planAmount: 240000, netInvoicedAmount: 60000, uninvoicedAmount: 180000, currentInvoiceAmount: 0 },
  { id: 'PLAN-002', contractName: '水务智能化年度框架合作协议', planName: '第二期阶段验收计划', planAmount: 480000, netInvoicedAmount: 180000, uninvoicedAmount: 300000, currentInvoiceAmount: 0 },
  { id: 'PLAN-003', contractName: '水务智能化年度框架合作协议', planName: '第三期终验收计划', planAmount: 480000, netInvoicedAmount: 0, uninvoicedAmount: 480000, currentInvoiceAmount: 0 },
  { id: 'PLAN-004', contractName: '数字孪生平台服务合同', planName: '第一期合同款计划', planAmount: 300000, netInvoicedAmount: 80000, uninvoicedAmount: 220000, currentInvoiceAmount: 0 },
  { id: 'PLAN-005', contractName: '数字孪生平台服务合同', planName: '第二期验收款计划', planAmount: 300000, netInvoicedAmount: 0, uninvoicedAmount: 300000, currentInvoiceAmount: 0 }
];
schema.mockData.availableContracts = [
  { contractNo: 'SR20260716001', contractName: '水务智能化年度框架合作协议', contractAmount: 1200000, projectName: '武汉东湖水厂智能化改造项目', company: '昕彤赋能（武汉）', customer: '武汉东湖水务有限公司' },
  { contractNo: 'SR20260627005', contractName: '数字孪生平台服务合同', contractAmount: 600000, projectName: '长沙水厂AI节能控制项目', company: '昕彤赋能（长沙）', customer: '长沙水务有限公司' }
];
const contractPicker = schema.overlays.find((overlay) => overlay.id === 'contract-picker');
if (contractPicker) contractPicker.selectionMap = {
  contractNo: 'contractNo', contractName: 'contractName', contractAmount: 'contractAmount',
  projectName: 'projectName', company: 'company', customer: 'customer'
};
schema.rules = [
  {
    id: 'R01', action: 'submit', type: 'detailTableSignedAbsoluteAmountLessThanOrEqualField', table: 'invoiceBasis',
    field: 'currentInvoiceAmount', maximumField: 'uninvoicedAmount', sign: 'positive', when: { invoiceType: '蓝字' },
    message: '蓝字本次开票金额必须为正数，且不得超过对应收款计划的未开票金额'
  },
  {
    id: 'R02', action: 'submit', type: 'detailTableSignedAbsoluteAmountLessThanOrEqualField', table: 'invoiceBasis',
    field: 'currentInvoiceAmount', maximumField: 'netInvoicedAmount', sign: 'negative', when: { invoiceType: '红字' },
    message: '红字本次开票金额必须为负数，且绝对值不得超过对应收款计划的已净开票金额'
  }
];
schema.relations = [{ from: '收入合同/收款计划', to: '销项开票', type: '合同开票依据' }];

fs.writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log('Sales invoice payment-plan optimization generated.');
