import { useEffect, useState } from 'react';
import { readPref, writePref } from '../../lib/prefs.ts';
import type { Tier } from './generator.ts';
import {
  ENDLESS_INITIAL_MS,
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
  /** 无尽模式的历史最好成绩（拼成几关） */
  best: number;
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

export function PuzzleSetup({ onStart, best }: Props) {
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

  // 无尽第一关的加时，用来说明「拼完能补多少」
  const firstBonus = fmtSec(timeBonusMs(endlessConfig(1)));

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

        {mode === 'level' ? (
          <div className="field">
            <div className="field__label">
              选难度 <span className="field__label-hint">各 3 关</span>
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
              {tier === 'easy' && '全是方形盘子，4×4 起步，块少而大'}
              {tier === 'normal' && '盘子开始缺角，5×5 到 6×6'}
              {tier === 'hard' && '挖角更多、块更碎，最大 7×7'}
            </p>
          </div>
        ) : (
          <div className="field">
            <div className="field__label">规则</div>
            <p className="field__hint" style={{ marginTop: 0 }}>
              开局 {fmtSec(ENDLESS_INITIAL_MS)}，每拼完一关按盘子大小补时间（第一关 +{firstBonus}）。
              盘子越拼越大、块越拼越碎，时间迟早会花光——看你能撑到第几关。
            </p>
            {best > 0 && (
              <p className="field__hint">
                最好成绩：<b>{best}</b> 关
              </p>
            )}
          </div>
        )}
      </div>

      <p className="today__hint" style={{ marginTop: 14 }}>
        玩法：把下面的碎块拖进盘子里，铺满所有格子就过关。拖不准时松手会自动吸到最近的位置；
        也可以先点碎块、再点格子。
      </p>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart({ mode, tier })}
        >
          {mode === 'level' ? `开始闯关 · ${TIER_LABELS[tier]}` : '开始无尽'}
        </button>
      </div>
    </>
  );
}
