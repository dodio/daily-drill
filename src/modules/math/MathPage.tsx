import { useCallback, useState } from 'react';
import type { PracticeResult, SessionRecord } from '../../types/index.ts';
import { useDailyLog } from '../../store/DailyLogProvider.tsx';
import { navigate } from '../../lib/router.ts';
import { uid } from '../../lib/id.ts';
import { ResultCard } from '../../components/ResultCard.tsx';
import { MathSetup } from './MathSetup.tsx';
import type { MathConfig } from './MathSetup.tsx';
import { MathQuiz } from './MathQuiz.tsx';

type Phase = 'setup' | 'quiz' | 'result';

export function MathPage() {
  const { record, today } = useDailyLog();
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<MathConfig | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);

  const start = (nextConfig: MathConfig) => {
    setConfig(nextConfig);
    setResult(null);
    setPhase('quiz');
  };

  const finish = useCallback(
    (practiceResult: PracticeResult) => {
      const session: SessionRecord = {
        id: uid(),
        subject: 'math',
        date: today,
        startedAt: Date.now() - practiceResult.durationMs,
        durationMs: practiceResult.durationMs,
        total: practiceResult.total,
        correct: practiceResult.correct,
        mode: config?.mode,
        wrongItems: practiceResult.wrongItems,
      };
      record(session);
      setResult(practiceResult);
      setPhase('result');
    },
    [record, today, config?.mode],
  );

  if (phase === 'quiz' && config) {
    return (
      <div className="app">
        <MathQuiz config={config} onFinish={finish} onExit={() => setPhase('setup')} />
      </div>
    );
  }

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
          <div style={{ fontWeight: 800, fontSize: 19 }}>
            {phase === 'setup' ? '口算' : '练习结果'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {phase === 'setup' ? 'MENTAL MATH' : 'RESULT'}
          </div>
        </div>
      </header>

      {phase === 'setup' && <MathSetup onStart={start} />}

      {phase === 'result' && result && (
        <ResultCard
          total={result.total}
          correct={result.correct}
          durationMs={result.durationMs}
          timeLimitMs={config?.mode === 'timed' ? config.durationMs : undefined}
          wrongItems={result.wrongItems}
          onRetry={() => {
            if (config) start(config);
            else setPhase('setup');
          }}
          onHome={() => navigate('/')}
        />
      )}
    </div>
  );
}
