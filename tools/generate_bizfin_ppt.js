const pptxgen = require("pptxgenjs");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Codex";
pptx.subject = "PMS业财融合汇报";
pptx.title = "PMS业财融合建设汇报";
pptx.company = "PMS业财一体化项目";
pptx.lang = "zh-CN";
pptx.theme = {
  headFontFace: "Microsoft YaHei",
  bodyFontFace: "Microsoft YaHei",
  lang: "zh-CN",
};
pptx.defineLayout({ name: "LAYOUT_WIDE", width: 13.333, height: 7.5 });

const C = {
  navy: "09245A",
  blue: "176BFF",
  bright: "2E7DFF",
  cyan: "3A8DFF",
  teal: "10B981",
  amber: "F59E0B",
  red: "EF4444",
  bg: "F4F7FC",
  card: "FFFFFF",
  line: "8DB8FF",
  text: "08245C",
  muted: "2F4A72",
  paleBlue: "F0F6FF",
  paleTeal: "EAFBF6",
  paleAmber: "FFF7E6",
  dark2: "0F172A",
};

const W = 13.333;
const H = 7.5;
const font = "Microsoft YaHei";
const out = process.env.PMS_PPT_OUT
  ? path.resolve(process.env.PMS_PPT_OUT)
  : path.resolve(__dirname, "../input/PMS业财融合建设汇报.pptx");

function base(slide, title, section, num) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg }, line: { color: C.bg } });
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.12, y: 0.12, w: 13.09, h: 7.24, rectRadius: 0.08, fill: { color: "FBFDFF" }, line: { color: "EAF1FF", width: 0.4 } });
  slide.addText(title, { x: 0.42, y: 0.32, w: 9.8, h: 0.42, fontFace: font, fontSize: 21.5, bold: true, color: C.text, margin: 0, fit: "shrink" });
  slide.addShape(pptx.ShapeType.rect, { x: 0.42, y: 0.83, w: 0.58, h: 0.045, fill: { color: C.blue }, line: { color: C.blue } });
  slide.addShape(pptx.ShapeType.line, { x: 1.04, y: 0.852, w: 1.55, h: 0, line: { color: C.blue, transparency: 20, width: 1.05 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.42, y: 6.92, w: 12.45, h: 0, line: { color: C.line, transparency: 18, width: 0.75 } });
  slide.addText(String(num).padStart(2, "0"), { x: 12.38, y: 7.05, w: 0.46, h: 0.14, fontFace: font, fontSize: 7.2, color: C.muted, align: "right", margin: 0 });
  slide.addText(section || "PMS业财融合建设汇报", { x: 0.42, y: 7.05, w: 4.4, h: 0.14, fontFace: font, fontSize: 7.2, color: C.muted, margin: 0 });
}

function text(slide, str, x, y, w, h, opt = {}) {
  slide.addText(str, {
    x, y, w, h, fontFace: font, fontSize: opt.size || 10.5, color: opt.color || C.text,
    bold: !!opt.bold, margin: opt.margin ?? 0.04, breakLine: false, fit: "shrink",
    valign: opt.valign || "top", align: opt.align || "left", paraSpaceAfterPt: opt.after ?? 2,
  });
}

function card(slide, x, y, w, h, title, body, opt = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.045,
    fill: { color: opt.fill || C.card },
    line: { color: opt.line || C.blue, width: opt.lineWidth || 0.75 },
    shadow: undefined,
  });
  if (opt.header !== false) {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h: Math.min(0.46, h * 0.32), fill: { color: opt.headerFill || C.paleBlue, transparency: 0 }, line: { color: C.blue, transparency: 100 } });
    slide.addShape(pptx.ShapeType.line, { x, y: y + Math.min(0.48, h * 0.32), w, h: 0, line: { color: C.line, width: 0.6 } });
    if (opt.badge) {
      slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: y + 0.11, w: 0.3, h: 0.3, fill: { color: C.blue }, line: { color: C.blue } });
      text(slide, opt.badge, x + 0.18, y + 0.165, 0.3, 0.1, { size: 8, color: "FFFFFF", bold: true, align: "center", margin: 0 });
      text(slide, title, x + 0.58, y + 0.16, w - 0.78, 0.16, { size: opt.titleSize || 11.8, bold: true, color: opt.titleColor || C.text, margin: 0 });
    } else {
      text(slide, title, x + 0.18, y + 0.16, w - 0.36, 0.16, { size: opt.titleSize || 11.5, bold: true, color: opt.titleColor || C.text, margin: 0 });
    }
    text(slide, body, x + 0.18, y + 0.62, w - 0.36, h - 0.72, { size: opt.bodySize || 8.7, color: opt.bodyColor || C.muted });
  } else {
    if (opt.accent) slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: opt.accent }, line: { color: opt.accent } });
    text(slide, title, x + 0.18, y + 0.15, w - 0.36, 0.26, { size: opt.titleSize || 11.5, bold: true, color: opt.titleColor || C.text });
    if (body) text(slide, body, x + 0.18, y + 0.48, w - 0.36, Math.max(0.05, h - 0.58), { size: opt.bodySize || 8.7, color: opt.bodyColor || C.muted });
  }
}

function pill(slide, label, x, y, w, color) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.28, rectRadius: 0.04, fill: { color }, line: { color } });
  text(slide, label, x, y + 0.055, w, 0.14, { size: 7.4, color: "FFFFFF", bold: true, align: "center", margin: 0 });
}

