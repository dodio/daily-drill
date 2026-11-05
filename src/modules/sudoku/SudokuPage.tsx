import { useState } from 'react';
import { navigate } from '../../lib/router.ts';
import { uid } from '../../lib/id.ts';
import { useDailyLog } from '../../store/DailyLogProvider.tsx';
import type { SessionRecord } from '../../types/index.ts';
import { SudokuGame } from './SudokuGame.tsx';
import { SudokuSetup } from './SudokuSetup.tsx';
import { createSudoku, modeMeta } from './generator.ts';
import type { SudokuMode, SudokuPuzzle } from './generator.ts';
import { readSudokuProgress, saveSudokuSolve } from './progress.ts';
import type { SudokuProgress, SudokuSolve } from './progress.ts';
import { formatDuration } from './format.ts';
import './sudoku.css';

type Phase = 'setup' | 'play' | 'result';

interface ResultState {
  solve: SudokuSolve;
  isBest: boolean;
}

interface NextTarget {
  mode: SudokuMode;
  level: number;
  label: string;
}

function nextTarget(puzzle: SudokuPuzzle): NextTarget | null {
  if (puzzle.mode === 'tutorial') {
    if (puzzle.level < 3) {
      return { mode: 'tutorial', level: puzzle.level + 1, label: '下一课' };
    }
    return { mode: 'very-easy', level: 1, label: '开始正式关卡' };
  }

  const meta = modeMeta(puzzle.mode);
  if (puzzle.level < meta.levelCount) {
    return { mode: puzzle.mode, level: puzzle.level + 1, label: '下一关' };
  }

  const order: SudokuMode[] = ['very-easy', 'medium', 'hard'];
  const position = order.indexOf(puzzle.mode);
  if (position >= 0 && position < order.length - 1) {
    const mode = order[position + 1];
    return { mode, level: 1, label: `挑战${modeMeta(mode).label}` };
  }
  return null;
}

export function SudokuPage() {
  const { record, today } = useDailyLog();
  const [phase, setPhase] = useState<Phase>('setup');
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [progress, setProgress] = useState<SudokuProgress>(readSudokuProgress);

  const start = (mode: SudokuMode, level: number) => {
    setPuzzle(createSudoku(mode, level));
    setResult(null);
    setPhase('play');
  };

  const finish = (solve: SudokuSolve) => {
    if (!puzzle) return;
    const previousBest = progress[puzzle.id]?.bestMs;
    const nextProgress = saveSudokuSolve(progress, puzzle.id, solve);
    setProgress(nextProgress);
    setResult({
      solve,
      isBest: previousBest === undefined || solve.durationMs < previousBest,
    });
    setPhase('result');

    const session: SessionRecord = {
      id: uid(),
      subject: 'sudoku',
      date: today,
      startedAt: Date.now() - solve.durationMs,
      durationMs: solve.durationMs,
      total: 1,
      correct: 1,
      kind: 'game',
      wrongItems: [],
    };
    record(session);
  };

  if (phase === 'play' && puzzle) {
    return (
      <SudokuGame
        key={puzzle.id}
        puzzle={puzzle}
        onExit={() => setPhase('setup')}
        onComplete={finish}
      />
    );
  }

  if (phase === 'result' && puzzle && result) {
    const next = nextTarget(puzzle);
    return (
      <div className="app sd-result-app">
        <header className="quiz-head">
          <button
            type="button"
            className="quiz-head__back"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            ‹
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 19 }}>数独完成</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              SUDOKU CLEAR
            </div>
          </div>
        </header>
        <section className="sd-result-card">
          <div className="sd-result-mark" aria-hidden="true">
            ✓
          </div>
          <span className="sd-kicker">{puzzle.mode === 'tutorial' ? 'LESSON CLEAR' : 'PUZZLE CLEAR'}</span>
          <h1>{puzzle.mode === 'tutorial' ? '这一课学会了！' : '整盘完成！'}</h1>
          <p>
            {puzzle.title}
            {result.isBest ? ' · 新的最佳时间' : ''}
          </p>

          <div className="sd-result-time">
            <b>{formatDuration(result.solve.durationMs)}</b>
            <span>完成时间</span>
          </div>

          <div className="sd-result-stats">
            <div>
              <b>{result.solve.mistakes}</b>
              <span>填错次数</span>
            </div>
            <div>
              <b>{result.solve.hints}</b>
              <span>使用提示</span>
            </div>
            <div>
              <b>{puzzle.clueCount}</b>
              <span>开局提示数</span>
            </div>
          </div>

          <p className="sd-result-note">
            {result.solve.hints === 0 && result.solve.mistakes === 0
              ? '一次没填错，也没用提示，推理很稳。'
              : result.solve.hints === 0
                ? '没有用提示，自己完成了整盘。'
                : '用完提示也没关系，知道它是怎么推出来的更重要。'}
          </p>
        </section>

        <div className="sd-result-actions">
          {next ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => start(next.mode, next.level)}
            >
              {next.label}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => navigate('/')}
            >
              回首页
            </button>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => start(puzzle.mode, puzzle.level)}
            >
              再玩这一盘
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPhase('setup')}>
              选择关卡
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app sd-setup-app">
      <header className="quiz-head">
        <button
          type="button"
          className="quiz-head__back"
          onClick={() => navigate('/')}
          aria-label="返回首页"
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 19 }}>数独</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            SUDOKU
          </div>
        </div>
        <span className="sd-header-tag">9 × 9</span>
      </header>
      <SudokuSetup progress={progress} onStart={start} />
    </div>
  );
}
