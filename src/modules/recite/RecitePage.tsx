import { useState } from 'react';
import type { PracticeResult, SessionRecord } from '../../types/index.ts';
import { useDailyLog } from '../../store/DailyLogProvider.tsx';
import { navigate } from '../../lib/router.ts';
import { uid } from '../../lib/id.ts';
import { ResultCard } from '../../components/ResultCard.tsx';
import { ReciteSetup } from './ReciteSetup.tsx';
import { ReciteQuiz } from './ReciteQuiz.tsx';
import { generateReciteQuestions } from './generator.ts';
import type { ReciteQuestion } from './generator.ts';

type Phase = 'setup' | 'quiz' | 'result';

export function RecitePage() {
  const { record, today } = useDailyLog();
  const [phase, setPhase] = useState<Phase>('setup');
  const [poemId, setPoemId] = useState('all');
  const [questions, setQuestions] = useState<ReciteQuestion[]>([]);
  const [result, setResult] = useState<PracticeResult | null>(null);

  const start = (id: string) => {
    setPoemId(id);
    setQuestions(generateReciteQuestions(id));
    setResult(null);
    setPhase('quiz');
  };

  const finish = (practiceResult: PracticeResult) => {
    const session: SessionRecord = {
      id: uid(),
      subject: 'recite',
      date: today,
      startedAt: Date.now() - practiceResult.durationMs,
      durationMs: practiceResult.durationMs,
      total: practiceResult.total,
      correct: practiceResult.correct,
      wrongItems: practiceResult.wrongItems,
    };
    record(session);
    setResult(practiceResult);
    setPhase('result');
  };

  if (phase === 'quiz') {
    return (
      <div className="app">
        <ReciteQuiz questions={questions} onFinish={finish} onExit={() => setPhase('setup')} />
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
            {phase === 'setup' ? '背诵' : '练习结果'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {phase === 'setup' ? 'RECITE' : 'RESULT'}
          </div>
        </div>
      </header>

      {phase === 'setup' && <ReciteSetup onStart={start} />}

      {phase === 'result' && result && (
        <ResultCard
          total={result.total}
          correct={result.correct}
          durationMs={result.durationMs}
          wrongItems={result.wrongItems}
          onRetry={() => start(poemId)}
          onHome={() => navigate('/')}
        />
      )}
    </div>
  );
}
