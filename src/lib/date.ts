/** 把 Date 转成本地时区的 YYYY-MM-DD（不能用 toISOString，那是 UTC）。 */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 基于日期 key 做天数偏移，返回新的 key。 */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return todayKey(date);
}

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 10月24日 周六 */
export function formatCn(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日 ${WEEK_CN[date.getDay()]}`;
}

/** 毫秒转 "1分23秒" */
export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}秒`;
  return sec === 0 ? `${min}分` : `${min}分${sec}秒`;
}
