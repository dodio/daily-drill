import { useState } from 'react';
import { POEMS } from '../../data/poems.ts';

export function ReciteSetup({ onStart }: { onStart: (poemId: string) => void }) {
  const [selected, setSelected] = useState<string>('all');

  return (
    <>
      <div className="card">
        <div className="field">
          <div className="field__label">练哪一首</div>
          <div className="pills">
            <button
              type="button"
              className={`pill${selected === 'all' ? ' pill--on' : ''}`}
              onClick={() => setSelected('all')}
            >
              全部混合
            </button>
            {POEMS.map((poem) => (
              <button
                key={poem.id}
                type="button"
                className={`pill${selected === poem.id ? ' pill--on' : ''}`}
                onClick={() => setSelected(poem.id)}
              >
                {poem.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="today__hint" style={{ marginTop: 14 }}>
        玩法：给出上一句，从四个选项里挑出下一句。
      </p>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => onStart(selected)}
        >
          开始背诵
        </button>
      </div>
    </>
  );
}
