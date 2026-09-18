# Schema 编写指南（AI 必读）

## 核心原则

**只写策略引擎无法推断的内容。** 策略引擎会自动补齐公共规则，AI 重复编写这些字段是纯浪费。

## 策略引擎自动填充的字段（AI 不必写）

以下字段由策略引擎根据 `policyProfile` 自动填充，Schema 中写了也会被覆盖：

### 页面级字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `policyVersion` | 自动填充为 `policies/registry.json` 的当前版本 | ❌ 不必写 |
| `toastEnabled` | 从 `policies/defaults/interaction.json` 读取默认值 | ❌ 不必写 |
| `deleteConfirmationEnabled` | 有删除操作时自动启用 | ❌ 不必写 |
| `saveDraftEnabled` | 从 profile 读取 | ❌ 不必写 |
| `detailReviewEnabled` | 从 profile 读取 | ❌ 不必写 |
| `detailWorkflowLinksEnabled` | 从 profile 读取 | ❌ 不必写 |
| `detailSaveEnabled` | 从 profile 读取 | ❌ 不必写 |
| `detailSubmitEnabled` | 从 profile 读取 | ❌ 不必写 |
| `submitActionLabel` | 非流程页面自动设为"提交" | ❌ 不必写 |
| `workflowActions` | 从 profile 读取 | ❌ 不必写 |

### 查询区（ProSearchForm）字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `collapsedFieldCount` | 自动设为 4 | ❌ 不必写 |
| `collapsible` | 自动设为 false | ❌ 不必写 |
| `firstFieldAlignment` | 根据是否有复选框自动选择 | ❌ 不必写 |

### 详情表单（DetailForm）字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `layoutColumns` | 自动设为 3（三列布局） | ❌ 不必写 |

### 附件列表（ProUploadList）字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `title` | 自动删除（页签名已承担分组作用） | ❌ 不必写 |
| `inheritDetailEditability` | 自动设为 true | ❌ 不必写 |
| `keepOperationColumn` | 自动设为 true | ❌ 不必写 |
| `operationColumnWidth` | 自动设为 96 | ❌ 不必写 |
| `rowActions` | 自动设为 `[{code: "remove-row", label: "删除", type: "link"}]` | ❌ 不必写 |

### 可编辑表格（EditableTable）字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `actions[].label`（batch-delete） | 自动设为"删除选中明细" | ❌ 不必写 |
| `rowActions[].label`（remove-row） | 自动设为"删除" | ❌ 不必写 |

### 审核/反审核动作

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| `pageActions` 中的 `audit` | 从 profile 自动注入 | ❌ 不必写 |
| `pageActions` 中的 `reverse-audit` | 从 profile 自动注入 | ❌ 不必写 |
| `detailActions` 中的审核按钮 | 自动删除（列表页头已有） | ❌ 不必写 |

### 审计字段

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| 创建人、创建时间、创建公司 | 自动注入到第一个 DetailForm | ❌ 不必写 |

### 状态字段位置

| 字段 | 策略引擎行为 | AI 是否需要写 |
|------|-------------|--------------|
| 状态字段在查询区、列表、详情中的位置 | 自动移到业务标识字段之后 | ❌ 不必写 |

## AI 必须写的字段

### 页面级必填字段

```json
{
  "schemaVersion": "pms-page-schema-v2",
  "pageCode": "your-page-code",
  "pageName": "页面名称",
  "domain": "业务域",
  "module": "所属模块",
  "pageType": "list | list-detail | detail | dashboard",
  "template": "页面模板名称",
  "outputPath": "pages/xxx/xxx.html",
  "policyProfile": "workflow-list-detail | auditable-list-detail | non-workflow-list-detail | business-list | approval-workbench | utility-page",
  "resourceReference": {
    "center": "prototype-resources/index.html",
    "baseline": "pms-resource-center-v1",
    "pageSamples": ["参考的页面样例"],
    "components": ["ProSearchForm", "ProTable", ...]
  }
}
```

