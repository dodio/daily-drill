export const SUDOKU_MODES = ['tutorial', 'very-easy', 'medium', 'hard'] as const;
export type SudokuMode = (typeof SUDOKU_MODES)[number];

export interface SudokuGuide {
  title: string;
  text: string;
  rule: string;
  focus: number[];
  targets: number[];
}

export interface SudokuPuzzle {
  id: string;
  mode: SudokuMode;
  level: number;
  title: string;
  clueCount: number;
  puzzle: number[];
  solution: number[];
  guide: SudokuGuide;
}

export interface SudokuModeMeta {
  id: SudokuMode;
  label: string;
  en: string;
  levelCount: number;
  description: string;
}

export const MODE_META: SudokuModeMeta[] = [
  {
    id: 'tutorial',
    label: '教学关',
    en: 'Learn',
    levelCount: 3,
    description: '三盘小练习，学会看行、看宫和排除法。',
  },
  {
    id: 'very-easy',
    label: '非常容易',
    en: 'Starter',
    levelCount: 5,
    description: '空格少、提示多，适合第一次独立完成。',
  },
  {
    id: 'medium',
    label: '中等',
    en: 'Medium',
    levelCount: 5,
    description: '需要多观察几行、几列，再开始填数。',
  },
  {
    id: 'hard',
    label: '困难',
    en: 'Hard',
    levelCount: 5,
    description: '提示数更少，留给排除法和耐心。',
  },
];

export function modeMeta(mode: SudokuMode): SudokuModeMeta {
  return MODE_META.find((item) => item.id === mode) ?? MODE_META[0];
}

export function levelId(mode: SudokuMode, level: number): string {
  return `${mode}-${level}`;
}

const BASE_SOLUTION = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 2, 4, 3, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 8, 4,
  2, 8, 7, 4, 1, 9, 6, 3, 5,
  3, 4, 5, 2, 8, 6, 1, 7, 9,
];

const TOP_LEFT_BOX = [0, 1, 2, 9, 10, 11, 18, 19, 20];
const MIDDLE_BOX = [30, 31, 32, 39, 40, 41, 48, 49, 50];

const TUTORIALS: Omit<SudokuPuzzle, 'mode' | 'level' | 'id'>[] = [
  makeTutorial(
    '一行不重复',
    {
      title: '先看一整行',
      rule: '每一行都要有 1 到 9，每个数字只出现一次。',
      text: '第一行已经有 5、3、4、6、8、9、1、2，只少一个数字。数一数，空格里应该填几？',
      focus: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      targets: [4],
    },
    [4],
  ),
  makeTutorial(
    '九宫格不能重复',
    {
      title: '再看一个宫',
      rule: '粗线框出的 3×3 小宫，也要刚好放满 1 到 9。',
      text: '左上角这一宫有三个空格。先在宫里找缺少的数字，再用对应的行和列确认。',
      focus: TOP_LEFT_BOX,
      targets: [2, 10, 11],
    },
    [2, 10, 11],
  ),
  makeTutorial(
    '排除法找唯一数',
    {
      title: '横竖交叉找答案',
      rule: '行、列、宫都不能重复；同时排除三个方向，就能找到唯一数。',
      text: '蓝色区域是这一格的同一行、同一列和同一个宫。把已经出现的数字都排除，剩下几？',
      focus: [27, 28, 29, 30, 31, 32, 33, 34, 35, 4, 13, 22, 31, 40, 49, 58, 67, 76, ...MIDDLE_BOX],
      targets: [31],
    },
    [31],
  ),
];

function makeTutorial(
  title: string,
  guide: SudokuGuide,
  blanks: number[],
): Omit<SudokuPuzzle, 'mode' | 'level' | 'id'> {
  const puzzle = [...BASE_SOLUTION];
  blanks.forEach((index) => {
    puzzle[index] = 0;
  });
  return {
    title,
    clueCount: 81 - blanks.length,
    puzzle,
    solution: [...BASE_SOLUTION],
    guide: { ...guide, focus: [...new Set(guide.focus)] },
  };
}

const CLUE_TARGETS: Record<Exclude<SudokuMode, 'tutorial'>, number[]> = {
  'very-easy': [52, 50, 48, 46, 44],
  medium: [38, 36, 34, 32, 30],
  hard: [29, 28, 27, 26, 25],
};

const MODE_TIPS: Record<Exclude<SudokuMode, 'tutorial'>, SudokuGuide> = {
  'very-easy': {
    title: '从空格最多的一宫开始',
    text: '先找一条只剩一个空格的行、列或宫。确认 1 到 9 里少了谁，填进去就好。',
    rule: '每一行、每一列、每个 3×3 宫中，1 到 9 都只能出现一次。',
    focus: [],
    targets: [],
  },
  medium: {
    title: '先找“最确定”的格子',
    text: '同时看格子的行、列和宫。可选项越少越先填；卡住时换一个宫观察。',
    rule: '填错时会标红。红色数字不会被锁住，选中后可以直接改。',
    focus: [],
    targets: [],
  },
  hard: {
    title: '慢一点，用排除法',
    text: '提示数变少了，但规则没有变。先扫一遍每个数字，再回到空格最少的区域。',
    rule: '提示会帮你填一格，但会记录使用次数；先试着自己推出答案。',
    focus: [],
    targets: [],
  },
};

