import fs from 'node:fs';
import path from 'node:path';

const company = '昕彤赋能（武汉）设计研究有限公司';
const projects = [
  ['PRJ2026001', '华中智能工厂一期', 'D001', '项目交付部'],
  ['PRJ2026002', '研发知识中台建设', 'D002', '技术研发部'],
  ['PRJ2026003', '智慧园区运营平台', 'D003', '武汉交付部'],
  ['PRJ2026004', 'AI客服场景孵化', 'D004', 'AI产品部'],
  ['PRJ2026005', '视觉算法能力升级', 'D005', '算法研发部'],
  ['PRJ2026006', '东莞产线数字化改造', 'D006', '东莞交付部'],
  ['PRJ2026007', '年度市场品牌推广', 'D007', '市场营销部'],
  ['PRJ2026008', '总部协同管理优化', 'D008', '综合管理部'],
  ['PRJ2026009', '业财数据治理专项', 'D009', '财务部'],
  ['PRJ2026010', '供应链协同平台', 'D010', '采购部'],
  ['PRJ2026011', '仓储条码能力改造', 'D011', '仓储部'],
  ['PRJ2026012', '客户运维服务提升', 'D012', '运维服务部']
];
const statuses = ['草稿', '待审核', '已审核', '草稿', '待审核', '已审核', '草稿', '待审核', '已审核', '草稿', '待审核', '已审核'];
const amounts = [68000, 96000, 125000, 52000, 88000, 146000, 45000, 78000, 112000, 64000, 84000, 138000];

const sourceRows = projects.map((project, index) => {
  const management = index % 2 === 1;
  const adjustmentType = management ? '管理费用分摊调整' : '人工成本调整';
  const originalAmount = amounts[index] * 4;
  const adjustedAmount = index % 3 === 0 ? amounts[index] / 2 : amounts[index] / 4;
  const pendingOccupiedAmount = index % 4 === 1 ? amounts[index] / 4 : 0;
  return {
    id: `SRC${String(index + 1).padStart(3, '0')}`,
    company,
    accountingPeriod: index > 9 ? '202608' : '202609',
    adjustmentType,
    sourceCostRecordNo: `${management ? 'POOL' : 'LAB'}202609${String(index + 1).padStart(3, '0')}`,
    sourceCostCategory: management ? '间接费用' : '人工成本',
    sourceDocumentType: management ? '部门公共费用池' : '人工成本归集',
    sourceDocumentNo: management ? `MGMT202609${String(index + 1).padStart(3, '0')}` : `LAB202609${String(index + 1).padStart(3, '0')}`,
    sourceBearingType: management ? '部门' : '项目',
    sourceProject: management ? '-' : `${project[0]} ${project[1]}`,
    sourceDepartment: `${project[2]} ${project[3]}`,
    originalAmount,
    adjustedAmount,
    pendingOccupiedAmount,
    availableBalance: originalAmount - adjustedAmount - pendingOccupiedAmount,
    suggestedTransferAmount: amounts[index]
  };
});

const attachmentsFor = (index) => [{
  id: `ATT${String(index + 1).padStart(3, '0')}`,
  name: index % 2 ? '管理费用分摊依据.xlsx' : '人工成本调整说明.pdf',
  size: index % 2 ? '36.8 KB' : '428 KB',
  uploader: ['李婷', '陈晨', '林峰'][index % 3],
  uploadedAt: `2026-09-${String(4 + index).padStart(2, '0')} 10:20:30`
}];

