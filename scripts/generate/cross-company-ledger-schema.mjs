import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('schemas/pages/todo/my-task.json');
const targetPath = path.resolve('schemas/pages/todo/cross-company-ledger.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function cloneWithPageIdentity(value) {
  if (Array.isArray(value)) return value.map(cloneWithPageIdentity);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneWithPageIdentity(item)]));
  }
  if (typeof value !== 'string') return value;
  return value
    .replaceAll('my-task', 'cross-company-ledger')
    .replaceAll('我的任务', '跨司协同台账');
}

const schema = cloneWithPageIdentity(source);
schema.pageCode = 'cross-company-ledger';
schema.pageName = '跨司协同台账';
schema.menuPath = '跨司协同台账';
schema.outputPath = 'pages/cross-company-ledger.html';

const search = schema.regions.find((region) => region.id === 'task-search');
if (search?.fields) search.fields = search.fields.filter((field) => field.code !== 'taskType');

const tabsRegion = schema.regions.find((region) => region.id === 'task-type-tabs');
const wbsTab = tabsRegion.tabs.find((tab) => tab.key === 'wbs');
const proposalTab = tabsRegion.tabs.find((tab) => tab.key === 'project-proposal');
const wbsTable = wbsTab.children.find((child) => child.component === 'ProTable');
const proposalTable = proposalTab.children.find((child) => child.component === 'ProTable');

function insertStatusAfter(columns, targetCode) {
  const targetIndex = columns.findIndex((column) => column.code === targetCode);
  const statusColumn = {
    code: 'status',
    label: '任务状态',
    component: 'tag',
    width: 112,
  };
  columns.splice(targetIndex + 1, 0, statusColumn);
}

insertStatusAfter(wbsTable.columns, 'detail');
insertStatusAfter(proposalTable.columns, 'requirementName');
wbsTable.rowActions = [
  {
    code: 'open',
    label: '详情',
    type: 'link',
    icon: 'fa-eye',
    target: 'project-plan-view-modal',
    statuses: ['未完成'],
  },
  {
    code: 'open',
    label: '详情',
    type: 'link',
    icon: 'fa-eye',
    target: 'project-plan-view-modal',
    statuses: ['已完成'],
  },
];
proposalTable.rowActions = [
  {
    code: 'handle',
    label: '办理',
    type: 'link',
    icon: 'fa-pen-to-square',
    targetField: 'handleTarget',
    statuses: ['未完成'],
  },
  {
    code: 'open',
    label: '详情',
    type: 'link',
    icon: 'fa-eye',
    targetField: 'viewTarget',
    statuses: ['已完成'],
  },
];

const openWbsTasks = source.mockData.wbsTasks
  .filter((row) => row.collaborationType === '跨司任务')
  .map((row) => ({ ...row, status: '未完成' }));
const completedWbsTasks = [
  {
    id: 'cross-wbs-completed-1',
    content: '现场调研',
    detail: '完成现场工艺、设备及数据条件调研',
    projectCode: 'XM202607150001',
    projectName: '沙河市污水厂',
    customer: '沙河市污水处理厂',
    owner: '李杨洋',
    startDate: '2026-07-02',
    endDate: '2026-07-03',
    collaborationType: '跨司任务',
    status: '已完成',
  },
  {
    id: 'cross-wbs-completed-2',
    content: '系统设计',
    detail: '完成跨司系统架构及接口方案确认',
    projectCode: 'XM202607030002',
    projectName: '德清L4技改',
    customer: '德清县威德水质净化有限公司',
    owner: '肖邵雷',
    startDate: '2026-07-04',
    endDate: '2026-07-08',
    collaborationType: '跨司任务',
    status: '已完成',
  },
];

const openProposalTasks = source.mockData.projectProposals
  .map((row) => ({ ...row, taskType: '跨司任务', status: '未完成' }));