function flow(slide, items, x, y, w, color = C.blue) {
  const gap = 0.14;
  const bw = (w - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const bx = x + i * (bw + gap);
    slide.addShape(pptx.ShapeType.roundRect, { x: bx, y, w: bw, h: 0.42, rectRadius: 0.035, fill: { color: i % 2 ? "FFFFFF" : C.paleBlue }, line: { color: C.line, width: 0.75 } });
    text(slide, it, bx + 0.05, y + 0.12, bw - 0.1, 0.12, { size: 7.2, bold: true, color: C.text, align: "center", margin: 0 });
    if (i < items.length - 1) {
      slide.addShape(pptx.ShapeType.line, { x: bx + bw, y: y + 0.21, w: gap - 0.02, h: 0, line: { color, width: 1.0 } });
      text(slide, ">", bx + bw + gap - 0.06, y + 0.13, 0.08, 0.1, { size: 8, bold: true, color, align: "center", margin: 0 });
    }
  });
}

function table(slide, rows, x, y, colWs, rowH, opt = {}) {
  rows.forEach((r, i) => {
    let cx = x;
    r.forEach((cell, j) => {
      const fill = i === 0 ? (opt.header || C.paleBlue) : (i % 2 ? "FFFFFF" : "F8FAFC");
      slide.addShape(pptx.ShapeType.rect, { x: cx, y: y + i * rowH, w: colWs[j], h: rowH, fill: { color: fill }, line: { color: C.line, width: 0.5 } });
      text(slide, String(cell), cx + 0.06, y + i * rowH + 0.07, colWs[j] - 0.12, rowH - 0.1, { size: opt.size || 7.4, color: C.text, bold: i === 0, margin: 0.01, align: j > 0 && opt.numCols?.includes(j) ? "right" : "left" });
      cx += colWs[j];
    });
  });
}

function notes(slide, arr) {
  if (slide.addNotes) slide.addNotes(arr.join("\n"));
}

function addCover() {
  const s = pptx.addSlide();
  s.background = { color: C.bg };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.bg }, line: { color: C.bg } });
  s.addText("PMS 业财融合建设汇报", { x: 0.62, y: 0.52, w: 8.4, h: 0.62, fontFace: font, fontSize: 30, bold: true, color: C.text, margin: 0 });
  s.addShape(pptx.ShapeType.rect, { x: 0.62, y: 1.28, w: 0.86, h: 0.06, fill: { color: C.blue }, line: { color: C.blue } });
  s.addShape(pptx.ShapeType.line, { x: 1.52, y: 1.31, w: 3.9, h: 0, line: { color: C.blue, transparency: 28, width: 1.2 } });
  const cards = [
    ["PMS业务前端", "项目、合同、采购、费用等业务单据\n沉淀经营台账与过程数据"],
    ["用友财务核算", "正式财务核算准绳\n统一会计科目、凭证与核销规则"],
    ["业财贯通与经营分析", "发票、收付款、凭证触发接口对接\n业务财务贯通，结果可追溯"],
  ];
  cards.forEach((c, i) => card(s, 0.72 + i * 4.12, 2.05, 3.25, 1.55, c[0], c[1], { badge: String(i + 1), titleSize: 13, bodySize: 9.2 }));
  flow(s, ["业务事实", "经营台账", "发票收付", "财务凭证", "管理分析"], 1.2, 4.42, 10.8, C.blue);
  card(s, 0.88, 5.62, 11.6, 0.72, "汇报对象", "经营管理层 / 业务部门 / 财务部门    目标：以项目为载体，PMS承接业务与经营，用友承接财务核算，业财通过发票与收付款实现贯通。", { header: false, fill: "FFFFFF", line: C.blue, accent: C.blue, bodySize: 11, titleSize: 11 });
}

function addAgenda() {
  const s = pptx.addSlide(); base(s, "目录", "总体结构", 2);
  const sections = [
    ["01", "规划背景与建设目标", "业务现状、建设目标、核心原则"],
    ["02", "业财融合架构与数据闭环", "整体架构、功能主线、数据交互"],
    ["03", "核心业务场景规划", "项目、收入、采购、物资、报销、成本、财务集成、经营分析"],
    ["04", "迭代推广与待决策事项", "版本计划、推广进度、审批节点确认"],
  ];
  sections.forEach((it, i) => {
    const y = 1.62 + i * 1.18;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.78, y, w: 11.2, h: 0.82, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: C.line } });
    s.addText(it[0], { x: 1.05, y: y + 0.15, w: 0.65, h: 0.25, fontFace: font, fontSize: 14, bold: true, color: C.blue, margin: 0 });
    text(s, it[1], 1.9, y + 0.13, 3.2, 0.22, { size: 12.5, bold: true });
    text(s, it[2], 5.35, y + 0.17, 5.8, 0.22, { size: 9.5, color: C.muted });
  });
  notes(s, ["本页用于说明汇报结构：先讲为什么建，再讲怎么建，随后逐一拆解业务财务场景，最后明确迭代和需要决策的事项。"]);
}

function addStatus() {
  const s = pptx.addSlide(); base(s, "业务现状：项目型复合交付，业务和财务仍有断点", "规划背景与目标", 3);
  card(s, 0.72, 1.55, 3.8, 1.35, "业务特征", "项目类型：软件实施 / AI智控 / 运维服务\n交付形态：软件 + 硬件 + 服务\n商务节奏：试用 -> 验证 -> 正式合同", { accent: C.blue });
  card(s, 4.82, 1.55, 3.8, 1.35, "现有系统", "PMS已建需求、调研、方案、实施、立项、计划、报工、运维、客户等模块\n用友财务规划覆盖总账、应收、应付、固资、物资、税务", { accent: C.teal });
  card(s, 8.92, 1.55, 3.3, 1.35, "主要缺口", "业务与财务依赖手工对接\nExcel中转导致口径不一\n回款、成本、审批、经营报表难实时穿透", { accent: C.amber });
  flow(s, ["客户试用", "项目需求", "方案实施", "合同签订", "开票回款", "经营分析"], 0.82, 3.6, 11.2, C.blue);
  table(s, [["管理对象", "当前问题", "建设要求"], ["项目", "过程已管理，收入成本归集不足", "项目成为业财共同载体"], ["合同/回款", "计划、开票、收款割裂", "以收款计划驱动台账与发票"], ["支出/成本", "采购、报销、物资难沉淀", "形成待付、成本和凭证链路"], ["经营报表", "数据滞后、口径不一", "按项目、部门、客户、期间输出"]], 0.82, 4.55, [1.7, 4.4, 5.1], 0.36);
}

