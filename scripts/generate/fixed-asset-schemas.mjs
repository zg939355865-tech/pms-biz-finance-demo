import { writeFileSync, mkdirSync } from 'node:fs';

const outDir = 'schemas/pages/fixed-asset';
mkdirSync(outDir, { recursive: true });

const componentNames = ['PageHeader', 'ProSearchForm', 'ProTable', 'ProTabsDetail', 'DetailForm', 'EditableTable', 'ProDataSelectModal', 'Modal', 'Tag'];
const resourceReference = (samples) => ({ center: 'prototype-resources/index.html', baseline: 'pms-resource-center-v1', pageSamples: samples, components: componentNames });
const field = (code, label, component = 'input', extra = {}) => ({ code, label, component, ...extra });
const col = (code, label, component = 'text', extra = {}) => ({ code, label, component, ...extra });
const deleteAction = { code: 'delete', label: '删除', type: 'link', enabledStatuses: ['草稿'] };
const tableBase = (id, dataSource, columns) => ({ id, component: 'ProTable', dataSource, pageSize: 5, representativeByStatus: false, showRecordCount: true, showPageSize: true, selectable: true, keepOperationColumn: true, operationColumnWidth: 96, rowActions: [deleteAction], columns });

const companies = '昕彤赋能（武汉）设计研究有限公司';
const assetNames = [
  ['FA2026090001', '研发笔记本电脑', '电子设备', 9800, '数字化中心', '王工'],
  ['FA2026090002', '研发笔记本电脑', '电子设备', 9800, '数字化中心', '李敏'],
  ['FA2026090003', '27英寸显示器', '电子设备', 2200, '数字化中心', '赵强'],
  ['FA2026090004', '彩色激光打印机', '办公设备', 5600, '综合管理部', '陈佳'],
  ['FA2026090005', '会议室投影仪', '电子设备', 7600, '综合管理部', '周敏'],
  ['FA2026090006', '工程测量仪', '专用设备', 12600, '工程管理部', '刘工'],
  ['FA2026090007', '研发笔记本电脑', '电子设备', 10800, '数字化中心', '孙伟'],
  ['FA2026090008', 'A3扫描仪', '办公设备', 4300, '采购管理部', '吴倩'],
  ['FA2026090009', '工业网关设备', '专用设备', 8800, '工程管理部', '马工'],
  ['FA2026090010', '台式电脑', '电子设备', 6500, '综合管理部', '李婷'],
  ['FA2026090011', '文件柜', '办公设备', 3200, '综合管理部', ''],
  ['FA2026090012', '便携式测试仪', '专用设备', 11800, '工程管理部', '杨工']
];
const assetRecords = assetNames.map(([assetCode, assetName, assetCategory, originalValue, useDepartment, user], index) => ({
  assetCode, fixedAssetCode: assetCode, fixedAssetSn: `SN202609${String(index + 1).padStart(4, '0')}`, assetName, assetCategory, originalValue,
  depreciationMethod: '年限平均法', usefulLifeMonths: assetCategory === '办公设备' ? 60 : 36,
  capitalizationDate: `2026-09-${String((index % 5) + 1).padStart(2, '0')}`, status: ['在用', '闲置', '报废', '出售', '其它'][index % 5],
  creator: '栗磊', createdAt: `2026-09-${String((index % 5) + 1).padStart(2, '0')} 09:${String(10 + index).padStart(2, '0')}:00`,
  assetCreator: '栗磊', assetCreatedAt: `2026-09-${String((index % 5) + 1).padStart(2, '0')} 09:${String(10 + index).padStart(2, '0')}:00`,
  acquiredPeriod: '202609', acquiredDate: `2026-08-${String((index % 12) + 10).padStart(2, '0')}`, salvageValuePct: 0,
  accumulatedDepreciationCost: Number((originalValue * Math.min(index + 1, 8) / (assetCategory === '办公设备' ? 60 : 36)).toFixed(2)),
  currentMonthDepreciationCost: Number((originalValue / (assetCategory === '办公设备' ? 60 : 36)).toFixed(2)), remark: index % 3 === 0 ? '研发及项目办公设备' : '',
  useDepartment, user, project: index % 4 === 0 ? 'PMS业财一体化项目' : '通用项目', custodian: user || '资产管理员', depreciationCostDepartment: index === 10 ? '资产管理部' : useDepartment,
  company: companies, assetCompany: companies, sourceInventoryNo: `INV202609${String(index + 1).padStart(3, '0')}`
}));
const inventoryRows = [
  { inventoryNo: 'INV202609001', purchaseCategory: '固定资产', purchaseName: '研发笔记本电脑', specification: 'ThinkPad P16 / i7 / 32G / 1T', unit: '台', warehouse: '武汉中心仓', storageBin: 'A-01-03', currentQuantity: 5 },
  { inventoryNo: 'INV202609002', purchaseCategory: '固定资产', purchaseName: '27英寸显示器', specification: '4K / IPS', unit: '台', warehouse: '武汉中心仓', storageBin: 'A-01-05', currentQuantity: 6 },
  { inventoryNo: 'INV202609003', purchaseCategory: '固定资产', purchaseName: '彩色激光打印机', specification: 'A4 双面', unit: '台', warehouse: '武汉中心仓', storageBin: 'B-02-01', currentQuantity: 2 },
  { inventoryNo: 'INV202609004', purchaseCategory: '固定资产', purchaseName: '工程测量仪', specification: '高精度 GNSS', unit: '套', warehouse: '长沙项目仓', storageBin: 'C-03-02', currentQuantity: 1 },
  { inventoryNo: 'INV202609005', purchaseCategory: '固定资产', purchaseName: '工业网关设备', specification: '8口工业级', unit: '台', warehouse: '德清项目仓', storageBin: 'D-01-01', currentQuantity: 3 }
];

