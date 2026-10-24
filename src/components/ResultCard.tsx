import type { WrongItem } from '../types/index.ts';
import { formatDuration } from '../lib/date.ts';

interface Props {
  total: number;
  correct: number;
  durationMs: number;
  wrongItems: WrongItem[];
  /** 限时模式的时限。传了才显示速度与限时说明，按题数模式不传 */
  timeLimitMs?: number;
  onRetry: () => void;
  onHome: () => void;
}

function praise(rate: number, total: number): string {
  if (total === 0) return '一题都没答，再来一次';
  if (rate >= 1) return '全对！太稳了';
  if (rate >= 0.9) return '很棒，就差一点';
  if (rate >= 0.7) return '不错，再来一组';
  return '慢一点，看清题目';
}

export function ResultCard({
  total,
  correct,
  durationMs,
  wrongItems,
  timeLimitMs,
  onRetry,
  onHome,
}: Props) {
  const rate = total === 0 ? 0 : correct / total;
  const pct = Math.round(rate * 100);
  const timed = timeLimitMs !== undefined;
  /** 限时模式的核心指标：平均每分钟做对/做了多少题 */
  const perMinute = durationMs > 0 ? Math.round(total / (durationMs / 60_000)) : 0;

  return (
    <>
      <div className="card result">
        <div
          className="result__ring"
          style={{ background: `conic-gradient(var(--primary) ${rate}turn, var(--track) 0turn)` }}
        >
          <span className="result__pct">{pct}%</span>
        </div>
        <h2 className="result__title">{praise(rate, total)}</h2>
        <p className="result__sub">
          {timed
            ? `限时 ${formatDuration(timeLimitMs)} · 答了 ${total} 题`
            : `${correct} / ${total} 题答对`}
        </p>

        <div className="stats-row">
          <div className="stat">
            <div className="stat__num">{correct}</div>
            <div className="stat__label">答对</div>
          </div>
          <div className="stat">
            <div className="stat__num">{total - correct}</div>
            <div className="stat__label">答错</div>
          </div>
          <div className="stat">
            <div className="stat__num">{timed ? perMinute : formatDuration(durationMs)}</div>
            <div className="stat__label">{timed ? '每分钟题数' : '用时'}</div>
          </div>
        </div>
      </div>

      {wrongItems.length > 0 && (
        <>
          <h3 className="section-title">错题回顾</h3>
          <div className="card">
            <div className="wrong-list">
              {wrongItems.map((item) => (
                <div className="wrong-item" key={`${item.prompt}-${item.yourAnswer}`}>
                  <span className="wrong-item__q">{item.prompt}</span>
                  <span className="wrong-item__a">
                    正确 <b>{item.correctAnswer}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          回首页
        </button>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          再来一组
        </button>
      </div>
    </>
  );
}
