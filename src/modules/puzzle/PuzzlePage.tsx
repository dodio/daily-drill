import { useCallback, useEffect, useRef, useState } from 'react';
import type { Puzzle, Tier } from './generator.ts';
import {
  ENDLESS_INITIAL_MS,
  TIERS,
  TIER_LABELS,
  endlessConfig,
  generatePuzzle,
  timeBonusMs,
} from './generator.ts';
import { PuzzleGame } from './PuzzleGame.tsx';
import { PuzzleSetup } from './PuzzleSetup.tsx';
import type { PuzzleStartConfig } from './PuzzleSetup.tsx';
import { useDailyLog } from '../../store/DailyLogProvider.tsx';
import { navigate } from '../../lib/router.ts';
import { readPref, writePref } from '../../lib/prefs.ts';
import { uid } from '../../lib/id.ts';
import type { SessionRecord } from '../../types/index.ts';

type Phase = 'setup' | 'play' | 'result';

interface Outcome {
  reason: 'clear' | 'timeup' | 'quit';
  /** 每关用时 */
  times: number[];
  /** 实际拼的时间之和 */
  totalMs: number;
  /** 从开始到结束的墙钟时间 */
  wallMs: number;
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtSec(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒`;
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}

export function PuzzlePage() {
  const { record, today } = useDailyLog();

  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<PuzzleStartConfig>({ mode: 'level', tier: 'easy' });
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [times, setTimes] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /**
   * 无尽模式的最好成绩按难度分开记。
   * 三档固定难度之后，「简单 40 关」和「困难 12 关」根本不是一回事，
   * 混在一个数字里只会让困难档永远看不到自己的进步。
   */
  const [bestByTier, setBestByTier] = useState<Record<Tier, number>>({
    easy: 0,
    normal: 0,
    hard: 0,
  });

  const deadlineRef = useRef(0);
  const levelStartRef = useRef(0);
  const sessionStartRef = useRef(0);
  /** 本轮已经结束的闸门，防止「时间到」和「拼完」同时触发记两次 */
  const closedRef = useRef(false);

  useEffect(() => {
    const saved = readPref('puzzle-best');
    // 旧版存的是一个数字（跨难度自动递进时代的关数），语义已经对不上，直接忽略
    if (!saved || typeof saved !== 'object') return;
    const raw = saved as Record<string, unknown>;
    const pick = (t: Tier) => (typeof raw[t] === 'number' ? (raw[t] as number) : 0);
    setBestByTier({ easy: pick('easy'), normal: pick('normal'), hard: pick('hard') });
  }, []);

  const totalLevels = TIERS[config.tier].length;

  const endSession = useCallback(
    (reason: Outcome['reason'], doneTimes: number[], stamp: number) => {
      if (closedRef.current) return;
      closedRef.current = true;

      const totalMs = doneTimes.reduce((acc, t) => acc + t, 0);
      const solved = doneTimes.length;

      // 一关都没拼完就先不记账，免得首页多出一次「0 题」的练习
      if (solved > 0) {
        const session: SessionRecord = {
          id: uid(),
          subject: 'puzzle',
          date: today,
          startedAt: sessionStartRef.current,
          durationMs: stamp - sessionStartRef.current,
          total: solved,
          correct: solved,
          mode: config.mode === 'level' ? 'count' : 'timed',
          kind: 'game',
          wrongItems: [],
        };
        record(session);
      }

      if (config.mode === 'endless' && solved > (bestByTier[config.tier] ?? 0)) {
        const nextBest = { ...bestByTier, [config.tier]: solved };
        setBestByTier(nextBest);
        writePref('puzzle-best', nextBest);
      }

      setTimes(doneTimes);
      setOutcome({ reason, times: doneTimes, totalMs, wallMs: stamp - sessionStartRef.current });
      setPhase('result');
    },
    [bestByTier, config.mode, config.tier, record, today],
  );

  const endRef = useRef(endSession);
  endRef.current = endSession;

  const start = (next: PuzzleStartConfig) => {
    const first = next.mode === 'level' ? TIERS[next.tier][0] : endlessConfig(next.tier, 1);
    const stamp = Date.now();
    setConfig(next);
    setLevel(1);
    setTimes([]);
    setOutcome(null);
    setPuzzle(generatePuzzle(1, first));
    levelStartRef.current = stamp;
    sessionStartRef.current = stamp;
    deadlineRef.current = stamp + ENDLESS_INITIAL_MS[next.tier];
    setNow(stamp);
    closedRef.current = false;
    setPhase('play');
  };

  /** 拼完那一刻：记下本关用时并停表。无尽模式的加时也在这里到账 */
  const handleFinish = () => {
    const stamp = Date.now();
    setTimes([...times, stamp - levelStartRef.current]);
    // 在拼完那一刻补时间，而不是点按钮那一刻——否则玩家在浮层上犹豫几秒就白亏几秒。
    // 用这一关实际的目标块数算加时：碎片数随关数在涨，拿第一关的数会少补
    if (config.mode === 'endless') {
      deadlineRef.current += timeBonusMs(endlessConfig(config.tier, level), level);
    }
  };

  /** 点「下一关 / 看结果」才推进：绝不自动跳，节奏交给玩家 */
  const handleNext = () => {
    const isLast = config.mode === 'level' && level >= totalLevels;
    if (isLast) {
      endSession('clear', times, Date.now());
      return;
    }

    const nextLevel = level + 1;
    // 无尽模式：盘子还是这一档的盘子，但碎片数会按关数往上长
    const nextConfig =
      config.mode === 'level'
        ? TIERS[config.tier][nextLevel - 1]
        : endlessConfig(config.tier, nextLevel);
    setLevel(nextLevel);
    setPuzzle(generatePuzzle(nextLevel, nextConfig));
    // 下一关从「点下按钮」起算，浮层上停留的那段不算
    levelStartRef.current = Date.now();
  };

  // 走秒。无尽模式顺便在这里判超时，不另外挂一个 setTimeout
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const id = window.setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);
      if (config.mode === 'endless' && stamp >= deadlineRef.current) {
        endRef.current('timeup', times, stamp);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, config.mode, times]);

  if (phase === 'setup') {
    return (
      <div className="app">
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
            <div style={{ fontWeight: 800, fontSize: 19 }}>像素拼接</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              PIXEL FIT
            </div>
          </div>
        </header>
        <PuzzleSetup onStart={start} bestByTier={bestByTier} />
      </div>
    );
  }

  if (phase === 'result' && outcome) {
    return (
      <PuzzleResult
        outcome={outcome}
        mode={config.mode}
        tier={config.tier}
        best={bestByTier[config.tier]}
        onAgain={() => start(config)}
        onChange={() => setPhase('setup')}
        onHome={() => navigate('/')}
      />
    );
  }

  const remaining = deadlineRef.current - now;
  const urgent = config.mode === 'endless' && remaining < 20_000;
  const isLastLevel = config.mode === 'level' && level >= totalLevels;
  // 进度条始终以「本档的初始时间」为满格：加时会让剩余时间超过初始值，这里自然被夹到 100%
  const barPct =
    config.mode === 'endless'
      ? Math.min(100, Math.max(0, (remaining / ENDLESS_INITIAL_MS[config.tier]) * 100))
      : ((level - 1) / totalLevels) * 100;

  return (
    <div className="app pz-app">
      <div className="quiz-head">
        <button
          type="button"
          className="quiz-head__back"
          onClick={() => endSession('quit', times, Date.now())}
          aria-label="结束"
        >
          ‹
        </button>
        <div className="progress">
          <div
            className={`progress__bar${config.mode === 'endless' ? ' progress__bar--time' : ''}${
              urgent ? ' progress__bar--urgent' : ''
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {config.mode === 'endless' ? (
          <span className={`quiz-head__timer${urgent ? ' quiz-head__timer--urgent' : ''}`}>
            {fmtClock(remaining)}
          </span>
        ) : (
          <span className="quiz-head__count">
            {level} / {totalLevels} 关 · {fmtClock(now - levelStartRef.current)}
          </span>
        )}
      </div>

      {puzzle && (
        <PuzzleGame
          key={`${config.mode}-${config.tier}-${level}-${puzzle.level}`}
          puzzle={puzzle}
          onFinish={handleFinish}
          onNext={handleNext}
          isLast={isLastLevel}
        />
      )}
    </div>
  );
}

interface ResultProps {
  outcome: Outcome;
  mode: PuzzleStartConfig['mode'];
  tier: Tier;
  best: number;
  onAgain: () => void;
  onChange: () => void;
  onHome: () => void;
}

function PuzzleResult({ outcome, mode, tier, best, onAgain, onChange, onHome }: ResultProps) {
  const solved = outcome.times.length;
  const bestThisRound =
    outcome.times.length > 0 ? Math.max(...outcome.times) : 0;

  const headline =
    outcome.reason === 'clear'
      ? '全部拼完！'
      : outcome.reason === 'timeup'
        ? '时间到'
        : '提前结束';

  const sub =
    outcome.reason === 'clear'
      ? `${TIER_LABELS[tier]} 三关，一关没落`
      : outcome.reason === 'timeup'
        ? `${TIER_LABELS[tier]}难度 · 时间用完了`
        : `${TIER_LABELS[tier]}难度 · 已经拼好的都记下来了`;

  return (
    <div className="app">
      <div className="pz-result">
        <div className="pz-result__head">{headline}</div>
        <div className="pz-result__sub">{sub}</div>

        <div className="pz-result__big">
          {mode === 'level' && outcome.reason === 'clear' ? (
            <>
              <span className="pz-result__num">{fmtClock(outcome.totalMs)}</span>
              <span className="pz-result__unit">总用时</span>
            </>
          ) : (
            <>
              <span className="pz-result__num">{solved}</span>
              <span className="pz-result__unit">关拼成</span>
            </>
          )}
        </div>

        <div className="pz-stats">
          <div className="pz-stat">
            <b>{solved}</b>
            <span>完成关数</span>
          </div>
          <div className="pz-stat">
            <b>{solved > 0 ? fmtSec(outcome.totalMs / solved) : '—'}</b>
            <span>每关平均</span>
          </div>
          <div className="pz-stat">
            <b>{solved > 0 ? fmtSec(bestThisRound) : '—'}</b>
            <span>最久一关</span>
          </div>
        </div>

        {outcome.times.length > 0 && (
          <div className="pz-laps">
            {outcome.times.map((t, i) => (
              <div className="pz-lap" key={i}>
                <span>第 {i + 1} 关</span>
                <b>{fmtClock(t)}</b>
              </div>
            ))}
          </div>
        )}

        {mode === 'endless' && best > 0 && (
          <p className="today__hint" style={{ marginTop: 4 }}>
            {TIER_LABELS[tier]}难度最好成绩：{best} 关
          </p>
        )}

        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--block" onClick={onAgain}>
            再来一次
          </button>
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn--ghost" onClick={onChange}>
            换个玩法
          </button>
          <button type="button" className="btn btn--ghost" onClick={onHome}>
            回首页
          </button>
        </div>
      </div>
    </div>
  );
}