const adjustmentDocuments = projects.map((project, index) => {
  const source = sourceRows[index];
  const amount = amounts[index];
  const firstTarget = projects[(index + 1) % projects.length];
  const secondTarget = projects[(index + 2) % projects.length];
  const firstAmount = Math.round(amount * 0.6 * 100) / 100;
  const allocationDetails = [
    {
      id: `AL${index + 1}-01`, costBearingType: '项目', targetCostObject: `${firstTarget[0]} ${firstTarget[1]}`,
      targetCostDepartment: `${firstTarget[2]} ${firstTarget[3]}`, allocationAmount: firstAmount, allocationRatio: '60.00%', lineRemark: '按本月实际投入占比分摊'
    },
    {
      id: `AL${index + 1}-02`, costBearingType: index % 2 ? '部门' : '项目', targetCostObject: index % 2 ? `${secondTarget[2]} ${secondTarget[3]}` : `${secondTarget[0]} ${secondTarget[1]}`,
      targetCostDepartment: `${secondTarget[2]} ${secondTarget[3]}`, allocationAmount: amount - firstAmount, allocationRatio: '40.00%', lineRemark: '平衡剩余分摊金额'
    }
  ];
  const status = statuses[index];
  return {
    id: `CA${String(index + 1).padStart(3, '0')}`,
    adjustmentNo: `CBTZ202609${String(index + 1).padStart(4, '0')}`,
    status,
    company,
    accountingPeriod: source.accountingPeriod,
    adjustmentDate: `2026-${source.accountingPeriod.slice(4, 6)}-${String(3 + index * 2 > 28 ? 28 : 3 + index * 2).padStart(2, '0')}`,
    adjustmentType: source.adjustmentType,
    sourceCostObject: source.sourceBearingType === '项目' ? project[1] : `${project[3]}公共费用池`,
    adjustmentAmount: amount,
    targetCount: allocationDetails.length,
    financialStatus: status === '已审核' ? index === 8 ? '同步失败' : '已同步' : '未同步',
    voucherNo: status === '已审核' && index !== 8 ? `记-${String(index + 21).padStart(3, '0')}` : '',
    creator: ['李婷', '陈晨', '林峰'][index % 3],
    createdAt: `2026-09-${String(3 + index).padStart(2, '0')} 09:18:26`,
    auditUser: status === '已审核' ? ['周凯', '王敏'][index % 2] : '',
    auditTime: status === '已审核' ? `2026-09-${String(4 + index).padStart(2, '0')} 15:36:18` : '',
    adjustmentReason: source.adjustmentType === '人工成本调整' ? '依据实际工时重新分配本期人工成本。' : '依据项目投入占比调整本期管理费用分摊。',
    sourceCostRecordNo: source.sourceCostRecordNo,
    sourceCostCategory: source.sourceCostCategory,
    sourceDocumentType: source.sourceDocumentType,
    sourceDocumentNo: source.sourceDocumentNo,
    sourceBearingType: source.sourceBearingType,
    sourceProject: source.sourceProject,
    sourceDepartment: source.sourceDepartment,
    originalAmount: source.originalAmount,
    adjustedAmount: source.adjustedAmount,
    pendingOccupiedAmount: source.pendingOccupiedAmount,
    availableBalance: source.availableBalance,
    sourceTransferAmount: amount,
    unallocatedAmount: 0,
    allocationDetails,
    attachments: attachmentsFor(index)
  };
});

