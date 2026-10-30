import { useEffect, useState } from 'react';
import { readPref, writePref } from '../../lib/prefs.ts';
import type { Tier } from './generator.ts';
import {
  ENDLESS_INITIAL_MS,
  ENDLESS_TIERS,
  TIERS,
  TIER_LABELS,
  endlessConfig,
  timeBonusMs,
} from './generator.ts';

export type PuzzleMode = 'level' | 'endless';

export interface PuzzleStartConfig {
  mode: PuzzleMode;
  tier: Tier;
}

interface Props {
  onStart: (config: PuzzleStartConfig) => void;
  /** 无尽模式的历史最好成绩，按难度分开记 */
  bestByTier: Record<Tier, number>;
}

const TIERS_ORDER: Tier[] = ['easy', 'normal', 'hard'];
const MODES: { id: PuzzleMode; label: string }[] = [
  { id: 'level', label: '闯关' },
  { id: 'endless', label: '无尽' },
];

function fmtSec(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PuzzleSetup({ onStart, bestByTier }: Props) {
  // 只读一次本地偏好，之后以 state 为准
  const [snap] = useState<Record<string, unknown>>(() => {
    const raw = readPref('puzzle');
    return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  });

  const [mode, setMode] = useState<PuzzleMode>(snap.mode === 'endless' ? 'endless' : 'level');
  const [tier, setTier] = useState<Tier>(
    snap.tier === 'normal' || snap.tier === 'hard' ? snap.tier : 'easy',
  );

  useEffect(() => {
    writePref('puzzle', { mode, tier });
  }, [mode, tier]);

  // 无尽第一关的加时，用来说明「拼完能补多少」。越往后补得越少，所以只给首关的数
  const firstBonus = fmtSec(timeBonusMs(endlessConfig(tier, 1), 1));
  const et = ENDLESS_TIERS[tier];
  // 成绩按难度分开看：三档盘子不一样大小，混在一起没有可比性
  const best = bestByTier[tier] ?? 0;

  return (
    <>
      <div className="card">
        <div className="field">
          <div className="field__label">怎么玩</div>
          <div className="pills">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pill${mode === m.id ? ' pill--on' : ''}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__label">
            选难度
            <span className="field__label-hint">
              {mode === 'level' ? '各 3 关' : '盘子不变，越切越碎'}
            </span>
          </div>
          <div className="pills">
            {TIERS_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                className={`pill${tier === t ? ' pill--on' : ''}`}
                onClick={() => setTier(t)}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="field__hint">
            {mode === 'level'
              ? (() => {
                  // 难度只由两个数决定：多少格、切成几块。文案直接把这俩数写出来，不绕弯子
                  const lv = TIERS[tier];
                  const first = lv[0];
                  const last = lv[lv.length - 1];
                  return `${first.cols}×${first.rows}（${first.cols * first.rows} 格），切成 ${first.pieces}~${last.pieces} 块`;
                })()
              : /* 无尽模式：盘子尺寸钉死，碎片数从第一关起一档一档往上加 */
                `一直是 ${et.cols}×${et.rows}（${et.cols * et.rows} 格），从 ${et.minPieces} 块起，每 ${et.gainEvery} 关多切一块，最多 ${et.maxPieces} 块`}
          </p>
        </div>

        {mode === 'endless' && (
          <div className="field">
            <div className="field__label">规则</div>
            <p className="field__hint" style={{ marginTop: 0 }}>
              开局 {fmtSec(ENDLESS_INITIAL_MS[tier])}，每拼完一关补时间：第一关 +
              {firstBonus}，之后每关补得少一点。盘子大小不变，碎片越切越多（最多{' '}
              {et.maxPieces} 块），时间花光就结束——看你能撑到第几关。
            </p>
            {best > 0 && (
              <p className="field__hint">
                本档最好成绩：<b>{best}</b> 关
              </p>
            )}
          </div>
        )}
      </div>

      <p className="today__hint" style={{ marginTop: 14 }}>
        玩法：把下面的碎块拖进盘子里，铺满所有格子就过关。块跟着手走，棋盘上的绿格是松手会落的位置，
        差一格会自动对齐、放不下就标红并留在原处；也可以先点碎块、再点格子。
        放到一半不想要了，把块拖出画布松手，它就回到待选区——不用特意对准待选区扔。
      </p>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart({ mode, tier })}
        >
          {mode === 'level' ? `开始闯关 · ${TIER_LABELS[tier]}` : `开始无尽 · ${TIER_LABELS[tier]}`}
        </button>
      </div>
    </>
  );
}