### 业务特有字段

- `regions`：页面区域定义（查询区、列表、详情、页签等）
- `overlays`：弹窗、抽屉定义
- `pageActions`：页面级操作（新增、批量删除等，但 audit/reverse-audit 不必写）
- `mockData`：样例数据
- `interactions`：业务特有的交互逻辑
- `rules`：业务特有的校验规则

## 字段默认值参考

以下默认值由生成器和策略引擎提供，Schema 中可不写：

| 组件 | 字段 | 默认值 |
|------|------|--------|
| ProTable | `pageSize` | 5 |
| ProTable | `selectable` | false |
| ProTable | `keepOperationColumn` | true（有删除操作时） |
| ProSearchForm | `collapsedFieldCount` | 4 |
| ProSearchForm | `collapsible` | false |
| DetailForm | `layoutColumns` | 3 |
| 字段 | `align` | 按 component 类型自动选择 |
| 字段 | `width` | 按 component 类型自动选择 |

## 示例：精简 Schema vs 冗余 Schema

### ❌ 冗余写法（浪费 token）

```json
{
  "policyVersion": "pms-policy-v5",
  "toastEnabled": false,
  "deleteConfirmationEnabled": true,
  "saveDraftEnabled": true,
  "detailReviewEnabled": false,
  "detailWorkflowLinksEnabled": false,
  "detailSaveEnabled": true,
  "detailSubmitEnabled": true,
  "submitActionLabel": "提交",
  "regions": [
    {
      "component": "ProSearchForm",
      "collapsedFieldCount": 4,
      "collapsible": false,
      "firstFieldAlignment": "selection-control",
      "fields": [...]
    },
    {
      "component": "DetailForm",
      "layoutColumns": 3,
      "fields": [...]
    },
    {
      "component": "ProUploadList",
      "title": "附件",
      "inheritDetailEditability": true,
      "keepOperationColumn": true,
      "operationColumnWidth": 96,
      "rowActions": [{"code": "remove-row", "label": "删除", "type": "link"}]
    }
  ],
  "pageActions": [
    {"code": "audit", "label": "审核", ...},
    {"code": "reverse-audit", "label": "反审核", ...},
    {"code": "batch-delete", "label": "批量删除", ...}
  ]
}
```

### ✅ 精简写法（推荐）

```json
{
  "schemaVersion": "pms-page-schema-v2",
  "pageCode": "your-page-code",
  "pageName": "页面名称",
  "domain": "income",
  "module": "收入管理",
  "pageType": "list-detail",
  "template": "tabs-detail-page",
  "outputPath": "pages/income/your-page.html",
  "policyProfile": "auditable-list-detail",
  "resourceReference": {
    "center": "prototype-resources/index.html",
    "baseline": "pms-resource-center-v1",
    "pageSamples": ["收入合同"],
    "components": ["ProSearchForm", "ProTable", "ProTabsDetail", "DetailForm", "ProUploadList"]
  },
  "regions": [
    {
      "component": "ProSearchForm",
      "fields": [...]
    },
    {
      "component": "DetailForm",
      "fields": [...]
    },
    {
      "component": "ProUploadList",
      "dataSource": "attachments"
    }
  ],
  "pageActions": [
    {"code": "batch-delete", "label": "批量删除", "type": "danger", "ghost": true, "requiresSelection": true},
    {"code": "create", "label": "新增", "type": "primary"}
  ],
  "mockData": {...}
}
```

**差异**：精简写法省去了约 40% 的字段定义，这些由策略引擎自动补齐。

## 检查方法

编写完 Schema 后，运行 `npm run verify:page -- <schema-path>`，策略引擎会自动补齐缺失字段并输出 `outputs/effective-schemas/` 下的完整版本。对比源 Schema 和 Effective Schema，如果某个字段被策略引擎覆盖，说明该字段不必在源 Schema 中编写。
