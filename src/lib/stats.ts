import type { SessionRecord, SubjectId } from '../types/index.ts';
import { shiftDay } from './date.ts';

export interface TodaySummary {
  sessions: number;
  total: number;
  correct: number;
  accuracy: number;
}

function summarize(list: SessionRecord[]): TodaySummary {
  const total = list.reduce((acc, s) => acc + s.total, 0);
  const correct = list.reduce((acc, s) => acc + s.correct, 0);
  return {
    sessions: list.length,
    total,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
  };
}

export function todaySummary(sessions: SessionRecord[], today: string): TodaySummary {
  return summarize(sessions.filter((s) => s.date === today));
}

export function subjectTodaySummary(
  sessions: SessionRecord[],
  today: string,
  subject: SubjectId,
): TodaySummary {
  return summarize(sessions.filter((s) => s.date === today && s.subject === subject));
}

/**
 * 连续打卡天数。
 * 今天还没练不算断（从昨天往前数），避免早上打开就看到「归零」挫败。
 */
export function calcStreak(sessions: SessionRecord[], today: string): number {
  const days = new Set(sessions.map((s) => s.date));
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** 最近 n 天的练习量，用于首页小趋势条。 */
export function recentDays(sessions: SessionRecord[], today: string, n = 7) {
  const out: { date: string; total: number }[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = shiftDay(today, -i);
    const total = sessions
      .filter((s) => s.date === date)
      .reduce((acc, s) => acc + s.total, 0);
    out.push({ date, total });
  }
  return out;
}
