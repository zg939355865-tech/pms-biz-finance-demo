# PMS PRD/UR 模板资产

本目录保存PMS项目历史模板资产、文档规范和交付目录，不再作为默认模板Skill入口。

## 目录内容

| 文件 | 用途 |
|---|---|
| `PMS项目管理需求规格说明书_标准模板_V1.0.docx` | 后续生成文档的正式视觉与结构基准 |
| `prd-document-standard.md` | 内容结构、写作、格式、版本和验收规则 |
| `prd-generation-workflow.md` | 从需求和原型到正式DOCX的执行流程 |
| `template-design.md` | 当前模板基线及后续调整原则 |
| `build_optimized_template.py` | 已停用的V1.1优化构建脚本，不作为当前模板生成入口 |
| `assets/` | 模板使用的标识及预览资源 |

## 使用入口

在 Codex 中调用 `$mes-ur-generator`，并说明模块范围、版本和内容来源。该 Skill 独立决定文档结构和格式，不叠加本目录中的历史模板。

## 文件管理

- 本目录仅保存正式模板资产和可复用规则。
- 具体模块每次生成的正式文件统一放入 `prd-assets/` 下的独立交付目录：`prd-assets/deliveries/{模块名称}/{YYYYMMDD}-V{版本}/`。
- 同一交付目录只保留正式DOCX、来源清单和必要的待确认事项，不把文件散放在 `prd-assets/` 根目录、`docs/PRD/` 或其他位置。
- 临时渲染图、PDF及检查文件统一存放在 `outputs/prd/{模块名称}/{YYYYMMDD}-V{版本}/`，不得放入正式交付目录。
