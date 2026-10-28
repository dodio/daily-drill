import type { Cell } from './generator.ts';

export interface Placement {
  anchor: Cell;
  /** 落点被纠正过：指针并不正指着这个位置 */
  adjusted: boolean;
}

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/**
 * 把指针位置换算成落点。抽成纯函数是为了能离线跑用例——
 * 吸附这块的判定条件一多，光靠手点是试不出来的。
 *
 * 四条规则，按优先级：
 * 1. 指针正指着刚被拿起来的那一格：不吸附，自由跟随。
 *    从棋盘上捡起一块时 raw 一开始就等于原位置，且原位置对自己永远「放得下」，
 *    于是块会立刻被吸回原处，看着像没拿起来（用户说的「被同样的格子连续吸附」）。
 *    这一格在这次拖动里被锁住，块先跟着手走，等指针真的挪开了再判。
 * 2. 指哪放哪：raw 本身能放就直接用，不纠正
 * 3. 差一格放不进：在周围一圈里找，只有唯一候选才吸过去。
 *    有多个候选说明这个位置本身有歧义，硬吸会吸到玩家不想要的地方
 * 4. 已经吸住的地方：只要指针没走远（一格内）就继续吸着。
 *    指针压在格子边界上时会来回跨格，跨到不合法处若无条件放开，
 *    块会从对齐好的位置跳回指针底下，看起来像拖拽被打断了
 *
 * @param blocked 本次拖动中锁定的格子（从棋盘拿起时的原位）。不许落、也不许吸。
 */
export function pickAnchor(
  raw: Cell,
  prev: Cell | null,
  fits: (anchor: Cell) => boolean,
  blocked?: Cell | null,
): Placement | null {
  if (blocked && same(raw, blocked)) return null;

  const usable = (anchor: Cell) => fits(anchor) && !(blocked && same(anchor, blocked));

  if (usable(raw)) return { anchor: raw, adjusted: false };

  const found: Cell[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const anchor = { x: raw.x + dx, y: raw.y + dy };
      if (usable(anchor)) found.push(anchor);
    }
  }
  if (found.length === 1) return { anchor: found[0], adjusted: true };

  if (
    prev &&
    !(blocked && same(prev, blocked)) &&
    Math.abs(raw.x - prev.x) <= 1 &&
    Math.abs(raw.y - prev.y) <= 1
  ) {
    return { anchor: prev, adjusted: true };
  }
  return null;
}
