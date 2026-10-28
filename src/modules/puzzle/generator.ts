/**
 * 像素拼接：区域生成 + 切分成块。
 *
 * 核心思路是「先有区域，再从区域里切块」，而不是「随机造块再指望拼得满」。
 * 后者会大量产出无解关卡，而这个模块只做前者：解就是切出来的原样，天然有解。
 *
 * 切法用随机生成树 + 递归对半切。树上切断一条边，两侧必然各自连通，
 * 所以永远切不出「断开的两块」这种废块——这是这套算法最要紧的性质。
 */

export interface Cell {
  x: number;
  y: number;
}

export interface PuzzlePiece {
  id: number;
  /** 归一化后的相对坐标（min x / min y 都是 0） */
  cells: Cell[];
  w: number;
  h: number;
  /** 正确摆放时，这块左上角在棋盘里的坐标 */
  solution: Cell;
  /** 调色板下标 */
  color: number;
}

export interface Puzzle {
  level: number;
  cols: number;
  rows: number;
  /** 长度 cols*rows；false 表示这一格不属于本关形状（被挖掉了） */
  region: boolean[];
  cellCount: number;
  pieces: PuzzlePiece[];
}

export interface LevelConfig {
  cols: number;
  rows: number;
  /** 单块目标格数，实际块数 ≈ 总格数 / targetSize */
  targetSize: number;
  /** 从区域上挖掉多少格，让形状不再是规整的矩形 */
  carve: number;
}

/** 十色，相邻块容易分辨；都是中低饱和，不刺眼 */
export const PALETTE = [
  '#ff8a5b',
  '#5b8cff',
  '#38b48b',
  '#f4b740',
  '#b07cff',
  '#ef6f9b',
  '#3fb6c8',
  '#8bc34a',
  '#ff6f61',
  '#7e8ef7',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 上下左右四个邻居的格子下标 */
function neighborsOf(index: number, cols: number, rows: number): number[] {
  const x = index % cols;
  const y = (index - x) / cols;
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < cols - 1) out.push(index + 1);
  if (y > 0) out.push(index - cols);
  if (y < rows - 1) out.push(index + cols);
  return out;
}

function regionCells(region: boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < region.length; i += 1) if (region[i]) out.push(i);
  return out;
}

/** 区域是否四连通（skip 用于「挖掉这一格之后还连通吗」） */
function isConnected(region: boolean[], cols: number, rows: number, skip = -1): boolean {
  const cells = regionCells(region);
  const total = cells.length - (skip >= 0 && region[skip] ? 1 : 0);
  if (total <= 0) return true;
  const start = cells.find((i) => i !== skip);
  if (start === undefined) return true;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length > 0) {
    const n = stack.pop() as number;
    for (const m of neighborsOf(n, cols, rows)) {
      if (m === skip || !region[m] || seen.has(m)) continue;
      seen.add(m);
      stack.push(m);
    }
  }
  return seen.size === total;
}

/**
 * 从矩形里挖格子，做出不规则轮廓。
 *
 * 两条硬约束：
 * 1. 只啃「挨着已空格」的格子，所以挖空区始终与外部连通，不会挖出封闭的洞
 * 2. 挖完必须仍然四连通，否则会出现够不到的孤岛
 *
 * 优先挑内侧边缘格（有 3 个邻居的那种），这样是「咬出缺口」，
 * 而不是把整块形状一点点削圆。
 */
function buildRegion(cols: number, rows: number, carve: number): boolean[] {
  const region = new Array<boolean>(cols * rows).fill(true);
  const floorKeep = Math.max(9, Math.round(cols * rows * 0.62));
  let budget = Math.min(carve, Math.floor(cols * rows * 0.3));
  let guard = 0;

  while (budget > 0 && guard < 240) {
    guard += 1;
    const cells = regionCells(region);
    if (cells.length <= floorKeep) break;

    const candidates = cells.filter((i) => {
      const touchesEmpty = neighborsOf(i, cols, rows).some((m) => !region[m]);
      return touchesEmpty && isConnected(region, cols, rows, i);
    });
    if (candidates.length === 0) break;

    const notch = candidates.filter(
      (i) => neighborsOf(i, cols, rows).filter((m) => region[m]).length >= 3,
    );
    const chosen = pick(notch.length > 0 && Math.random() < 0.75 ? notch : candidates);
    region[chosen] = false;
    budget -= 1;
  }

  return region;
}

/**
 * 区域上的随机生成树（随机化 Prim）。
 *
 * 边是从 frontier 里均匀随机挑的，所以树比较「茂密」，
 * 切出来的块也就偏团块状，不会长成一条蛇。
 */
