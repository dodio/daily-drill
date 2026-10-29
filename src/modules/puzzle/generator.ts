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
  /**
   * 这一关要切成几块。
   *
   * 难度其实只有两个自变量：**盘子有多少格**、**切成几块**。
   * 以前用的是「单块目标格数」（targetSize），块数是它算出来的副产品——
   * 想调「更碎一点」得反推着改格数，改完块数还不一定对。
   * 直接要块数，难度就是一个能写死的数，也才说得清「越碎越难」。
   */
  pieces: number;
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

/**
 * 把整块区域切成 target 块。
 *
 * 每一刀都切**当前最大的那一块**——切最大的，块大小才会越切越均匀；
 * 随手挑一块切，最后必然出现「三块巨无霸 + 一堆碎渣」。
 *
 * 只在两半都至少 2 格时才认这一刀：单格块抓不住也没法再分，
 * 与其切出渣，不如让块数少一块——所以实际块数可能略少于 target，
 * 但每一块都是能拿在手上拼的。
 */
function splitInto(
  members: number[],
  adj: Map<number, number[]>,
  target: number,
): number[][] {
  const parts: number[][] = [members];
  // 切不动的大块（形状太窄，切下去必然出现 1 格）按引用记下来，避免反复重试
  const stuck = new Set<number[]>();

  while (parts.length < target) {
    let idx = -1;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (stuck.has(part)) continue;
      // 不足 4 格切不出「2 格 + 2 格」，直接标死
      if (part.length < 4) {
        stuck.add(part);
        continue;
      }
      if (idx < 0 || part.length > parts[idx].length) idx = i;
    }
    if (idx < 0) break;

    const current = parts[idx];
    let left: number[] = [];
    let right: number[] = [];
    let ok = false;
    // 0.38~0.54 之间随机取切点：固定对半的话每块都一样大，拼起来没意思
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const cut = Math.round(current.length * (0.38 + Math.random() * 0.16));
      [left, right] = cutTree(current, adj, cut);
      if (left.length >= 2 && right.length >= 2) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      stuck.add(current);
      continue;
    }
    parts.splice(idx, 1, left, right);
  }

  return parts;
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
  const { cols, rows, pieces: wanted, carve } = config;
  const region = buildRegion(cols, rows, carve);
  const cells = regionCells(region);

  /*
    块数上限按「每块至少 2 格」卡死：区域 28 格最多切成 14 块，
    再往上就只能切出单格渣——抓着都费劲，也别谈什么难度。
  */
  const target = clamp(wanted, 2, Math.floor(cells.length / 2));

  const tree = buildTree(region, cols, rows);
  const parts = splitInto(cells, tree, target);
  const shuffled = shuffle(parts);

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
 * 三档难度各 3 关。
 *
 * 难度只用两个数表达，别的不算数：
 *   - **格子数**：4×4 十六格 → 5×5 二十五格 → 6×6 三十六格
 *   - **碎片数**：三档分别是 3~5 块、6~8 块、9~12 块
 *
 * 碎片越多越难，因为每一块都要单独认形状、单独找位置。
 * 同一档里三关的格子不变，只加碎片数——这样「第二关比第一关难」
 * 才是真的难了一点点，而不是盘子突然大了一圈。
 *
 * 三档的盘子都压在 6×6 以内，是为了让**每格在屏幕上的大小完全一样**：
 * 难度不该靠「简单的格子更大」来伪装，那样简单档的块反而又大又笨。
 */
export const TIERS: Record<Tier, LevelConfig[]> = {
  easy: [
    { cols: 4, rows: 4, pieces: 3, carve: 0 },
    { cols: 4, rows: 4, pieces: 4, carve: 0 },
    { cols: 4, rows: 4, pieces: 5, carve: 0 },
  ],
  normal: [
    { cols: 5, rows: 5, pieces: 6, carve: 2 },
    { cols: 5, rows: 5, pieces: 7, carve: 3 },
    { cols: 5, rows: 5, pieces: 8, carve: 4 },
  ],
  hard: [
    { cols: 6, rows: 6, pieces: 9, carve: 6 },
    { cols: 6, rows: 6, pieces: 11, carve: 7 },
    { cols: 6, rows: 6, pieces: 12, carve: 8 },
  ],
};

