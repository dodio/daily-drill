import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeResult, WrongItem } from '../../types/index.ts';
import { getPoem, sourceLabel } from '../../data/poems.ts';
import type { ReciteQuestion } from './generator.ts';

interface Props {
  questions: ReciteQuestion[];
  onFinish: (result: PracticeResult) => void;
  onExit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function ReciteQuiz({ questions, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const correctRef = useRef(0);
  const wrongRef = useRef<WrongItem[]>([]);
  const startedRef = useRef(Date.now());

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answered = picked !== null;
  const isRight = picked === current.answer;
  const poem = getPoem(current.poemId);

  const next = useCallback(() => {
    if (index >= questions.length - 1) {
      onFinish({
        total: questions.length,
        correct: correctRef.current,
        durationMs: Date.now() - startedRef.current,
        wrongItems: wrongRef.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  }, [index, questions.length, onFinish]);

  const choose = useCallback(
    (option: string) => {
      if (picked !== null) return;
      setPicked(option);
      if (option === current.answer) {
        correctRef.current += 1;
      } else {
        wrongRef.current = [
          ...wrongRef.current,
          {
            prompt: `${current.prompt} → ${option}`,
            yourAnswer: option,
            correctAnswer: current.answer,
          },
        ];
      }
    },
    [picked, current],
  );

  // 答对自动下一题；答错停留，让孩子看清正确的那一句
  useEffect(() => {
    if (picked === null || picked !== current.answer) return undefined;
    const timer = window.setTimeout(next, 620);
    return () => window.clearTimeout(timer);
  }, [picked, current.answer, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && answered) {
        next();
        return;
      }
      const num = Number(event.key);
      if (num >= 1 && num <= current.options.length) {
        choose(current.options[num - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, next, choose, current.options]);

  return (
    <>
      <div className="quiz-head">
        <button type="button" className="quiz-head__back" onClick={onExit} aria-label="退出练习">
          ‹
        </button>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="quiz-head__count">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="card">
        <div className="question">
          <div className="question__line">{current.prompt}</div>
          <div className="question__from">
            {poem ? sourceLabel(poem) : current.poemTitle} · 下一句是？
          </div>
        </div>
      </div>

      <div className="options">
        {current.options.map((option, i) => {
          let cls = 'option';
          if (answered) {
            if (option === current.answer) cls += ' option--ok';
            else if (option === picked) cls += ' option--bad';
            else cls += ' option--muted';
          }
          return (
            <button
              key={`${option}-${i}`}
              type="button"
              className={cls}
              onClick={() => choose(option)}
              disabled={answered}
            >
              <span className="option__key">{LETTERS[i]}</span>
              {option}
            </button>
          );
        })}
      </div>

      {answered && !isRight && (
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--block" onClick={next}>
            {isLast ? '看结果' : '下一题'}
          </button>
        </div>
      )}
    </>
  );
}