function addGoal() {
  const s = pptx.addSlide(); base(s, "建设目标：PMS管经营过程，用友管财务核算", "规划背景与目标", 4);
  goalCard(s, 0.62, 1.18, "1", "PMS业务前端", ["项目、合同、采购、费用等业务单据", "沉淀经营台账与过程数据"], "业务人员：录入、执行、跟踪");
  goalCard(s, 5.15, 1.18, "2", "用友财务核算", ["作为正式财务核算准绳", "统一会计科目、凭证与核销规则"], "财务人员：审核、记账、核销");
  goalCard(s, 9.68, 1.18, "3", "业财贯通与经营分析", ["发票、收付款触发接口对接", "业务财务贯通，结果可追溯"], "管理者：经营分析与决策");
  arrowText(s, "业务单据\n-> 经营台账", 3.78, 2.48);
  arrowText(s, "发票、收付款对接\n-> 凭证回写", 8.3, 2.48);
  controlStrip(s, 0.43, 3.95);
  text(s, "分阶段建设目标", 0.42, 4.96, 1.3, 0.22, { size: 12.2, bold: true });
  timeline(s, 2.1, 5.72);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.62, y: 6.44, w: 12.1, h: 0.46, rectRadius: 0.045, fill: { color: C.paleBlue }, line: { color: C.blue, width: 0.75 } });
  simpleBadgeIcon(s, 0.9, 6.51, 2);
  text(s, "以项目为载体，PMS承接业务与经营，用友承接财务核算，业财通过发票与收付款实现贯通。", 1.35, 6.56, 10.8, 0.12, { size: 10.2, bold: true, color: C.text, margin: 0 });
  notes(s, ["本页按参考图重做：三段目标、关键控制点、分阶段建设目标和底部总结，强调PMS、用友和业财贯通的边界。"]);
}

function slideLineArrow(slide, x, y, w) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.blue, width: 1.3 } });
  text(slide, ">", x + w - 0.06, y - 0.07, 0.18, 0.12, { size: 13, color: C.blue, bold: true, margin: 0 });
}

function goalCard(slide, x, y, idx, title, bullets, footer) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.0, h: 2.72, rectRadius: 0.06, fill: { color: "FFFFFF" }, line: { color: C.blue, width: 0.9 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 3.0, h: 0.56, fill: { color: "EFF5FF" }, line: { color: C.line, width: 0.4 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.34, y: y + 0.12, w: 0.34, h: 0.34, fill: { color: C.blue }, line: { color: C.blue } });
  text(slide, idx, x + 0.34, y + 0.19, 0.34, 0.1, { size: 9, bold: true, color: "FFFFFF", align: "center", margin: 0 });
  text(slide, title, x + 0.88, y + 0.2, 1.8, 0.16, { size: 12.8, bold: true, margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x, y: y + 2.08, w: 3.0, h: 0, line: { color: C.line, width: 0.6 } });
  iconDoc(slide, x + 0.32, y + 0.82, C.blue);
  iconDb(slide, x + 0.32, y + 1.52, C.blue);
  text(slide, `• ${bullets[0]}\n• ${bullets[1]}`, x + 0.9, y + 0.78, 1.84, 1.1, { size: 9.4, bold: true, color: C.text });
  iconUser(slide, x + 0.28, y + 2.27, C.blue);
  text(slide, footer, x + 0.75, y + 2.32, 2.05, 0.16, { size: 8.8, bold: true, color: C.text, margin: 0 });
}

function arrowText(slide, label, x, y) {
  slide.addShape(pptx.ShapeType.line, { x, y: y + 0.05, w: 1.25, h: 0, line: { color: C.blue, width: 1.4 } });
  text(slide, ">", x + 1.18, y - 0.04, 0.2, 0.12, { size: 13, color: C.blue, bold: true, margin: 0 });
  text(slide, label, x + 0.1, y - 0.42, 1.1, 0.35, { size: 9, color: C.blue, bold: true, align: "center", margin: 0 });
}

function controlStrip(slide, x, y) {
  const w = 12.78;
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.56, rectRadius: 0.035, fill: { color: "FFFFFF" }, line: { color: C.blue, width: 0.75 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 1.48, h: 0.56, fill: { color: C.blue }, line: { color: C.blue } });
  text(slide, "关键控制点", x + 0.18, y + 0.24, 1.1, 0.14, { size: 10.5, color: "FFFFFF", bold: true, margin: 0 });
  const items = ["项目贯穿全流程", "业务数据与财务数据一致", "接口触发有据可查", "凭证结果可回写、可追溯"];
  const xs = [x + 1.72, x + 4.3, x + 7.2, x + 9.9];
  items.forEach((it, i) => {
    if (i > 0) slide.addShape(pptx.ShapeType.line, { x: xs[i] - 0.2, y, w: 0, h: 0.56, line: { color: C.line, width: 0.6 } });
    simpleBadgeIcon(slide, xs[i], y + 0.13, i);
    text(slide, it, xs[i] + 0.46, y + 0.19, 2.35, 0.14, { size: 8.8, bold: true, margin: 0 });
  });
}

