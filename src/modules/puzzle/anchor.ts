import type { Cell } from './generator.ts';

export interface Placement {
  anchor: Cell;
  /** 落点被纠正过：指针并不正指着这个位置 */
  adjusted: boolean;
}

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/**
 * 换格的迟滞，单位是格。
 *
 * 块本身不再被吸到格子上（见 dragAnchor 的说明），这里只决定「落点预览」和
 * 「松手会放在哪」什么时候改判。没有它，指针停在两格分界线上手一抖，
 * 绿框就在左右两格之间闪。0.08 格 ≈ 40px 格子上的 3px，够压住抖动又不拖沓。
 */
const HOLD = 0.08;

const settleAxis = (value: number, prev: number | null | undefined): number => {
  const near = Math.round(value);
  if (prev === null || prev === undefined || prev === near) return near;
  return Math.abs(value - prev) > 0.5 + HOLD ? near : prev;
};

/**
 * 指针位置 → 这一放会落在哪一格。**只做判定，不搬动块**。
 *
 * `grabX/grabY` 是指针抓住的那一点在块内的位置，单位是格（带小数）；
 * `prev` 是上一次判出来的格，用来做迟滞。
 *
 * 判定用 round 而不是 floor：
 * - `floor` 问的是「块左上角进了哪一格」，块一碰到格子边就改判；
 * - `round` 问的是「哪一格的格心离块最近」，也就是块里的格子**盖住了某个画布格的中心**
 *   才算数——过头半格才倒向那边，跟用指甲盖推东西的感觉一致。
 *
 * 早期这里还顺带把块吸到格子上，结果是一个死结：块的像素位置一旦服从格位，
 * 就必须设阈值；设了阈值就必然出现「想挪开得先移出那个区域」的黏滞感，
 * 阈值调大调小都只是换个地方难受。现在块永远精确跟手（见 PuzzleGame 里
 * `px - grabX * cell`），对齐这件事只存在于「松手落在哪」的判定里。
 */
export function dragAnchor(
  localX: number,
  localY: number,
  grabX: number,
  grabY: number,
  cell: number,
  prev?: Cell | null,
): Cell {
  const exactX = localX / cell - grabX;
  const exactY = localY / cell - grabY;
  return {
    x: settleAxis(exactX, prev?.x),
    y: settleAxis(exactY, prev?.y),
  };
}

/**
 * 把「块想落在的这一格」核成「最终允许落在哪一格」。
 * 抽成纯函数是为了能离线跑用例——判定条件一多，光靠手点是试不出来的。
 *
 * 三条规则，按优先级：
 * 1. 刚被拿起来的那一格：本次拖动里作废。
 *    从棋盘上捡起一块时 raw 一开始就等于原位置，且原位置对自己永远「放得下」，
 *    于是预览会立刻在脚下亮起绿框、块也像没动过。这一格这次不算。
 * 2. 指哪放哪：raw 本身能放就直接用，不纠正。
 * 3. 差一格放不进：在周围一圈里找，只有唯一候选才纠正过去。
 *    有多个候选说明这个位置本身有歧义，硬纠会纠到玩家不想要的地方。
 *
 * 早先还有第四条「上一帧吸住的地方在 1 格内就继续吸着」，那是为了防块被甩掉。
 * 块不再吸附之后，这条只会让预览亮着一个过期的绿框，已经删掉。
 *
 * @param blocked 本次拖动中作废的格子（从棋盘拿起时的原位）
 */
export function pickAnchor(
  raw: Cell,
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
  return found.length === 1 ? { anchor: found[0], adjusted: true } : null;
}
