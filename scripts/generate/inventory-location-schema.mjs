import fs from 'node:fs';
import path from 'node:path';

const companies = ['昕彤赋能（武汉）设计研究有限公司', '昕彤赋能（长沙）人工智能行业应用系统有限公司', '昕诺飞智能科技有限公司'];
const bins = (prefix, defaults = 0) => [
  { binCode: `${prefix}-01-0101`, isDefaultBin: defaults === 0 ? '是' : '否', remark: '' },
  { binCode: `${prefix}-02-0201`, isDefaultBin: defaults === 1 ? '是' : '否', remark: '' },
  { binCode: `${prefix}-03-0301`, isDefaultBin: '否', remark: '历史库位' }
];
const locations = [
  ['LOC-WH-001', '武汉中心仓', companies[0], '是', 'A-01-0101', '启用', bins('A')],
  ['LOC-WH-002', '武汉项目仓', companies[0], '否', 'B-01-0101', '启用', bins('B', 1)],
  ['LOC-CS-001', '长沙项目仓', companies[1], '是', 'C-01-0101', '启用', bins('C')],
  ['LOC-CS-002', '长沙临时仓', companies[1], '否', '', '停用', bins('D', 2)],
  ['LOC-XN-001', '昕诺飞设备仓', companies[2], '是', 'E-01-0101', '启用', bins('E')],
  ['LOC-WH-003', '武汉退货暂存仓', companies[0], '否', 'F-01-0101', '启用', bins('F')],
  ['LOC-CS-003', '长沙备件仓', companies[1], '否', 'G-01-0101', '启用', bins('G')],
  ['LOC-XN-002', '昕诺飞临时仓', companies[2], '否', '', '停用', bins('H', 2)],
  ['LOC-WH-004', '武汉维修仓', companies[0], '否', 'I-01-0101', '启用', bins('I')],
  ['LOC-CS-004', '长沙维修仓', companies[1], '否', 'J-01-0101', '启用', bins('J')],
  ['LOC-XN-003', '昕诺飞备件仓', companies[2], '否', 'K-01-0101', '启用', bins('K')],
  ['LOC-WH-005', '武汉现场临时仓', companies[0], '否', 'L-01-0101', '启用', bins('L')]
].map(([locationCode, locationName, company, isDefaultLocation, defaultBin, status, storageBins], index) => ({ id: `LOC-${String(index + 1).padStart(3, '0')}`, locationCode, locationName, company, isDefaultLocation, defaultBin, status, creator: index % 2 ? '李杨洋' : '管理员', createdAt: `2026-09-${String((index % 9) + 1).padStart(2, '0')} 09:20:18`, updatedBy: '管理员', updatedAt: `2026-09-${String((index % 9) + 1).padStart(2, '0')} 10:30:00`, remark: '', storageBins }));