function buildTree(region: boolean[], cols: number, rows: number): Map<number, number[]> {
  const cells = regionCells(region);
  const adj = new Map<number, number[]>();
  const inTree = new Set<number>();
  const start = pick(cells);

  inTree.add(start);
  adj.set(start, []);

  const frontier: [number, number][] = [];
  const pushEdges = (n: number) => {
    for (const m of neighborsOf(n, cols, rows)) {
      if (region[m] && !inTree.has(m)) frontier.push([n, m]);
    }
  };
  pushEdges(start);

  while (frontier.length > 0) {
    const k = randInt(0, frontier.length - 1);
    const [a, b] = frontier[k];
    // 交换删除，O(1) 移出，别用 splice
    frontier[k] = frontier[frontier.length - 1];
    frontier.pop();
    if (inTree.has(b)) continue;
    inTree.add(b);
    adj.set(b, []);
    (adj.get(a) as number[]).push(b);
    (adj.get(b) as number[]).push(a);
    pushEdges(b);
  }

  return adj;
}

/** 在生成树上找一条边，把 members 切成「接近 target 格」的两半 */
function cutTree(
  members: number[],
  adj: Map<number, number[]>,
  target: number,
): [number[], number[]] {
  const inside = new Set(members);
  const root = members[0];
  const parent = new Map<number, number>();
  const order: number[] = [];

  parent.set(root, -1);
  const stack = [root];
  while (stack.length > 0) {
    const n = stack.pop() as number;
    order.push(n);
    for (const m of adj.get(n) ?? []) {
      if (!inside.has(m) || parent.has(m)) continue;
      parent.set(m, n);
      stack.push(m);
    }
  }

  // 自底向上算子树大小
  const size = new Map<number, number>();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const n = order[i];
    let s = 1;
    for (const m of adj.get(n) ?? []) {
      if (inside.has(m) && parent.get(m) === n) s += size.get(m) as number;
    }
    size.set(n, s);
  }

  let best = -1;
  let bestDiff = Infinity;
  for (const n of order) {
    if (n === root) continue;
    const diff = Math.abs((size.get(n) as number) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = n;
    }
  }
  if (best < 0) return [members, []];

  // 把 best 的整棵子树摘下来
  const group: number[] = [];
  const seen = new Set([best]);
  const walk = [best];
  while (walk.length > 0) {
    const n = walk.pop() as number;
    group.push(n);
    for (const m of adj.get(n) ?? []) {
      if (!inside.has(m) || seen.has(m) || m === parent.get(n)) continue;
      seen.add(m);
      walk.push(m);
    }
  }

  return [group, members.filter((n) => !seen.has(n))];
}

/** 递归对半切，直到每块都不超过 maxSize */
function decompose(
  members: number[],
  adj: Map<number, number[]>,
  maxSize: number,
  out: number[][],
): void {
  if (members.length <= maxSize) {
    out.push(members);
    return;
  }
  // 0.36~0.50 之间随机取切点，块大小才会有差异；固定取一半的话每块都一样大，拼起来没意思
  let left: number[] = [];
  let right: number[] = [];
  // 有时按目标大小挑中的那条边，切出来正好是单个格子（和某个 3 格子树打平时），
  // 单格块太寒酸，换个切点重试几次
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const target = Math.round(members.length * (0.36 + Math.random() * 0.14));
    [left, right] = cutTree(members, adj, target);
    if (left.length === 0 || right.length === 0) continue;
    if (left.length >= 2 && right.length >= 2) break;
  }
  if (left.length === 0 || right.length === 0) {
    out.push(members);
    return;
  }
  decompose(left, adj, maxSize, out);
  decompose(right, adj, maxSize, out);
}

/**
 * 把小碎块并进相邻块。
 *
 * 只在「并进去不会超上限」时才并，而且是整块并（两侧都连通，并完必然连通）。
 * 找不到空位就让它独立成块——一块两格的骨牌完全能玩，
 * 硬塞进邻块把它撑成 8 格、10 格才是真的难看。
 */
function mergeSmall(
  pieces: number[][],
  cols: number,
  rows: number,
  minSize: number,
  maxSize: number,
): number[][] {
  const list = pieces.map((p) => [...p]);
  let guard = 0;

  while (guard < 40) {
    guard += 1;

    // 每次挑最小的那块处理，免得大碎块把空间占完
    let idx = -1;
    let smallest = Infinity;
    list.forEach((p, i) => {
      if (p.length < minSize && p.length < smallest) {
        smallest = p.length;
        idx = i;
      }
    });
    if (idx < 0) break;

    const small = new Set(list[idx]);
    let target = -1;
    let targetSize = Infinity;
    list.forEach((p, j) => {
      if (j === idx) return;
      if (p.length + small.size > maxSize) return; // 塞进去会超上限
      const touches = p.some((n) => neighborsOf(n, cols, rows).some((m) => small.has(m)));
      if (!touches) return;
      if (p.length < targetSize) {
        targetSize = p.length;
        target = j;
      }
    });
    if (target < 0) break; // 没地方放，就让它独立存在

    list[target] = [...list[target], ...list[idx]];
    list.splice(idx, 1);
  }

  return list;
}