const completedProposalTasks = [
  {
    id: 'cross-proposal-completed-1',
    requirementCode: 'XQ00000188',
    requirementName: '污水处理智能化升级需求',
    customer: '岳阳水务有限公司',
    owner: '陆志军/李杨洋',
    generatedAt: '2026-07-16 16:20:00',
    currentStage: '调研问卷',
    taskType: '跨司任务',
    status: '已完成',
    handleTarget: 'survey-questionnaire-handle-modal',
  },
  {
    id: 'cross-proposal-completed-2',
    requirementCode: 'XQ00000176',
    requirementName: '水厂云边协同改造需求',
    customer: '株洲市水务投资集团有限公司',
    owner: '李杨洋',
    generatedAt: '2026-07-12 09:45:00',
    currentStage: '项目实施通知',
    taskType: '跨司任务',
    status: '已完成',
    handleTarget: 'project-notice-handle-modal',
  },
];

function viewTargetFor(handleTarget) {
  return String(handleTarget || '').replace(/-handle-modal$/, '-view-modal');
}

function makeOverlayReadonly(overlay, id, title) {
  const view = JSON.parse(JSON.stringify(overlay));
  view.id = id;
  view.title = title;
  view.actions = [{ code: 'close', label: '关闭' }];

  function lock(node) {
    if (Array.isArray(node)) {
      node.forEach(lock);
      return;
    }
    if (!node || typeof node !== 'object') return;

    if (node.component === 'DetailForm' && Array.isArray(node.fields)) {
      node.fields.forEach((field) => {
        field.readonly = true;
        if (['select', 'multi-select', 'tree-select', 'cascader'].includes(field.component)) {
          field.disabled = true;
        }
      });
    }
    if (['EditableTable', 'ProTable'].includes(node.component)) {
      node.actions = [];
      node.rowActions = [];
      node.selectable = false;
      node.keepOperationColumn = false;
      if (Array.isArray(node.columns)) {
        node.columns.forEach((column) => {
          column.editable = false;
          column.readonly = true;
        });
      }
    }
    Object.values(node).forEach(lock);
  }

  lock(view.children);
  return view;
}

const detailTitleByTarget = {
  'project-proposal-handle-modal': '项目方案详情',
  'survey-questionnaire-handle-modal': '调研问卷详情',
  'project-notice-handle-modal': '项目实施通知详情',
  'project-setup-handle-modal': '项目立项详情',
  'milestone-plan-handle-modal': '项目计划详情',
  'project-progress-handle-modal': '项目进度填报详情',
};

completedProposalTasks.forEach((row) => {
  row.viewTarget = viewTargetFor(row.handleTarget);
});
const handleTargets = [...new Set(source.mockData.projectProposals.map((row) => row.handleTarget).filter(Boolean))];
const readonlyOverlays = handleTargets.map((handleTarget) => {
  const sourceOverlay = schema.overlays.find((overlay) => overlay.id === handleTarget);
  if (!sourceOverlay) throw new Error(`Missing task overlay: ${handleTarget}`);
  return makeOverlayReadonly(
    sourceOverlay,
    viewTargetFor(handleTarget),
    detailTitleByTarget[handleTarget] || '任务详情'
  );
});
schema.overlays = schema.overlays.filter((overlay) => !readonlyOverlays.some((view) => view.id === overlay.id));
schema.overlays.push(...readonlyOverlays);

schema.mockData.wbsTasks = [...openWbsTasks, ...completedWbsTasks];
schema.mockData.projectProposals = [...openProposalTasks, ...completedProposalTasks];
wbsTable.pageSize = 5;
proposalTable.pageSize = 5;
delete wbsTable.showRecordCount;
delete proposalTable.showRecordCount;
wbsTab.label = 'WBS任务';
proposalTab.label = '项目周期任务';
schema.rules = [
  '跨司协同台账仅展示跨司任务，不展示我司任务。',
  '跨司协同台账同步展示六个项目周期阶段及其最新办理弹窗规则。',
  '跨司协同台账同时展示未完成和已完成任务；未完成任务显示办理，已完成任务显示详情并打开只读详情弹窗。',
  '页签不显示任务数量统计；列表底部使用公共分页组件显示总记录数和固定“5条/页”。',
  '页面结构、查询条件、页签、列表字段和弹窗结构与我的任务保持一致。',
  '列表不产生纵向滚动；宽表仅在表格内部横向滚动。',
];

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
console.log(`Schema generated: ${path.relative(process.cwd(), targetPath)}`);
