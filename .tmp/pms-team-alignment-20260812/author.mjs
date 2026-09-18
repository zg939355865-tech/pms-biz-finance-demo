import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const finalPptx = 'D:/项目AI协作/4、PMS业财一体化/docs/测试/PMS业财一体化功能介绍_团队对齐版_20260812.pptx';
const previewDir = './final-preview';
const layoutDir = './final-layout';

const p = await PresentationFile.importPptx(await FileBlob.load('./template-starter.pptx'));

function shapeById(slide, id) {
  const found = slide.shapes.items.find((x) => String(x.id) === String(id));
  if (!found) throw new Error(`Missing shape ${id}`);
  return found;
}

function setText(slideNo, shapeId, text) {
  shapeById(p.slides.getItem(slideNo - 1), shapeId).text.set(text);
}

function removeShape(slideNo, shapeId) {
  const s = p.slides.getItem(slideNo - 1);
  const found = s.shapes.items.find((x) => String(x.id) === String(shapeId));
  if (found) found.delete();
}

function setTable(slideNo, values) {
  p.slides.getItem(slideNo - 1).tables.items[0].setValues(values);
}

function notes(slideNo, sourceLines) {
  const s = p.slides.getItem(slideNo - 1);
  s.speakerNotes.textFrame.setText(`[Sources]\n${sourceLines.join('\n')}\n[/Sources]`);
  s.speakerNotes.setVisible(true);
}

// 1 — Opening
setText(1, '4', 'PMS 业财一体化\n功能介绍');
setText(1, '5', '以项目为核心，贯通业务与财务\n团队对齐版｜2026-08-12');
notes(1, ['- 项目 AGENTS.md：系统定位与核心架构']);

// 2 — Agenda
setText(2, '2', '2');
setText(2, '3', '功能介绍路线');
setTable(2, [
  ['01', '建设目标：为什么要做业财一体化'],
  ['02', '功能全景：系统覆盖哪些能力'],
  ['03', '核心链路：项目如何贯通业务与财务'],
  ['04', '关键模块：如何支撑日常运营'],
  ['05', '控制机制：如何保障一致、合规、可追溯'],
  ['06', '落地路径：如何分阶段交付与验收'],
]);
removeShape(2, '5');
notes(2, ['- 项目 AGENTS.md：菜单结构、核心架构', '- rules/project-standard.md：项目级交付准则']);

// 3 — Why
setText(3, '532', '3');
setText(3, '533', '目标不是“多一个系统”，而是形成同一套经营事实');
setText(3, '3', '业务协同\n围绕项目统一组织需求、方案、计划、任务和审批，减少跨部门信息断点。');
setText(3, '4', '统一项目主线\n明确责任与状态\n过程可追踪');
setText(3, '11', '财务闭环\n业务单据驱动预算、收支和凭证，确保数据同源、金额一致、差异可追溯。');
setText(3, '13', '预算前置控制\n单据自动映射\n实时业财对账');
setText(3, '14', '共同目标\n项目是业务与财务的共同载体。系统把“发生了什么、由谁处理、影响多少预算、形成什么核算结果”连成一条链路。');
setText(3, '26', '团队需要围绕统一对象、统一状态、统一金额口径协作，避免业务台账与财务账各自解释。');
removeShape(3, '5');
notes(3, ['- 项目 AGENTS.md：PMS 业财一体化核心架构', '- rules/common.md：业务与财务双向数据一致性']);

// 4 — Landscape
setText(4, '532', '4');
setText(4, '533', '功能全景围绕项目全生命周期展开');
setText(4, '8', '待办与流程\n我的审批、我的任务、流程指引，统一承接待办、办理和状态跟踪。');
setText(4, '10', '项目前期\n项目需求、调研问卷、项目方案、实施通知，沉淀从需求到启动的决策依据。');
setText(4, '3', '项目管理\n项目类型、计划模板、立项、计划和进度填报，形成全过程执行基线。');
setText(4, '5', '报表与监控\n任务看板与运营分析聚合进度、运行状态和异常。');
setText(4, '6', '系统能力覆盖“发起—审批—执行—监控—复盘”，并通过项目、合同、预算、收支、凭证实现业财穿透。');
removeShape(4, '11');
notes(4, ['- 项目 AGENTS.md：菜单结构', '- inputs/excel/menu/menu-simple.xlsx：菜单源文件']);

// 5 — Chain
setText(5, '4', '5');
setText(5, '11', '项目贯通端到端业财链路');
setText(5, '16', '项目与合同\n项目归集收入、采购与责任\n合同明确权责与金额');
setText(5, '17', '预算与执行\n业务发生前校验预算\n超预算拦截或追加审批');
setText(5, '18', '收支与核算\n开票、收付和核销形成财务依据\n业务单据生成或关联凭证');
setText(5, '9', '立项/签约');
setText(5, '13', '执行/控制');
setText(5, '14', '核算/对账');
removeShape(5, '7');
notes(5, ['- 项目 AGENTS.md：项目→合同→预算→收支→凭证', '- rules/data-standard.md：业务单据与财务凭证一致性']);

// 6 — Lifecycle capabilities
setText(6, '532', '6');
setText(6, '533', '项目全生命周期由四组能力协同支撑');
setText(6, '3', '从需求到运营分析，系统持续保留数据、责任人、状态和业务依据，为核算与分析提供可追溯来源。');
setText(6, '15', '前期决策');
setText(6, '12', '登记需求、完成调研、评审方案并发布通知，明确做什么、何时启动。');
setText(6, '17', '计划执行');
setText(6, '16', '立项、计划模板、WBS 和进度填报，建立目标—任务—责任—进度基线。');
setText(6, '19', '协同审批');
setText(6, '18', '审批、任务与流程指引承接跨角色办理，统一状态和处理轨迹。');
setText(6, '21', '分析监控');
setText(6, '20', '看板、运营分析、运行监控与需求跟踪，识别延期、阻塞和改进机会。');
removeShape(6, '2');
notes(6, ['- 项目 AGENTS.md：菜单结构与标签页机制', '- outputs/reports/project-acceptance-report-2026-07-24.md：交付页面范围']);

