import type { Grade, Poem, Volume } from '../../data/poems.ts';
import { poemsFor } from '../../data/poems.ts';

export interface ReciteConfig {
  grade: Grade;
  volume: Volume;
  /** 'all' 表示本册全部篇目，否则是具体篇目 id */
  poemId: string;
}

export interface ReciteQuestion {
  id: string;
  /** 题干：上一句 */
  prompt: string;
  options: string[];
  answer: string;
  poemTitle: string;
  poemId: string;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildWrongChoices(answer: string, prompt: string, pool: string[], count: number): string[] {
  // 必须同时排除正确答案和题干本身，否则会出现「选自己」的无效选项
  const candidates = shuffle([...new Set(pool)].filter((line) => line !== answer && line !== prompt));
  return candidates.slice(0, count);
}

function questionsForPoem(poem: Poem, pool: string[]): ReciteQuestion[] {
  const out: ReciteQuestion[] = [];
  for (let i = 0; i < poem.lines.length - 1; i += 1) {
    const prompt = poem.lines[i];
    const answer = poem.lines[i + 1];
    const options = shuffle([answer, ...buildWrongChoices(answer, prompt, pool, 3)]);
    out.push({
      id: `${poem.id}-${i}`,
      prompt,
      options,
      answer,
      poemTitle: poem.title,
      poemId: poem.id,
    });
  }
  return out;
}

export const MAX_QUESTIONS = 10;

/**
 * 生成接句题。
 *
 * 干扰项只从同一册的篇目里抽，跨年级混进来的句子一眼就能排除，题目会变水。
 * poemId 找不到（比如换了年级，上次选的是另一册的诗）时退回本册全部。
 */
export function generateReciteQuestions({ grade, volume, poemId }: ReciteConfig): ReciteQuestion[] {
  const semester = poemsFor(grade, volume);
  if (semester.length === 0) return [];

  const picked = semester.filter((p) => p.id === poemId);
  const targets = picked.length > 0 ? picked : semester;
  const isWhole = picked.length === 0 || poemId === 'all';

  const pool = semester.flatMap((p) => p.lines);
  const built = targets.flatMap((poem) => questionsForPoem(poem, pool));

  return isWhole ? shuffle(built).slice(0, MAX_QUESTIONS) : shuffle(built);
}