export function tutorialSummaries() {
  return TUTORIALS.map((item, index) => ({
    level: index + 1,
    title: item.title,
    rule: item.guide.rule,
  }));
}

export function createSudoku(mode: SudokuMode, level: number): SudokuPuzzle {
  if (mode === 'tutorial') {
    const safeLevel = Math.min(3, Math.max(1, level));
    const tutorial = TUTORIALS[safeLevel - 1];
    return {
      ...tutorial,
      id: levelId(mode, safeLevel),
      mode,
      level: safeLevel,
    };
  }

  const meta = modeMeta(mode);
  const safeLevel = Math.min(meta.levelCount, Math.max(1, level));
  const target = CLUE_TARGETS[mode][safeLevel - 1];
  const built = buildPuzzle(target, hashSeed(`${mode}:${safeLevel}:v1`));
  return {
    id: levelId(mode, safeLevel),
    mode,
    level: safeLevel,
    title: `${meta.label} · 第 ${safeLevel} 关`,
    clueCount: built.puzzle.filter(Boolean).length,
    puzzle: built.puzzle,
    solution: built.solution,
    guide: MODE_TIPS[mode],
  };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function allowedMask(board: number[], index: number): number {
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  let used = 0;

  for (let i = 0; i < 9; i += 1) {
    const rowValue = board[row * 9 + i];
    const colValue = board[i * 9 + col];
    if (rowValue) used |= 1 << (rowValue - 1);
    if (colValue) used |= 1 << (colValue - 1);
  }
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      const value = board[r * 9 + c];
      if (value) used |= 1 << (value - 1);
    }
  }
  return (~used) & 0x1ff;
}

function digitFromBit(bit: number): number {
  return bit + 1;
}

function bestEmpty(board: number[]): { index: number; mask: number; count: number } | null {
  let best: { index: number; mask: number; count: number } | null = null;
  for (let index = 0; index < 81; index += 1) {
    if (board[index] !== 0) continue;
    const mask = allowedMask(board, index);
    let count = 0;
    for (let value = mask; value; value &= value - 1) count += 1;
    if (!best || count < best.count) best = { index, mask, count };
    if (count <= 1) break;
  }
  return best;
}

function fillSolution(board: number[], random: () => number): boolean {
  const next = bestEmpty(board);
  if (!next) return true;
  if (next.count === 0) return false;

  const digits: number[] = [];
  for (let bit = 0; bit < 9; bit += 1) {
    if (next.mask & (1 << bit)) digits.push(digitFromBit(bit));
  }
  for (const digit of shuffle(digits, random)) {
    board[next.index] = digit;
    if (fillSolution(board, random)) return true;
    board[next.index] = 0;
  }
  return false;
}

function countSolutions(board: number[], limit = 2): number {
  const next = bestEmpty(board);
  if (!next) return 1;
  if (next.count === 0) return 0;

  let total = 0;
  for (let bit = 0; bit < 9 && total < limit; bit += 1) {
    if (!(next.mask & (1 << bit))) continue;
    board[next.index] = digitFromBit(bit);
    total += countSolutions(board, limit - total);
    board[next.index] = 0;
  }
  return total;
}

function makeSolution(random: () => number): number[] {
  const board = new Array<number>(81).fill(0);
  if (!fillSolution(board, random)) throw new Error('数独生成失败');
  return board;
}

function buildPuzzle(targetClues: number, seed: number): { puzzle: number[]; solution: number[] } {
  const random = mulberry32(seed);
  let bestPuzzle: number[] | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const solution = makeSolution(random);
    const puzzle = [...solution];
    const order = shuffle(Array.from({ length: 81 }, (_, index) => index), random);

    // 两轮遍历：第二轮会把第一轮删掉数字后、变得可以继续删除的位置再检查一遍。
    for (let pass = 0; pass < 2; pass += 1) {
      for (const index of order) {
        if (puzzle.filter(Boolean).length <= targetClues) break;
        if (puzzle[index] === 0) continue;
        const value = puzzle[index];
        puzzle[index] = 0;
        if (countSolutions([...puzzle], 2) !== 1) puzzle[index] = value;
      }
    }

    if (!bestPuzzle || puzzle.filter(Boolean).length < bestPuzzle.filter(Boolean).length) {
      bestPuzzle = puzzle;
    }
    if (puzzle.filter(Boolean).length <= targetClues + 2) {
      return { puzzle, solution };
    }
  }

  if (!bestPuzzle) throw new Error('数独生成失败');
  return {
    puzzle: bestPuzzle,
    solution: solveUnique(bestPuzzle),
  };
}

function solveUnique(board: number[]): number[] {
  const copy = [...board];
  if (!fillSolution(copy, mulberry32(1))) throw new Error('数独题解生成失败');
  return copy;
}
