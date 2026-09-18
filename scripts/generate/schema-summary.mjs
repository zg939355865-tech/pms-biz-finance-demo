#!/usr/bin/env node
/**
 * Schema 人类可读摘要生成器
 * 
 * 从 Schema JSON 生成简洁的 Markdown 摘要，用于替代蓝图确认环节。
 * 用户可以直接查看摘要确认页面结构，无需 AI 先生成蓝图 MD。
 * 
 * 用法：node scripts/generate/schema-summary.mjs <schema-path> [--output=<output-path>]
 */

import fs from 'node:fs';
import path from 'node:path';

const schemaPath = process.argv[2];
if (!schemaPath) {
  console.error('Usage: node scripts/generate/schema-summary.mjs <schema-path> [--output=<output-path>]');
  process.exit(1);
}

const outputArg = process.argv.find(arg => arg.startsWith('--output='));
const outputPath = outputArg ? outputArg.split('=')[1] : null;

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const summary = generateSummary(schema);

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, summary, 'utf8');
  console.log(`Summary generated: ${outputPath}`);
} else {
  console.log(summary);
}

function generateSummary(schema) {
  const lines = [];
  
  // 标题
  lines.push(`# ${schema.pageName} — 页面结构摘要`);
  lines.push('');
  lines.push(`> 自动生成自 \`${path.basename(schemaPath)}\``);
  lines.push(`> 页面类型: ${schema.pageType} | 策略配置: ${schema.policyProfile || '默认'}`);
  lines.push('');
  
  // 业务场景
  if (schema.businessScenario) {
    lines.push('## 业务场景');
    lines.push('');
    lines.push(schema.businessScenario);
    lines.push('');
  }
  
  // 页面操作
  if (schema.pageActions?.length) {
    lines.push('## 页面操作');
    lines.push('');
    for (const action of schema.pageActions) {
      const statusHint = action.enabledSelectionStatuses 
        ? `（仅 ${action.enabledSelectionStatuses.join('/')} 状态可用）`
        : action.requiresSelection 
          ? '（需先选择记录）'
          : '';
      lines.push(`- **${action.label}**${statusHint}`);
    }
    lines.push('');
  }
  
  // 区域定义
  lines.push('## 页面区域');
  lines.push('');
  
  for (const region of schema.regions || []) {
    renderRegion(region, lines, 0);
  }
  
  // 弹窗/抽屉
  if (schema.overlays?.length) {
    lines.push('## 弹窗/抽屉');
    lines.push('');
    for (const overlay of schema.overlays) {
      lines.push(`### ${overlay.title || overlay.component}`);
      lines.push('');
      renderRegion(overlay, lines, 0);
    }
  }
  
  // 业务规则
  if (schema.rules?.length) {
    lines.push('## 业务规则');
    lines.push('');
    for (const rule of schema.rules) {
      if (rule.message) {
        lines.push(`- ${rule.message}`);
      } else if (rule.description) {
        lines.push(`- ${rule.description}`);
      } else {
        lines.push(`- ${rule.code}: ${rule.type}`);
      }
    }
    lines.push('');
  }
  
  // 交互逻辑
  if (schema.interactions?.length) {
    lines.push('## 交互逻辑');
    lines.push('');
    for (const interaction of schema.interactions) {
      lines.push(`- **${interaction.trigger}**: ${interaction.effect}`);
    }
    lines.push('');
  }
  
  // 样例数据概览
  if (schema.mockData) {
    lines.push('## 样例数据概览');
    lines.push('');
    for (const [key, data] of Object.entries(schema.mockData)) {
      if (Array.isArray(data)) {
        lines.push(`- \`${key}\`: ${data.length} 条记录`);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function renderRegion(region, lines, depth) {
  const indent = '  '.repeat(depth);
  const component = region.component;
  
  if (component === 'ProSearchForm') {
    lines.push(`${indent}### 查询区`);
    lines.push('');
    if (region.fields?.length) {
      lines.push(`${indent}| 字段 | 控件 | 说明 |`);
      lines.push(`${indent}|------|------|------|`);
      for (const field of region.fields) {
        const required = field.required ? ' (必填)' : '';
        const options = field.options ? ` 选项: ${field.options.join('/')}` : '';
        lines.push(`${indent}| ${field.label}${required} | ${field.component || 'input'} |${options} |`);
      }
      lines.push('');
    }
  } else if (component === 'ProTable') {
    lines.push(`${indent}### 主列表`);
    lines.push('');
    if (region.columns?.length) {
      lines.push(`${indent}| 字段 | 对齐 | 宽度 |`);
      lines.push(`${indent}|------|------|------|`);
      for (const col of region.columns) {
        const align = col.align || 'auto';
        const width = col.width ? `${col.width}px` : '-';
        lines.push(`${indent}| ${col.label} | ${align} | ${width} |`);
      }
      lines.push('');
    }
    if (region.rowActions?.length) {
      lines.push(`${indent}**行操作**: ${region.rowActions.map(a => a.label).join(', ')}`);
      lines.push('');
    }
  } else if (component === 'DetailForm') {
    lines.push(`${indent}### 详情表单`);
    lines.push('');
    if (region.fields?.length) {
      lines.push(`${indent}| 字段 | 控件 | 必填 |`);
      lines.push(`${indent}|------|------|------|`);
      for (const field of region.fields) {
        const required = field.required ? '是' : '否';
        lines.push(`${indent}| ${field.label} | ${field.component || 'input'} | ${required} |`);
      }
      lines.push('');
    }
  } else if (component === 'EditableTable') {
    lines.push(`${indent}### 可编辑表格: ${region.title || ''}`);
    lines.push('');
    if (region.columns?.length) {
      lines.push(`${indent}| 字段 | 控件 | 必填 | 宽度 |`);
      lines.push(`${indent}|------|------|------|------|`);
      for (const col of region.columns) {
        const required = col.required ? '是' : '否';
        const width = col.width ? `${col.width}px` : '-';
        lines.push(`${indent}| ${col.label} | ${col.component || 'input'} | ${required} | ${width} |`);
      }
      lines.push('');
    }
    if (region.actions?.length) {
      lines.push(`${indent}**操作**: ${region.actions.map(a => a.label).join(', ')}`);
      lines.push('');
    }
  } else if (component === 'ProTabsDetail') {
    lines.push(`${indent}### 页签详情`);
    lines.push('');
    if (region.tabs?.length) {
      for (const tab of region.tabs) {
        lines.push(`${indent}#### 页签: ${tab.label}`);
        lines.push('');
        if (tab.children) {
          for (const child of tab.children) {
            renderRegion(child, lines, depth + 1);
          }
        }
      }
    }
  } else if (component === 'ProUploadList') {
    lines.push(`${indent}### 附件列表`);
    lines.push('');
    lines.push(`${indent}数据源: \`${region.dataSource}\``);
    lines.push('');
  } else if (component === 'ProDataSelectModal') {
    lines.push(`${indent}### 数据选择弹窗: ${region.title || ''}`);
    lines.push('');
    if (region.children) {
      for (const child of region.children) {
        renderRegion(child, lines, depth);
      }
    }
  } else {
    lines.push(`${indent}### ${component}`);
    lines.push('');
    if (region.fields?.length) {
      lines.push(`${indent}字段: ${region.fields.map(f => f.label).join(', ')}`);
      lines.push('');
    }
    if (region.columns?.length) {
      lines.push(`${indent}列: ${region.columns.map(c => c.label).join(', ')}`);
      lines.push('');
    }
  }
}
