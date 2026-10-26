/**
 * 用户偏好（上次选的难度、题型、年级等）。
 *
 * 和 storage.ts 里的练习记录分开存：那边是"做过什么"，这边是"下次还想怎么练"。
 * 记录丢了只是少一条历史，偏好丢了每次都得多点几下，所以两者互不影响。
 * 任何读写异常都静默降级——隐私模式下 localStorage 会直接抛错。
 */

const PREFIX = 'daily-drill:pref:';

export function readPref(key: string): unknown {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // 配额用尽或隐私模式：记不住就算了，不影响本次练习
  }
}
