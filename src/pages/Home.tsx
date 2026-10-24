import { useEffect, useState } from 'react';
import { SUBJECTS } from '../data/subjects.ts';
import { useDailyLog } from '../store/DailyLogProvider.tsx';
import { navigate } from '../lib/router.ts';
import { formatCn } from '../lib/date.ts';
import { recentDays, subjectTodaySummary } from '../lib/stats.ts';
import { StreakBadge } from '../components/StreakBadge.tsx';
import { SubjectCard } from '../components/SubjectCard.tsx';
import type { SubjectMeta } from '../types/index.ts';

export function Home() {
  const { today, streak, summary, sessions } = useDailyLog();
  const [toast, setToast] = useState('');

  const days = recentDays(sessions, today, 7);
  const peak = Math.max(1, ...days.map((d) => d.total));

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSelect = (subject: SubjectMeta) => {
    if (!subject.ready) {
      setToast(`${subject.name}模块开发中，先练口算和背诵`);
      return;
    }
    navigate(subject.route);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="brand__title">每日一练</h1>
          <p className="brand__sub">Daily Drill</p>
        </div>
        <StreakBadge days={streak} />
      </header>

      <section className="card today">
        <div className="today__row">
          <span className="today__date">{formatCn(today)}</span>
          <span className="today__count">
            {summary.sessions > 0 ? `${summary.sessions} 次练习` : '今天'}
          </span>
        </div>

        <div className="today__big">
          <span className="today__num">{summary.total}</span>
          <span className="today__unit">题已完成</span>
        </div>

        <p className="today__hint">
          {summary.total === 0
            ? '还没开始。练 10 道口算，两分钟就够。'
            : `答对 ${summary.correct} 题 · 正确率 ${Math.round(summary.accuracy * 100)}%`}
        </p>

        <div className="trend">
          {days.map((day) => (
            <div className="trend__col" key={day.date}>
              <div
                className={`trend__bar${day.total > 0 ? ' trend__bar--on' : ''}`}
                style={{ height: `${Math.max(4, Math.round((day.total / peak) * 32))}px` }}
                title={`${day.date}：${day.total} 题`}
              />
              <span className="trend__label">{Number(day.date.slice(8))}</span>
            </div>
          ))}
        </div>
      </section>

      <h2 className="section-title">今天练什么</h2>
      <div className="subject-list">
        {SUBJECTS.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            todayCount={subjectTodaySummary(sessions, today, subject.id).total}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <p className="footnote">数据只保存在这台设备 · 每日一练 v0.1</p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
