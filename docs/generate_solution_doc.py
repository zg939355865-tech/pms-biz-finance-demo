# -*- coding: utf-8 -*-
"""
PMS数字员工智能问答技术解决方案文档生成脚本
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import datetime

def set_run_font(run, font_name='宋体', font_size=11, bold=False):
    """设置-run的字体"""
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)

def add_heading(doc, text, level=1):
    """添加标题"""
    heading = doc.add_heading(text, level=level)
    heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return heading

def add_paragraph(doc, text, bold=False, indent=False):
    """添加段落"""
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.5
    if indent:
        p.paragraph_format.first_line_indent = Cm(0.74)
    run = p.add_run(text)
    run.font.size = Pt(11)
    run.font.bold = bold
    set_run_font(run)
    return p

def add_bullet(doc, text, level=0):
    """添加项目符号"""
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.size = Pt(11)
    set_run_font(run)
    return p

def create_table(doc, headers, rows):
    """创建表格"""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'

    # 表头
    hdr_cells = table.rows[0].cells
    for i, header in enumerate(headers):
        hdr_cells[i].text = header
        for paragraph in hdr_cells[i].paragraphs:
            for run in paragraph.runs:
                run.font.bold = True
                run.font.size = Pt(10)
                set_run_font(run, font_size=10)

    # 数据行
    for row_idx, row_data in enumerate(rows):
        row_cells = table.rows[row_idx + 1].cells
        for col_idx, cell_data in enumerate(row_data):
            row_cells[col_idx].text = str(cell_data)
            for paragraph in row_cells[col_idx].paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(10)
                    set_run_font(run, font_size=10)

    return table

def add_code_block(doc, code_text, caption=""):
    """添加代码块"""
    if caption:
        p = doc.add_paragraph()
        run = p.add_run(caption)
        run.font.size = Pt(9)
        run.font.italic = True
        set_run_font(run, font_size=9)

    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.74)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0, 0, 128)

def add_image_placeholder(doc, path, caption, width=Inches(5)):
    """添加图片占位符（实际生成时替换为真实图片）"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f'[图片: {caption}]')
    run.font.size = Pt(9)
    run.font.italic = True
    run.font.color.rgb = RGBColor(128, 128, 128)

def add_page_break(doc):
    """添加分页符"""
    doc.add_page_break()