const ledger = {
  schemaVersion: 'pms-page-schema-v2', policyProfile: 'non-workflow-list-detail', policyVersion: 'pms-policy-v5',
  pageCode: 'fixed-asset-ledger', pageName: '固资台账', domain: 'fixed-asset', module: '固资管理', menuPath: '固资管理/固资台账',
  pageType: 'list-detail', template: 'tabs-detail-page', outputPath: 'pages/fixed-asset/fixed-asset-ledger.html', workflowActions: false,
  businessScenario: '从物资类型为固定资产的即时汇总库存批量选择来源记录，逐件生成固定资产卡片并扣减来源库存。',
  detailSaveEnabled: false, detailSubmitEnabled: true, submitActionLabel: '提交', toastEnabled: false,
  detailOnlyFields: ['sourceInventoryNo', 'purchaseCategory', 'purchaseName', 'specification', 'unit', 'warehouse', 'storageBin', 'currentQuantity', 'unitQuantity', 'sourceUnitIndex'],
  uiConstraints: { listPageSize: 5, detailFormColumns: 3, tabSectionTitles: true },
  resourceReference: resourceReference(['列表详情一体', '非流程详情页模板', '即时物资', '数据选择弹窗']),
  relations: [{ from: '即时汇总库存', to: '固资台账', type: '转固来源' }, { from: '固资台账', to: '固资变更', type: '资产来源' }],
  pageActions: [{ code: 'create', label: '新增转固', type: 'primary', target: 'fixed-asset-ledger-detail' }],
  regions: [
    { id: 'fixed-asset-ledger-search', component: 'ProSearchForm', fields: [
      field('fixedAssetSn', '固定资产SN'), field('assetName', '固定资产名称'), field('status', '状态', 'select', { options: ['在用', '闲置', '报废', '出售', '其它'] }),
      field('assetCategory', '固定资产类别', 'select', { options: ['电子设备', '办公设备', '专用设备'] }), field('fixedAssetCode', '固定资产编码'), field('capitalizationDate', '转固日期', 'date-range')
    ] },
    tableBase('fixed-asset-ledger-table', 'records', [
      col('fixedAssetSn', '固定资产SN', 'link', { fixed: 'left', width: 176 }), col('status', '状态', 'tag', { align: 'center', width: 104 }), col('capitalizationDate', '转固日期', 'date', { width: 136 }),
      col('assetName', '固定资产名称', 'text', { width: 200 }), col('assetCategory', '固定资产类别', 'text', { width: 136 }), col('fixedAssetCode', '固定资产编码', 'text', { width: 176 }),
      col('useDepartment', '使用部门', 'text', { width: 136 }), col('user', '使用人员', 'text', { width: 128 }), col('acquiredDate', '购置日期', 'date', { width: 136 }),
      col('creator', '创建人', 'text', { width: 128 }), col('createdAt', '创建时间', 'datetime', { width: 168 })
    ]),
    { id: 'fixed-asset-ledger-detail', component: 'ProTabsDetail', tabs: [{ key: 'basic-info', label: '基础信息', children: [
      { id: 'fixed-asset-create-basic', component: 'DetailForm', detailModes: ['新增'], showTitle: false, fields: [
        field('transferDate', '转固日期', 'date', { required: true, defaultToday: true, preserveOnCreate: true }), field('creator', '创建人', 'input', { readonly: true, preserveOnCreate: true, value: '栗磊' }),
        field('createdAt', '创建时间', 'input', { readonly: true, preserveOnCreate: true, value: '2026-09-04 10:00:00' }), field('company', '所属公司', 'input', { readonly: true, preserveOnCreate: true, value: companies })
      ] },
      { id: 'fixed-asset-view-basic', component: 'DetailForm', detailModes: ['查看', '编辑'], showTitle: false, fields: [
        field('fixedAssetSn', '固定资产SN', 'input', { readonly: true }), field('status', '状态', 'input', { readonly: true }), field('capitalizationDate', '转固日期', 'input', { readonly: true }),
        field('assetName', '固定资产名称', 'input', { readonly: true }), field('assetCategory', '固定资产类别', 'input', { readonly: true }), field('fixedAssetCode', '固定资产编码', 'input', { readonly: true }),
        field('useDepartment', '使用部门', 'input', { readonly: true }), field('user', '使用人员', 'input', { readonly: true }), field('project', '项目', 'input', { readonly: true }), field('acquiredDate', '购置日期', 'input', { readonly: true }),
        field('depreciationMethod', '折旧方法', 'input', { readonly: true }), field('originalValue', '原值', 'number', { readonly: true }), field('usefulLifeMonths', '使用期限（月）', 'number', { readonly: true }),
        field('salvageValuePct', '残值率', 'number', { readonly: true }), field('accumulatedDepreciationCost', '累计折旧成本', 'number', { readonly: true }), field('currentMonthDepreciationCost', '月折旧成本', 'number', { readonly: true }),
        field('remark', '备注', 'input', { readonly: true }), field('assetCreator', '创建人', 'input', { readonly: true }), field('assetCreatedAt', '创建时间', 'input', { readonly: true }), field('assetCompany', '所属公司', 'input', { readonly: true })
      ] },
      { id: 'capitalization-items', component: 'EditableTable', detailModes: ['新增'], title: '转固明细', showTitle: true, dataSource: 'capitalizationItems', pagination: false, selectable: true, keepOperationColumn: true, operationColumnWidth: 96,
        actions: [{ code: 'open', label: '选择即时库存', type: 'primary', target: 'fixed-asset-inventory-picker' }, { code: 'batch-delete', label: '删除选中明细', type: 'danger', ghost: true, requiresSelection: true }],
        rowActions: [{ code: 'remove-row', label: '删除', type: 'link' }],
        columns: [
          col('sequence', '序号', 'text', { fixed: 'left', fixedOffset: 56, width: 72, align: 'center' }), col('purchaseName', '物资名称', 'text', { fixed: 'left', fixedOffset: 128, width: 200, editable: false }),
          col('specification', '规格', 'text', { width: 220, editable: false }), col('unit', '单位', 'text', { width: 80, editable: false }), col('warehouse', '库存地点', 'text', { width: 136, editable: false }), col('storageBin', '库位', 'text', { width: 120, editable: false }),
          col('fixedAssetSn', '固定资产SN', 'input', { required: true, width: 176 }), col('assetName', '固定资产名称', 'input', { required: true, width: 200 }),
          col('assetCategory', '固定资产类别', 'select', { required: true, width: 136, options: ['电子设备', '办公设备', '专用设备'] }), col('useDepartment', '使用部门', 'select', { required: true, width: 136, options: ['数字化中心', '综合管理部', '工程管理部', '采购管理部'] }),
          col('user', '使用人员', 'select', { required: true, width: 128, options: ['王工', '李敏', '赵强', '陈佳', '周敏', '刘工', '孙伟', '吴倩', '马工', '李婷', '杨工'] }),
          col('project', '项目', 'select', { required: true, width: 176, options: ['通用项目', 'PMS业财一体化项目', '长沙交付项目', '德清实施项目'] }), col('acquiredDate', '购置日期', 'date', { required: true, width: 136 }),
          col('depreciationMethod', '折旧方法', 'select', { required: true, width: 160, options: ['年限平均法', '工作量法', '双倍余额递减法', '年数总和法', '不计提折旧'] }), col('originalValue', '原值', 'number', { required: true, align: 'right', width: 120, precision: 2 }),
          col('usefulLifeMonths', '使用期限（月）', 'number', { required: true, align: 'right', width: 136 }), col('salvageValuePct', '残值率', 'number', { required: true, align: 'right', width: 96, precision: 2 }),
          col('remark', '备注', 'input', { width: 240 })
        ] }
    ] }] }
  ],
  overlays: [{ id: 'fixed-asset-inventory-picker', component: 'ProDataSelectModal', title: '选择即时库存', size: 'wide', appendSelectionTo: 'capitalizationItems',
    selectionRepeatBy: { field: 'currentQuantity', unitField: 'unitQuantity', unitValue: 1, indexField: 'sourceUnitIndex', copyFields: { assetName: 'purchaseName' }, setFields: { fixedAssetSn: '', project: '通用项目', salvageValuePct: 0, status: '在用' } },
    actions: [{ code: 'close', label: '取消' }, { code: 'confirm-select-inventory', label: '确认选择', type: 'primary' }], children: [
      { id: 'fixed-asset-inventory-search', component: 'ProSearchForm', fields: [field('purchaseName', '物资名称'), field('warehouse', '库存地点', 'select', { options: ['武汉中心仓', '长沙项目仓', '德清项目仓'] })] },
      { id: 'fixed-asset-inventory-table', component: 'ProTable', dataSource: 'inventoryRows', pageSize: 5, showRecordCount: true, showPageSize: true, selectable: true, rowActions: [], columns: [
        col('purchaseCategory', '物资类型'), col('purchaseName', '物资名称', 'text', { width: 200 }), col('specification', '规格', 'text', { width: 220 }), col('unit', '单位', 'text', { width: 80 }), col('currentQuantity', '库存余量', 'number', { align: 'right' }), col('warehouse', '库存地点'), col('storageBin', '库位')
      ] }
    ] }],
  rules: [{ id: 'capitalization-source-category', type: 'dataFilter', field: 'purchaseCategory', equals: '固定资产' }, { id: 'capitalization-unit-split', type: 'selectionExpansion', sourceField: 'currentQuantity', unitQuantity: 1 }, { id: 'capitalization-default-project', type: 'defaultValue', field: 'project', value: '通用项目' }, { id: 'capitalization-default-status', type: 'submitEffect', field: 'status', value: '在用', message: '转固成功后资产状态自动变为在用' }, { id: 'capitalization-detail-required', type: 'tableMinimumRows', action: 'submit', table: 'capitalizationItems', minimum: 1, message: '请至少选择一条即时库存' }, { id: 'capitalization-sn-unique', type: 'tableColumnUnique', action: 'submit', table: 'capitalizationItems', column: 'fixedAssetSn', message: '固定资产SN不能重复' }, { id: 'capitalization-stock-recheck', type: 'submitValidation', message: '即时库存已变化，请重新确认转固数量' }],
  mockData: { records: assetRecords, inventoryRows, capitalizationItems: [] }
};

