import fs from 'node:fs';
import path from 'node:path';

const taskSchemaPath = path.resolve('schemas/pages/todo/my-task.json');
const setupSchemaPath = path.resolve('schemas/pages/project/project-setup.json');
const planSchemaPath = path.resolve('schemas/pages/project/project-plan.json');
const progressSchemaPath = path.resolve('schemas/pages/project/project-progress.json');

const taskSchema = JSON.parse(fs.readFileSync(taskSchemaPath, 'utf8'));
const setupSchema = JSON.parse(fs.readFileSync(setupSchemaPath, 'utf8'));
const planSchema = JSON.parse(fs.readFileSync(planSchemaPath, 'utf8'));
const progressSchema = JSON.parse(fs.readFileSync(progressSchemaPath, 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findRegion(schema, id) {
  const region = schema.regions.find((item) => item.id === id);
  if (!region) throw new Error(`Missing region: ${id}`);
  return clone(region);
}

function replaceDataSource(value, from, to) {
  if (Array.isArray(value)) {
    value.forEach((item) => replaceDataSource(item, from, to));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.dataSource === from) value.dataSource = to;
  if (Array.isArray(value.columns)) {
    value.columns.forEach((column) => {
      if (column.component === 'multi-select') column.component = 'input';
    });
  }
  Object.values(value).forEach((item) => replaceDataSource(item, from, to));
}

function buildTaskOverlay({ id, title, detailRegion, sourceData, targetData }) {
  const content = clone(detailRegion);
  delete content.id;
  replaceDataSource(content, sourceData, targetData);
  return {
    id,
    component: 'ProModalForm',
    title,
    size: 'wide',
    children: [content],
    actions: [
      { code: 'close', label: '取消' },
      { code: 'save', label: '保存', icon: 'fa-floppy-disk' },
      { code: 'submit', label: '提交', icon: 'fa-paper-plane', type: 'primary' },
    ],
  };
}

function setReadonlyFields(value, fieldCodes) {
  if (Array.isArray(value)) {
    value.forEach((item) => setReadonlyFields(item, fieldCodes));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.code && fieldCodes.has(value.code)) {
    value.readonly = true;
    if (value.component === 'select') value.disabled = true;
  }
  Object.values(value).forEach((item) => setReadonlyFields(item, fieldCodes));
}

function setFieldValue(value, fieldCode, fieldValue) {
  if (Array.isArray(value)) {
    value.forEach((item) => setFieldValue(item, fieldCode, fieldValue));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.code === fieldCode) value.value = fieldValue;
  Object.values(value).forEach((item) => setFieldValue(item, fieldCode, fieldValue));
}

function setOverlayActionLabel(overlay, actionCode, label) {
  const action = overlay.actions?.find((item) => item.code === actionCode);
  if (!action) throw new Error(`Missing overlay action: ${overlay.id}.${actionCode}`);
  action.label = label;
}

function setEditableTableColumn(value, fieldCode) {
  if (Array.isArray(value)) {
    value.forEach((item) => setEditableTableColumn(item, fieldCode));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.component === 'EditableTable' && Array.isArray(value.columns)) {
    value.columns
      .filter((column) => column.code === fieldCode)
      .forEach((column) => {
        delete column.readonly;
        delete column.disabled;
        column.editable = true;
      });
  }
  Object.values(value).forEach((item) => setEditableTableColumn(item, fieldCode));
}

const taskTabs = taskSchema.regions.find((region) => region.id === 'task-type-tabs');
const cycleTab = taskTabs?.tabs?.find((tab) => tab.key === 'project-proposal');
if (!cycleTab) throw new Error('Missing project lifecycle task tab');
cycleTab.label = '项目周期任务（6）';
const cycleTable = cycleTab.children.find((child) => child.id === 'project-proposal-task-table');
cycleTable.pageSize = 5;

const taskById = new Map(taskSchema.mockData.projectProposals.map((row) => [row.id, row]));
const surveyTask = {
  ...taskById.get('proposal-2'),
  owner: '陆志军/李杨洋',
  currentStage: '调研问卷',
  taskType: '跨司任务',
  handleTarget: 'survey-questionnaire-handle-modal',
};
const proposalTask = {
  ...taskById.get('proposal-1'),
  currentStage: '项目方案',
  taskType: '我司任务',
  handleTarget: 'project-proposal-handle-modal',
};
const noticeTask = {
  id: 'proposal-notice',
  requirementCode: 'XQ00020044',
  requirementName: '德清威德L4级智能化水质净化需求',
  customer: '德清县威德水质净化有限公司',
  owner: '李杨洋',
  generatedAt: '2026-07-23 14:05:00',
  currentStage: '项目实施通知',
  taskType: '跨司任务',
  handleTarget: 'project-notice-handle-modal',
};
const setupTask = {
  id: 'proposal-setup',
  requirementCode: 'XQ00020052',
  requirementName: '沙河市污水厂智能化改造立项需求',
  customer: '沙河市污水处理厂',
  owner: '栗磊',
  generatedAt: '2026-07-24 09:20:00',
  currentStage: '项目立项',
  taskType: '我司任务',
  handleTarget: 'project-setup-handle-modal',
};
const milestoneTask = {
  ...taskById.get('proposal-4'),
  currentStage: '里程碑计划',
  taskType: '跨司任务',
  handleTarget: 'milestone-plan-handle-modal',
};
const progressTask = {
  ...taskById.get('proposal-5'),
  currentStage: '项目进度填报',
  taskType: '跨司任务',
  handleTarget: 'project-progress-handle-modal',
};
taskSchema.mockData.projectProposals = [
  surveyTask,
  proposalTask,
  noticeTask,
  setupTask,
  milestoneTask,
  progressTask,
];

const setupOverlay = buildTaskOverlay({
  id: 'project-setup-handle-modal',
  title: '新增项目立项',
  detailRegion: findRegion(setupSchema, 'project-setup-detail'),
  sourceData: 'projectStages',
  targetData: 'projectSetupStages',
});
setReadonlyFields(
  setupOverlay,
  new Set([
    'status',
    'noticeCode',
    'noticeName',
    'sourceCompany',
    'requirementOwner',
    'customerCode',
    'customerName',
    'industry',
    'salesOwner',
    'customerContact',
    'contactPhone',
    'projectManager',
    'projectRegion',
    'address',
    'plannedStartDate',
    'plannedFinishDate',
    'projectDays',
    'projectStatus',
    'company',
  ])
);
setEditableTableColumn(setupOverlay, 'company');
setFieldValue(setupOverlay, 'status', '草稿');

const milestoneOverlay = buildTaskOverlay({
  id: 'milestone-plan-handle-modal',
  title: '新增项目计划',
  detailRegion: findRegion(planSchema, 'project-plan-detail'),
  sourceData: 'tasks',
  targetData: 'milestonePlanDetails',
});
setReadonlyFields(milestoneOverlay, new Set(['status', 'projectType', 'planStatus', 'projectStage']));
setFieldValue(milestoneOverlay, 'status', '待审核');
setOverlayActionLabel(milestoneOverlay, 'submit', '审核提交');
const progressOverlay = buildTaskOverlay({
  id: 'project-progress-handle-modal',
  title: '项目进度填报',
  detailRegion: findRegion(progressSchema, 'project-progress-detail'),
  sourceData: 'tasks',
  targetData: 'progressTaskDetails',
});
setReadonlyFields(progressOverlay, new Set(['status', 'projectName', 'projectStage']));
setOverlayActionLabel(progressOverlay, 'submit', '审核提交');

taskSchema.overlays = taskSchema.overlays.filter(
  (overlay) =>
    !['project-setup-handle-modal', 'milestone-plan-handle-modal', 'project-progress-handle-modal'].includes(
      overlay.id
    )
);
taskSchema.overlays.push(setupOverlay, milestoneOverlay, progressOverlay);
taskSchema.mockData.projectSetupStages = clone(setupSchema.mockData.projectStages || []);
taskSchema.mockData.milestonePlanDetails = clone(planSchema.mockData.tasks || []);
taskSchema.mockData.progressTaskDetails = clone(progressSchema.mockData.tasks || []);
const managedRules = [
  '我的任务仅展示当前用户负责的 WBS 任务及项目周期任务。',
  '项目周期任务固定展示调研问卷、项目方案、项目实施通知、项目立项、里程碑计划和项目进度填报各一条。',
  '当前阶段为调研问卷时，负责人显示陆志军/李杨洋。',
  '项目立项办理时打开新增项目立项弹窗，项目需求相关信息由上游单据带入且不可编辑。',
  '项目立项弹窗的流程状态固定默认为草稿，智能体使用多选下拉。',
  '项目立项弹窗项目阶段表不显示协作公司。',
  '里程碑计划办理时打开新增项目计划弹窗；项目进度填报办理时打开项目进度填报弹窗。',
  '里程碑计划弹窗中的状态、项目类型、计划状态和项目阶段不可编辑，状态默认为待审核。',
  '项目进度填报弹窗中的状态、项目名称和项目阶段不可编辑。',
  '里程碑计划和项目进度填报办理弹窗的提交按钮名称统一为审核提交。',
];
const managedRuleFragments = [
  '我的任务仅展示',
  '项目周期任务当前阶段包含',
  '项目周期任务固定展示',
  '当前阶段为调研问卷',
  '项目立项办理时',
  '项目立项弹窗的流程状态',
  '项目立项弹窗项目阶段表中的协作公司',
  '里程碑计划办理时',
  '里程碑计划弹窗中的状态',
  '项目进度填报弹窗中的状态',
  '里程碑计划和项目进度填报办理弹窗的提交按钮',
  'WBS 任务与',
];
taskSchema.rules = [
  ...managedRules,
  ...taskSchema.rules.filter((rule) => !managedRuleFragments.some((fragment) => rule.includes(fragment))),
];

fs.writeFileSync(taskSchemaPath, `${JSON.stringify(taskSchema, null, 2)}\n`, 'utf8');
console.log(`Schema synchronized: ${path.relative(process.cwd(), taskSchemaPath)}`);
