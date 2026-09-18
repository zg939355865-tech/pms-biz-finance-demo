# PMS Harness

Harness 是页面生成的工程护栏，不依赖 AI 记住项目规则。

## 固定链路

`原始 Schema -> 策略补全 -> 有效 Schema -> HTML -> 结构检查 + 规则检查`

## 日常使用

- 生成单页：`npm run prototype:build -- schemas/pages/<domain>/<page>.json`
- 检查全部页面：`npm run harness:check`
- 查看自动补全结果：`outputs/effective-schemas/`
- 查看规则报告：`outputs/reports/policy/`
- 查看交付物通道：`artifact-resources/manifest.json`

## 目录职责

- `rules/`：给人阅读的项目准则。
- `policies/`：机器执行的默认规则和页面 Profile。
- `schemas/pages/`：页面业务差异。
- `prototype-resources/`：公共组件和运行时。
- `scripts/`：生成、补全和检查工具。
- `outputs/`：有效 Schema 和检查报告。
- `artifact-resources/`：HTML、文档和 PPT 的资源通道声明。
- `deliverables/`：最终确认的文档和 PPT；HTML 仍沿用 `pages/` 与 `menu/`。

新增页面只需选择正确的 `policyProfile` 并描述业务差异。所属公司、创建人、创建时间、查询布局、分页数量、Toast 和流程按钮等默认项由 Harness 补齐。
