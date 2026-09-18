# PMS业财融合蓝图汇报方案 - 大纲草稿

> 状态：outline draft。按 `input/业财融合PPT汇报.md` 页数规划整理，共 27 页。未生成 slide image、deck_spec、speech、prompt jobs 或 PPTX。
> 风格意向：IBM式企业咨询汇报风格，深蓝、灰白、克制科技蓝强调；结论先行、结构化图解、少装饰、强业务链路。
> 强制源图片：无。

## Slide 1: 封面页
- Key points:
  - 汇报主题：PMS业财融合蓝图汇报方案
  - 聚焦 PMS 与用友财务系统的业务、票据、资金、凭证和分析闭环
  - 呈现建设目标、总体架构、关键场景、迭代计划和待决策事项
- Visual idea: 深蓝全幅封面，抽象业务流与财务流双轨汇合到项目主线。
- Layout role: cover。
- Required images: none。

## Slide 2: 目录页
- Key points:
  - 规划背景与目标
  - 业务融合架构及场景规划
  - 迭代及推广计划
  - 待决策事项
- Visual idea: IBM咨询式目录导航，四个章节编号构成横向推进路线。
- Layout role: agenda。
- Required images: none。

## Slide 3: 规划背景与目标
- Key points:
  - 本章节先回答为什么要建设业财融合
  - 识别业务现状、系统断点和目标边界
  - 明确设计原则：轻量闭环优先，再做深度集成
- Visual idea: 章节分隔页，左侧章节编号，右侧三条议题线。
- Layout role: section divider。
- Required images: none。

## Slide 4: 业务现状
- Key points:
  - 项目类型包括软件实施、AI智控、运维服务，交付形态为软件、硬件、服务复合交付
  - 商务节奏从试用、验证到正式合同，周期长且业务状态多
  - PMS 已建设项目业务模块，用友财务计划承载总账、应收、应付、固资、物资、税务
  - 当前核心缺口是业务与财务断点，依赖手工对接和 Excel 中转
- Visual idea: 左侧业务特征三层结构，右侧系统现状与断点诊断。
- Layout role: context / problem。
- Required images: none。

## Slide 5: 业财融合建设目标
- Key points:
  - PMS 定位为业务前端与经营分析平台
  - 用友定位为正式财务核算基准
  - 两端通过发票、收付款、凭证回写实现业务财务贯通
  - 分三期推进：业务台账与 Excel 对账、用友 API 与凭证回写、经营分析与智能预警
- Visual idea: 目标三角形加三阶段路线条。
- Layout role: goal / roadmap。
- Required images: none。

## Slide 6: 核心设计原则
- Key points:
  - 项目是业务与财务共同载体，合同、收入、支出、成本、回款均归集到项目
  - 开票以合同收款计划为主线，减少多头匹配
  - PMS 台账与财务应收应付要区分边界，但必须可对账
  - 发票必须关联业务来源，但不能替代合同、验收、入库、报销等业务事实
  - 一期先轻量闭环，二期再接口化和自动回写
- Visual idea: 七项原则压缩为“项目主线、事实依据、台账边界、分期集成”四组原则卡。
- Layout role: design principles。
- Required images: none。

## Slide 7: 业务融合架构及场景规划
- Key points:
  - 本章节定义业财融合的整体架构和关键业务场景
  - 以项目为核心串联业务流、票据流、资金流、报表流
  - 八大场景覆盖项目经营、收入回款、采购付款、物资、费用、成本、财务集成和经营分析
- Visual idea: 章节页，中央为“项目”核心节点，外圈为八大场景。
- Layout role: section divider。
- Required images: none。

## Slide 8: 业务融合整体架构
- Key points:
  - 业务流：项目经营、合同管理、采购报销、物资资产、服务验收
  - 票据流：开票申请、销项发票、采购收票、票据回写、税负统计
  - 资金流：收款计划、回款台账、付款申请、付款台账、资金计划
  - 报表流：成本归集、收入结构、费用结构、预算执行、管理看板
  - 核心闭环为业务事实、经营台账、发票收付、财务凭证、管理分析
- Visual idea: 四流并行泳道图，底部汇聚为闭环链路。
- Layout role: architecture。
- Required images: none。

## Slide 9: 业务融合功能架构
- Key points:
  - 功能围绕项目、收入、付款、物资、研发、集成、经营分析七条主线展开
  - PMS业财中台统一主数据、业务规则、数据模型和服务能力
  - 系统集成层连接用友财务系统与 AI-OS 工艺智控系统
  - 数据支撑层承载标准口径、质量治理、安全权限和日志监控
- Visual idea: 四层功能架构图，顶部七条业务主线，中间 PMS 中台，底部系统与数据支撑。
- Layout role: functional architecture。
- Required images: none。

## Slide 10: 业财融合数据整体交互
- Key points:
  - 主数据先统一，避免客户、供应商、部门、员工、科目、核算主体口径不一致
  - PMS 产生项目、合同、采购、物资、报销、研发等业务事实
  - 业务事实沉淀到收入回款台账和支出付款台账
  - 发票、收票、收付款、核销形成财务关键动作
  - 用友完成核算并将凭证号、凭证状态、核算结果和收付款状态回写 PMS
