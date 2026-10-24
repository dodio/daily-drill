import type { AppData, SessionRecord } from '../types/index.ts';

const STORAGE_KEY = 'daily-drill:data:v1';

function emptyData(): AppData {
  return { version: 1, sessions: [] };
}

/** 读取本地数据，任何异常都降级为空数据，绝不让坏数据把应用打挂。 */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData> | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
      return emptyData();
    }
    return { version: 1, sessions: parsed.sessions };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 隐私模式或配额用尽时静默失败，不影响当前练习流程
  }
}

/** 追加一条练习记录并落盘，返回新的数据对象。 */
export function appendSession(data: AppData, session: SessionRecord): AppData {
  const next: AppData = { ...data, sessions: [...data.sessions, session] };
  saveData(next);
  return next;
}

export function clearAll(): AppData {
  const next = emptyData();
  saveData(next);
  return next;
}