function timeline(slide, x, y) {
  slide.addShape(pptx.ShapeType.line, { x, y, w: 9.7, h: 0, line: { color: C.blue, width: 1.1 } });
  const phases = [
    ["一期 | 2个月", "业务台账上线\nExcel对账"],
    ["二期 | 1个月", "用友API对接\n凭证回写"],
    ["三期", "经营分析\n智能预警"],
  ];
  phases.forEach((p, i) => {
    const px = x + i * 4.0;
    slide.addShape(pptx.ShapeType.ellipse, { x: px - 0.08, y: y - 0.1, w: 0.2, h: 0.2, fill: { color: "FFFFFF" }, line: { color: C.blue, width: 1.2 } });
    slide.addShape(pptx.ShapeType.line, { x: px + 0.02, y: y - 0.72, w: 0, h: 0.42, line: { color: C.blue, width: 1.2 } });
    slide.addShape(pptx.ShapeType.rect, { x: px + 0.04, y: y - 0.72, w: 0.3, h: 0.18, fill: { color: C.blue }, line: { color: C.blue } });
    slide.addShape(pptx.ShapeType.roundRect, { x: px + 0.55, y: y - 0.55, w: 1.75, h: 0.66, rectRadius: 0.05, fill: { color: "FFFFFF" }, line: { color: C.blue, width: 0.75 } });
    text(slide, p[0], px + 0.78, y - 0.42, 1.3, 0.13, { size: 9, bold: true, color: C.blue, margin: 0 });
    text(slide, p[1], px + 0.78, y - 0.2, 1.26, 0.25, { size: 7.8, color: C.text, margin: 0 });
  });
}

function iconDoc(slide, x, y, color) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.32, h: 0.42, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 1.2 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.07, y: y + 0.15, w: 0.18, h: 0, line: { color, width: 0.8 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.07, y: y + 0.25, w: 0.18, h: 0, line: { color, width: 0.8 } });
}

function iconDb(slide, x, y, color) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.34, h: 0.14, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 1.2 } });
  slide.addShape(pptx.ShapeType.line, { x, y: y + 0.07, w: 0, h: 0.34, line: { color, width: 1.2 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.34, y: y + 0.07, w: 0, h: 0.34, line: { color, width: 1.2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x, y: y + 0.34, w: 0.34, h: 0.14, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 1.2 } });
}

function iconUser(slide, x, y, color) {
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.09, y, w: 0.18, h: 0.18, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 1 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.02, y: y + 0.42, w: 0.32, h: 0, line: { color, width: 1 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.02, y: y + 0.24, w: 0.08, h: 0.18, line: { color, width: 1 } });
  slide.addShape(pptx.ShapeType.line, { x: x + 0.26, y: y + 0.24, w: 0.08, h: 0.18, line: { color, width: 1 } });
}

function simpleBadgeIcon(slide, x, y, idx) {
  const color = C.blue;
  if (idx === 0) {
    slide.addShape(pptx.ShapeType.line, { x: x + 0.12, y: y + 0.05, w: 0, h: 0.3, line: { color, width: 1.2 } });
    slide.addShape(pptx.ShapeType.line, { x: x + 0.02, y: y + 0.18, w: 0.22, h: 0, line: { color, width: 1.2 } });
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.0, y: y + 0.3, w: 0.12, h: 0.1, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 0.8 } });
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.18, y: y + 0.3, w: 0.12, h: 0.1, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 0.8 } });
  } else if (idx === 1) iconDb(slide, x, y, color);
  else if (idx === 2) {
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.04, y, w: 0.28, h: 0.36, fill: { color: "FFFFFF", transparency: 100 }, line: { color, width: 1.1 } });
    slide.addShape(pptx.ShapeType.line, { x: x + 0.11, y: y + 0.18, w: 0.12, h: 0.09, line: { color, width: 1.1 } });
  } else iconDoc(slide, x, y, color);
}

