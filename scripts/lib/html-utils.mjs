export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatValue(value, format) {
  if (format === 'money' || format === 'quantity' || format === 'unit-price') {
    const number = Number(value || 0);
    const precision = format === 'unit-price' ? 4 : 2;
    return number.toLocaleString('zh-CN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  }
  if (format === 'percent') return `${Number(value || 0).toFixed(2)}%`;
  return escapeHtml(value);
}

export const STATUS_CLASS_MAP = {
  草稿: 'tag-default',
  新增: 'tag-default',
  未生效: 'tag-default',
  未开启: 'tag-warning',
  已开启: 'tag-success',
  已启动: 'tag-info',
  已关闭: 'tag-danger',
  审核: 'tag-success',
  履约中: 'tag-info',
    是: 'tag-success',
    否: 'tag-default',
    待审核: 'tag-warning',
    待审批: 'tag-warning',
    进行中: 'tag-info',
    已完成: 'tag-success',
    已生效: 'tag-success',
    已审核: 'tag-success',
    已审批: 'tag-success',
    已提交: 'tag-info',
    在线: 'tag-success',
    离线: 'tag-danger',
    未知: 'tag-warning',
    控制: 'tag-success',
    已控制: 'tag-success',
    未控制: 'tag-warning',
    智能体训练: 'tag-info',
    部署中: 'tag-info',
    已到期: 'tag-danger',
    停用: 'tag-danger',
    待客户确认: 'tag-warning',
    无: 'tag-default',
    待确认: 'tag-warning',
    已确认: 'tag-success',
    已拒绝: 'tag-danger',
    已停止: 'tag-danger',
    已通过: 'tag-success',
    全部通过: 'tag-success',
    未通过: 'tag-danger',
    检查中: 'tag-info',
    检查失败: 'tag-danger',
    阻断: 'tag-danger',
    警告: 'tag-warning',
    未结账: 'tag-warning',
    结账中: 'tag-info',
    已结账: 'tag-success',
    结账失败: 'tag-danger',
    未同步: 'tag-warning',
    同步中: 'tag-info',
    同步成功: 'tag-success',
    部分失败: 'tag-danger',
    同步失败: 'tag-danger',
    已驳回: 'tag-danger',
    已终止: 'tag-danger',
    待付款: 'tag-warning',
    已付款: 'tag-success',
    已取消: 'tag-danger',
    已作废: 'tag-danger',
    未生成凭证: 'tag-warning',
    已生成凭证: 'tag-success',
    凭证异常: 'tag-danger',
  draft: 'tag-default',
  pending: 'tag-warning',
  active: 'tag-info',
  done: 'tag-success',
  error: 'tag-danger'
};

export function statusClass(value) {
  return STATUS_CLASS_MAP[value] || 'tag-default';
}
