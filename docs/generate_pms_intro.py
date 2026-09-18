from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# PMS 业财一体化产品介绍 PPT
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# 配色方案 - 科技深蓝风格
primary = RGBColor(15, 40, 80)      # 深蓝
secondary = RGBColor(30, 100, 180)  # 中蓝
accent = RGBColor(0, 200, 150)      # 青色
light = RGBColor(240, 248, 255)     # 浅蓝背景
text_dark = RGBColor(30, 30, 30)
white = RGBColor(255, 255, 255)

def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_title_bar(slide, title):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(1.3))
    bar.fill.solid()
    bar.fill.fore_color.rgb = primary
    bar.line.fill.background()

    txBox = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12), Inches(0.8))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = white

# 第1页：封面
slide1 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide1, primary)

# 装饰线条
line1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(5.5), Inches(13.333), Inches(0.05))
line1.fill.solid()
line1.fill.fore_color.rgb = accent
line1.line.fill.background()

line2 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(6.5), Inches(13.333), Inches(0.02))
line2.fill.solid()
line2.fill.fore_color.rgb = RGBColor(100, 150, 200)
line2.line.fill.background()

# 主标题
title_box = slide1.shapes.add_textbox(Inches(1), Inches(2), Inches(11), Inches(1.5))
tf = title_box.text_frame
p = tf.paragraphs[0]
p.text = "PMS 业财一体化平台"
p.font.size = Pt(54)
p.font.bold = True
p.font.color.rgb = white
p.alignment = PP_ALIGN.CENTER

# 副标题
sub_box = slide1.shapes.add_textbox(Inches(1), Inches(3.8), Inches(11), Inches(0.8))
tf2 = sub_box.text_frame
p2 = tf2.paragraphs[0]
p2.text = "以项目为载体 · 让业务流与财务流同步流转"
p2.font.size = Pt(24)
p2.font.color.rgb = accent
p2.alignment = PP_ALIGN.CENTER

# 底部信息
footer = slide1.shapes.add_textbox(Inches(1), Inches(6.8), Inches(11), Inches(0.5))
tf3 = footer.text_frame
p3 = tf3.paragraphs[0]
p3.text = "高保真原型 · 业财闭环 · 智能决策"
p3.font.size = Pt(16)
p3.font.color.rgb = RGBColor(180, 200, 220)
p3.alignment = PP_ALIGN.CENTER

# 第2页：核心价值
slide2 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide2, white)
add_title_bar(slide2, "核心价值")

values = [
    ("业财一体", "业务发生即财务发生\n数据自动穿透"),
    ("项目全周期", "从立项到验收\n全流程可视化"),
    ("智能决策", "多维数据看板\n决策有据可依"),
    ("高效协同", "待办驱动执行\n流程无缝衔接")
]

for i, (title, desc) in enumerate(values):
    x = Inches(0.5 + (i % 2) * 6.5)
    y = Inches(1.8 + (i // 2) * 2.8)

    # 卡片背景
    card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(6), Inches(2.5))
    card.fill.solid()
    card.fill.fore_color.rgb = light
    card.line.fill.background()

    # 数字标识
    num_box = slide2.shapes.add_textbox(x + Inches(0.3), y + Inches(0.3), Inches(1), Inches(0.8))
    tf_num = num_box.text_frame
    p_num = tf_num.paragraphs[0]
    p_num.text = f"0{i+1}"
    p_num.font.size = Pt(36)
    p_num.font.bold = True
    p_num.font.color.rgb = accent

    # 标题
    title_box2 = slide2.shapes.add_textbox(x + Inches(1.3), y + Inches(0.4), Inches(4.5), Inches(0.6))
    tf_t = title_box2.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = primary

    # 描述
    desc_box = slide2.shapes.add_textbox(x + Inches(0.3), y + Inches(1.3), Inches(5.5), Inches(1))
    tf_d = desc_box.text_frame
    tf_d.word_wrap = True
    p_d = tf_d.paragraphs[0]
    p_d.text = desc
    p_d.font.size = Pt(16)
    p_d.font.color.rgb = text_dark

# 第3页：功能矩阵
slide3 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide3, white)
add_title_bar(slide3, "功能矩阵")

modules = [
    ("流程指引", "可视化流程图", "process-guide.html"),
    ("待办事项", "审批 + 任务", "my-approval.html\nmy-task.html"),
    ("项目前期", "需求 → 方案 → 通知", "project-requirement.html\nsurvey-questionnaire.html\nproject-proposal.html\nproject-notice.html"),
    ("项目管理", "类型 → 计划 → 进度", "project-type.html\nplan-template.html\nproject-setup.html\nproject-plan.html\nproject-progress.html"),
    ("报表管理", "看板 + 分析 + 监控", "wbs-kanban.html\nagent-cockpit.html\nagent-monitor.html\nrequirement-trace.html"),
    ("使用指南", "帮助文档", "user-guide.html")
]