function toPiece(members: number[], id: number, cols: number): PuzzlePiece {
  const points = members.map((n) => ({ x: n % cols, y: Math.floor(n / cols) }));
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const cells = points
    .map((p) => ({ x: p.x - minX, y: p.y - minY }))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const w = Math.max(...cells.map((c) => c.x)) + 1;
  const h = Math.max(...cells.map((c) => c.y)) + 1;
  return { id, cells, w, h, solution: { x: minX, y: minY }, color: id % PALETTE.length };
}

export function generatePuzzle(level: number, config: LevelConfig): Puzzle {
  const { cols, rows, targetSize, carve } = config;
  const region = buildRegion(cols, rows, carve);
  const cells = regionCells(region);

  // 块的上限比目标大 1、下限比目标小 2：切出来的块大小才会落在
  // 「够小不至于一放就满，够大不至于碎得抓不住」这个区间里
  const maxSize = clamp(targetSize + 1, 3, 9);
  const minSize = clamp(targetSize - 2, 2, maxSize);
  // 直接按 maxSize 切。压到 maxSize-1 会让块数暴涨（8×8 切出 22 块，碎得没法玩）
  const splitCap = maxSize;

  const tree = buildTree(region, cols, rows);
  const parts: number[][] = [];
  decompose(cells, tree, splitCap, parts);

  // 递归切分收尾时可能剩下一两块很小的，能并则并
  const merged = mergeSmall(parts, cols, rows, minSize, maxSize);
  const shuffled = shuffle(merged);

  return {
    level,
    cols,
    rows,
    region,
    cellCount: cells.length,
    pieces: shuffled.map((members, i) => toPiece(members, i, cols)),
  };
}

// ---------- 关卡配置 ----------

export type Tier = 'easy' | 'normal' | 'hard';

export const TIER_LABELS: Record<Tier, string> = {
  easy: '简单',
  normal: '中等',
  hard: '困难',
};

/**
 * 三档难度各 3 关，数值调过：
 * - 简单：全是矩形，4×4 起步，块少而大，7 岁第一次玩能通
 * - 中等：开始挖格子，6×6 收尾
 * - 困难：挖得更多，块更小更多，7×7 收尾
 */
export const TIERS: Record<Tier, LevelConfig[]> = {
  easy: [
    { cols: 4, rows: 4, targetSize: 5, carve: 0 },
    { cols: 5, rows: 4, targetSize: 5, carve: 0 },
    { cols: 5, rows: 5, targetSize: 5, carve: 2 },
  ],
  normal: [
    { cols: 5, rows: 5, targetSize: 4, carve: 3 },
    { cols: 6, rows: 5, targetSize: 5, carve: 4 },
    { cols: 6, rows: 6, targetSize: 5, carve: 6 },
  ],
  hard: [
    { cols: 6, rows: 6, targetSize: 4, carve: 8 },
    { cols: 7, rows: 6, targetSize: 4, carve: 10 },
    { cols: 7, rows: 7, targetSize: 4, carve: 12 },
  ],
};

/**
 * 无尽模式第 n 关的配置。
 * 棋盘每 3 关长一格（上限 8），挖空比例随关数上升，
 * 块的目标尺寸从 5 降到 4——同样是 49 格，4 格的块要多拼三块。
 */
export function endlessConfig(level: number): LevelConfig {
  const grown = Math.min(8, 4 + Math.floor((level - 1) / 3));
  // 每 3 关来一次非正方形，避免一直是方阵
  const rows = level % 3 === 0 ? Math.max(4, grown - 1) : grown;
  const cells = grown * rows;
  return {
    cols: grown,
    rows,
    targetSize: level <= 3 ? 5 : 4,
    carve: Math.round(cells * Math.min(0.28, 0.03 * level)),
  };
}

/** 无尽模式的初始时间 */
export const ENDLESS_INITIAL_MS = 150_000;

/**
 * 完成一关加多少时间。
 *
 * 系数是照着「孩子实际耗时」估的：4×4 大约 30~40 秒，加成 38 秒，
 * 手快能攒时间；到 7×7 要一分半，加成只有 55 秒，时间就开始往下掉。
 * 所以它迟早会结束，但不是一开始就被卡死。
 */
export function timeBonusMs(config: LevelConfig): number {
  return Math.round((30 + config.cols * config.rows * 0.5) * 1000);
}
