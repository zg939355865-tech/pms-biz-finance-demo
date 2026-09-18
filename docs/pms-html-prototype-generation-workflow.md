# PMS Schema 原型生成工作流

## 固化流程

页面蓝图必须遵循 `rules/page-blueprint-standard.md`。
页面蓝图和正式 Schema 必须引用 `prototype-resources/index.html`，并遵循 `rules/resource-center-standard.md`。
全部页面同时遵循 `rules/project-standard.md`；与旧文档冲突时，以项目准则和自动检查结果为准。

```text
自然语言需求
  -> AI 生成页面蓝图 MD
  -> 用户确认蓝图
  -> AI 生成正式页面 Schema v2
  -> Schema 校验
  -> HTML 生成
  -> HTML 结构与视觉检查
  -> 匹配现有菜单入口
  -> 交付
```

不再生成页面草稿 Schema。蓝图 MD 用于业务确认，正式 Schema 是组件、数据、状态、规则和交互的唯一机器可执行输入。

## 职责边界

| 文件或目录 | 职责 |
| --- | --- |
| `inputs/md/pages/` | 用户检查的页面蓝图，描述业务场景、页面结构、字段、操作、状态和规则 |
| `schemas/meta/pms-page-schema-v2.schema.json` | Schema v2 文档约束 |
| `schemas/pages/` | 经确认的正式页面 Schema |
| `prototype-resources/index.html` | 组件库、样例和设计规范的统一可视化入口 |
| `prototype-resources/components/component-registry.json` | 可生成组件、字段控件、表格列控件和页面类型注册表 |
| `prototype-resources/components/` | 项目 Token、公共样式、组件注册表和页面运行时 |
| `prototype-resources/samples/` | 页面结构和公共组件静态结构参考 |
| `scripts/generate/page-from-schema.mjs` | Schema 递归生成 HTML |
| `scripts/check/schema-check.mjs` | 组件、字段、事件和结构校验 |
| `scripts/check/page-check.mjs` | 生成 HTML 的组件引用和结构校验 |
| `pages/` | 可直接打开及 iframe 嵌入的 HTML 交付目录 |

## Schema v2 最小结构

```json
{
  "schemaVersion": "pms-page-schema-v2",
  "pageCode": "income-contract",
  "pageName": "收入合同",
  "domain": "income",
  "module": "收入管理",
  "menuPath": "收入管理/收入合同",
  "pageType": "list-detail",
  "template": "tabs-detail-page",
  "outputPath": "pages/income/income-contract.html",
  "pageActions": [],
  "regions": [
    { "component": "ProSearchForm", "fields": [] },
    { "component": "ProTable", "columns": [], "dataSource": "records" }
  ],
  "overlays": [],
  "interactions": [],
  "rules": [],
  "mockData": { "records": [] }
}
```

## 组件规则

1. 页面区域使用 `regions` 按顺序声明，可通过 `children` 和 `tabs[].children` 递归组合。
2. 弹窗、抽屉和数据选择器统一放在 `overlays`。
3. 表单字段必须使用注册的 `fieldComponents`。
4. 表格列必须使用注册的 `columnComponents`，金额、状态、日期需声明明确类型。
5. 未注册组件、缺少组件必填属性、错误字段控件会阻断生成。
6. Ant Design Pro 只作为信息架构和交互样式参考，交付仍是 Vue3 CDN 可接入的静态 HTML，不引入 React API。

## 命令

从正式 Schema 一次完成校验、生成和页面检查：

```bash
npm run prototype:build -- schemas/pages/income/income-contract-schema.json
```

收入合同完整验证，包括浏览器交互和截图：

```bash
npm run prototype:income-contract
```

验证注册表中的所有组件均可生成：

```bash
npm run check:components
```

单步命令：

```bash
npm run check:schema -- schemas/pages/income/income-contract-schema.json
npm run page:build -- schemas/pages/income/income-contract-schema.json
npm run check:page -- schemas/pages/income/income-contract-schema.json
```

## 菜单规则

菜单仍由 `inputs/excel/menu/menu-simple.xlsx` 生成。页面 Schema 只通过 `menuPath` 和 `outputPath` 匹配现有菜单，不因生成页面而自动修改 Excel 菜单源。

## 验收门槛

- Schema 校验状态为 `passed`。
- 所有声明组件都真实出现在 HTML 中。
- 页面引用项目公共 Token、组件样式和运行时。
- 宽表仅在表格内部横向滚动，表头和关键列可固定。
- 分页独立位于表格下方，不出现大面积无效留白。
- 列表、表单、标签页、弹窗和抽屉的关键交互可演示。
- 页面支持直接打开和 iframe 嵌入。
