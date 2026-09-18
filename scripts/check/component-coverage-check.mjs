import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { writeJson } from '../lib/file-utils.mjs';
import { componentRegistry, registeredComponents } from '../lib/component-registry.mjs';

const schemaPath = 'schemas/pages/system/component-gallery.json';
const outputPath = 'pages/system/component-gallery.html';
const overlays = new Set(['Modal', 'ProModalForm', 'Drawer', 'ProDetailDrawer', 'DataSelectModal', 'ProDataSelectModal']);
const nodes = [...registeredComponents].map(sampleNode);
const schema = {
  schemaVersion: 'pms-page-schema-v2', pageCode: 'component-gallery', pageName: '组件库展厅', domain: 'system', module: '系统管理', menuPath: '系统管理/组件库展厅', pageType: 'workbench', template: 'workbench-page', outputPath,
  businessScenario: `覆盖 ${nodes.length} 个已注册的 Ant Design Pro 风格静态组件。`,
  resourceReference: { center: 'prototype-resources/index.html', baseline: 'pms-resource-center-v1', pageSamples: ['组件覆盖页'], components: ['*'] },
  regions: nodes.filter((node) => !overlays.has(node.component)),
  overlays: nodes.filter((node) => overlays.has(node.component)),
  mockData: {}
};
writeJson(schemaPath, schema);
run('scripts/check/schema-check.mjs', schemaPath);
run('scripts/generate/page-from-schema.mjs', schemaPath);
run('scripts/check/page-check.mjs', schemaPath);

const html = fs.readFileSync(outputPath, 'utf8');
const missing = [...registeredComponents].filter((name) => !html.includes(`data-component="${name}"`));
if (missing.length) throw new Error(`Components not rendered: ${missing.join(', ')}`);
console.log(`Component coverage passed: ${registeredComponents.size}/${registeredComponents.size}`);

function sampleNode(component, index) {
  const base = { id: `gallery-${index}`, component, title: component };
  const field = { code: 'sample', label: '示例字段', component: 'input', value: '示例内容', options: ['选项一', '选项二'] };
  const column = { code: 'name', label: '名称', component: 'text' };
  const row = { name: '示例记录', status: '已完成', amount: 128000 };
  if (['PageHeader', 'Card', 'Space'].includes(component)) return { ...base, children: [{ component: 'Alert', message: `${component} 内容区域` }] };
  if (component === 'Breadcrumb') return { ...base, items: ['系统管理', '组件库', component] };
  if (component === 'Divider') return { ...base, label: '分割线' };
  if (['Tabs', 'ProTabsDetail'].includes(component)) return { ...base, tabs: [{ key: 'one', label: '页签一', children: [{ component: 'Alert', message: '页签内容' }] }, { key: 'two', label: '页签二', children: [{ component: 'Empty', description: '暂无内容' }] }] };
  if (component === 'ProFilterTabs') return { ...base, field: 'status', target: 'gallery-table', defaultKey: 'all', items: [{ key: 'all', label: '全部', values: [] }, { key: 'active', label: '处理中', values: ['处理中'] }] };
  if (['Steps', 'StatusFlow', 'BizfinChain'].includes(component)) return { ...base, items: ['草稿', '待审核', '已生效'] };
  if (component === 'Collapse') return { ...base, items: [{ label: '展开项', children: [{ component: 'Alert', message: '折叠内容' }] }] };
  if (component === 'ProSearchForm') return { ...base, fields: [field] };
  if (['Form', 'FormSection', 'DetailForm'].includes(component)) return { ...base, fields: [field] };
  if (['ProTable', 'EditableTable', 'HistoryTable'].includes(component)) return { ...base, columns: [column, { code: 'status', label: '状态', component: 'tag' }], rows: [row], pagination: false };
  if (['Descriptions', 'ProDescriptionList'].includes(component)) return { ...base, fields: [field], record: { sample: '示例内容' } };
  if (component === 'AmountSummary') return { ...base, items: [{ label: '合同金额', value: '¥128,000.00' }] };
  if (['Statistic', 'ProStatCard'].includes(component)) return { ...base, items: [{ label: '项目数量', value: '128', meta: '较上月 +12' }] };
  if (component === 'Progress') return { ...base, percent: 68 };
  if (['Timeline', 'ProTimeline'].includes(component)) return { ...base, items: [{ label: '提交审核', time: '2026-07-20 10:00:00', description: '管理员提交' }] };
  if (component === 'Alert') return { ...base, message: '提示信息', description: '用于业务提示和校验反馈。', persistent: true };
  if (component === 'Empty') return { ...base, description: '暂无数据' };
  if (['Result', 'ProResult'].includes(component)) return { ...base, title: '操作成功', description: '数据已保存。' };
  if (['Upload', 'UploadList', 'ProUploadList'].includes(component)) return { ...base, rows: [{ name: '合同附件.pdf', size: '1.2 MB', uploader: '管理员' }] };
  if (component === 'ApprovalPanel') return { ...base };
  if (component === 'ProChartCard') return { ...base, placeholder: '图表组件容器' };
  if (component === 'ProMonitorCardGrid') return { ...base, pageSize: 4, rows: [{ projectCode: 'PMS2026001', projectName: '示例水厂', status: '在线', controlledCount: 2, uncontrolledCount: 1, lastCheckTime: '2026-07-31 10:40:00' }], cardActions: [{ code: 'vpn', label: 'VPN配置' }, { code: 'exception', label: '离线原因' }, { code: 'detect', label: '检测' }] };
  if (component === 'ProTreeTable') return { ...base, tree: ['收入管理', '成本管理'], columns: [column], rows: [row], pagination: false };
  if (component === 'ProBatchToolbar') return { ...base, actions: [{ code: 'delete', label: '批量删除', type: 'danger' }] };
  if (component === 'ProColumnSetting') return { ...base, columns: [column] };
  if (component === 'ProImportPanel') return { ...base };
  if (component === 'Badge') return { ...base, text: '正常' };
  if (component === 'Tag') return { ...base, text: '已完成' };
  if (component === 'Popconfirm') return { ...base, title: '确认删除该记录？' };
  if (component === 'Spin') return { ...base, text: '加载中...' };
  if (component === 'Skeleton') return { ...base, rows: 3 };
  if (overlays.has(component)) return { ...base, fields: [field], children: [{ component: 'Alert', message: `${component} 内容` }] };
  return { ...base, code: `field-${index}`, label: component, value: '示例内容', options: ['选项一', '选项二'] };
}

function run(script, input) {
  const result = spawnSync(process.execPath, [script, input], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