const changeStatuses = ['草稿', '待审核', '已审核'];
const changeReasons = ['使用部门调整', '使用人员调整', '资产状态调整', '折旧信息调整'];
const changeRecords = assetRecords.slice(0, 12).map((asset, index) => {
  const status = changeStatuses[index % changeStatuses.length];
  const changeDate = `2026-09-${String((index % 5) + 4).padStart(2, '0')}`;
  const nextDepartment = index % 2 ? '综合管理部' : asset.useDepartment;
  return {
    changeNo: `BG202609${String(index + 1).padStart(3, '0')}`, status, changeDate,
    fixedAssetSn: asset.fixedAssetSn, assetName: asset.assetName, fixedAssetCode: asset.fixedAssetCode,
    changeReason: changeReasons[index % changeReasons.length], creator: '资产管理员', createdAt: `${changeDate} 15:${String(10 + index).padStart(2, '0')}:00`,
    auditor: status === '已审核' ? '李杨洋' : '', auditedAt: status === '已审核' ? `${changeDate} 16:20:00` : '', company: companies, remark: '',
    beforeFixedAssetSn: asset.fixedAssetSn, beforeStatus: asset.status, beforeCapitalizationDate: asset.capitalizationDate,
    beforeAssetName: asset.assetName, beforeAssetCategory: asset.assetCategory, beforeFixedAssetCode: asset.fixedAssetCode,
    beforeUseDepartment: asset.useDepartment, beforeUser: asset.user, beforeProject: asset.project, beforeAcquiredDate: asset.acquiredDate,
    beforeDepreciationMethod: asset.depreciationMethod, beforeOriginalValue: asset.originalValue, beforeUsefulLifeMonths: asset.usefulLifeMonths,
    beforeSalvageValuePct: asset.salvageValuePct, beforeAccumulatedDepreciationCost: asset.accumulatedDepreciationCost,
    beforeCurrentMonthDepreciationCost: asset.currentMonthDepreciationCost,
    afterFixedAssetSn: asset.fixedAssetSn, afterStatus: asset.status, afterCapitalizationDate: asset.capitalizationDate,
    afterAssetName: asset.assetName, afterAssetCategory: asset.assetCategory, afterFixedAssetCode: asset.fixedAssetCode,
    afterUseDepartment: nextDepartment, afterUser: asset.user, afterProject: asset.project, afterAcquiredDate: asset.acquiredDate,
    afterDepreciationMethod: asset.depreciationMethod, afterOriginalValue: asset.originalValue, afterUsefulLifeMonths: asset.usefulLifeMonths,
    afterSalvageValuePct: asset.salvageValuePct, afterAccumulatedDepreciationCost: asset.accumulatedDepreciationCost,
    afterCurrentMonthDepreciationCost: asset.currentMonthDepreciationCost
  };
});
const returnSchema = {
  schemaVersion: 'pms-page-schema-v2', policyProfile: 'auditable-list-detail', policyVersion: 'pms-policy-v5',
  pageCode: 'fixed-asset-return', pageName: '固资变更', domain: 'fixed-asset', module: '固资管理', menuPath: '固资管理/固资变更', pageType: 'list-detail', template: 'tabs-detail-page', outputPath: 'pages/fixed-asset/fixed-asset-return.html', workflowActions: false,
  businessScenario: '逐件选择固定资产台账，对比记录资产变更前后信息；草稿提交后进入待审核，审核后更新原资产卡片。',
  saveDraftEnabled: true, detailSaveEnabled: true, saveActionLabel: '保存草稿', detailSubmitEnabled: true, submitActionLabel: '提交', submitNextStatus: '待审核',
  detailEditableStatuses: ['草稿'], detailReviewEnabled: false, detailWorkflowLinksEnabled: false,
  auditPendingStatus: '待审核', auditCompletedStatus: '已审核', reverseAuditNextStatus: '草稿', toastEnabled: false,
  uiConstraints: { listPageSize: 5, detailFormColumns: 3, tabSectionTitles: true }, resourceReference: resourceReference(['列表详情一体', '非流程详情页模板', '数据选择弹窗']),
  relations: [{ from: '固资台账', to: '固资变更', type: '资产来源' }, { from: '固资变更', to: '固资台账', type: '审核后更新原卡片' }],
  pageActions: [
    { code: 'audit', label: '审核', type: 'primary', target: 'audit-fixed-asset-change-modal', requiresSingleSelection: true, enabledSelectionStatuses: ['待审核'] },
    { code: 'reverse-audit', label: '反审核', target: 'reverse-fixed-asset-change-modal', requiresSingleSelection: true, enabledSelectionStatuses: ['已审核'] },
    { code: 'create', label: '新增', type: 'primary', target: 'fixed-asset-return-detail' }
  ],
  detailActions: [],
  regions: [
    { id: 'fixed-asset-return-search', component: 'ProSearchForm', fields: [
      field('changeNo', '固资变更单号'), field('status', '状态', 'select', { options: changeStatuses }), field('fixedAssetSn', '固定资产SN'),
      field('assetName', '固定资产名称'), field('fixedAssetCode', '固定资产编码'), field('changeDate', '变更日期', 'date-range')
    ] },
    tableBase('fixed-asset-return-table', 'records', [
      col('changeNo', '固资变更单号', 'link', { fixed: 'left', width: 176 }), col('status', '状态', 'tag', { align: 'center', width: 104 }), col('changeDate', '变更日期', 'date', { width: 136 }),
      col('fixedAssetSn', '固定资产SN', 'text', { width: 176 }), col('assetName', '固定资产名称', 'text', { width: 200 }), col('fixedAssetCode', '固定资产编码', 'text', { width: 176 }),
      col('changeReason', '变更原因', 'text', { width: 180 }), col('creator', '创建人', 'text', { width: 128 }), col('createdAt', '创建时间', 'datetime', { width: 168 })
    ]),
    { id: 'fixed-asset-return-detail', component: 'ProTabsDetail', tabs: [
      { key: 'basic-info', label: '基础信息', children: [
      { id: 'fixed-asset-return-basic', component: 'DetailForm', showTitle: false, fields: [
        field('changeNo', '固资变更单号', 'input', { readonly: true, value: '提交后生成' }), field('status', '状态', 'select', { readonly: true, preserveOnCreate: true, options: changeStatuses, value: '草稿' }), field('changeDate', '变更日期', 'date', { required: true, defaultToday: true, preserveOnCreate: true }),
        field('fixedAssetSn', '固定资产SN', 'picker', { readonly: true, required: true, inputReadonly: true, actionCode: 'open', actionLabel: '选择', target: 'fixed-asset-return-picker', placeholder: '请选择固定资产SN' }), field('assetName', '固定资产台账', 'input', { readonly: true, placeholder: '根据固定资产SN自动带出' }), field('fixedAssetCode', '固定资产编码', 'input', { readonly: true, placeholder: '根据固定资产SN自动带出' }),
        field('changeReason', '变更原因', 'input', { required: true, placeholder: '请输入变更原因' }), field('creator', '创建人', 'input', { readonly: true, preserveOnCreate: true, value: '资产管理员' }), field('createdAt', '创建时间', 'input', { readonly: true, preserveOnCreate: true, value: '2026-09-08 10:00:00' }),
        field('auditor', '审核人', 'input', { readonly: true }), field('auditedAt', '审核时间', 'input', { readonly: true }), field('company', '所属公司', 'input', { readonly: true, preserveOnCreate: true, value: companies }), field('remark', '备注', 'input', { placeholder: '请输入备注，最多200字' })
      ] },
      { id: 'fixed-asset-change-before', component: 'DetailForm', title: '变更前', dividerTop: true, fields: [
        field('beforeFixedAssetSn', '固定资产SN', 'input', { readonly: true }), field('beforeStatus', '状态', 'input', { readonly: true }), field('beforeCapitalizationDate', '转固日期', 'input', { readonly: true }),
        field('beforeAssetName', '固定资产名称', 'input', { readonly: true }), field('beforeAssetCategory', '固定资产类别', 'input', { readonly: true }), field('beforeFixedAssetCode', '固定资产编码', 'input', { readonly: true }),
        field('beforeUseDepartment', '使用部门', 'input', { readonly: true }), field('beforeUser', '使用人员', 'input', { readonly: true }), field('beforeProject', '项目', 'input', { readonly: true }), field('beforeAcquiredDate', '购置日期', 'input', { readonly: true }),
        field('beforeDepreciationMethod', '折旧方法', 'input', { readonly: true }), field('beforeOriginalValue', '原值', 'number', { readonly: true }), field('beforeUsefulLifeMonths', '使用期限（月）', 'number', { readonly: true }),
        field('beforeSalvageValuePct', '残值率', 'number', { readonly: true }), field('beforeAccumulatedDepreciationCost', '累计折旧成本', 'number', { readonly: true }), field('beforeCurrentMonthDepreciationCost', '月折旧成本', 'number', { readonly: true })
      ] },
      { id: 'fixed-asset-change-after', component: 'DetailForm', title: '变更后', dividerTop: true, fields: [
        field('afterFixedAssetSn', '固定资产SN', 'input', { readonly: true }), field('afterStatus', '状态', 'select', { required: true, options: ['在用', '闲置', '报废', '出售', '其它'] }), field('afterCapitalizationDate', '转固日期', 'input', { readonly: true }),
        field('afterAssetName', '固定资产名称', 'input', { required: true }), field('afterAssetCategory', '固定资产类别', 'select', { required: true, options: ['电子设备', '办公设备', '专用设备'] }), field('afterFixedAssetCode', '固定资产编码', 'input', { readonly: true }),
        field('afterUseDepartment', '使用部门', 'select', { required: true, options: ['数字化中心', '综合管理部', '工程管理部', '采购管理部', '资产管理部'] }), field('afterUser', '使用人员', 'select', { options: ['王工', '李敏', '赵强', '陈佳', '周敏', '刘工', '孙伟', '吴倩', '马工', '李婷', '杨工'] }),
        field('afterProject', '项目', 'select', { options: ['通用项目', 'PMS业财一体化项目', '长沙交付项目', '德清实施项目'] }), field('afterAcquiredDate', '购置日期', 'date', { readonly: true }),
        field('afterDepreciationMethod', '折旧方法', 'input', { readonly: true }), field('afterOriginalValue', '原值', 'number', { readonly: true }), field('afterUsefulLifeMonths', '使用期限（月）', 'number', { readonly: true }),
        field('afterSalvageValuePct', '残值率', 'number', { readonly: true }), field('afterAccumulatedDepreciationCost', '累计折旧成本', 'number', { readonly: true }), field('afterCurrentMonthDepreciationCost', '月折旧成本', 'number', { readonly: true })
      ] }
    ] }] }
  ],
  overlays: [
    { id: 'fixed-asset-return-picker', component: 'ProDataSelectModal', title: '选择固资台账', size: 'wide', selectionMap: {
      fixedAssetSn: 'fixedAssetSn', assetName: 'assetName', fixedAssetCode: 'fixedAssetCode',
      beforeFixedAssetSn: 'fixedAssetSn', beforeStatus: 'status', beforeCapitalizationDate: 'capitalizationDate', beforeAssetName: 'assetName', beforeAssetCategory: 'assetCategory', beforeFixedAssetCode: 'fixedAssetCode', beforeUseDepartment: 'useDepartment', beforeUser: 'user', beforeProject: 'project', beforeAcquiredDate: 'acquiredDate', beforeDepreciationMethod: 'depreciationMethod', beforeOriginalValue: 'originalValue', beforeUsefulLifeMonths: 'usefulLifeMonths', beforeSalvageValuePct: 'salvageValuePct', beforeAccumulatedDepreciationCost: 'accumulatedDepreciationCost', beforeCurrentMonthDepreciationCost: 'currentMonthDepreciationCost',
      afterFixedAssetSn: 'fixedAssetSn', afterStatus: 'status', afterCapitalizationDate: 'capitalizationDate', afterAssetName: 'assetName', afterAssetCategory: 'assetCategory', afterFixedAssetCode: 'fixedAssetCode', afterUseDepartment: 'useDepartment', afterUser: 'user', afterProject: 'project', afterAcquiredDate: 'acquiredDate', afterDepreciationMethod: 'depreciationMethod', afterOriginalValue: 'originalValue', afterUsefulLifeMonths: 'usefulLifeMonths', afterSalvageValuePct: 'salvageValuePct', afterAccumulatedDepreciationCost: 'accumulatedDepreciationCost', afterCurrentMonthDepreciationCost: 'currentMonthDepreciationCost'
    }, actions: [{ code: 'close', label: '取消' }, { code: 'confirm-select-asset', label: '确认选择', type: 'primary' }], children: [
      { id: 'fixed-asset-return-picker-search', component: 'ProSearchForm', fields: [
        field('fixedAssetCode', '固定资产编码'), field('assetName', '固定资产名称'), field('assetCategory', '固定资产类别', 'select', { options: ['电子设备', '办公设备', '专用设备'] }), field('fixedAssetSn', '固定资产SN'), field('status', '状态', 'select', { options: ['在用', '闲置', '报废', '出售', '其它'] })
      ] },
      { id: 'fixed-asset-return-picker-table', component: 'ProTable', dataSource: 'availableAssets', pageSize: 5, showRecordCount: true, showPageSize: true, selectable: true, selectionMode: 'single', rowActions: [], columns: [
        col('fixedAssetSn', '固定资产SN', 'text', { width: 176 }), col('assetName', '固定资产名称', 'text', { width: 200 }), col('fixedAssetCode', '固定资产编码', 'text', { width: 176 }),
        col('assetCategory', '固定资产类别', 'text', { width: 136 }), col('status', '状态', 'tag', { align: 'center', width: 104 }), col('useDepartment', '使用部门', 'text', { width: 136 })
      ] }
    ] },
    { id: 'audit-fixed-asset-change-modal', component: 'Modal', title: '确认固资变更审核', fields: [{ code: 'auditNotice', label: '审核说明', component: 'input', readonly: true, value: '审核后将按变更后信息更新原固定资产卡片。' }], actions: [{ code: 'close', label: '取消' }, { code: 'confirm-status', label: '确认审核', type: 'primary', nextStatus: '已审核', fieldUpdates: { auditor: '$currentUser', auditedAt: '$currentDateTime' } }] },
    { id: 'reverse-fixed-asset-change-modal', component: 'Modal', title: '确认反审核', fields: [{ code: 'reverseNotice', label: '反审核说明', component: 'input', readonly: true, value: '反审核后单据回到草稿，可继续修改并重新提交。' }], actions: [{ code: 'close', label: '取消' }, { code: 'confirm-status', label: '确认反审核', type: 'primary', nextStatus: '草稿', fieldUpdates: { auditor: '', auditedAt: '' } }] }
  ],
  rules: [
    { id: 'change-asset-required', type: 'required', field: 'fixedAssetSn', message: '请选择固定资产SN' },
    { id: 'change-before-snapshot', type: 'selectionSnapshot', source: 'availableAssets', targetPrefix: 'before', message: '选择台账后固化变更前信息' },
    { id: 'change-after-copy', type: 'selectionCopy', sourcePrefix: 'before', targetPrefix: 'after', message: '变更后默认复制变更前信息' },
    { id: 'change-audit-update-card', type: 'auditEffect', message: '审核后按变更后信息更新原固定资产卡片' }
  ],
  mockData: { records: changeRecords, availableAssets: assetRecords }
};

const target = process.argv[2] || 'all';
if (target === 'all' || target === 'fixed-asset-ledger') writeFileSync(`${outDir}/fixed-asset-ledger.json`, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
if (target === 'all' || target === 'fixed-asset-return') writeFileSync(`${outDir}/fixed-asset-return.json`, `${JSON.stringify(returnSchema, null, 2)}\n`, 'utf8');
if (!['all', 'fixed-asset-ledger', 'fixed-asset-return'].includes(target)) throw new Error(`Unknown fixed asset schema target: ${target}`);
console.log(`Fixed asset schema generated: ${target}.`);
