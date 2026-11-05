import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { SudokuPuzzle } from './generator.ts';
import { formatDuration } from './format.ts';
import type { SudokuSolve } from './progress.ts';

interface Props {
  puzzle: SudokuPuzzle;
  onExit: () => void;
  onComplete: (solve: SudokuSolve) => void;
}

function rowOf(index: number): number {
  return Math.floor(index / 9);
}

function colOf(index: number): number {
  return index % 9;
}

function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

function isPeer(a: number, b: number): boolean {
  return (
    a === b ||
    rowOf(a) === rowOf(b) ||
    colOf(a) === colOf(b) ||
    boxOf(a) === boxOf(b)
  );
}

export function SudokuGame({ puzzle, onExit, onComplete }: Props) {
  const [values, setValues] = useState<number[]>(() => [...puzzle.puzzle]);
  const [selected, setSelected] = useState<number | null>(() => {
    const target = puzzle.guide.targets.find((index) => puzzle.puzzle[index] === 0);
    return target ?? puzzle.puzzle.findIndex((value) => value === 0);
  });
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const startedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fixed = useMemo(() => puzzle.puzzle.map((value) => value !== 0), [puzzle.puzzle]);
  const guideFocus = useMemo(() => new Set(puzzle.guide.focus), [puzzle.guide.focus]);
  const guideTargets = useMemo(() => new Set(puzzle.guide.targets), [puzzle.guide.targets]);
  const emptyIndices = useMemo(
    () => puzzle.puzzle.flatMap((value, index) => (value === 0 ? [index] : [])),
    [puzzle.puzzle],
  );
  const filledEmpty = emptyIndices.filter((index) => values[index] !== 0).length;
  const progress = emptyIndices.length === 0 ? 100 : (filledEmpty / emptyIndices.length) * 100;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (finishedRef.current) return;
    const solved = values.every((value, index) => value === puzzle.solution[index]);
    if (!solved) return;
    finishedRef.current = true;
    onCompleteRef.current({
      durationMs: Date.now() - startedAtRef.current,
      mistakes,
      hints,
    });
  }, [values, puzzle.solution, mistakes, hints]);

  const chooseCell = (index: number) => {
    setSelected(index);
  };

  const writeDigit = (digit: number) => {
    if (selected === null || fixed[selected] || finishedRef.current) return;
    if (values[selected] === digit) return;
    if (digit !== puzzle.solution[selected]) {
      setMistakes((count) => count + 1);
    }
    setValues((current) => {
      const next = [...current];
      next[selected] = digit;
      return next;
    });
  };

  const eraseCell = () => {
    if (selected === null || fixed[selected] || values[selected] === 0) return;
    setValues((current) => {
      const next = [...current];
      next[selected] = 0;
      return next;
    });
  };

  const revealHint = () => {
    const target =
      selected !== null && !fixed[selected] && values[selected] !== puzzle.solution[selected]
        ? selected
        : emptyIndices.find((index) => values[index] !== puzzle.solution[index]);
    if (target === undefined) return;
    setSelected(target);
    setHints((count) => count + 1);
    setValues((current) => {
      const next = [...current];
      next[target] = puzzle.solution[target];
      return next;
    });
  };

  const reset = () => {
    setValues([...puzzle.puzzle]);
    setMistakes(0);
    setHints(0);
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setNow(Date.now());
    setSelected(emptyIndices[0] ?? null);
  };

  const handleBoardKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (selected === null) return;
    let next = selected;
    if (event.key === 'ArrowLeft') next = selected % 9 === 0 ? selected : selected - 1;
    else if (event.key === 'ArrowRight') next = selected % 9 === 8 ? selected : selected + 1;
    else if (event.key === 'ArrowUp') next = selected < 9 ? selected : selected - 9;
    else if (event.key === 'ArrowDown') next = selected >= 72 ? selected : selected + 9;
    else if (/^[1-9]$/.test(event.key)) writeDigit(Number(event.key));
    else if (event.key === 'Backspace' || event.key === 'Delete') eraseCell();
    else return;
    event.preventDefault();
    setSelected(next);
  };

  const selectedValue = selected === null ? 0 : values[selected];
  const tutorial = puzzle.mode === 'tutorial';

  return (
    <div className="app sd-play-app">
      <header className="sd-play-head">
        <button type="button" className="quiz-head__back" onClick={onExit} aria-label="退出本关">
          ‹
        </button>
        <div className="sd-play-head__copy">
          <span>{puzzle.mode === 'tutorial' ? '数独小课堂' : '数独挑战'}</span>
          <b>{puzzle.title}</b>
        </div>
        <div className="sd-clock" aria-label="本关用时">
          {formatDuration(now - startedAtRef.current)}
        </div>
      </header>

      <div className="sd-play-progress" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>

      <section className={`sd-coach${tutorial ? ' sd-coach--lesson' : ''}`}>
        <div className="sd-coach__badge">
          {tutorial ? `教学 ${puzzle.level}` : '小提示'}
        </div>
        <div>
          <h2>{puzzle.guide.title}</h2>
          <p>{puzzle.guide.text}</p>
          <span>{puzzle.guide.rule}</span>
        </div>
      </section>

      <div className="sd-game-grid">
        <main className="sd-board-column">
          <div
            className="sd-board"
            role="grid"
            aria-label={`${puzzle.title}数独棋盘`}
            tabIndex={0}
            onKeyDown={handleBoardKey}
          >
            {values.map((value, index) => {
              const row = rowOf(index);
              const col = colOf(index);
              const wrong = value !== 0 && value !== puzzle.solution[index];
              const selectedCell = selected === index;
              const peer = selected !== null && isPeer(selected, index);
              const same = selectedValue !== 0 && value === selectedValue;
              const coachCell = guideFocus.has(index);
              const coachTarget = guideTargets.has(index);
              const classes = [
                'sd-cell',
                fixed[index] ? 'sd-cell--fixed' : '',
                selectedCell ? 'sd-cell--selected' : '',
                peer ? 'sd-cell--peer' : '',
                same ? 'sd-cell--same' : '',
                wrong ? 'sd-cell--wrong' : '',
                coachCell ? 'sd-cell--coach' : '',
                coachTarget ? 'sd-cell--target' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={index}
                  type="button"
                  role="gridcell"
                  className={classes}
                  aria-label={`第 ${row + 1} 行第 ${col + 1} 列${value ? `，数字 ${value}` : '，空格'}`}
                  aria-selected={selectedCell}
                  onClick={() => chooseCell(index)}
                >
                  {value || ''}
                </button>
              );
            })}
          </div>
          <div className="sd-board-note">
            <span>
              {filledEmpty} / {emptyIndices.length} 个空格已填
            </span>
            <span>红色表示这一格还不对</span>
          </div>
          <div className="sd-numpad" aria-label="数字键盘">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => {
              const used = values.filter(
                (value, index) => value === digit && value === puzzle.solution[index],
              ).length;
              const remaining = Math.max(0, 9 - used);
              return (
                <button
                  key={digit}
                  type="button"
                  className={`sd-key${remaining === 0 ? ' sd-key--done' : ''}`}
                  aria-label={`填入数字 ${digit}，还剩 ${remaining} 个`}
                  onClick={() => writeDigit(digit)}
                >
                  <b>{digit}</b>
                  <small>{remaining === 0 ? '✓' : remaining}</small>
                </button>
              );
            })}
          </div>
        </main>

        <aside className="sd-controls">
          <div className="sd-count-row">
            <span>
              <b>{mistakes}</b>
              次填错
            </span>
            <span>
              <b>{hints}</b>
              次提示
            </span>
          </div>
          <button type="button" className="sd-control-btn" onClick={revealHint}>
            <span aria-hidden="true">💡</span>
            看一眼提示
          </button>
          <button
            type="button"
            className="sd-control-btn sd-control-btn--quiet"
            onClick={eraseCell}
            disabled={selected === null || fixed[selected]}
          >
            <span aria-hidden="true">⌫</span>
            擦除所选格
          </button>
          <button
            type="button"
            className="sd-control-btn sd-control-btn--quiet"
            onClick={reset}
          >
            重新开始这一盘
          </button>
          <div className="sd-keyboard-tip">
            电脑上也可用方向键移动，按 1–9 填数，按退格键擦除。
          </div>
        </aside>
      </div>
    </div>
  );
}