function addPrinciples() {
  const s = pptx.addSlide(); base(s, "核心设计原则：轻量闭环优先，避免再造一套财务账", "规划背景与目标", 5);
  const principles = [
    ["01", "项目为主线", "合同、收入、支出、成本、回款都归集到项目。", "单据必须带项目或进入归属池。"],
    ["02", "收款计划为开票主线", "开票参照合同收款计划，减少多头匹配。", "开票金额不得超过计划金额。"],
    ["03", "台账不等于财务账", "PMS管经营台账，用友管正式应收、应付与凭证。", "财务结果以用友为准并回写。"],
    ["04", "发票关联业务来源", "发票不是唯一业务依据，但必须关联业务来源。", "支持项目、合同、台账穿透。"],
    ["05", "先轻量后集成", "一期保证业务可用、台账清晰；二期推进API回写。", "Excel可交接，接口可替换。"],
  ];
  principles.forEach((p, i) => {
    const y = 1.28 + i * 0.78;
    s.addShape(pptx.ShapeType.rect, { x: 0.82, y, w: 11.6, h: 0.58, fill: { color: i % 2 ? "FFFFFF" : "EEF5FF" }, line: { color: C.line, width: 0.7 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.82, y, w: 0.54, h: 0.58, fill: { color: C.blue }, line: { color: C.blue } });
    text(s, p[0], 0.94, y + 0.2, 0.28, 0.12, { size: 8.2, color: "FFFFFF", bold: true, align: "center", margin: 0 });
    text(s, p[1], 1.58, y + 0.13, 2.25, 0.14, { size: 10.6, bold: true, margin: 0 });
    text(s, p[2], 4.05, y + 0.12, 4.0, 0.16, { size: 8.2, color: C.muted, margin: 0 });
    text(s, p[3], 8.32, y + 0.12, 3.58, 0.16, { size: 8.2, color: C.text, bold: true, margin: 0 });
  });
  s.addShape(pptx.ShapeType.rect, { x: 0.92, y: 5.72, w: 11.2, h: 0.72, fill: { color: C.paleBlue }, line: { color: C.line, width: 0.8 } });
  text(s, "设计底线", 1.14, 5.95, 1.2, 0.14, { size: 10.5, bold: true, color: C.text, margin: 0 });
  text(s, "在满足业务、财务合规的前提下，尽量缩短业务流程、减少审批流；以业务事实驱动财务动作，以财务结果回写业务闭环。", 2.5, 5.9, 8.95, 0.22, { size: 8.9, color: C.muted, margin: 0 });
}

function addOverallArch() {
  const s = pptx.addSlide(); base(s, "整体架构：以项目为核心串联四类流", "业财融合架构", 6);
  s.addShape(pptx.ShapeType.ellipse, { x: 5.25, y: 2.48, w: 2.4, h: 1.15, fill: { color: C.navy }, line: { color: C.navy } });
  text(s, "项目\n共同载体", 5.52, 2.72, 1.86, 0.42, { size: 16, color: "FFFFFF", bold: true, align: "center" });
  const arcs = [
    ["业务流", "项目经营 / 合同 / 采购报销 / 物资资产 / 服务验收", 0.82, 1.64, C.blue],
    ["票据流", "开票申请 / 销项发票 / 采购收票 / 票据回写 / 税负统计", 7.98, 1.64, C.teal],
    ["资金流", "收款计划 / 回款台账 / 付款申请 / 支出台账 / 资金计划", 0.82, 4.35, C.amber],
    ["报表流", "成本归集 / 收入结构 / 费用结构 / 预算执行 / 管理看板", 7.98, 4.35, C.cyan],
  ];
  arcs.forEach(([t, b, x, y, c]) => card(s, x, y, 4.15, 1.15, t, b, { accent: c, fill: "FFFFFF", bodySize: 8.4 }));
  flow(s, ["业务事实", "经营台账", "发票收付", "财务凭证", "管理分析"], 1.45, 6.0, 10.4, C.blue);
}

function addFunctionArch() {
  const s = pptx.addSlide(); base(s, "功能架构：围绕项目展开七条主线", "业财融合架构", 7);
  const items = [
    ["项目经营", "需求、调研、方案、实施、立项、计划、运维监控"],
    ["收入回款", "收入合同、收款计划、开票申请、回款台账、收款核销"],
    ["采购付款", "采购申请、支出合同、入库验收、服务结算、付款申请"],
    ["物资资产", "物资台账、日常/项目领用、资产台账、盘点调整"],
    ["研发投入", "研发项目、研发人力、研发费用、投入归集"],
    ["财务集成", "主数据、发票、收付款、凭证、状态回写"],
    ["经营分析", "税负、费用、收入、预算、资金、回报率分析"],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    card(s, 0.88 + col * 5.85, 1.46 + row * 1.16, 5.35, 0.84, it[0], it[1], { accent: [C.blue, C.teal, C.amber, C.cyan, C.red, C.navy, C.bright][i], bodySize: 8.2, titleSize: 10.8 });
  });
  card(s, 3.78, 5.98, 5.6, 0.72, "PMS业财中台能力", "统一主数据、统一业务规则、统一数据模型、统一服务能力，支撑用友集成和经营看板。", { fill: C.paleTeal, accent: C.teal, bodySize: 8.8 });
}

function addDataFlow() {
  const s = pptx.addSlide(); base(s, "数据交互：主数据先统一，业务结果双向闭环", "业财融合架构", 8);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.56, y: 1.16, w: 8.4, h: 4.18, rectRadius: 0.04, fill: { color: "FFFFFF", transparency: 100 }, line: { color: C.blue, width: 0.75, dash: "dash" } });
  s.addShape(pptx.ShapeType.roundRect, { x: 9.2, y: 1.16, w: 2.65, h: 4.18, rectRadius: 0.04, fill: { color: "FFFFFF", transparency: 100 }, line: { color: C.blue, width: 0.75, dash: "dash" } });
  text(s, "PMS业务与经营平台", 3.45, 1.25, 2.45, 0.14, { size: 9.5, color: C.blue, bold: true, align: "center", margin: 0 });
  text(s, "用友财务核算系统", 9.72, 1.25, 1.65, 0.14, { size: 9.5, color: C.blue, bold: true, align: "center", margin: 0 });

  const nodes = [
    [0.78, "1", "统一主数据", ["客户", "供应商", "部门", "员工", "科目", "核算主体"]],
    [3.15, "2", "业务单据", ["合同", "验收", "开票申请", "采购", "报销"]],
    [5.52, "3", "经营台账", ["收入回款", "支出付款", "项目成本", "物资资产"]],
    [9.48, "4", "财务结果", ["发票", "收付款", "凭证", "核销状态"]],
  ];
  nodes.forEach(([x, n, title, items]) => dataNode(s, x, 1.72, n, title, items));
  dataArrow(s, 2.62, 3.1, 0.48);
  dataArrow(s, 4.98, 3.1, 0.48);
  dataArrow(s, 7.02, 3.1, 2.28);
  dataArrow(s, 11.78, 3.1, 0.72);
  card(s, 12.08, 2.58, 0.86, 1.04, "业务金额、\n财务金额与\n凭证状态可\n穿透核对", "", { header: false, fill: "FFFFFF", line: C.blue, titleSize: 8.2, bodySize: 7.4 });

  s.addShape(pptx.ShapeType.line, { x: 1.08, y: 5.66, w: 9.65, h: 0, line: { color: C.blue, width: 1.05 } });
  s.addShape(pptx.ShapeType.line, { x: 10.72, y: 3.98, w: 0, h: 1.68, line: { color: C.blue, width: 1.05 } });
  s.addShape(pptx.ShapeType.line, { x: 5.05, y: 4.98, w: 0, h: 0.68, line: { color: C.blue, width: 1.05 } });
  s.addShape(pptx.ShapeType.line, { x: 7.34, y: 4.98, w: 0, h: 0.68, line: { color: C.blue, width: 1.05 } });
  s.addShape(pptx.ShapeType.line, { x: 1.08, y: 4.66, w: 0, h: 1.0, line: { color: C.blue, width: 1.05 } });
  text(s, "数据贯通与闭环流转", 5.25, 5.47, 2.4, 0.14, { size: 8.5, color: C.blue, bold: true, align: "center", margin: 0 });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.76, y: 6.28, w: 11.85, h: 0.5, rectRadius: 0.04, fill: { color: C.paleBlue }, line: { color: C.blue, width: 0.75 } });
  simpleBadgeIcon(s, 2.92, 6.36, 2);
  text(s, "主数据统一、单据可关联、结果可回写、差异可追溯", 3.45, 6.4, 6.2, 0.13, { size: 11.5, bold: true, color: C.text, align: "center", margin: 0 });
}

