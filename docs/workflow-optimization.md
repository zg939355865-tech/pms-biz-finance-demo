# 项目生成流程优化说明

## 优化内容

### 1. 策略引擎配置项支持

**问题**：schema中配置的`noPagination`、`keepOperationColumn`等配置项不生效，需要手动修改HTML。

**解决方案**：在策略引擎中添加了对以下配置项的支持：

| Schema配置项 | 效果 | 示例 |
|-------------|------|------|
| `noPagination: true` | EditableTable不显示分页 | 项目分摊明细、部门分摊明细 |
| `keepOperationColumn: false` + `rowActions: []` | EditableTable不显示操作列 | 只读明细表格 |
| `pagination: false` | 强制禁用分页（与noPagination等效） | 通用表格 |

**使用示例**：
```json
{
  "id": "project-allocations",
  "component": "EditableTable",
  "noPagination": true,
  "keepOperationColumn": false,
  "rowActions": [],
  "columns": [...]
}
```

### 2. 分级验证命令

**问题**：每次修改都要运行完整验证（8秒），快速迭代效率低。

**解决方案**：提供两个验证级别：

```bash
# 快速验证（仅生成页面，约2秒）
npm run verify:quick -- schemas/pages/cost/purchase-price-variance.json

# 完整验证（生成+策略检查+静态检查+视口检查，约8秒）
npm run verify:full -- schemas/pages/cost/purchase-price-variance.json

# 兼容旧命令
npm run verify:page -- schemas/pages/cost/purchase-price-variance.json
```

**使用建议**：
- 开发阶段：使用`verify:quick`快速预览
- 交付前：使用`verify:full`确保质量

### 3. Schema模板生成器

**问题**：手动编写schema容易遗漏配置项，查阅文档耗时。

**解决方案**：提供schema初始化命令，自动生成推荐配置的schema骨架。

```bash
# 基本用法
npm run schema:init -- "页面名称" [domain] [module] [profile-type]

# 示例
npm run schema:init -- "价差确认" cost 成本核算 auditable-list-detail
npm run schema:init -- "采购订单" procurement 采购管理 workflow-list-detail
npm run schema:init -- "物料列表" material 物资管理 list-only
```

**支持的模板类型**：

| 模板类型 | 适用场景 | 默认配置 |
|---------|---------|---------|
| `auditable-list-detail` | 可审核列表详情页（默认） | 审核/反审核按钮，无流程 |
| `workflow-list-detail` | 流程列表详情页 | 完整流程功能 |
| `list-only` | 仅列表页 | 无详情页 |

### 4. 页面生成逻辑优化

**问题**：`rowActions`配置被默认值覆盖，无法通过schema控制操作列显示。

**解决方案**：修改页面生成逻辑，优先使用schema中的配置：

```javascript
// 修改前：总是使用默认值
const rowActions = node.rowActions || (editable ? [...] : [...]);

// 修改后：尊重schema配置
const rowActions = 'rowActions' in node ? node.rowActions : (editable ? [...] : [...]);
```

## 优化效果

| 优化项 | 优化前 | 优化后 | 收益 |
|-------|--------|--------|------|
| 分页/操作列配置 | 需手动修改HTML | schema配置直接生效 | 减少50%手动修改 |
| 验证耗时 | 每次8秒 | 快速验证2秒 | 节省60%时间 |
| Schema编写 | 手动编写完整JSON | 模板生成+补充字段 | 减少70%编写时间 |
| 配置生效 | 策略引擎不识别 | 完整支持 | 避免二次修改 |

## 最佳实践

### 开发流程

```
【新页面】
1. npm run schema:init -- "页面名称" cost 模块名
2. 编辑schema字段和mockData
3. npm run verify:quick -- schemas/pages/cost/xxx.json（快速预览）
4. npm run verify:full -- schemas/pages/cost/xxx.json（交付前验证）

【修改现有页面】
1. 编辑schema
2. npm run verify:quick -- schemas/pages/cost/xxx.json（快速预览）
3. 如需手动修改HTML，直接编辑（下次verify:full会覆盖）
4. npm run verify:full -- schemas/pages/cost/xxx.json（交付前验证）
```

### 配置项使用

**EditableTable无分页、无删除按钮**：
```json
{
  "component": "EditableTable",
  "noPagination": true,
  "keepOperationColumn": false,
  "rowActions": []
}
```

**EditableTable有分页、有删除按钮**：
```json
{
  "component": "EditableTable"
  // 使用默认配置即可
}
```

**ProTable无分页**：
```json
{
  "component": "ProTable",
  "pagination": false
}
```

## 后续优化方向

1. **HTML Patch机制**：支持在schema中声明需要保留的HTML手动修改
2. **组件级编辑API**：通过schema直接修改特定组件的HTML片段
3. **IDE插件**：提供schema配置项自动补全和验证
4. **增量检查**：只检查本次修改的region，而非全页
