export type Difficulty = 'easy' | 'normal' | 'hard';
/** 单个题型。可以多选叠加，选几个就混着出几个——「混合」只是全选的快捷方式 */
export type TopicKind = 'add' | 'sub' | 'mul' | 'div';

export interface Question {
  id: string;
  /** 题干，例如 "7 + 8" */
  prompt: string;
  answer: number;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '一年级 · 20以内',
  normal: '二年级 · 100以内',
  hard: '三年级+ · 多位',
};

export const TOPIC_KINDS: TopicKind[] = ['add', 'sub', 'mul', 'div'];

export const TOPIC_LABELS: Record<TopicKind, string> = {
  add: '加法',
  sub: '减法',
  mul: '乘法',
  div: '除法',
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)];
}

function ceiling(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 20;
  if (difficulty === 'normal') return 100;
  return 1000;
}

function makeAdd(difficulty: Difficulty): { prompt: string; answer: number } {
  const max = ceiling(difficulty);
  const a = randInt(1, max - 1);
  const b = randInt(1, max - a);
  return { prompt: `${a} + ${b}`, answer: a + b };
}

function makeSub(difficulty: Difficulty): { prompt: string; answer: number } {
  const max = ceiling(difficulty);
  const a = randInt(2, max);
  const b = randInt(1, a - 1);
  return { prompt: `${a} − ${b}`, answer: a - b };
}

function makeMul(difficulty: Difficulty): { prompt: string; answer: number } {
  let a: number;
  let b: number;
  if (difficulty === 'hard') {
    a = randInt(11, 99);
    b = randInt(2, 9);
  } else if (difficulty === 'normal') {
    a = randInt(2, 9);
    b = randInt(2, 9);
  } else {
    a = randInt(2, 5);
    b = randInt(2, 5);
  }
  return { prompt: `${a} × ${b}`, answer: a * b };
}

function makeDiv(difficulty: Difficulty): { prompt: string; answer: number } {
  // 用逆运算构造，保证整除，不出现余数
  const divisor = difficulty === 'easy' ? randInt(2, 5) : randInt(2, 9);
  const quotient =
    difficulty === 'easy' ? randInt(2, 4) : difficulty === 'hard' ? randInt(11, 50) : randInt(2, 9);
  const dividend = divisor * quotient;
  return { prompt: `${dividend} ÷ ${divisor}`, answer: quotient };
}

const BUILDERS: Record<TopicKind, (d: Difficulty) => { prompt: string; answer: number }> = {
  add: makeAdd,
  sub: makeSub,
  mul: makeMul,
  div: makeDiv,
};

export interface GenerateOptions {
  difficulty: Difficulty;
  /** 可多选；为空按全选题型处理 */
  topics: TopicKind[];
  count: number;
}

let seq = 0;

/**
 * 出一题。限时模式用它按需取题——时间到之前不知道一共要出多少题，
 * 所以不能像按题数模式那样预先整批生成。
 * topics 有多个时随机取一个，这就是"叠加"出题的实现；
 * avoidPrompt 用于避免和上一题完全相同（题型少时很容易撞）。
 */
export function makeQuestion(
  difficulty: Difficulty,
  topics: TopicKind[],
  avoidPrompt?: string,
): Question {
  const pool = topics.length > 0 ? topics : TOPIC_KINDS;
  let built = { prompt: '', answer: 0 };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    built = BUILDERS[pick(pool)](difficulty);
    if (built.prompt !== avoidPrompt) break;
  }
  seq += 1;
  return { id: `q${seq}`, prompt: built.prompt, answer: built.answer };
}

/**
 * 归一化题干，用来判断"是不是同一道题"。
 *
 * 加法和乘法满足交换律，3 × 8 与 8 × 3 在口算练习里就是同一道，
 * 不做归并的话，表内乘法 64 种写法里其实只有 36 道不同的题。
 * 减法和除法不可交换，原样保留。
 */
function canonical(prompt: string): string {
  const [a, op, b] = prompt.split(' ');
  if (op !== '+' && op !== '×') return prompt;
  return Number(a) <= Number(b) ? prompt : `${b} ${op} ${a}`;
}

/** id 里带上序号，same题出现两次时也不会撞 key */
let batchSeq = 0;

/**
 * 生成一组题目。
 *
 * 去重是"软"的：先按同题只出一次铺开，题库不够时才逐级放宽到每题两次、三次……
 *
 * 原因很实在——低难度的乘除法本质题目太少（一年级 2~5 的乘法口诀只有 10 道），
 * 设 20 题时死守去重会只出 12 道就结束，孩子做完发现和设定的题数对不上。
 * 与其少给题，不如让这十道题各练两遍，对刚学口诀的孩子本来也更合适。
 */
export function generateQuestions({ difficulty, topics, count }: GenerateOptions): Question[] {
  batchSeq += 1;
  const out: Question[] = [];
  const used = new Map<string, number>();

  const fill = (limit: number) => {
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard += 1;
      const prev = out[out.length - 1]?.prompt;
      const built = makeQuestion(difficulty, topics, prev);
      const key = canonical(built.prompt);
      // 不连着出同一道——就算放宽了重复上限，紧挨着来两道一样的也像出错
      if (prev !== undefined && key === canonical(prev)) continue;
      if ((used.get(key) ?? 0) >= limit) continue;
      used.set(key, (used.get(key) ?? 0) + 1);
      out.push({ ...built, id: `b${batchSeq}-${out.length}-${built.prompt}` });
    }
  };

  for (let limit = 1; limit <= 8 && out.length < count; limit += 1) fill(limit);
  return out;
}