// 7 — Controls
setText(7, '2', '7');
setText(7, '3', '四类控制确保业务与财务始终对得上');
setText(7, '10', '预算前置控制\n合同、采购、报销、付款发生前校验预算；超预算拦截或审批。');
setText(7, '11', '单据—凭证映射\n业务单据生成或关联凭证，保留来源、金额、核算主体与状态。');
setText(7, '4', '多核算主体\n多公司、多部门独立核算与汇总；跨公司事项保留责任和协同台账。');
setText(7, '5', '实时业财对账\n业务与凭证金额逐笔核对；异常可穿透回业务单据。');
removeShape(7, '6');
notes(7, ['- 项目 AGENTS.md：预算、多主体、对账机制', '- rules/data-standard.md：凭证状态与金额一致性']);

// 8 — Monitoring
setText(8, '532', '8');
setText(8, '533', '协同与监控让问题在执行中可见');
setText(8, '4', '工作协同\n按角色呈现审批和任务\n计划与看板明确责任、期限和状态');
setText(8, '7', '管理洞察\n运营分析聚合进度与异常\n指标可穿透明细');
removeShape(8, '2');
notes(8, ['- 项目 AGENTS.md：待办事项与报表管理', '- pages/：现有功能页面目录']);

// 9 — Principles table
setText(9, '532', '9');
setText(9, '533', '实施遵循“数据同源、规则前置、结果可验”');
setText(9, '14', '落地不是一次性堆功能，而是把业务口径、页面交互、数据结构和验收规则固化到统一生成与检查链路中。');
setTable(9, [
  ['原则', '业务要求', '系统机制', '验收证据', '结果'],
  ['项目主线', '对象统一', '项目编码贯穿单据', '链路可穿透', '同源'],
  ['预算前置', '先控后办', '余额校验与策略', '超预算用例', '可控'],
  ['业务驱动', '单据入账', '映射凭证与状态', '金额一致检查', '一致'],
  ['权限分层', '职责清晰', '角色/状态权限', '按钮与流程用例', '合规'],
  ['组件复用', '交互统一', '公共资源中心', '组件覆盖检查', '稳定'],
  ['自动校验', '质量可证', 'Schema/页面检查', '结构与视觉报告', '可验'],
  ['菜单交付', '入口统一', 'Excel 生成菜单', '路径存在检查', '可用'],
  ['持续迭代', '小步交付', '模块化覆盖更新', '回归与版本记录', '可持续'],
]);
removeShape(9, '3');
notes(9, ['- rules/project-standard.md：标准生成链路与项目级验收', '- docs/pms-html-prototype-generation-workflow.md：Schema 原型生成流程']);

// 10 — Roadmap
setText(10, '4', '10');
setText(10, '11', '分三阶段推进：先主线、再业财、后分析');
setText(10, '16', '阶段一｜协同主线\n固化需求、立项、计划与任务入口\n统一项目对象和状态');
setText(10, '17', '阶段二｜业财闭环\n接入合同、预算、开票与收付\n打通核销、凭证和对账');
setText(10, '18', '阶段三｜经营分析\n完善任务看板和运营分析\n建立运行监控与异常闭环');
setText(10, '9', '统一对象');
setText(10, '13', '统一口径');
setText(10, '14', '统一洞察');
removeShape(10, '7');
notes(10, ['- 项目 AGENTS.md：按菜单模块分次交付', '- docs/project-structure.md：需求→蓝图→Schema→HTML→检查→菜单链路']);

// 11 — Actions
setText(11, '556', '11');
setText(11, '557', '下一步聚焦三项团队行动');
setText(11, '558', '统一业务口径\n确认项目、合同和预算口径\n确认收支、凭证状态与金额\n登记争议项');
setText(11, '559', '确定交付优先级\n按菜单模块排列版本\n优先打通高频业务\n落实关键业财控制');
setText(11, '560', '建立验收闭环\n验证结构、交互和权限\n验证金额一致与穿透链路\n检查桌面端展示');
removeShape(11, '2');
notes(11, ['- rules/project-standard.md：页面、权限与交付准则', '- 项目 AGENTS.md：规范检查清单']);

// 12 — Closing
setText(12, '4', '谢谢');
setText(12, '5', 'PMS 业财一体化\n以项目贯通业务与财务');
notes(12, ['- 项目 AGENTS.md：PMS 业财一体化核心架构']);

await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of p.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, '0')}`;
  const png = await p.export({ slide, format: 'png', scale: 1.5 });
  await fs.writeFile(path.join(previewDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text(), 'utf8');
}
const montage = await p.export({ format: 'webp', montage: true, scale: 1 });
await fs.writeFile('./final-montage.webp', new Uint8Array(await montage.arrayBuffer()));
await fs.mkdir(path.dirname(finalPptx), { recursive: true });
const pptx = await PresentationFile.exportPptx(p);
await pptx.save(finalPptx);
const inspection = await p.inspect({ kind: 'slide,textbox,shape,table,notes,layout', maxChars: 200000 });
await fs.writeFile('./final-inspect.ndjson', inspection.ndjson, 'utf8');
console.log(finalPptx);