const schema = {
  schemaVersion: 'pms-page-schema-v2',
  policyProfile: 'workflow-list-detail',
  policyVersion: 'pms-policy-v1',
  pageCode: 'cost-adjustment',
  pageName: '成本调整单',
  domain: 'cost',
  module: '成本分析',
  menuPath: '成本分析/成本调整单',
  pageType: 'list-detail',
  template: 'tabs-detail-page',
  outputPath: 'pages/cost/cost-adjustment.html',
  businessScenario: '对人工成本和管理费用在项目、部门之间执行平衡式调整，审核后来源调减与目标调增同时生效且不修改原始业务事实。',
  workflowActions: true,
  saveDraftEnabled: true,
  detailSaveEnabled: true,
  saveActionLabel: '保存草稿',
  detailSubmitEnabled: true,
  submitActionLabel: '提交',
  submitNextStatus: '待审核',
  detailReviewEnabled: true,
  detailWorkflowLinksEnabled: true,
  detailEditableStatuses: ['草稿'],
  primaryDeleteEnabledStatuses: ['草稿'],
  detailOnlyFields: ['costBearingType', 'targetCostObject', 'targetCostDepartment', 'allocationAmount', 'allocationRatio', 'lineRemark'],
  toastEnabled: false,
  uiConstraints: { listPageSize: 5, detailFormColumns: 3, noPageSizeSelector: true, desktopOnly: true, noBusinessPageVerticalScroll: true },
  resourceReference: {
    center: 'prototype-resources/index.html', baseline: 'pms-resource-center-v1',
    pageSamples: ['列表详情一体', '业务表单', '数据选择弹窗'],
    components: ['PageHeader', 'ProSearchForm', 'ProTable', 'ProTabsDetail', 'DetailForm', 'EditableTable', 'AmountSummary', 'ProUploadList', 'ProDataSelectModal', 'ApprovalPanel', 'Modal', 'Result', 'Tag']
  },
  pageActions: [
    { code: 'batch-delete', label: '批量删除', type: 'danger', ghost: true, requiresSelection: true },
    { code: 'create', label: '新增', type: 'primary', target: 'cost-adjustment-detail' }
  ],
  detailActions: [
    { code: 'reverse-audit', label: '反审核', target: 'reverse-cost-adjustment-modal', statuses: ['已审核'], allowWhenReadOnly: true }
  ],
  regions: [
    {
      id: 'cost-adjustment-search', component: 'ProSearchForm', collapsible: false,
      fields: [
        { code: 'adjustmentNo', label: '调整单号', component: 'input' },
        { code: 'status', label: '状态', component: 'select', options: ['草稿', '待审核', '已审核'] },
        { code: 'company', label: '所属公司', component: 'select', options: [company] },
        { code: 'accountingPeriod', label: '会计期间', component: 'select', options: ['202609', '202608'] },
        { code: 'adjustmentType', label: '调整类型', component: 'select', options: ['人工成本调整', '管理费用分摊调整'] },
        { code: 'adjustmentDate', label: '调整日期', component: 'date-range' },
        { code: 'sourceProject', label: '来源项目', component: 'input' },
        { code: 'sourceDepartment', label: '来源成本部门', component: 'select', options: projects.map((item) => item[3]) }
      ]
    },
    {
      id: 'cost-adjustment-table', component: 'ProTable', title: '成本调整单列表', dataSource: 'adjustments', pageSize: 5,
      statusCode: 'status', representativeByStatus: false, showRecordCount: true, showPageSize: true, selectable: true,
      keepOperationColumn: true, operationColumnWidth: 96,
      rowActions: [{ code: 'delete', label: '删除', type: 'link', enabledStatuses: ['草稿'] }],
      columns: [
        { code: 'adjustmentNo', label: '调整单号', component: 'link', fixed: 'left', width: 176 },
        { code: 'status', label: '状态', component: 'tag', align: 'center', width: 104 },
        { code: 'company', label: '所属公司', component: 'text', width: 220 },
        { code: 'accountingPeriod', label: '会计期间', component: 'text', width: 104 },
        { code: 'adjustmentDate', label: '调整日期', component: 'date', width: 136 },
        { code: 'adjustmentType', label: '调整类型', component: 'text', width: 152 },
        { code: 'sourceCostObject', label: '来源成本对象', component: 'text', width: 200 },
        { code: 'adjustmentAmount', label: '调整金额（元）', component: 'money', width: 144 },
        { code: 'targetCount', label: '目标数量', component: 'number', width: 104 },
        { code: 'financialStatus', label: '财务回写状态', component: 'tag', align: 'center', width: 120 },
        { code: 'creator', label: '创建人', component: 'text', width: 112 },
        { code: 'createdAt', label: '创建时间', component: 'datetime', width: 168 }
      ]
    },
    {
      id: 'cost-adjustment-detail', component: 'ProTabsDetail', tabs: [
        {
          key: 'adjustment-detail', label: '调整明细', children: [
            {
              id: 'cost-adjustment-basic', component: 'DetailForm', showTitle: false, layoutColumns: 3,
              fields: [
                { code: 'adjustmentNo', label: '调整单号', component: 'input', readonly: true },
                { code: 'status', label: '状态', component: 'select', readonly: true, preserveOnCreate: true, value: '草稿', options: ['草稿', '待审核', '已审核'] },
                { code: 'company', label: '所属公司', component: 'select', required: true, preserveOnCreate: true, value: company, options: [company] },
                { code: 'accountingPeriod', label: '会计期间', component: 'select', required: true, preserveOnCreate: true, value: '202609', options: ['202609'] },
                { code: 'adjustmentDate', label: '调整日期', component: 'date', required: true, defaultToday: true, preserveOnCreate: true, value: '2026-09-10' },
                { code: 'adjustmentType', label: '调整类型', component: 'select', required: true, options: ['人工成本调整', '管理费用分摊调整'] },
                { code: 'financialStatus', label: '财务回写状态', component: 'select', readonly: true, valueByStatus: { 草稿: '未同步', 待审核: '未同步', 已审核: '已同步' }, options: ['未同步', '已同步', '同步失败'] },
                { code: 'voucherNo', label: '财务凭证号', component: 'input', readonly: true },
                { code: 'creator', label: '创建人', component: 'input', readonly: true, preserveOnCreate: true, value: '李婷' },
                { code: 'createdAt', label: '创建时间', component: 'input', readonly: true },
                { code: 'auditUser', label: '审核人', component: 'input', readonly: true },
                { code: 'auditTime', label: '审核时间', component: 'input', readonly: true },
                { code: 'adjustmentReason', label: '调整原因', component: 'input', required: true, placeholder: '请输入调整原因，最多500字' }
              ]
            },
            {
              id: 'source-cost-form', component: 'DetailForm', title: '来源成本与金额平衡', layoutColumns: 3,
              fields: [
                { code: 'sourceCostRecordNo', label: '来源成本记录号', component: 'picker', inputReadonly: true, required: true, actionCode: 'open', actionLabel: '选择', target: 'source-cost-picker' },
                { code: 'sourceCostCategory', label: '来源成本类别', component: 'input', readonly: true },
                { code: 'sourceDocumentType', label: '来源单据类型', component: 'input', readonly: true },
                { code: 'sourceDocumentNo', label: '来源单据号', component: 'input', readonly: true },
                { code: 'sourceBearingType', label: '来源承担类型', component: 'input', readonly: true },
                { code: 'sourceProject', label: '来源项目', component: 'input', readonly: true },
                { code: 'sourceDepartment', label: '来源成本部门', component: 'input', readonly: true },
                { code: 'originalAmount', label: '来源原始金额', component: 'number', readonly: true, precision: 2 },
                { code: 'adjustedAmount', label: '已调整金额', component: 'number', readonly: true, precision: 2 },
                { code: 'pendingOccupiedAmount', label: '待审核占用金额', component: 'number', readonly: true, precision: 2 },
                { code: 'availableBalance', label: '可调整余额', component: 'number', readonly: true, precision: 2 },
                { code: 'sourceTransferAmount', label: '本次调减金额', component: 'number', required: true, min: 0.01, precision: 2 },
                { code: 'adjustmentAmount', label: '目标分摊合计', component: 'number', readonly: true, precision: 2, summarySource: { table: 'allocationDetails', column: 'allocationAmount', precision: 2 } },
                { code: 'unallocatedAmount', label: '未分摊差额', component: 'number', readonly: true, precision: 2, calculatedBy: { type: 'difference', minuendField: 'sourceTransferAmount', subtrahendField: 'adjustmentAmount', precision: 2 } }
              ]
            },
            {
              id: 'allocation-details-table', component: 'EditableTable', title: '目标分摊明细', dataSource: 'allocationDetails', pagination: false,
              selectable: true, keepOperationColumn: true, operationColumnWidth: 96, minWidth: 1280,
              actions: [
                { code: 'add-row', label: '新增目标', type: 'primary' },
                { code: 'batch-delete', label: '删除选中明细', type: 'danger', ghost: true, requiresSelection: true }
              ],
              rowActions: [{ code: 'remove-row', label: '删除', type: 'link' }],
              footerSummary: { label: '目标分摊合计', columns: [{ column: 'allocationAmount', precision: 2 }] },
              columns: [
                { code: 'sequence', label: '序号', component: 'text', editable: false, align: 'center', fixed: 'left', width: 72 },
                { code: 'costBearingType', label: '成本承担类型', component: 'select', required: true, options: ['项目', '部门'], width: 136 },
                { code: 'targetCostObject', label: '目标成本对象', component: 'select', required: true, options: projects.flatMap((item) => [`${item[0]} ${item[1]}`, `${item[2]} ${item[3]}`]), width: 240 },
                { code: 'targetCostDepartment', label: '目标成本部门', component: 'select', required: true, options: projects.map((item) => `${item[2]} ${item[3]}`), width: 176 },
                { code: 'allocationAmount', label: '分摊金额（元）', component: 'number', required: true, min: 0.01, precision: 2, width: 152 },
                { code: 'allocationRatio', label: '分摊比例', component: 'input', editable: false, width: 112 },
                { code: 'lineRemark', label: '明细备注', component: 'input', width: 240 }
              ]
            },
            {
              component: 'AmountSummary', sourceTable: 'allocation-details-table', items: [
                { label: '目标分摊金额', column: 'allocationAmount', value: '¥0.00', help: '必须与本次调减金额一致' }
              ]
            }
          ]
        },
        {
          key: 'attachments', label: '附件', children: [
            {
              id: 'cost-adjustment-attachments', component: 'ProUploadList', showTitle: false, inheritDetailEditability: true,
              dataSource: 'attachments', keepOperationColumn: true, operationColumnWidth: 96,
              rowActions: [{ code: 'remove-row', label: '删除', type: 'link' }],
              columns: [
                { code: 'sequence', label: '序号', component: 'text', align: 'center', fixed: 'left', width: 72 },
                { code: 'name', label: '文件名', component: 'text', width: 300 },
                { code: 'size', label: '大小', component: 'text', width: 100 },
                { code: 'uploader', label: '上传人', component: 'text', width: 128 },
                { code: 'uploadedAt', label: '上传时间', component: 'datetime', width: 168 }
              ]
            }
          ]
        }
      ]
    }
  ],
  overlays: [
    {
      id: 'source-cost-picker', component: 'ProDataSelectModal', title: '选择来源成本', size: 'wide',
      selectionMap: {
        sourceCostRecordNo: 'sourceCostRecordNo', sourceCostCategory: 'sourceCostCategory', sourceDocumentType: 'sourceDocumentType',
        sourceDocumentNo: 'sourceDocumentNo', sourceBearingType: 'sourceBearingType', sourceProject: 'sourceProject', sourceDepartment: 'sourceDepartment',
        originalAmount: 'originalAmount', adjustedAmount: 'adjustedAmount', pendingOccupiedAmount: 'pendingOccupiedAmount', availableBalance: 'availableBalance', sourceTransferAmount: 'suggestedTransferAmount'
      },
      clearTablesOnConfirm: ['allocationDetails'],
      contextFilterMap: { company: 'company', accountingPeriod: 'accountingPeriod', adjustmentType: 'adjustmentType' },
      children: [
        {
          id: 'source-cost-picker-search', component: 'ProSearchForm', collapsible: false,
          fields: [
            { code: 'sourceCostRecordNo', label: '来源记录号', component: 'input' },
            { code: 'sourceCostCategory', label: '成本类别', component: 'select', options: ['人工成本', '间接费用'] },
            { code: 'sourceDocumentNo', label: '来源单据号', component: 'input' },
            { code: 'sourceBearingType', label: '承担类型', component: 'select', options: ['项目', '部门'] },
            { code: 'sourceProject', label: '来源项目', component: 'input' },
            { code: 'sourceDepartment', label: '来源成本部门', component: 'input' }
          ]
        },
        {
          id: 'available-source-cost-table', component: 'ProTable', dataSource: 'availableCosts', pageSize: 5, showRecordCount: true, showPageSize: true,
          selectable: true, selectionMode: 'single', rowActions: [],
          columns: [
            { code: 'sourceCostRecordNo', label: '来源记录号', component: 'text', width: 176 },
            { code: 'sourceCostCategory', label: '成本类别', component: 'text', width: 112 },
            { code: 'sourceDocumentType', label: '来源单据类型', component: 'text', width: 144 },
            { code: 'sourceDocumentNo', label: '来源单据号', component: 'text', width: 176 },
            { code: 'sourceBearingType', label: '承担类型', component: 'text', width: 104 },
            { code: 'sourceProject', label: '来源项目', component: 'text', width: 220 },
            { code: 'sourceDepartment', label: '来源成本部门', component: 'text', width: 176 },
            { code: 'originalAmount', label: '原始金额', component: 'money', width: 136 },
            { code: 'adjustedAmount', label: '已调整金额', component: 'money', width: 136 },
            { code: 'pendingOccupiedAmount', label: '待审核占用', component: 'money', width: 136 },
            { code: 'availableBalance', label: '可调整余额', component: 'money', width: 136 }
          ]
        }
      ],
      actions: [
        { code: 'close', label: '取消' },
        { code: 'confirm-source-cost', label: '确认选择', type: 'primary', requiresSelection: true }
      ]
    },
    {
      id: 'approval-modal', component: 'Modal', title: '成本调整审核', children: [
        {
          component: 'ApprovalPanel', fields: [{ code: 'approvalOpinion', label: '审核意见', component: 'textarea', required: false }],
          actions: [
            { code: 'confirm-status', label: '驳回', type: 'danger', nextStatus: '草稿', fieldUpdates: { auditUser: '', auditTime: '' } },
            { code: 'confirm-status', label: '审核通过', type: 'primary', nextStatus: '已审核', fieldUpdates: { auditUser: '$currentUser', auditTime: '$currentDateTime', financialStatus: '未同步' } }
          ]
        }
      ], actions: [{ code: 'close', label: '取消' }]
    },
    {
      id: 'reverse-cost-adjustment-modal', component: 'Modal', title: '确认反审核', children: [
        { component: 'Result', status: 'warning', title: '确认撤销本次成本调整？', description: '系统将撤销来源调减和目标调增，状态回到草稿。' }
      ],
      actions: [
        { code: 'close', label: '取消' },
        { code: 'confirm-status', label: '确认反审核', type: 'danger', nextStatus: '草稿', fieldUpdates: { auditUser: '', auditTime: '', financialStatus: '未同步', voucherNo: '' } }
      ]
    }
  ],
  interactions: [
    { trigger: 'sourceCost.select', effect: '按所属公司、会计期间和调整类型筛选可调整来源，选择后带出余额并清空原目标分摊明细。' },
    { trigger: 'allocationAmount.change', effect: '实时汇总目标分摊金额并计算未分摊差额。' },
    { trigger: 'submit.click', effect: '校验来源余额、目标行和分摊平衡后进入待审核。' },
    { trigger: 'approve.click', effect: '来源调减和目标调增同时生效，整单净额保持为零。' }
  ],
  rules: [
    { id: 'R01', action: 'submit', type: 'fieldRequired', field: 'sourceCostRecordNo', message: '请选择来源成本' },
    { id: 'R02', action: 'submit', type: 'fieldMinimum', field: 'sourceTransferAmount', minimum: 0.01, message: '本次调减金额必须大于0' },
    { id: 'R03', action: 'submit', type: 'fieldLessThanOrEqualField', field: 'sourceTransferAmount', maximumField: 'availableBalance', message: '本次调减金额不能超过可调整余额' },
    { id: 'R04', action: 'submit', type: 'tableMinimumRows', table: 'allocationDetails', minimum: 1, message: '请至少维护一条目标分摊明细' },
    { id: 'R05', action: 'submit', type: 'tableColumnUnique', table: 'allocationDetails', column: 'targetCostObject', message: '目标成本对象不能重复' },
    { id: 'R06', action: 'submit', type: 'tableColumnSumEqualsField', table: 'allocationDetails', column: 'allocationAmount', field: 'sourceTransferAmount', tolerance: 0.01, message: '目标分摊金额合计必须等于本次调减金额' },
    { id: 'R07', description: '调整原因和至少一个附件为提交必填；已审核调整形成来源负向、目标正向的同一调整事实，不修改原始业务单据。' }
  ],
  relations: [
    { from: '来源成本记录', to: '成本调整单', type: '成本参照', description: '选择可调整余额大于0的已确认成本事实或成本池。' },
    { from: '成本调整单', to: '项目成本分析/部门成本分析', type: '审核生效', description: '审核后来源调减与目标调增进入同一成本分析事实。' }
  ],
  mockData: { adjustments: adjustmentDocuments, availableCosts: sourceRows, attachments: adjustmentDocuments[0].attachments }
};

const outputPath = 'schemas/pages/cost/cost-adjustment.json';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log(`Schema generated: ${outputPath}`);
