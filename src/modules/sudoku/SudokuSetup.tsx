import { useEffect, useState } from 'react';
import { readPref, writePref } from '../../lib/prefs.ts';
import {
  MODE_META,
  SUDOKU_MODES,
  levelId,
  modeMeta,
  tutorialSummaries,
} from './generator.ts';
import type { SudokuMode } from './generator.ts';
import { completedInMode } from './progress.ts';
import type { SudokuProgress } from './progress.ts';
import { formatDuration } from './format.ts';

interface Props {
  progress: SudokuProgress;
  onStart: (mode: SudokuMode, level: number) => void;
}

function initialPreference(): { mode: SudokuMode; level: number } {
  const raw = readPref('sudoku');
  if (!raw || typeof raw !== 'object') return { mode: 'tutorial', level: 1 };
  const saved = raw as Record<string, unknown>;
  const mode = SUDOKU_MODES.includes(saved.mode as SudokuMode)
    ? (saved.mode as SudokuMode)
    : 'tutorial';
  const count = modeMeta(mode).levelCount;
  const level =
    typeof saved.level === 'number'
      ? Math.min(count, Math.max(1, Math.round(saved.level)))
      : 1;
  return { mode, level };
}

export function SudokuSetup({ progress, onStart }: Props) {
  const [initial] = useState(initialPreference);
  const [mode, setMode] = useState<SudokuMode>(initial.mode);
  const [level, setLevel] = useState(initial.level);

  useEffect(() => {
    writePref('sudoku', { mode, level });
  }, [mode, level]);

  const meta = modeMeta(mode);
  const completed = completedInMode(progress, mode);
  const tutorials = tutorialSummaries();

  const chooseMode = (next: SudokuMode) => {
    setMode(next);
    setLevel(1);
  };

  return (
    <>
      <section className="sd-hero">
        <div className="sd-hero__copy">
          <span className="sd-kicker">SUDOKU · 9×9</span>
          <h2>从规则开始，一格一格变厉害</h2>
          <p>
            每行、每列、每个 3×3 宫里，1 到 9 都只出现一次。
            先上三节小课，再挑战越来越难的完整棋盘。
          </p>
        </div>
        <div className="sd-rule-strip" aria-label="数独基本规则">
          <span>
            <b>9</b>
            行不重复
          </span>
          <span>
            <b>9</b>
            列不重复
          </span>
          <span>
            <b>9</b>
            宫不重复
          </span>
        </div>
      </section>

      <section className="sd-setup-card">
        <div className="sd-setup-head">
          <div>
            <span className="sd-label">选择路线</span>
            <p className="sd-setup-desc">{meta.description}</p>
          </div>
          <span className="sd-progress-pill">
            {completed} / {meta.levelCount} 完成
          </span>
        </div>

        <div className="sd-mode-grid">
          {MODE_META.map((item, index) => {
            const done = completedInMode(progress, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`sd-mode${mode === item.id ? ' sd-mode--on' : ''}`}
                aria-pressed={mode === item.id}
                onClick={() => chooseMode(item.id)}
              >
                <span className="sd-mode__num">{index === 0 ? '学' : index}</span>
                <span className="sd-mode__copy">
                  <b>{item.label}</b>
                  <small>{item.en}</small>
                </span>
                <span className="sd-mode__done">
                  {done > 0 ? `${done}/${item.levelCount}` : '›'}
                </span>
              </button>
            );
          })}
        </div>

        {mode === 'tutorial' ? (
          <div className="sd-tutorial-list">
            {tutorials.map((item) => {
              const done = Boolean(progress[levelId(mode, item.level)]);
              return (
                <button
                  key={item.level}
                  type="button"
                  className={`sd-tutorial${level === item.level ? ' sd-tutorial--on' : ''}`}
                  aria-pressed={level === item.level}
                  onClick={() => setLevel(item.level)}
                >
                  <span className="sd-tutorial__lesson">教学 {item.level}</span>
                  <span className="sd-tutorial__body">
                    <b>{item.title}</b>
                    <small>{item.rule}</small>
                  </span>
                  <span className={`sd-check${done ? ' sd-check--on' : ''}`}>
                    {done ? '✓' : '○'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="sd-levels">
            {Array.from({ length: meta.levelCount }, (_, index) => {
              const itemLevel = index + 1;
              const record = progress[levelId(mode, itemLevel)];
              return (
                <button
                  key={itemLevel}
                  type="button"
                  className={`sd-level${level === itemLevel ? ' sd-level--on' : ''}${
                    record ? ' sd-level--done' : ''
                  }`}
                  aria-pressed={level === itemLevel}
                  onClick={() => setLevel(itemLevel)}
                >
                  <span className="sd-level__num">{String(itemLevel).padStart(2, '0')}</span>
                  <b>第 {itemLevel} 关</b>
                  <small>
                    {record ? `最佳 ${formatDuration(record.bestMs)}` : itemLevel <= 2 ? '热身' : '挑战'}
                  </small>
                  {record && <span className="sd-level__tick">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="sd-start">
        <div className="sd-start__summary">
          <span>{mode === 'tutorial' ? '小课堂' : meta.label}</span>
          <b>{mode === 'tutorial' ? tutorials[level - 1]?.title : `第 ${level} 关`}</b>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart(mode, level)}
        >
          {mode === 'tutorial' ? `开始教学 ${level}` : `开始第 ${level} 关`}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );
}