/**
 * 无尽模式的一档：盘子尺寸钉死，碎片数随关卡从少长到多。
 *
 * 早先是「每 3 关长一格」的自动递进，13 关就到 8×8 顶格，孩子还没玩开就撞墙了；
 * 后来改成盘子完全不动，结果每关长得一模一样，只是换了张图——玩到第十关和第一关
 * 手感毫无区别，压力全由倒计时提供，那更像限时挑战，不像「越玩越难」。
 *
 * 现在取中间：**格子数不动，只让切分变碎**。
 * 盘子不涨是因为格子一变，每格在屏幕上的大小就跟着变（棋盘按 MAX_GRID 分配），
 * 手感会突跳；而碎片数从少到多，是同一张盘子上实打实的加难：
 * 块更多、每块更小、要找的位置更多。
 *
 * 为什么是确定性递增而不是每关随机：随机的话「这关 4 块下一关 11 块」会让人
 * 莫名其妙地翻车，也没法从关数看出自己进步到哪了。每 2 关多一块，节奏可预期。
 */
export interface EndlessTier {
  cols: number;
  rows: number;
  carve: number;
  /** 第一关切几块 */
  minPieces: number;
  /**
   * 碎片上限。
   *
   * 两个约束同时卡着：一是「每块至少 2 格」（区域 16 / 22 / 29 格），
   * 再往上就只能切单格渣；二是托盘——手机上十二块已经要占三四行，
   * 再多就把棋盘压得没地方看了。
   */
  maxPieces: number;
  /** 每几关多切一块 */
  gainEvery: number;
}

export const ENDLESS_TIERS: Record<Tier, EndlessTier> = {
  easy: { cols: 4, rows: 4, carve: 0, minPieces: 3, maxPieces: 6, gainEvery: 2 },
  normal: { cols: 5, rows: 5, carve: 3, minPieces: 6, maxPieces: 9, gainEvery: 2 },
  hard: { cols: 6, rows: 6, carve: 7, minPieces: 9, maxPieces: 12, gainEvery: 2 },
};

/** 无尽模式第 level 关切几块：每 gainEvery 关多一块，到上限就停 */
export function endlessPieces(tier: Tier, level: number): number {
  const t = ENDLESS_TIERS[tier];
  const grown = t.minPieces + Math.floor((Math.max(1, level) - 1) / t.gainEvery);
  return Math.min(t.maxPieces, grown);
}

export function endlessConfig(tier: Tier, level: number): LevelConfig {
  const t = ENDLESS_TIERS[tier];
  return { cols: t.cols, rows: t.rows, carve: t.carve, pieces: endlessPieces(tier, level) };
}

/**
 * 全游戏里最大的盘子边长。
 *
 * 棋盘按「可用空间 ÷ MAX_GRID」定格子大小，于是 4×4 和 6×6 分到同样的格宽，
 * 简单档只是整体小一圈。写死一个 6 容易和上面的表脱钩，所以从表里算出来。
 */
export const MAX_GRID: number = (() => {
  let n = 2;
  for (const tier of ['easy', 'normal', 'hard'] as Tier[]) {
    for (const cfg of TIERS[tier]) n = Math.max(n, cfg.cols, cfg.rows);
    const endless = ENDLESS_TIERS[tier];
    n = Math.max(n, endless.cols, endless.rows);
  }
  return n;
})();

/** 无尽模式的初始时间。盘子越大，给得越多 */
export const ENDLESS_INITIAL_MS: Record<Tier, number> = {
  easy: 150_000,
  normal: 180_000,
  hard: 210_000,
};

/**
 * 完成一关加多少时间。
 *
 * 盘子固定之后，加时如果也固定，手一熟就是净赚——时间从 2:30 一路涨到 5 分钟，
 * 永远结束不了，那样就不叫无尽了。所以加成随关数收紧：每关少 4%，收到 45% 封底。
 *
 * 起手值按两件事给：盘子有多大（格数），这一关切成了几块。
 * 碎片越多、摆一轮越久，加时必须跟着涨一点，否则「多切一块」就等于白扣时间；
 * 但每块只补 1.6 秒——补满是净赚，补一部分才是「越往后越紧」的坡度。
 */
export function timeBonusMs(config: LevelConfig, level: number): number {
  const base = 30 + config.cols * config.rows * 0.5 + config.pieces * 1.6;
  const decay = Math.max(0.45, 1 - (level - 1) * 0.04);
  return Math.round(base * decay * 1000);
}
