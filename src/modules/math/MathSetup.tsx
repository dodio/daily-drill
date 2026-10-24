import { useState } from 'react';
import type { Difficulty, TopicKind } from './generator.ts';
import { DIFFICULTY_LABELS, TOPIC_KINDS, TOPIC_LABELS } from './generator.ts';

export type MathMode = 'count' | 'timed';

/** 两种练法共用难度与题型，区别只在「什么时候结束」。 */
interface MathConfigBase {
  difficulty: Difficulty;
  /** 至少一项。全选即「混合」 */
  topics: TopicKind[];
}

export interface CountConfig extends MathConfigBase {
  mode: 'count';
  count: number;
}

export interface TimedConfig extends MathConfigBase {
  mode: 'timed';
  durationMs: number;
}

export type MathConfig = CountConfig | TimedConfig;

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const COUNTS = [10, 20];
/** 首期三档时长。超过 10 分钟对注意力是负担，暂不提供。 */
const MINUTES = [2, 5, 10];
const ALL_TOPICS = TOPIC_KINDS;

export function MathSetup({ onStart }: { onStart: (config: MathConfig) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [topics, setTopics] = useState<TopicKind[]>(ALL_TOPICS);
  const [mode, setMode] = useState<MathMode>('count');
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(2);

  const isMix = topics.length === ALL_TOPICS.length;

  // 多选叠加的规则：
  // 当前是全选（混合）时，点某个题型 = 只看这一个；之后每点一个就再叠一个。
  // 只剩一项时不允许再取消，避免出现"没有题型"。
  const toggleTopic = (t: TopicKind) => {
    setTopics((prev) => {
      if (prev.length === ALL_TOPICS.length) return [t];
      if (prev.includes(t)) {
        return prev.length === 1 ? prev : prev.filter((k) => k !== t);
      }
      // 按固定顺序插入，保证传出去的数组稳定
      return ALL_TOPICS.filter((k) => k === t || prev.includes(k));
    });
  };

  const start = () => {
    onStart(
      mode === 'count'
        ? { mode: 'count', difficulty, topics, count }
        : { mode: 'timed', difficulty, topics, durationMs: minutes * 60_000 },
    );
  };

  return (
    <>
      <div className="card">
        <div className="field">
          <div className="field__label">选难度</div>
          <div className="pills">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`pill${difficulty === d ? ' pill--on' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__label">
            选题型 <span className="field__label-hint">可多选</span>
          </div>
          <div className="pills">
            <button
              type="button"
              className={`pill${isMix ? ' pill--on' : ''}`}
              onClick={() => setTopics(ALL_TOPICS)}
            >
              混合
            </button>
            {ALL_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className={`pill${topics.includes(t) ? ' pill--on' : ''}`}
                onClick={() => toggleTopic(t)}
              >
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="field__hint">点单个题型就只练这一种，再点别的会叠加进来</p>
        </div>

        <div className="field">
          <div className="field__label">怎么练</div>
          <div className="pills">
            <button
              type="button"
              className={`pill${mode === 'count' ? ' pill--on' : ''}`}
              onClick={() => setMode('count')}
            >
              按题数
            </button>
            <button
              type="button"
              className={`pill${mode === 'timed' ? ' pill--on' : ''}`}
              onClick={() => setMode('timed')}
            >
              按时间
            </button>
          </div>
        </div>

        {/* 按题数练几道、按时间练多久，两者互斥，只显示当前练法对应的那一栏 */}
        {mode === 'count' ? (
          <div className="field">
            <div className="field__label">练几道</div>
            <div className="pills">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pill${count === c ? ' pill--on' : ''}`}
                  onClick={() => setCount(c)}
                >
                  {c} 题
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="field">
            <div className="field__label">限时多久</div>
            <div className="pills">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`pill${minutes === m ? ' pill--on' : ''}`}
                  onClick={() => setMinutes(m)}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
            <p className="field__hint">时间内能做多少做多少，时间到自动看结果</p>
          </div>
        )}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--primary btn--block" onClick={start}>
          {mode === 'count' ? `开始练习 · ${count} 题` : `开始练习 · 限时 ${minutes} 分钟`}
        </button>
      </div>
    </>
  );
}