function dataNode(slide, x, y, num, title, items) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 1.66, h: 3.02, rectRadius: 0.035, fill: { color: "FFFFFF" }, line: { color: C.blue, width: 0.8 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.18, y: y + 0.16, w: 0.3, h: 0.3, fill: { color: C.blue }, line: { color: C.blue } });
  text(slide, num, x + 0.18, y + 0.225, 0.3, 0.1, { size: 8, color: "FFFFFF", bold: true, align: "center", margin: 0 });
  text(slide, title, x + 0.54, y + 0.22, 0.92, 0.12, { size: 8.6, color: C.text, bold: true, margin: 0 });
  items.forEach((it, i) => {
    const yy = y + 0.72 + i * 0.38;
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.2, y: yy + 0.02, w: 0.14, h: 0.14, fill: { color: "FFFFFF", transparency: 100 }, line: { color: C.blue, width: 0.75 } });
    slide.addShape(pptx.ShapeType.line, { x: x + 0.23, y: yy + 0.09, w: 0.08, h: 0, line: { color: C.blue, width: 0.5 } });
    text(slide, it, x + 0.55, yy + 0.02, 0.88, 0.1, { size: 7.1, color: C.text, margin: 0 });
    if (i < items.length - 1) slide.addShape(pptx.ShapeType.line, { x: x + 0.18, y: yy + 0.28, w: 1.24, h: 0, line: { color: C.line, transparency: 35, width: 0.4 } });
  });
}

function dataArrow(slide, x, y, w) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.blue, width: 1.2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: x - 0.05, y: y - 0.045, w: 0.09, h: 0.09, fill: { color: C.blue }, line: { color: C.blue } });
  text(slide, ">", x + w - 0.05, y - 0.07, 0.12, 0.1, { size: 10, color: C.blue, bold: true, margin: 0 });
}

