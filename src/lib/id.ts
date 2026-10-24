/** 生成唯一 id。局域网 http 下 crypto.randomUUID 不可用（非安全上下文），需要降级。 */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
