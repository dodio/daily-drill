import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeResult, WrongItem } from '../../types/index.ts';
import type { Question } from './generator.ts';
import { generateQuestions, makeQuestion } from './generator.ts';
import { Numpad } from '../../components/Numpad.tsx';
import type { MathConfig } from './MathSetup.tsx';

/** 结果页最多列出的错题数：10 分钟模式可能错几十道，全存会撑大 localStorage */
const WRONG_LIST_CAP = 30;
/** 答对后停留时长，留一点"对了"的确认感 */
const OK_DELAY = 380;
/** 限时模式答错后自动进入下一题的时长：够看清正确答案，但不给孩子磨蹭的空档 */
const BAD_DELAY_TIMED = 1200;
/** 倒计时刷新间隔 */
const TICK = 200;
/** 进入最后这段就变色提醒 */
const URGENT_MS = 15_000;

type Feedback = 'none' | 'ok' | 'bad';

interface Props {
  config: MathConfig;
  onFinish: (result: PracticeResult) => void;
  onExit: () => void;
}

export function MathQuiz({ config, onFinish, onExit }: Props) {
  const timed = config.mode === 'timed';
  const limitMs = config.mode === 'timed' ? config.durationMs : 0;

  // 按题数：一次性生成整批
  const questions = useMemo(
    () => (config.mode === 'count' ? generateQuestions(config) : []),
    [config],
  );

  const [index, setIndex] = useState(0);
  const [timedQuestion, setTimedQuestion] = useState<Question>(() =>
    makeQuestion(config.difficulty, config.topics),
  );
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [score, setScore] = useState({ ok: 0, bad: 0 });
  const [remaining, setRemaining] = useState(limitMs);

  const current = timed ? timedQuestion : questions[index];

  // 计数用 ref，结果回传时不会读到过期的 state
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const wrongItemsRef = useRef<WrongItem[]>([]);
  const startedRef = useRef(Date.now());
  const endAtRef = useRef(startedRef.current + limitMs);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const elapsed = Date.now() - startedRef.current;
    onFinish({
      total: correctRef.current + wrongRef.current,
      correct: correctRef.current,
      // 提前结束就按实际用时，不要虚报成整个时限
      durationMs: timed ? Math.min(limitMs, elapsed) : elapsed,
      wrongItems: wrongItemsRef.current,
    });
  }, [onFinish, timed, limitMs]);

  const next = useCallback(() => {
    if (doneRef.current) return;
    if (!timed && index >= questions.length - 1) {
      finish();
      return;
    }
    if (timed) {
      setTimedQuestion(makeQuestion(config.difficulty, config.topics, current.prompt));
    } else {
      setIndex(index + 1);
    }
    setInput('');
    setFeedback('none');
  }, [timed, index, questions.length, finish, config.difficulty, config.topics, current.prompt]);

  const submit = useCallback(() => {
    if (doneRef.current || input === '' || feedback !== 'none') return;
    if (Number(input) === current.answer) {
      correctRef.current += 1;
      setScore((s) => ({ ...s, ok: s.ok + 1 }));
      setFeedback('ok');
      return;
    }
    wrongRef.current += 1;
    setScore((s) => ({ ...s, bad: s.bad + 1 }));
    if (wrongItemsRef.current.length < WRONG_LIST_CAP) {
      wrongItemsRef.current = [
        ...wrongItemsRef.current,
        {
          prompt: `${current.prompt} = ${input}`,
          yourAnswer: input,
          correctAnswer: String(current.answer),
        },
      ];
    }
    setFeedback('bad');
  }, [input, feedback, current]);

  // 用 ref 透传，避免父组件每次渲染都重建定时器
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const nextRef = useRef(next);
  nextRef.current = next;

  // 倒计时。看门狗式读时钟，不用累加计数，切后台再回来也不会偏差
  useEffect(() => {
    if (!timed) return undefined;
    const timer = window.setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setRemaining(left);
      if (left === 0) finishRef.current();
    }, TICK);
    return () => window.clearInterval(timer);
  }, [timed]);

  // 答对自动进下一题；限时模式答错也自动进，不让孩子在计时里点按钮
  useEffect(() => {
    if (feedback === 'ok') {
      const timer = window.setTimeout(() => nextRef.current(), OK_DELAY);
      return () => window.clearTimeout(timer);
    }
    if (feedback === 'bad' && timed) {
      const timer = window.setTimeout(() => nextRef.current(), BAD_DELAY_TIMED);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [feedback, timed]);

  // 物理键盘支持：平板接键盘、电脑上都能用
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (feedback === 'bad' && !timed) nextRef.current();
        else submit();
        return;
      }
      if (feedback !== 'none' || doneRef.current) return;
      if (/^[0-9]$/.test(event.key)) {
        setInput((value) => (value.length >= 4 ? value : value + event.key));
      } else if (event.key === 'Backspace') {
        setInput((value) => value.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feedback, timed, submit]);

  const slotClass =
    feedback === 'ok' ? ' answer-slot--ok' : feedback === 'bad' ? ' answer-slot--bad' : '';

  const urgent = timed && remaining <= Math.min(URGENT_MS, limitMs * 0.15);
  const totalSec = Math.ceil(remaining / 1000);
  const timeText = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
  const barPct = timed
    ? Math.max(0, Math.min(100, (remaining / limitMs) * 100))
    : (index / questions.length) * 100;

  return (
    <>
      <div className="quiz-head">
        <button
          type="button"
          className="quiz-head__back"
          // 限时模式中途返回等于提前结束，已答的题要记下来，不能白做
          onClick={timed && score.ok + score.bad > 0 ? finish : onExit}
          aria-label={timed ? '结束练习' : '退出练习'}
        >
          ‹
        </button>
        <div className="progress">
          <div
            className={`progress__bar${timed ? ' progress__bar--time' : ''}${
              urgent ? ' progress__bar--urgent' : ''
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {timed ? (
          <span className={`quiz-head__timer${urgent ? ' quiz-head__timer--urgent' : ''}`}>
            {timeText}
          </span>
        ) : (
          <span className="quiz-head__count">
            {index + 1} / {questions.length}
          </span>
        )}
      </div>

      {timed && (
        <div className="score-strip">
          <span className="score-chip score-chip--ok">
            <b>{score.ok}</b> 对
          </span>
          <span className="score-chip score-chip--bad">
            <b>{score.bad}</b> 错
          </span>
        </div>
      )}

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

      {feedback === 'bad' && !timed ? (
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => nextRef.current()}
          >
            {index === questions.length - 1 ? '看结果' : '下一题'}
          </button>
        </div>
      ) : (
        <Numpad
          onInput={(digit) =>
            setInput((value) => (value.length >= 4 ? value : value + digit))
          }
          onBackspace={() => setInput((value) => value.slice(0, -1))}
          onSubmit={submit}
          canSubmit={input !== '' && feedback === 'none' && !doneRef.current}
        />
      )}
    </>
  );
}
