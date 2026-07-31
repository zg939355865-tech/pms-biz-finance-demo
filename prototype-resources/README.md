# PMS 原型资源中心

本目录是页面原型设计和生成的唯一资源入口。

## 目录

```text
prototype-resources/
├─ index.html          # 可直接打开的资源中心入口
├─ manifest.json       # Ant Design 组件与页面样例目录
├─ components/         # 组件注册表、Token、公共样式和运行时
└─ samples/            # 页面结构样例与组件结构样例
```

## 使用约束

1. 生成页面蓝图前先选择 `samples/` 中的页面结构。
2. Schema 组件必须存在于 `components/component-registry.json`。
3. HTML 必须引用 `components/` 中的公共样式和运行时。
4. 新组件或新样例必须先登记到本目录，再用于业务页面。
5. 完整检查执行 `npm run prototype:all`。
