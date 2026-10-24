import type { Poem } from '../../data/poems.ts';
import { POEMS } from '../../data/poems.ts';

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

/** 所有诗句的扁平池，用来抽干扰项。 */
function allLines(): string[] {
  return POEMS.flatMap((p) => p.lines);
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
 * poemId 传 'all' 时从全部诗里抽，最多 MAX_QUESTIONS 题；传具体 id 时只考这一首。
 */
export function generateReciteQuestions(poemId: string): ReciteQuestion[] {
  const pool = allLines();
  const targets = poemId === 'all' ? POEMS : POEMS.filter((p) => p.id === poemId);
  const built = targets.flatMap((poem) => questionsForPoem(poem, pool));

  if (poemId === 'all') {
    return shuffle(built).slice(0, MAX_QUESTIONS);
  }
  return shuffle(built);
}