const scenarioSlides = [
  {
    title: "场景1：项目经营主线",
    lead: "项目从需求到运维的全生命周期管理，是收入、成本、回款、费用归集的共同载体。",
    flow: ["客户报备", "项目需求", "调研方案", "实施通知", "项目立项", "计划执行", "运维结项"],
    points: [["业务处理", "试用项目按正常项目执行，通过合同类型掌握未签、试用、正式等商务状态。"], ["财务规则", "内部项目记录投入不确认收入；外部正式项目按合同、里程碑或周期确认收入。"], ["经营洞察", "按项目查看需求、立项、计划、执行、收入、成本与回款风险。"]],
    table: [["项目类型", "合同类型", "财务处理", "收入确认"], ["内部项目", "无合同", "记录投入", "不确认"], ["外部试用", "试用协议", "记录投入", "不确认"], ["外部正式", "收入合同", "应收/收入/回款", "按里程碑/周期"]],
  },
  {
    title: "场景2：收入回款主线 - 收入确认",
    lead: "收入合同记录业务事实，再按收款计划触发收入回款台账，形成合同、项目、开票、收款的统一事实。",
    flow: ["签订合同", "拆分计划", "业务确认", "形成台账", "用友凭证"],
    points: [["触发条件", "合同生效、收款计划到期、验收节点达成。"], ["规范条件", "收入合同原则上必须关联唯一项目；验收、开票、收款前完成项目归属。"], ["经营洞察", "查看合同额、计划额、已开票、已收款、未收款和到期风险。"]],
  },
  {
    title: "场景3：收入回款主线 - 销项开票",
    lead: "开票申请统一参照收入合同和收款计划，确保发票不脱离项目、合同和业务阶段。",
    flow: ["选择合同", "选择节点", "发起申请", "财务确认", "销项开票", "发票回写", "生成凭证"],
    points: [["校验规则", "开票金额 <= 收款计划金额；开票科目 = 合同约定科目；客户税号 = 主数据税号。"], ["业务处理", "支持单节点、多节点合并、蓝字开票、红字发票和跨期开票。"], ["经营洞察", "查看已开票、未开票、提前开票及开票回款风险。"]],
  },
  {
    title: "场景4：收入回款主线 - 收款核销",
    lead: "收款单与收入台账、发票形成核销关系，保障业务发生、发票开具和资金到账一致。",
    flow: ["收款登记", "自动匹配", "财务确认", "收款核销", "用友凭证", "差异预警"],
    points: [["特殊场景", "预收款、部分付款、合并付款、尾差均需可识别和可追踪。"], ["匹配逻辑", "按客户、金额、合同、项目、发票号进行自动匹配，异常转人工确认。"], ["经营洞察", "识别已收未开、已开未收、超期应收和催收重点。"]],
  },
  {
    title: "场景5：采购付款主线 - 物料采购",
    lead: "可入库、可领用、可消耗的实物采购，通过入库形成物料台账和支出付款台账。",
    flow: ["采购申请", "采购订单", "合同判断", "入库验收", "生成台账", "采购收票", "付款申请", "对公付款", "用友凭证"],
    points: [["关键差异", "物资台账记录“物”的数量和状态；支出付款台账记录“钱”的应付、已付、未付。"], ["规范条件", "采购类型、项目归属、入库数量、入库金额必须明确。"], ["经营洞察", "查看项目物资成本、物资来源、待收票和待付款压力。"]],
  },
  {
    title: "场景6：采购付款主线 - 服务采购",
    lead: "无实物入库的服务采购，以服务成果、服务过程或人力投入作为交付对象。",
    flow: ["采购申请", "订单/合同", "服务执行", "服务结算", "支出台账", "采购收票", "付款申请", "用友凭证"],
    points: [["业务处理", "服务结算后生成支出台账，收票参照支出付款台账，可挂外部项目或内部项目。"], ["规范条件", "结算单需说明服务期间、成果、验收责任人和金额。"], ["经营洞察", "查看服务成本、待收票、待付款和项目利润影响。"]],
  },
  {
    title: "场景7：采购付款主线 - 固资采购",
    lead: "价值高、使用周期长的实物资产，验收后进入资产卡片、固资台账和支出付款台账。",
    flow: ["采购申请", "采购订单", "合同判断", "固资验收", "资产卡片", "采购收票", "付款申请", "用友凭证", "折旧分摊"],
    points: [["关键时点", "以“入库验收合格”为资产形成和凭证生成的关键时点。"], ["规范条件", "单价达到配置阈值且使用年限超过1年，按固定资产管理。"], ["经营洞察", "查看固资规模、供应商分布、验收合格率和折旧对成本的影响。"]],
  },
  {
    title: "场景8：物资管理主线",
    lead: "物资管理解决买入后去向不清的问题，支撑项目成本真实性和资产责任管理。",
    flow: ["物资台账", "项目/部门领用", "财务凭证", "物资盘点", "物资调整"],
    points: [["业务处理", "区分内部物资、项目物资；外部项目领用进入项目成本，内部项目按资产或费用处理。"], ["规范条件", "物料按编码和类别管理，领用必须关联项目或部门，安全库存触发预警。"], ["经营洞察", "查看采购规模、周转效率、领用项目分布和占用情况。"]],
  },
  {
    title: "场景9：费用报销主线",
    lead: "费用报销解决差旅、招待、日常采购等零散支出的合规管控、入账与归集问题。",
    flow: ["事前申请", "报销单", "审批通过", "支出台账", "付款单", "用友凭证"],
    points: [["流程范围", "差旅、招待、日常采购分别走对应申请和报销流程。"], ["规范条件", "发票抬头必须为公司；招待费需事前申请；报销单必须关联项目或部门。"], ["经营洞察", "查看费用结构、部门占比、报销时效和异常报销预警。"]],
  },
  {
    title: "场景10：成本归集主线",
    lead: "成本归集解决多部门、多项目下成本归集与分摊问题，支撑项目利润真实性核算。",
    flow: ["成本要素采集", "直接成本归集", "间接成本分摊", "成本计算", "成本调整", "成本分析"],
    points: [["成本要素", "采购成本、物资领用、费用报销、折旧等来源都需沉淀到项目或部门。"], ["调整机制", "支持人工、管理费用等成本调整，后续可固化为系统规则。"], ["经营洞察", "查看项目成本构成、毛利变化和成本异常预警。"]],
    table: [["类型", "数据来源", "归集方式"], ["采购成本", "采购订单", "项目/部门"], ["物资领用", "领用单", "项目/部门"], ["费用报销", "报销单", "项目/部门"], ["折旧", "用友资产", "按规则分摊"]],
  },
  {
    title: "场景11：财务集成主线",
    lead: "财务集成解决PMS与用友之间的数据贯通，支撑业务过程实时可见财务结果和穿透查询。",
    flow: ["主数据", "业务单据", "Excel/API", "用友核算", "凭证状态", "PMS回写", "定期对账"],
    points: [["一期", "Excel导入导出，先保证口径统一和人工可交接。"], ["二期", "用友API接口，处理主数据、发票、收付款、凭证和状态回写。"], ["异常处理", "接口失败重试3次；差异预警转人工对账；业务单据唯一编码防重复。"]],
    table: [["类型", "阶段", "流向"], ["客户/供应商/项目", "一期", "PMS -> 用友"], ["发票/收付款", "二期", "PMS -> 用友"], ["凭证号/状态", "二期", "用友 -> PMS"], ["差异预警", "三期", "双向校验"]],
  },
  {
    title: "场景12：经营分析主线",
    lead: "经营分析解决业务与财务数据割裂、决策依据不足的问题，支撑多维经营指标和异常预警。",
    flow: ["月结数据", "项目口径", "部门口径", "客户口径", "期间趋势", "经营报告", "AI建议"],
    points: [["指标范围", "收入、成本、毛利、回款、应收、预算执行、现金流。"], ["报表要求", "税负统计、费用结构、收入结构、预算执行、资金计划、财务回报率。"], ["经营洞察", "按项目优先，其次部门、客户、期间，输出收入结构、利润贡献和异常预警。"]],
    table: [["指标", "公式/口径", "用途"], ["收入", "已确认收入", "业绩核算"], ["成本", "项目成本", "利润分析"], ["毛利", "收入-成本", "项目盈利"], ["回款", "实际到账", "现金流"], ["应收", "已开票未回", "催收预警"]],
  },
];

function addScenario(obj, idx) {
  const s = pptx.addSlide(); base(s, obj.title, "核心业务场景规划", 9 + idx);
  card(s, 0.72, 1.42, 11.9, 0.94, "场景定位", obj.lead, { fill: "FFFFFF", accent: C.blue, bodySize: 8.9, titleSize: 10.5 });
  flow(s, obj.flow, 0.78, 2.72, 11.82, idx % 2 ? C.teal : C.blue);
  obj.points.forEach((p, i) => card(s, 0.78 + i * 4.0, 3.62, 3.65, 1.25, p[0], p[1], { accent: [C.blue, C.teal, C.amber][i], bodySize: 8.1, titleSize: 10.2 }));
  if (obj.table) table(s, obj.table, 1.08, 5.2, obj.table[0].length === 4 ? [2.05, 2.25, 2.4, 3.25] : [2.6, 3.55, 3.8], 0.33, { size: 7.2 });
  else card(s, 1.05, 5.18, 10.9, 0.82, "业务-财务穿透口径", "所有场景均要求业务单据、台账、发票/收付款、凭证状态可追溯；财务已记账后，业务侧修改需走冲销、红冲或调整流程，不直接改历史结果。", { fill: C.paleBlue, accent: C.navy, bodySize: 8.5 });
  notes(s, [obj.lead, ...obj.points.map(p => `${p[0]}：${p[1]}`)]);
}