const schema = {
  schemaVersion: 'pms-page-schema-v2', policyProfile: 'non-workflow-list-detail', policyVersion: 'pms-policy-v1',
  pageCode: 'inventory-location', pageName: '库存地点', domain: 'material', module: '物资管理', menuPath: '物资管理/库存地点', pageType: 'list-detail', template: 'tabs-detail-page', outputPath: 'pages/material/inventory-location.html',
  businessScenario: '按所属公司维护库存地点，并在详情中维护库位及默认库位，为收发存业务提供库存组织维度。', workflowActions: false, approvalOverlay: false, detailSubmitEnabled: true, submitActionLabel: '保存', createStatus: '启用', detailEditableStatuses: ['启用'], primaryDeleteEnabledStatuses: ['停用'],
  uiConstraints: { listPageSize: 5, detailFormColumns: 3, tabSectionTitles: true },
  resourceReference: { center: 'prototype-resources/index.html', baseline: 'pms-resource-center-v1', pageSamples: ['列表详情一体', '物资出库'], components: ['ProSearchForm', 'ProTable', 'ProTabsDetail', 'DetailForm', 'EditableTable', 'Switch'] },
  relations: [{ from: '公司档案', to: '库存地点', type: '所属公司' }, { from: '库存地点', to: '库位', type: '包含' }, { from: '库存地点/库位', to: '收发存业务', type: '库存维度' }],
  pageActions: [{ code: 'create', label: '新增库存地点', type: 'primary', target: 'inventory-location-detail' }],
  regions: [
    { id: 'inventory-location-search', component: 'ProSearchForm', collapsible: false, labelAlign: 'left', labelWidth: 176, searchPaddingLeft: 33, fields: [
      { code: 'keyword', label: '库存地点编码或名称', component: 'input', span: 2, placeholder: '请输入库存地点编码或名称', searchCodes: ['locationCode', 'locationName'] }
    ] },
    { id: 'inventory-location-table', component: 'ProTable', dataSource: 'records', pageSize: 5, showRecordCount: true, showPageSize: true, selectable: true, keepOperationColumn: true, operationColumnWidth: 88, representativeByStatus: false, rowActions: [{ code: 'delete', label: '删除', type: 'link' }], columns: [
      { code: 'locationCode', label: '库存地点编码', component: 'link', fixed: 'left', width: 180 }, { code: 'locationName', label: '库存地点名称', component: 'text', width: 260 }, { code: 'creator', label: '创建人', component: 'text', width: 160 }, { code: 'createdAt', label: '创建时间', component: 'datetime', width: 200 }
    ] },
    { id: 'inventory-location-detail', component: 'ProTabsDetail', tabs: [
      { key: 'basic', label: '基础信息', children: [{ component: 'DetailForm', showTitle: false, layoutColumns: 3, fields: [
        { code: 'locationCode', label: '库存地点编码', component: 'input', readonly: true, value: 'LOC-WH-001' }, { code: 'locationName', label: '库存地点名称', component: 'input', required: true, value: '武汉中心仓' }, { code: 'creator', label: '创建人', component: 'input', readonly: true, value: '管理员', preserveOnCreate: true },
        { code: 'createdAt', label: '创建时间', component: 'input', readonly: true, value: '2026-09-01 09:20:18', preserveOnCreate: true }, { code: 'company', label: '所属公司', component: 'input', readonly: true, value: companies[0], preserveOnCreate: true }, { code: 'remark', label: '备注', component: 'textarea', value: '' }
      ] }, { component: 'EditableTable', title: '库位信息', showTitle: true, dataSource: 'storageBins', pagination: false, selectable: true, keepOperationColumn: true, operationColumnWidth: 88, minWidth: 760, actions: [{ code: 'add-row', label: '新增库位', type: 'primary' }, { code: 'batch-delete', label: '删除选中明细', type: 'default', requiresSelection: true }], rowActions: [{ code: 'remove-row', label: '删除', type: 'link' }], columns: [
        { code: 'sequence', label: '序号', component: 'text', editable: false, align: 'center', width: 72, fixed: 'left' }, { code: 'binCode', label: '库位编码', component: 'input', editable: true, required: true, width: 220 }, { code: 'isDefaultBin', label: '是否默认库位', component: 'select', editable: true, required: true, options: ['是', '否'], exclusiveValue: '是', exclusiveResetValue: '否', width: 180 }, { code: 'remark', label: '备注', component: 'input', editable: true, width: 260 }
      ] }] }
    ] }
  ],
  rules: [
    { id: 'R01', action: 'submit', type: 'fieldUniqueInDataSource', field: 'locationCode', dataSource: 'records', column: 'locationCode', message: '库存地点编码已存在' }, { id: 'R02', action: 'submit', type: 'tableColumnUnique', table: 'storageBins', column: 'binCode', message: '库位编码不能重复' }, { id: 'R03', action: 'submit', type: 'tableMaximumRowsMatching', table: 'storageBins', field: 'isDefaultBin', value: '是', maximum: 1, message: '一个库存地点只能设置一个默认库位' }, { id: 'R04', description: '库存地点变更或清空时，下游单据清空库位并按新地点重载候选库位。' }
  ],
  mockData: { records: locations, storageBins: locations[0].storageBins }
};

const target = path.resolve('schemas/pages/material/inventory-location.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log(`Inventory location schema generated: ${path.relative(process.cwd(), target)}`);
