# PMS PRD/UR 生成流程

## 默认生成 Skill

- 文档生成 Skill：`$mes-ur-generator`
- 项目规则：`prd-assets/prd-document-standard.md`

## 使用方式

后续可直接提出：

> 使用 `$mes-ur-generator`，根据已确认的页面蓝图、Schema和当前原型，生成“XX模块”需求规格说明书。

未特别指定其他文档生成 Skill 时，本项目的PRD和UR默认使用 `$mes-ur-generator`。

## 标准流程

1. 收集本轮确认需求、页面蓝图、Schema、原型和公共规则。
2. 按 `$mes-ur-generator` 规范整理章节、功能模块和待确认事项。
3. 使用该 Skill 自带的结构、样式、截图和流程图生成机制，不叠加其他模板 Skill。
4. 写入本期业务内容并生成当前页面截图。
5. 校验需求与原型的一致性。
6. 输出DOCX并进行全页渲染检查，确认目录页码、标题层级、正文、表格、截图、流程图和分页符合 `$mes-ur-generator` 当前规范及用户本轮要求。
7. 修复所有版式问题后，将本次正式文件集中保存到独立交付目录。

## 交付物

- 正式交付目录：`prd-assets/deliveries/{模块名称}/{YYYYMMDD}-V{版本}/`
- 临时渲染和检查目录：`outputs/prd/{模块名称}/{YYYYMMDD}-V{版本}/`
- 问题澄清项：写入正式文档“问题澄清”章节。

同一次任务生成的正式DOCX、来源清单和必要的待确认事项必须放在同一交付目录，不得散放；渲染图、PDF和检查日志仅进入对应的临时检查目录。
