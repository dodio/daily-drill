import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeResult, WrongItem } from '../../types/index.ts';
import type { Question } from './generator.ts';
import { Numpad } from '../../components/Numpad.tsx';

interface Props {
  questions: Question[];
  onFinish: (result: PracticeResult) => void;
  onExit: () => void;
}

type Feedback = 'none' | 'ok' | 'bad';

export function MathQuiz({ questions, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('none');

  const correctRef = useRef(0);
  const wrongRef = useRef<WrongItem[]>([]);
  const startedRef = useRef(Date.now());

  const current = questions[index];
  const isLast = index === questions.length - 1;

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
    setInput('');
    setFeedback('none');
  }, [index, questions.length, onFinish]);

  const submit = useCallback(() => {
    if (input === '' || feedback !== 'none') return;
    if (Number(input) === current.answer) {
      correctRef.current += 1;
      setFeedback('ok');
      return;
    }
    wrongRef.current = [
      ...wrongRef.current,
      {
        prompt: `${current.prompt} = ${input}`,
        yourAnswer: input,
        correctAnswer: String(current.answer),
      },
    ];
    setFeedback('bad');
  }, [input, feedback, current]);

  // 答对后短暂停留再自动进入下一题，给孩子一个"对了"的确认感
  useEffect(() => {
    if (feedback !== 'ok') return undefined;
    const timer = window.setTimeout(next, 420);
    return () => window.clearTimeout(timer);
  }, [feedback, next]);

  // 物理键盘支持：平板接键盘、电脑上都能用
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (feedback === 'bad') next();
        else submit();
        return;
      }
      if (feedback !== 'none') return;
      if (/^[0-9]$/.test(event.key)) {
        setInput((value) => (value.length >= 4 ? value : value + event.key));
      } else if (event.key === 'Backspace') {
        setInput((value) => value.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feedback, next, submit]);

  const slotClass =
    feedback === 'ok' ? ' answer-slot--ok' : feedback === 'bad' ? ' answer-slot--bad' : '';

  return (
    <>
      <div className="quiz-head">
        <button type="button" className="quiz-head__back" onClick={onExit} aria-label="退出练习">
          ‹
        </button>
        <div className="progress">
          <div
            className="progress__bar"
            style={{ width: `${(index / questions.length) * 100}%` }}
          />
        </div>
        <span className="quiz-head__count">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="card">
        <div className="question">
          <div className="question__prompt">{current.prompt} =</div>
          <div className={`answer-slot${slotClass}${input === '' ? ' answer-slot--empty' : ''}`}>
            {input === '' ? '?' : input}
            {input === '' && <span className="answer-slot__cursor" />}
          </div>
          {feedback === 'bad' && (
            <div className="question__from">正确答案是 {current.answer}</div>
          )}
        </div>
      </div>

      {feedback === 'bad' ? (
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--block" onClick={next}>
            {isLast ? '看结果' : '下一题'}
          </button>
        </div>
      ) : (
        <Numpad
          onInput={(digit) => setInput((value) => (value.length >= 4 ? value : value + digit))}
          onBackspace={() => setInput((value) => value.slice(0, -1))}
          onSubmit={submit}
          canSubmit={input !== ''}
        />
      )}
    </>
  );
}