- Visual idea: PMS 与用友双向数据交互图，强调“业务事实 -> 财务结果 -> 状态回写”。
- Layout role: data flow。
- Required images: none。

## Slide 11: 场景1：项目经营主线
- Key points:
  - 项目全生命周期从客户报备、需求、调研、方案、实施通知、立项计划到执行运维和结项
  - 项目是收入、成本、回款、费用归集的共同载体
  - 项目类型与合同类型决定财务处理和收入确认方式
  - 内部项目、试用项目、正式外部项目需要在 PMS 中明确区分
  - 经营洞察按项目穿透查看全过程状态和风险
- Visual idea: 生命周期时间轴加项目类型/合同类型矩阵。
- Layout role: scenario process。
- Required images: none。

## Slide 12: 场景2：收入回款主线 - 收入确认
- Key points:
  - 收入合同先记录业务事实，再按收款计划触发收入回款台账
  - 收入确认五步：签约录入、拆分计划、业务确认、形成台账、用友生成凭证
  - 触发条件包括合同生效、计划到期、验收节点达成
  - 收入合同原则上必须关联唯一项目，未明确时进入待归属合同池
  - 经营洞察关注合同金额、计划、开票、收款、未收和到期风险
- Visual idea: 五步流程链，突出“业务台账不等于财务应收”。
- Layout role: scenario process。
- Required images: none。

## Slide 13: 场景2：收入回款主线 - 销项开票
- Key points:
  - 开票申请统一参照收入合同和收款计划
  - 开票六步：选合同节点、发起申请、财务确认、销项开票、发票回写、生成凭证
  - 强校验包括开票金额不超过收款计划金额、科目一致、客户税号一致
  - 支持蓝字、红字和跨期开票
  - 经营洞察关注已开票、未开票和提前开票风险
- Visual idea: 开票控制流程图，校验规则作为右侧控制面板。
- Layout role: scenario control flow。
- Required images: none。

## Slide 14: 场景2：收入回款主线 - 收款核销
- Key points:
  - 收款单与收入台账、销项发票形成核销关系
  - 核销六步：收款登记、自动匹配、财务确认、收款核销、生成凭证、容差预警
  - 匹配维度包括客户、金额、合同和项目
  - 特殊场景包括预收款、部分付款、合并付款和尾差
  - 经营洞察关注现金流压力、履约风险和催收重点
- Visual idea: 核销匹配引擎示意，四类特殊场景以标签呈现。
- Layout role: scenario process / exceptions。
- Required images: none。

## Slide 15: 场景3：采购付款主线 - 物料采购
- Key points:
  - 实物采购通过入库形成物料台账和支出付款台账
  - 九步流程覆盖采购申请、采购订单、合同判断、入库验收、台账生成、收票、付款申请、付款、凭证
  - 物资台账记录“物”的数量和状态，支出付款台账记录“钱”的应付、已付、未付状态
  - 规范条件包括采购类型、项目归属、入库数量和金额明确
  - 经营洞察关注项目物资成本、物资来源、待收票和待付款压力
- Visual idea: 物料采购端到端流程，分成“采购-入库-收票-付款-凭证”五段。
- Layout role: scenario process。
- Required images: none。

## Slide 16: 场景3：采购付款主线 - 服务采购
- Key points:
  - 服务采购无实物入库，以服务成果、服务过程或人力投入作为交付对象
  - 八步流程覆盖申请、订单合同、服务过程、服务结算、支出台账、收票、付款申请、凭证
  - 服务结算后生成支出台账，收票参照支出台账
  - 支持外部项目与内部项目挂接
  - 结算单需说明服务期间、成果、验收责任人和金额
- Visual idea: 服务采购流程用“成果验收”作为中心节点，连接合同、结算、付款和凭证。
- Layout role: scenario process。
- Required images: none。

## Slide 17: 场景3：采购付款主线 - 固资采购
- Key points:
  - 固资采购面向高价值、长周期使用资产
  - 验收后同步生成固资台账、支出付款台账和资产卡片
  - 与物资采购差异集中在高价值合同判断、一物一卡和验收时点凭证
  - 用友按月折旧并按部门或项目分摊
  - 资产价值阈值建议按单价大于等于 5000 元且使用年限大于 1 年配置
- Visual idea: 固资采购差异化流程图，突出“一物一卡、验收即凭证、折旧分摊”。
- Layout role: scenario comparison / process。
- Required images: none。

## Slide 18: 场景4：物资管理主线
- Key points:
  - 物资管理解决物资买入后去向不清的问题
  - 主流程为物资台账、项目或部门领用、物资盘点、物资调整
  - 区分内部物资和项目物资，挂内部项目满足固资条件则进入固定资产管理
  - 领用必须关联项目或部门，支持安全物资预警和自动补物资
  - 经营洞察关注采购规模、周转效率、领用项目分布和物资占用
- Visual idea: 物资流向桑基图或流转闭环，显示入库、领用、盘点、调整。
- Layout role: scenario lifecycle。
- Required images: none。