for i, (module, desc, files) in enumerate(modules):
    x = Inches(0.4 + (i % 3) * 4.3)
    y = Inches(1.6 + (i // 3) * 3)

    # 模块框
    box = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(4), Inches(2.7))
    box.fill.solid()
    box.fill.fore_color.rgb = primary if i % 2 == 0 else secondary
    box.line.fill.background()

    # 模块名
    m_box = slide3.shapes.add_textbox(x + Inches(0.3), y + Inches(0.3), Inches(3.5), Inches(0.6))
    tf_m = m_box.text_frame
    p_m = tf_m.paragraphs[0]
    p_m.text = module
    p_m.font.size = Pt(22)
    p_m.font.bold = True
    p_m.font.color.rgb = white

    # 描述
    d_box = slide3.shapes.add_textbox(x + Inches(0.3), y + Inches(1), Inches(3.5), Inches(0.5))
    tf_d = d_box.text_frame
    p_d = tf_d.paragraphs[0]
    p_d.text = desc
    p_d.font.size = Pt(14)
    p_d.font.color.rgb = accent

    # 文件
    f_box = slide3.shapes.add_textbox(x + Inches(0.3), y + Inches(1.6), Inches(3.5), Inches(1))
    tf_f = f_box.text_frame
    tf_f.word_wrap = True
    p_f = tf_f.paragraphs[0]
    p_f.text = files
    p_f.font.size = Pt(11)
    p_f.font.color.rgb = RGBColor(200, 220, 240)

# 第4页：业财链路
slide4 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide4, white)
add_title_bar(slide4, "业财一体化链路")

# 中心项目
center = slide4.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.4), Inches(3), Inches(2.5), Inches(1.5))
center.fill.solid()
center.fill.fore_color.rgb = primary
center.line.fill.background()

proj_box = slide4.shapes.add_textbox(Inches(5.5), Inches(3.4), Inches(2.3), Inches(0.8))
tf_proj = proj_box.text_frame
p_proj = tf_proj.paragraphs[0]
p_proj.text = "项目"
p_proj.font.size = Pt(20)
p_proj.font.bold = True
p_proj.font.color.rgb = white
p_proj.alignment = PP_ALIGN.CENTER

# 左侧业务流
left_items = ["需求立项", "合同管理", "预算管理", "收支管理"]
for i, item in enumerate(left_items):
    y = Inches(1.8 + i * 1.3)
    box = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), y, Inches(2.2), Inches(0.9))
    box.fill.solid()
    box.fill.fore_color.rgb = secondary
    box.line.fill.background()

    t = slide4.shapes.add_textbox(Inches(0.9), y + Inches(0.2), Inches(2), Inches(0.5))
    tf_t = t.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = item
    p_t.font.size = Pt(16)
    p_t.font.bold = True
    p_t.font.color.rgb = white
    p_t.alignment = PP_ALIGN.CENTER

# 连接线
from pptx.enum.shapes import MSO_CONNECTOR
for i in range(4):
    y = Inches(2.25 + i * 1.3)
    line = slide4.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(3), y, Inches(2.3), Inches(0.4))
    line.fill.solid()
    line.fill.fore_color.rgb = accent
    line.line.fill.background()

# 右侧财务流
right_items = ["凭证生成", "成本核算", "财务报表", "审计合规"]
for i, item in enumerate(right_items):
    y = Inches(1.8 + i * 1.3)
    box = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(10.3), y, Inches(2.2), Inches(0.9))
    box.fill.solid()
    box.fill.fore_color.rgb = RGBColor(0, 140, 120)
    box.line.fill.background()

    t = slide4.shapes.add_textbox(Inches(10.4), y + Inches(0.2), Inches(2), Inches(0.5))
    tf_t = t.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = item
    p_t.font.size = Pt(16)
    p_t.font.bold = True
    p_t.font.color.rgb = white
    p_t.alignment = PP_ALIGN.CENTER

# 连接线
for i in range(4):
    y = Inches(2.25 + i * 1.3)
    line = slide4.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(8), y, Inches(2.2), Inches(0.4))
    line.fill.solid()
    line.fill.fore_color.rgb = accent
    line.line.fill.background()

# 第5页：已完成页面一览
slide5 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide5, white)
add_title_bar(slide5, "已完成原型页面")

pages = [
    "index.html", "process-guide.html", "my-approval.html", "my-task.html",
    "project-requirement.html", "survey-questionnaire.html", "project-proposal.html", "project-notice.html",
    "project-type.html", "plan-template.html", "project-setup.html", "project-plan.html",
    "project-progress.html", "wbs-kanban.html", "agent-cockpit.html", "agent-monitor.html",
    "requirement-trace.html", "user-guide.html", "digital-employee.html"
]

