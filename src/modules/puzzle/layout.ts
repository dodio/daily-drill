/**
 * 棋盘尺寸的算法，单独拎出来是为了能离线验。
 *
 * 这里的每一条都对应一个曾经踩过的坑，改之前先看这里的注释。
 */

/** 一格最多多大（CSS 像素）。再大就只是「屏幕越大块越傻」 */
export const CELL_MAX = 60;
/** 极端小屏兜底，再小就点不中了 */
export const CELL_MIN = 18;

/**
 * 一格该多大。
 *
 * 分母固定用全游戏最大的盘子边长（MAX_GRID = 6），**不是当前关卡的 cols**。
 * 这是「不同难度格子一样大」的全部实现：
 *   4×4 拿到的是 stageW/6，6×6 拿到的也是 stageW/6，两者格宽相同，
 *   于是简单档的盘子整体小一圈，而不是把小盘子的格子撑大。
 *
 * 早先棋盘是 width:100% + max-width:420，格子大小等于「可用宽度 ÷ 列数」，
 * 盘子越小格子越大——4×4 只有十六格却铺满全屏，一块顶别人四块，
 * 简单档反而最笨重，完全反了。
 *
 * 取 min(w, h) 是因为两条边都得塞得下：横屏时高度是稀缺资源，
 * 竖屏时高度也依然是拖拽距离的瓶颈。
 */
export function fitCell(stageW: number, stageH: number, maxGrid: number): number {
  if (!(stageW > 0) || !(stageH > 0) || !(maxGrid > 0)) return CELL_MAX;
  const fit = Math.floor(Math.min(stageW / maxGrid, stageH / maxGrid, CELL_MAX));
  return Math.max(CELL_MIN, fit);
}
