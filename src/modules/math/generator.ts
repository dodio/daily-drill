export type Difficulty = 'easy' | 'normal' | 'hard';
export type Topic = 'add' | 'sub' | 'mul' | 'div' | 'mix';

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

export const TOPIC_LABELS: Record<Topic, string> = {
  add: '加法',
  sub: '减法',
  mul: '乘法',
  div: '除法',
  mix: '混合',
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

const BUILDERS: Record<Exclude<Topic, 'mix'>, (d: Difficulty) => { prompt: string; answer: number }> = {
  add: makeAdd,
  sub: makeSub,
  mul: makeMul,
  div: makeDiv,
};

const TOPICS: Exclude<Topic, 'mix'>[] = ['add', 'sub', 'mul', 'div'];

export interface GenerateOptions {
  difficulty: Difficulty;
  topic: Topic;
  count: number;
}

/** 生成一组不重复的题目。 */
export function generateQuestions({ difficulty, topic, count }: GenerateOptions): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;

  while (out.length < count && guard < count * 50) {
    guard += 1;
    const picked = topic === 'mix' ? pick(TOPICS) : topic;
    const built = BUILDERS[picked](difficulty);
    if (seen.has(built.prompt)) continue;
    seen.add(built.prompt);
    out.push({
      id: `${out.length}-${built.prompt}`,
      prompt: built.prompt,
      answer: built.answer,
    });
  }

  return out;
}
