import { useEffect, useState } from 'react';
import type { Grade, Volume } from '../../data/poems.ts';
import { GRADE_LABELS, VOLUME_LABELS, poemsFor } from '../../data/poems.ts';
import { readPref, writePref } from '../../lib/prefs.ts';
import type { ReciteConfig } from './generator.ts';

const GRADES: Grade[] = [1, 2];
const VOLUMES: Volume[] = ['up', 'down'];

export function ReciteSetup({ onStart }: { onStart: (config: ReciteConfig) => void }) {
  // 只读一次本地偏好，之后以 state 为准
  const [snap] = useState<Record<string, unknown>>(() => {
    const raw = readPref('recite');
    return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  });

  const [grade, setGrade] = useState<Grade>(snap.grade === 2 ? 2 : 1);
  const [volume, setVolume] = useState<Volume>(snap.volume === 'down' ? 'down' : 'up');
  const [poemId, setPoemId] = useState<string>(
    typeof snap.poemId === 'string' ? snap.poemId : 'all',
  );

  const semester = poemsFor(grade, volume);
  // 换了年级/册之后，上次选的篇目可能不在这一册里，退回本册全部
  const validId = poemId === 'all' || semester.some((p) => p.id === poemId) ? poemId : 'all';

  useEffect(() => {
    writePref('recite', { grade, volume, poemId: validId });
  }, [grade, volume, validId]);

  return (
    <>
      <div className="card">
        <div className="field">
          <div className="field__label">选年级</div>
          <div className="pills">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                className={`pill${grade === g ? ' pill--on' : ''}`}
                onClick={() => setGrade(g)}
              >
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__label">选册</div>
          <div className="pills">
            {VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                className={`pill${volume === v ? ' pill--on' : ''}`}
                onClick={() => setVolume(v)}
              >
                {VOLUME_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__label">
            练哪一首 <span className="field__label-hint">本册共 {semester.length} 篇</span>
          </div>
          <div className="pills">
            <button
              type="button"
              className={`pill${validId === 'all' ? ' pill--on' : ''}`}
              onClick={() => setPoemId('all')}
            >
              全部混合
            </button>
            {semester.map((poem) => (
              <button
                key={poem.id}
                type="button"
                className={`pill${validId === poem.id ? ' pill--on' : ''}`}
                onClick={() => setPoemId(poem.id)}
              >
                {poem.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="today__hint" style={{ marginTop: 14 }}>
        玩法：给出上一句，从四个选项里挑出下一句。干扰项只从同一册里抽。
      </p>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart({ grade, volume, poemId: validId })}
        >
          开始背诵
        </button>
      </div>
    </>
  );
}
