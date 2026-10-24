import { useState } from 'react';
import type { Difficulty, Topic } from './generator.ts';
import { DIFFICULTY_LABELS, TOPIC_LABELS } from './generator.ts';

export interface MathConfig {
  difficulty: Difficulty;
  topic: Topic;
  count: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const TOPICS: Topic[] = ['mix', 'add', 'sub', 'mul', 'div'];
const COUNTS = [10, 20];

export function MathSetup({ onStart }: { onStart: (config: MathConfig) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [topic, setTopic] = useState<Topic>('mix');
  const [count, setCount] = useState(10);

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
          <div className="field__label">选题型</div>
          <div className="pills">
            {TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                className={`pill${topic === t ? ' pill--on' : ''}`}
                onClick={() => setTopic(t)}
              >
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

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
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart({ difficulty, topic, count })}
        >
          开始练习 · {count} 题
        </button>
      </div>
    </>
  );
}