## Slide 19: 场景5：费用报销主线
- Key points:
  - 费用报销解决差旅、招待、日常采购等零散支出的合规管控和成本归集
  - 三类流程：差旅报销、招待报销、日常采购报销
  - 审批通过是关键时点，按“谁受益谁承担”归集到项目或部门成本
  - 员工垫付款通过报销流程支付，日常采购小额可直接费用化
  - 规范条件包括发票抬头、住宿标准、事前招待申请和项目/部门必填
- Visual idea: 三类报销流程并列泳道，底部统一汇入支出付款台账和凭证。
- Layout role: scenario governance。
- Required images: none。

## Slide 20: 场景6：成本归集主线
- Key points:
  - 成本归集支撑部门和项目利润真实性核算
  - 主流程为成本要素采集、直接成本归集、间接成本分摊、成本计算、成本调整和成本分析
  - 成本要素包括采购成本、物资领用、费用报销和折旧
  - 成本调整单支持人工和管理费用分摊调整，后续可固化为系统规则
  - 所有业务单据必须关联项目或部门
- Visual idea: 成本要素四象限汇入项目利润模型。
- Layout role: scenario model。
- Required images: none。

## Slide 21: 场景7：财务集成主线
- Key points:
  - 财务集成解决 PMS 与用友之间的数据贯通和财务结果可见
  - 一期以主数据同步为主，包括核算主体、部门、员工、客户、供应商、项目等
  - 二期以凭证记账为主，包括收入台账、支出台账、收票、付款核销、销项开票、收款核销、入库和固资
  - 分期策略为 Excel 对接、用友 API、智能穿透和自动对账
  - 异常处理包括重试队列、差异预警、幂等控制和财务已记账后业务不可改
- Visual idea: 分期集成矩阵，左侧主数据，右侧凭证业务，底部异常处理机制。
- Layout role: integration architecture。
- Required images: none。

## Slide 22: 场景8：经营分析主线
- Key points:
  - 经营分析解决业务与财务数据割裂和决策依据不足
  - 七大核心指标包括收入、成本、毛利、回款、应收、预算执行和现金流
  - 报表覆盖税负、费用结构、收入结构、预算执行、资金计划和财务回报率
  - 分析维度优先按项目，其次按部门、客户和期间
  - 月结后输出月报，季度和年度支持财务报告及经营建议
- Visual idea: 经营驾驶舱式指标地图，强调项目维度优先。
- Layout role: dashboard / analytics。
- Required images: none。

## Slide 23: 迭代及推广计划
- Key points:
  - 本章节定义版本建设节奏和公司推广路径
  - 先以长沙基线版本沉淀标准，再复制到各公司并适配差异
  - 推广重点是数据补录、流程配置、人员责任和财务对接准备
- Visual idea: 章节页，路线图从“基线版本”扩展到多公司推广。
- Layout role: section divider。
- Required images: none。

## Slide 24: PMS业财融合迭代版本计划
- Key points:
  - 一期 2-3 个月：业务台账上线与 Excel 对账
  - 二期 1 个月：用友 API 对接与凭证回写
  - 三期：经营分析报表、智能预警和 AI 赋能
  - 每期目标逐步从“可用、可对账”升级到“可集成、可分析、可预警”
- Visual idea: 三阶段路线图，标出每期产出物和能力升级。
- Layout role: roadmap。
- Required images: none。

## Slide 25: PMS业财推广整体进度
- Key points:
  - 推广策略以长沙为基线版本，各公司推广并适配差异化需求
  - 长沙已完成一期功能上线，正在规划财务对接，需业务部门补录数据
  - 武汉已完成流程和人员配置并交付
  - 东莞智能装备未提交特殊流程，已完成流程和人员配置
  - 上海、无锡、东莞运营、杭州、湖北、武汉可利尔、江陵等公司处于未开始状态
- Visual idea: 公司推广进度看板，按“已上线/已交付/已配置/未开始”分组。
- Layout role: rollout status。
- Required images: none。

## Slide 26: 待决策事项
- Key points:
  - 本章节聚焦上线前需要管理层或业务负责人确认的关键事项
  - 核心待决策为审批流程和审批节点确认
  - 涉及采购申请、收入合同、招待申请、招待报销、差旅申请、差旅报销、日常报销和服务验收
  - 决策输出将影响流程配置、权限设置、节点责任和上线节奏
- Visual idea: 章节页，审批决策清单以决策漏斗呈现。
- Layout role: section divider。
- Required images: none。

## Slide 27: 待决策事项
- Key points:
  - 采购申请审批节点需确认金额阈值、部门负责人、财务和管理层节点
  - 收入合同审批需确认合同负责人、法务/财务审核和最终授权人
  - 招待、差旅和日常报销需确认事前申请、事后报销和超标审批规则
  - 服务验收需确认验收责任人、成果确认和付款触发条件
  - 建议形成审批流程矩阵，作为系统配置和上线验收依据
- Visual idea: 审批流程矩阵表，横轴为业务类型，纵轴为审批节点和责任角色。
- Layout role: decision matrix / closing。
- Required images: none。