def generate_document():
    """生成文档"""
    doc = Document()

    # 设置默认字体
    style = doc.styles['Normal']
    style.font.name = '宋体'
    style.font.size = Pt(11)
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')

    # ========== 封面 ==========
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(60)
    run = p.add_run('PMS数字员工')
    run.font.size = Pt(36)
    run.font.bold = True
    set_run_font(run, font_size=36, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('智能问答技术解决方案')
    run.font.size = Pt(28)
    run.font.bold = True
    set_run_font(run, font_size=28, bold=True)

    doc.add_paragraph()
    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('版本：V1.0')
    run.font.size = Pt(14)
    set_run_font(run, font_size=14)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f'编制日期：{datetime.datetime.now().strftime("%Y年%m月%d日")}')
    run.font.size = Pt(14)
    set_run_font(run, font_size=14)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('面向对象：开发人员')
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(128, 128, 128)
    set_run_font(run, font_size=12)

    add_page_break(doc)

    # ========== 目录 ==========
    add_heading(doc, '目录', 1)

    toc_items = [
        '1. 概述',
        '2. 系统架构设计',
        '3. 技术选型',
        '4. 数据库设计',
        '5. 接口设计',
        '6. 核心模块实现流程',
        '7. 代码示例',
        '8. 部署方案',
        '9. 验收标准'
    ]

    for item in toc_items:
        p = doc.add_paragraph()
        run = p.add_run(item)
        run.font.size = Pt(12)
        set_run_font(run, font_size=12)

    add_page_break(doc)

    # ========== 1. 概述 ==========
    add_heading(doc, '1. 概述', 1)

    add_heading(doc, '1.1 产品定位', 2)
    add_paragraph(doc, '数字员工是PMS系统内的智能问答入口，用户通过自然语言文本输入，系统识别意图后执行业务查询，返回结构化结果。', indent=True)

    add_heading(doc, '1.2 核心能力', 2)
    capabilities = [
        '文本输入：用户输入自然语言问题',
        '意图识别：自动识别用户查询意图（客户/项目/合同/预算）',
        '参数提取：从文本中提取查询参数（名称、地区、行业等）',
        '多轮对话：支持追问、补充条件、上下文继承',
        '权限控制：数据范围（企业）+ 功能范围（角色）双重校验',
        '结果呈现：结构化卡片 + 自然语言播报'
    ]
    for cap in capabilities:
        add_bullet(doc, cap)

    add_heading(doc, '1.3 技术目标', 2)
    targets = [
        '意图识别准确率 > 90%',
        'LLM响应时间 < 2秒',
        '数据库查询时间 < 500ms',
        '支持多轮对话上下文继承'
    ]
    for t in targets:
        add_bullet(doc, t)

    add_page_break(doc)

    # ========== 2. 系统架构设计 ==========
    add_heading(doc, '2. 系统架构设计', 1)

    add_heading(doc, '2.1 整体架构', 2)
    add_paragraph(doc, '系统采用分层架构，包含以下层次：', indent=True)

    arch_layers = [
        ('用户交互层', 'Vue3前端 + 对话UI组件'),
        ('对话管理层', '意图识别 + 参数提取 + 权限校验 + 上下文管理'),
        ('LLM服务层', 'GPT-4o-mini/Claude-haiku 意图分类 + 结果生成'),
        ('数据访问层', '预定义查询模板 + 参数化SQL'),
        ('数据存储层', 'MySQL关系型数据库')
    ]
    create_table(doc, ['层次', '职责'], arch_layers)

    add_paragraph(doc, '')
    add_image_placeholder(doc, '', '图2-1 系统架构图')

    add_heading(doc, '2.2 数据流向', 2)
    flow_steps = [
        '用户输入文本 →',
        '意图识别（LLM分类） →',
        '参数提取 →',
        '权限校验 →',
        'SQL生成 →',
        '数据库查询 →',
        '结果封装 →',
        '响应生成（LLM渲染） →',
        '返回用户'
    ]
    p = doc.add_paragraph()
    run = p.add_run(' → '.join(flow_steps))
    run.font.size = Pt(10)
    set_run_font(run, font_size=10)

    add_heading(doc, '2.3 模块划分', 2)
    modules = [
        ('意图识别模块', '识别用户查询意图（客户/项目/合同/预算）'),
        ('参数提取模块', '从文本中提取业务参数'),
        ('权限校验模块', '校验用户数据范围和功能权限'),
        ('对话管理模块', '管理多轮对话上下文'),
        ('查询执行模块', '执行数据库查询'),
        ('响应生成模块', '生成自然语言回复和卡片')
    ]
    create_table(doc, ['模块', '说明'], modules)

    add_page_break(doc)

    # ========== 3. 技术选型 ==========
    add_heading(doc, '3. 技术选型', 1)

    add_heading(doc, '3.1 前端技术', 2)
    frontend_stack = [
        ('Vue3 (CDN)', '现有PMS系统保持一致'),
        ('Tailwind CSS', '样式和布局'),
        ('原生JavaScript', '对话逻辑'),
        ('FontAwesome', '图标库')
    ]
    create_table(doc, ['技术', '说明'], frontend_stack)

    add_heading(doc, '3.2 后端技术', 2)
    backend_stack = [
        ('Node.js/Python', '后端运行时'),
        ('GPT-4o-mini / Claude-haiku', 'LLM服务'),
        ('Redis', '会话状态存储'),
        ('MySQL', '关系型数据库（现有）')
    ]
    create_table(doc, ['技术', '说明'], backend_stack)

    add_heading(doc, '3.3 技术对比', 2)
    tech_compare = [
        ('LLM提供商', 'GPT-4o-mini', 'Claude-haiku', '本地LLM'),
        ('响应速度', '快', '快', '取决于硬件'),
        ('成本', '中等', '低', '无API成本'),
        ('部署复杂度', '低', '低', '高'),
        ('推荐场景', '生产环境', '低成本方案', '私有化部署')
    ]
    create_table(doc, ['对比项', 'GPT-4o-mini', 'Claude-haiku', '本地LLM'], tech_compare)

    add_page_break(doc)

    # ========== 4. 数据库设计 ==========
    add_heading(doc, '4. 数据库设计', 1)

    add_heading(doc, '4.1 客户表 (crm_customer)', 2)
    customer_fields = [
        ('id', 'BIGINT', '主键'),
        ('customer_code', 'VARCHAR(32)', '客户编码'),
        ('customer_name', 'VARCHAR(128)', '客户名称'),
        ('enterprise_id', 'BIGINT', '所属企业ID'),
        ('region', 'VARCHAR(32)', '地区'),
        ('industry', 'VARCHAR(32)', '行业'),
        ('scale', 'VARCHAR(16)', '规模（大型/中型/小微）'),
        ('status', 'VARCHAR(16)', '状态（活跃/沉默/流失）'),
        ('contact_name', 'VARCHAR(64)', '联系人'),
        ('contact_phone', 'VARCHAR(20)', '联系电话'),
        ('create_time', 'DATETIME', '创建时间')
    ]
    create_table(doc, ['字段名', '类型', '说明'], customer_fields)

    add_heading(doc, '4.2 用户表 (sys_user)', 2)
    user_fields = [
        ('id', 'BIGINT', '主键'),
        ('user_name', 'VARCHAR(64)', '用户名'),
        ('enterprise_id', 'BIGINT', '所属企业ID'),
        ('role', 'VARCHAR(32)', '角色（sales/manager/admin）')
    ]
    create_table(doc, ['字段名', '类型', '说明'], user_fields)

    add_heading(doc, '4.3 对话历史表 (ai_conversation)', 2)
    conv_fields = [
        ('id', 'BIGINT', '主键'),
        ('session_id', 'VARCHAR(64)', '会话ID'),
        ('user_id', 'BIGINT', '用户ID'),
        ('role', 'VARCHAR(16)', 'user/assistant'),
        ('content', 'TEXT', '对话内容'),
        ('intent', 'VARCHAR(32)', '意图类型'),
        ('params', 'JSON', '提取的参数'),
        ('create_time', 'DATETIME', '创建时间')
    ]
    create_table(doc, ['字段名', '类型', '说明'], conv_fields)

    add_heading(doc, '4.4 企业表 (sys_enterprise)', 2)
    ent_fields = [
        ('id', 'BIGINT', '主键'),
        ('enterprise_name', 'VARCHAR(128)', '企业名称'),
        ('parent_id', 'BIGINT', '上级企业ID（支持集团）')
    ]
    create_table(doc, ['字段名', '类型', '说明'], ent_fields)

    add_page_break(doc)

    # ========== 5. 接口设计 ==========
    add_heading(doc, '5. 接口设计', 1)

    add_heading(doc, '5.1 对话入口接口', 2)
    add_paragraph(doc, '请求方式：POST', indent=True)
    add_paragraph(doc, '请求路径：/api/ai/chat', indent=True)
    add_paragraph(doc, '请求参数：', indent=True)

    request_params = [
        ('session_id', 'string', '会话ID（首次为空）'),
        ('user_input', 'string', '用户输入文本'),
        ('user_id', 'string', '用户ID'),
        ('enterprise_id', 'string', '企业ID')
    ]
    create_table(doc, ['参数名', '类型', '说明'], request_params)

    add_paragraph(doc, '')
    add_paragraph(doc, '响应示例：', indent=True)
    response_json = '''{
  "success": true,
  "data": {
    "session_id": "uuid-xxx",
    "response_type": "card",
    "content": "广州地区共有3个客户",
    "card_data": [...],
    "suggestions": ["查看详情", "查看项目"]
  },
  "message": "查询成功"
}'''
    add_code_block(doc, response_json)

    add_heading(doc, '5.2 历史会话查询接口', 2)
    add_paragraph(doc, '请求方式：GET', indent=True)
    add_paragraph(doc, '请求路径：/api/ai/history/{user_id}', indent=True)
    add_paragraph(doc, '响应参数：返回用户最近会话列表', indent=True)

    add_heading(doc, '5.3 快捷问题配置接口', 2)
    add_paragraph(doc, '请求方式：GET/POST', indent=True)
    add_paragraph(doc, '请求路径：/api/ai/quick-questions', indent=True)

    add_page_break(doc)

    # ========== 6. 核心模块实现流程 ==========
    add_heading(doc, '6. 核心模块实现流程', 1)

    add_heading(doc, '6.1 意图识别流程', 2)
    intent_flow = [
        'Step 1: 文本预处理（去噪声、分词、标准化）',
        'Step 2: 关键词匹配（快速过滤候选意图）',
        'Step 3: LLM精确分类（输出intent + confidence）',
        'Step 4: 置信度校验（<0.7 追问，<0.5 unknown）'
    ]
    for i, step in enumerate(intent_flow, 1):
        add_bullet(doc, step)

    add_heading(doc, '6.2 参数提取流程', 2)
    param_flow = [
        'Step 1: 根据意图类型选择参数模板',
        'Step 2: 使用LLM或正则提取文本中的实体',
        'Step 3: 参数校验和标准化',
        'Step 4: 缺失参数触发澄清流程'
    ]
    for i, step in enumerate(param_flow, 1):
        add_bullet(doc, step)

    add_heading(doc, '6.3 权限校验流程', 2)
    perm_flow = [
        'Step 1: 获取用户信息（enterprise_id, role）',
        'Step 2: 查询角色权限表',
        'Step 3: 校验是否有权执行此操作',
        'Step 4: 注入数据范围条件（WHERE enterprise_id = ?）',
        'Step 5: 过滤敏感字段'
    ]
    for i, step in enumerate(perm_flow, 1):
        add_bullet(doc, step)

    add_heading(doc, '6.4 多轮对话流程', 2)
    chat_flow = [
        'Step 1: 获取历史上下文',
        'Step 2: 合并上轮参数（继承）',
        'Step 3: 提取本轮新参数',
        'Step 4: 参数完整则执行查询，否则澄清',
        'Step 5: 更新上下文记忆'
    ]
    for i, step in enumerate(chat_flow, 1):
        add_bullet(doc, step)

    add_image_placeholder(doc, '', '图6-1 意图识别流程图')

    add_page_break(doc)

    # ========== 7. 代码示例 ==========
    add_heading(doc, '7. 代码示例', 1)

    add_heading(doc, '7.1 意图识别（前端）', 2)
    intent_code = '''// 意图识别伪代码
async function classifyIntent(userInput, context) {
  // 1. 快速关键词匹配（兜底）
  const quickMatch = keywordMatch(userInput);
  if (quickMatch.confidence > 0.9) return quickMatch;

  // 2. LLM精确分类
  const llmResult = await llm.chat({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_INTENT },
      { role: "user", content: userInput }
    ],
    response_format: { type: "json_object" },
    schema: IntentSchema
  });

  // 3. 历史上下文继承
  if (context.currentIntent && llmResult.confidence < 0.8) {
    llmResult.intent = context.currentIntent;
  }

  return llmResult;
}'''
    add_code_block(doc, intent_code, '示例7-1: 意图识别')

    add_heading(doc, '7.2 参数提取（前端）', 2)
    param_code = '''// 参数提取伪代码
function extractEntities(text, intent) {
  const entityPatterns = {
    project_name: /项目[名称]?[：:]([^，,。]+)|([^，,。]+)项目/,
    region: /(广州|深圳|北京|上海)/,
    industry: /(水务|环保|金融|建筑)/,
    scale: /(大型|中型|小微)/
  };

  const result = {};
  for (const [entity, pattern] of Object.entries(entityPatterns)) {
    const match = text.match(pattern);
    if (match) result[entity] = match[1] || match[2];
  }

  return result;
}'''
    add_code_block(doc, param_code, '示例7-2: 参数提取')

    add_heading(doc, '7.3 SQL生成（后端）', 2)
    sql_code = '''-- 客户查询SQL模板
SELECT
  c.id, c.customer_name, c.region, c.industry,
  c.scale, c.status, c.contact_name, c.contact_phone,
  (SELECT COUNT(*) FROM project p WHERE p.customer_id = c.id) AS project_count
FROM crm_customer c
WHERE c.enterprise_id = :enterprise_id
  AND (:customer_name IS NULL OR c.customer_name LIKE CONCAT('%', :customer_name, '%'))
  AND (:region IS NULL OR c.region = :region)
  AND (:industry IS NULL OR c.industry = :industry)
ORDER BY c.create_time DESC
LIMIT 20'''
    add_code_block(doc, sql_code, '示例7-3: SQL生成')

    add_heading(doc, '7.4 对话状态管理（前端）', 2)
    state_code = '''// 对话状态管理
class ConversationContext {
  constructor(userId) {
    this.userId = userId;
    this.history = [];
    this.currentIntent = null;
    this.pendingParams = {};
    this.entityMemory = {};
  }

  addMessage(role, content, extracted = {}) {
    this.history.push({ role, content, timestamp: Date.now(), ...extracted });
  }

  memorize(entityType, value) {
    this.entityMemory[entityType] = {
      value,
      updateTime: Date.now()
    };
  }
}'''
    add_code_block(doc, state_code, '示例7-4: 对话状态管理')

    add_heading(doc, '7.5 LLM提示词', 2)
    prompt_code = '''// 意图识别系统提示词
const SYSTEM_PROMPT_INTENT = `你是一个客户管理系统的意图识别器。

## 可识别意图类型：
1. query_customer - 查询客户信息
2. query_project - 查询项目信息
3. query_contract - 查询合同信息
4. query_budget - 查询预算信息
5. unknown - 无法理解的输入
6. clarify - 需要用户澄清

## 输出格式（JSON）：
{
  "intent": "意图类型",
  "params": {...},
  "confidence": 0.95,
  "need_clarify": false
}`;'''
    add_code_block(doc, prompt_code, '示例7-5: LLM提示词')

    add_page_break(doc)

    # ========== 8. 部署方案 ==========
    add_heading(doc, '8. 部署方案', 1)

    add_heading(doc, '8.1 部署架构', 2)
    deploy_arch = [
        ('前端部署', '静态文件服务器 / CDN', 'index.html + pages/'),
        ('后端服务', 'Node.js服务', '处理对话逻辑、LLM调用'),
        ('Redis', '会话状态存储', '多轮对话上下文'),
        ('MySQL', '数据存储', '现有PMS数据库')
    ]
    create_table(doc, ['组件', '技术', '说明'], deploy_arch)

    add_heading(doc, '8.2 环境要求', 2)
    env_req = [
        ('Node.js', '>= 16.0', '后端运行时'),
        ('Redis', '>= 6.0', '会话存储'),
        ('MySQL', '>= 8.0', '数据存储'),
        ('LLM API', 'OpenAI / Anthropic', '意图识别和生成')
    ]
    create_table(doc, ['组件', '版本要求', '说明'], env_req)

    add_heading(doc, '8.3 配置文件', 2)
    config_code = '''// config.js
module.exports = {
  llm: {
    provider: 'anthropic',  // openai | anthropic
    apiKey: process.env.LLM_API_KEY,
    model: 'claude-haiku'
  },
  redis: {
    host: 'localhost',
    port: 6379,
    sessionTTL: 1800  // 30分钟
  },
  mysql: {
    host: 'localhost',
    user: 'pms_user',
    password: process.env.DB_PASSWORD,
    database: 'pms_db'
  }
};'''
    add_code_block(doc, config_code, '示例8-1: 配置文件')

    add_heading(doc, '8.4 性能优化', 2)
    perf_opts = [
        ('LLM响应时间', '< 2秒', '超时返回友好提示'),
        ('数据库查询', '< 500ms', '添加适当索引'),
        ('会话存储', 'Redis', '30分钟过期'),
        ('结果缓存', '5分钟', '相同查询不重复查询')
    ]
    create_table(doc, ['优化项', '目标', '方案'], perf_opts)

    add_heading(doc, '8.5 安全措施', 2)
    security = [
        'SQL注入防护：预定义模板 + 参数化查询',
        '敏感字段过滤：根据角色过滤可见字段',
        '企业数据隔离：所有查询强制注入enterprise_id',
        'LLM输出校验：JSON Schema约束输出格式'
    ]
    for s in security:
        add_bullet(doc, s)

    add_page_break(doc)

    # ========== 9. 验收标准 ==========
    add_heading(doc, '9. 验收标准', 1)

    add_heading(doc, '9.1 功能验收', 2)
    func验收 = [
        ('客户查询', '返回正确客户数据'),
        ('项目查询', '返回正确项目数据'),
        ('合同查询', '返回正确合同数据'),
        ('预算查询', '返回正确预算数据'),
        ('多轮对话', '上下文正确继承'),
        ('意图识别', '准确率 > 90%')
    ]
    create_table(doc, ['功能', '验收标准'], func验收)

    add_heading(doc, '9.2 权限验收', 2)
    perm验收 = [
        ('数据隔离', '不同企业用户无法查看对方数据'),
        ('字段过滤', '不同角色可见字段正确过滤'),
        ('敏感信息', '手机号、金额等脱敏')
    ]
    create_table(doc, ['检查项', '验收标准'], perm验收)

    add_heading(doc, '9.3 性能验收', 2)
    perf验收 = [
        ('LLM响应', '< 2秒'),
        ('数据库查询', '< 500ms'),
        ('页面加载', '< 1秒')
    ]
    create_table(doc, ['指标', '验收标准'], perf验收)

    add_heading(doc, '9.4 体验验收', 2)
    exp验收 = [
        ('滚动行为', '新消息自动滚动到底部'),
        ('历史会话', '可单独滚动'),
        ('快捷问题', '可自定义配置'),
        ('空状态', '友好提示')
    ]
    create_table(doc, ['检查项', '验收标准'], exp验收)

    # ========== 附录 ==========
    add_page_break(doc)
    add_heading(doc, '附录', 1)

    add_heading(doc, 'A. 术语表', 2)
    terms = [
        ('意图', 'Intent，用户查询的目的（如query_customer）'),
        ('实体', 'Entity，从文本中提取的业务参数（如customer_name）'),
        ('上下文', 'Context，多轮对话中的历史信息和记忆'),
        ('会话', 'Session，一次完整的对话交互')
    ]
    create_table(doc, ['术语', '说明'], terms)

    add_heading(doc, 'B. 更新日志', 2)
    changelog = [
        ('2026-05-15', 'V1.0', '初始版本')
    ]
    create_table(doc, ['日期', '版本', '更新内容'], changelog)

    # 保存文档
    output_path = r'D:\项目AI协作\4、PMS业财一体化\docs\PMS数字员工智能问答技术解决方案_V1.0.docx'
    doc.save(output_path)
    print(f'文档已生成：{output_path}')

if __name__ == '__main__':
    generate_document()