import type { Cell } from './generator.ts';

export interface Placement {
  anchor: Cell;
  /** 落点被纠正过：指针并不正指着这个位置 */
  adjusted: boolean;
}

/**
 * 把指针位置换算成落点。抽成纯函数是为了能离线跑用例——
 * 吸附这块的判定条件一多，光靠手点是试不出来的。
 *
 * 三条规则，按优先级：
 * 1. 指哪放哪：raw 本身能放就直接用，不纠正
 * 2. 差一格放不进：在周围一圈里找，只有唯一候选才吸过去。
 *    有多个候选说明这个位置本身有歧义，硬吸会吸到玩家不想要的地方
 * 3. 已经吸住的地方：只要指针没走远（一格内）就继续吸着。 *    指针压在格子边界上时会来回跨格，跨到不合法处若无条件放开，
 *    块会从对齐好的位置跳回指针底下，看起来像拖拽被打断了
 */
export function pickAnchor(
  raw: Cell,
  prev: Cell | null,
  fits: (anchor: Cell) => boolean,
): Placement | null {
  if (fits(raw)) return { anchor: raw, adjusted: false };

  const found: Cell[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const anchor = { x: raw.x + dx, y: raw.y + dy };
      if (fits(anchor)) found.push(anchor);
    }
  }
  if (found.length === 1) return { anchor: found[0], adjusted: true };

  if (prev && Math.abs(raw.x - prev.x) <= 1 && Math.abs(raw.y - prev.y) <= 1) {
    return { anchor: prev, adjusted: true };
  }
  return null;
}