for i, page in enumerate(pages):
    col = i % 5
    row = i // 5
    x = Inches(0.4 + col * 2.5)
    y = Inches(1.6 + row * 1.4)

    box = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(2.3), Inches(1.1))
    box.fill.solid()
    box.fill.fore_color.rgb = light if row % 2 == 0 else RGBColor(230, 240, 250)
    box.line.fill.background()

    # 序号
    num = slide5.shapes.add_textbox(x + Inches(0.1), y + Inches(0.1), Inches(0.5), Inches(0.4))
    tf_n = num.text_frame
    p_n = tf_n.paragraphs[0]
    p_n.text = f"{i+1:02d}"
    p_n.font.size = Pt(12)
    p_n.font.color.rgb = secondary

    # 文件名
    fn = slide5.shapes.add_textbox(x + Inches(0.1), y + Inches(0.5), Inches(2.1), Inches(0.5))
    tf_fn = fn.text_frame
    tf_fn.word_wrap = True
    p_fn = tf_fn.paragraphs[0]
    p_fn.text = page
    p_fn.font.size = Pt(11)
    p_fn.font.color.rgb = text_dark

# 底部统计
stats = slide5.shapes.add_textbox(Inches(0.5), Inches(6.8), Inches(12), Inches(0.5))
tf_stats = stats.text_frame
p_stats = tf_stats.paragraphs[0]
p_stats.text = "共 20 个页面 · 6大模块 · 全生命周期覆盖"
p_stats.font.size = Pt(18)
p_stats.font.bold = True
p_stats.font.color.rgb = primary
p_stats.alignment = PP_ALIGN.CENTER

# 第6页：技术特性
slide6 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide6, white)
add_title_bar(slide6, "技术特性")

techs = [
    ("Vue3 + CDN", "轻量部署\n无需构建"),
    ("Bootstrap Table", "企业级\n数据表格"),
    ("Tailwind CSS", "原子化\n样式系统"),
    ("iframe架构", "独立页面\n灵活嵌入"),
    ("标签页切换", "多任务\n并行操作"),
    ("响应式布局", "多终端\n自适应")
]

for i, (tech, desc) in enumerate(techs):
    x = Inches(0.5 + (i % 3) * 4.3)
    y = Inches(1.8 + (i // 3) * 2.8)

    box = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(4), Inches(2.5))
    box.fill.solid()
    box.fill.fore_color.rgb = primary
    box.line.fill.background()

    # 技术名
    t_box = slide6.shapes.add_textbox(x + Inches(0.3), y + Inches(0.4), Inches(3.5), Inches(0.7))
    tf_t = t_box.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = tech
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = white

    # 描述
    d_box = slide6.shapes.add_textbox(x + Inches(0.3), y + Inches(1.3), Inches(3.5), Inches(1))
    tf_d = d_box.text_frame
    tf_d.word_wrap = True
    p_d = tf_d.paragraphs[0]
    p_d.text = desc
    p_d.font.size = Pt(16)
    p_d.font.color.rgb = accent

# 第7页：总结
slide7 = prs.slides.add_slide(prs.slide_layouts[6])
set_bg(slide7, primary)

# 装饰线
line = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(3.8), Inches(13.333), Inches(0.03))
line.fill.solid()
line.fill.fore_color.rgb = accent
line.line.fill.background()

# 标题
title = slide7.shapes.add_textbox(Inches(1), Inches(1.5), Inches(11), Inches(1))
tf_t = title.text_frame
p_t = tf_t.paragraphs[0]
p_t.text = "以项目为载体"
p_t.font.size = Pt(44)
p_t.font.bold = True
p_t.font.color.rgb = white
p_t.alignment = PP_ALIGN.CENTER

# 副标题
sub = slide7.shapes.add_textbox(Inches(1), Inches(2.8), Inches(11), Inches(0.8))
tf_s = sub.text_frame
p_s = tf_s.paragraphs[0]
p_s.text = "让业务流与财务流同步流转"
p_s.font.size = Pt(28)
p_s.font.color.rgb = accent
p_s.alignment = PP_ALIGN.CENTER

# 要点
points = [
    "业财数据一体化 · 告别手工对账",
    "项目全周期管理 · 决策全程可溯",
    "智能数据看板 · 掌控全局动态"
]

for i, point in enumerate(points):
    p_box = slide7.shapes.add_textbox(Inches(2), Inches(4.3 + i * 0.7), Inches(9), Inches(0.6))
    tf_p = p_box.text_frame
    p_p = tf_p.paragraphs[0]
    p_p.text = f"✓  {point}"
    p_p.font.size = Pt(20)
    p_p.font.color.rgb = white

# 底部
footer = slide7.shapes.add_textbox(Inches(1), Inches(6.8), Inches(11), Inches(0.5))
tf_f = footer.text_frame
p_f = tf_f.paragraphs[0]
p_f.text = "PMS 业财一体化 · 高保真原型演示"
p_f.font.size = Pt(16)
p_f.font.color.rgb = RGBColor(150, 180, 210)
p_f.alignment = PP_ALIGN.CENTER

# 保存
output_path = "D:/项目AI协作/4、PMS业财一体化/docs/PMS产品介绍.pptx"
prs.save(output_path)
print(f"PPT已生成: {output_path}")