function addRoadmap() {
  const s = pptx.addSlide(); base(s, "PMS业财融合迭代版本计划", "迭代及推广计划", 21);
  const phases = [
    ["一期", "2-3个月", "业务台账上线 + Excel对账", "收入回款、支出付款、采购收票、付款申请、基础报表"],
    ["二期", "1个月", "用友API对接 + 凭证回写", "主数据同步、发票收付、凭证生成、状态回写"],
    ["三期", "持续优化", "经营分析报表 + 智能预警 + AI赋能", "项目利润、现金流、预算执行、异常预警、数字员工建议"],
  ];
  phases.forEach((p, i) => {
    const x = 0.9 + i * 4.05;
    slidePhase(s, x, 1.65, p, [C.blue, C.teal, C.amber][i]);
  });
  flow(s, ["轻量闭环", "统一口径", "接口贯通", "自动对账", "智能预警"], 1.2, 5.86, 10.9, C.blue);
}

function slidePhase(s, x, y, p, color) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.55, h: 3.5, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: C.line }, shadow: { type: "outer", color: "94A3B8", opacity: 0.13, blur: 1, angle: 45, offset: 1 } });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 3.55, h: 0.55, fill: { color }, line: { color } });
  text(s, `${p[0]} | ${p[1]}`, x + 0.18, y + 0.18, 3.15, 0.16, { size: 10, bold: true, color: "FFFFFF", margin: 0 });
  text(s, p[2], x + 0.2, y + 0.82, 3.15, 0.38, { size: 14, bold: true, color: C.text });
  text(s, p[3], x + 0.2, y + 1.62, 3.15, 1.18, { size: 8.8, color: C.muted });
}

function addRollout() {
  const s = pptx.addSlide(); base(s, "PMS业财推广整体进度", "迭代及推广计划", 22);
  card(s, 0.72, 1.48, 4.2, 0.82, "推广策略", "以长沙为基线版本，各公司推广并适配差异化需求；录入数据规范检查责任人：柳博。", { accent: C.blue, bodySize: 8.6 });
  table(s, [["公司", "当前状态", "责任人"], ["昕彤赋能（长沙）人工智能行业应用系统有限公司", "一期功能上线，规划财务对接，需业务补录数据", "业务人员 / 柳博 / 张贵"], ["昕彤赋能（武汉）设计研究有限公司", "已完成流程及人员配置并交付武汉", "柳博 / 柏彬 / 张贵"], ["昕彤智能装备科技（东莞）有限公司", "未提交特殊流程，已完成流程及人员配置", "柳博 / 柏彬"], ["上海混溟智能技术有限公司等7家公司", "未开始", "待明确"]], 0.72, 2.62, [5.1, 4.75, 2.0], 0.48, { size: 7.6 });
  card(s, 7.15, 1.48, 5.42, 0.82, "推广关注点", "先确保基线流程、人员、权限、基础数据、财务映射口径可复用，再处理各公司的差异流程。", { accent: C.teal, bodySize: 8.6 });
  pill(s, "已上线", 7.28, 6.26, 0.9, C.teal); pill(s, "已配置", 8.34, 6.26, 0.9, C.blue); pill(s, "未开始", 9.4, 6.26, 0.9, C.amber);
}

function addDecisions() {
  const s = pptx.addSlide(); base(s, "待决策事项：审批节点与权责边界", "待决策事项", 23);
  const decisions = [
    ["采购申请", "需求部门 / 项目负责人 / 财务 / 采购", "预算余额、供应商、是否需合同"],
    ["收入合同", "业务负责人 / 合同管理员 / 财务 / 领导", "项目归属、收款计划、开票科目"],
    ["招待申请/报销", "部门负责人 / 财务 / 领导", "事前申请、标准、发票合规"],
    ["差旅申请/报销", "部门负责人 / 项目负责人 / 财务", "出差标准、项目归属、垫付款"],
    ["日常报销", "部门负责人 / 财务", "费用类别、项目或部门归集"],
    ["服务验收", "项目负责人 / 业务负责人 / 财务", "服务期间、成果、金额、付款条件"],
  ];
  decisions.forEach((d, i) => {
    const x = 0.72 + (i % 2) * 6.1;
    const y = 1.32 + Math.floor(i / 2) * 1.32;
    card(s, x, y, 5.62, 1.04, d[0], `节点：${d[1]}\n关注：${d[2]}`, { badge: String(i + 1), bodySize: 8.0, titleSize: 10.5, fill: i % 2 ? "FFFFFF" : "F4F8FF" });
  });
  card(s, 0.92, 5.75, 11.2, 0.78, "决策建议", "优先确认高频、高金额、高风险流程；流程节点以“足够管控、不过度审批”为原则，先形成可执行基线，再对特殊公司或特殊项目做差异化扩展。", { fill: C.paleAmber, accent: C.amber, bodySize: 8.7 });
}

const builders = [
  addCover,
  addAgenda,
  addStatus,
  addGoal,
  addPrinciples,
  addOverallArch,
  addFunctionArch,
  addDataFlow,
  ...scenarioSlides.map((_, i) => () => addScenario(scenarioSlides[i], i)),
  addRoadmap,
  addRollout,
  addDecisions,
];

const only = process.env.PMS_PPT_ONLY ? Number(process.env.PMS_PPT_ONLY) : null;
const limit = process.env.PMS_PPT_LIMIT ? Number(process.env.PMS_PPT_LIMIT) : null;
if (only) {
  builders[only - 1]();
} else {
  builders.slice(0, limit || builders.length).forEach((build) => build());
}

pptx.writeFile({ fileName: out });
