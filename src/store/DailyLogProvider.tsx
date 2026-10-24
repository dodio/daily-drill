import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionRecord } from '../types/index.ts';
import { appendSession, clearAll, loadData } from '../lib/storage.ts';
import { todayKey } from '../lib/date.ts';
import { calcStreak, todaySummary } from '../lib/stats.ts';

interface DailyLogValue {
  sessions: SessionRecord[];
  today: string;
  streak: number;
  summary: ReturnType<typeof todaySummary>;
  record: (session: SessionRecord) => void;
  reset: () => void;
}

const DailyLogContext = createContext<DailyLogValue | null>(null);

/**
 * 全局唯一的练习数据源。
 * 放在 Provider 里而不是每个页面各调一次 loadData，否则跨页面切换时读到的会是各自的旧副本。
 */
export function DailyLogProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadData().sessions);
  const today = todayKey();

  const record = useCallback((session: SessionRecord) => {
    setSessions((prev) => {
      const next = appendSession({ version: 1, sessions: prev }, session);
      return next.sessions;
    });
  }, []);

  const reset = useCallback(() => {
    setSessions(clearAll().sessions);
  }, []);

  const streak = useMemo(() => calcStreak(sessions, today), [sessions, today]);
  const summary = useMemo(() => todaySummary(sessions, today), [sessions, today]);

  const value = useMemo<DailyLogValue>(
    () => ({ sessions, today, streak, summary, record, reset }),
    [sessions, today, streak, summary, record, reset],
  );

  return <DailyLogContext.Provider value={value}>{children}</DailyLogContext.Provider>;
}

export function useDailyLog(): DailyLogValue {
  const ctx = useContext(DailyLogContext);
  if (!ctx) throw new Error('useDailyLog 必须在 DailyLogProvider 内使用');
  return ctx;
}
