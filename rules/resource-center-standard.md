# 原型资源中心引用规范

## 强制要求

所有新页面蓝图、正式 Schema 和生成 HTML 必须引用 `prototype-resources/index.html` 原型资源中心，避免页面结构、组件和样式漂移。

资源中心基线由以下文件维护：

```text
prototype-resources/manifest.json
```

当前覆盖：

- Ant Design 6.x 官方基础组件和重型组件。
- PMS Schema 注册组件。
- PMS 业务页面样例。
- 项目 Token 和页面生成规则。

## 蓝图要求

蓝图的“组件与样例映射”章节必须列出：

1. 参考的资源中心版本。
2. 参考的页面样例。
3. 计划使用的组件名称。
4. 页面与样例存在的必要差异。

没有匹配样例时，必须说明原因，不能直接自由设计。

## Schema 要求

正式 Schema 必须包含：

```json
{
  "resourceReference": {
    "center": "prototype-resources/index.html",
    "baseline": "pms-resource-center-v1",
    "pageSamples": ["收入合同"],
    "components": ["ProSearchForm", "ProTable", "ProTabsDetail"]
  }
}
```

Schema 声明的页面组件必须出现在 `resourceReference.components` 中。组件覆盖检查页允许使用 `"*"` 表示全部注册组件。

## HTML 要求

生成 HTML 必须写入资源基线标识：

```html
<html data-resource-baseline="pms-resource-center-v1">
```

页面检查器发现基线缺失、组件未引用或基线版本不一致时，应阻断交付。

## 防漂移规则

1. 优先复用页面样例，不从空白结构开始设计。
2. 优先使用资源中心中的组件，不创建同义重复组件。
3. 只使用 `prototype-resources/components/tokens.css` 中的颜色、间距、字号、圆角和阴影。
4. 新组件必须先进入组件注册表和资源中心，再用于业务页面。
5. 修改公共组件时必须重新运行资源中心检查和组件覆盖检查。
6. Ant Design 官方组件只作为静态原型视觉与交互基线，不在静态 HTML 中使用未引入的 React API。
