# PMS 项目结构

## 核心生成链路

```text
自然语言需求
  -> 页面蓝图 MD
  -> 正式页面 Schema v2
  -> HTML 原型
  -> Schema 与页面检查报告
  -> 匹配 Excel 菜单入口
```

蓝图用于业务确认，Schema 用于机器生成。项目不再保留 AI 任务 JSON 和草稿 Schema 中间层。

## 核心目录

| 目录 | 保留内容 | 使用阶段 |
| --- | --- | --- |
| `inputs/md/requirements/` | 用户原始需求或业务场景描述 | 需求输入 |
| `inputs/md/pages/` | AI 生成、用户确认的页面蓝图 | 蓝图确认 |
| `rules/page-blueprint-standard.md` | 自然语言需求生成页面蓝图的统一规范 | 蓝图生成与检查 |
| `inputs/excel/menu/` | 菜单 Excel 源文件 | 菜单生成 |
| `inputs/业财融合蓝图方案/` | 后续汇报和文档生成的业务资料 | 文档输入 |
| `schemas/meta/` | Schema v2 标准 | Schema 约束 |
| `schemas/pages/` | 正式页面 Schema | HTML 生成 |
| `prototype-resources/` | 资源中心入口、清单、组件库和样例结构 | 设计基线、蓝图、Schema 与评审 |
| `scripts/generate/` | Schema、菜单和原型生成脚本 | 自动生成 |
| `scripts/check/` | Schema、HTML、组件和浏览器检查脚本 | 自动检查 |
| `pages/` | 菜单业务页和 Schema 生成页 | 原型交付 |
| `menu/` | Excel 生成的统一菜单入口 | 原型入口 |
| `docs/` | PRD、财务资料、合同模板、汇报材料和流程文档 | 文档来源与交付 |
| `tools/` | PPT、Word 等文档生成工具 | 文档生成 |
| `outputs/reports/` | 当前生成结果的结构与视觉检查报告 | 质量检查 |

## HTML 原型资产

保留三类页面：

1. `pages/*.html`：当前菜单实际使用的业务页面。
2. `pages/{domain}/*.html`：正式 Schema 生成页面。
3. `pages/system/component-gallery.html`：62 个注册组件的覆盖验证页。

原型资源统一维护在 `prototype-resources/`。公共组件的唯一清单是 `prototype-resources/components/component-registry.json`，页面结构与组件结构样例位于 `prototype-resources/samples/`，可视化入口是 `prototype-resources/index.html`。页面不得自行建立另一套颜色、间距、圆角或控件体系。

## 文档生成资产

PRD/UR模板资产统一维护在项目一级目录 `prd-assets/`。文档遵循该目录下的 `prd-document-standard.md`，默认使用 `$artifact-template-pms`；具体流程见同目录的 `prd-generation-workflow.md`。

后续生成 PRD、UR、PPT 或方案文档时：

1. 原始业务材料从 `inputs/` 和 `docs/` 读取。
2. 页面截图从当前 `menu/index.html` 或 `pages/` 重新生成，不长期保存浏览器缓存。
3. 文档生成脚本保留在 `docs/*.py` 和 `tools/`。
4. 临时渲染图、浏览器 Profile、检查缓存放在 `outputs/`，验收后可删除。
5. 已确认的 PRD、合同模板、财务资料和最终 PPT 属于业务档案，不按临时文件清理。

## 常用命令

从正式 Schema 生成并检查 HTML：

```bash
npm run prototype:build -- schemas/pages/income/income-contract-schema.json
```

验证全部注册组件：

```bash
npm run check:components
```

生成菜单：

```bash
npm run menu:update
```

执行当前完整检查：

```bash
npm run prototype:all
```

## 清理边界

可以删除：浏览器 Profile、临时截图、重复压缩包、已被正式 Schema 替代的中间 JSON、无入口页面副本。

不可自动删除：用户原始资料、菜单 Excel、正式蓝图、正式 Schema、现有业务页面、组件库、规则文件、PRD、财务资料、合同模板和最终交付文档。
