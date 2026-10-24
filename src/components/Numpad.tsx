interface Props {
  onInput: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Numpad({ onInput, onBackspace, onSubmit, canSubmit }: Props) {
  return (
    <div className="numpad">
      {DIGITS.map((d) => (
        <button key={d} type="button" className="key" onClick={() => onInput(d)}>
          {d}
        </button>
      ))}
      <button type="button" className="key key--fn" onClick={onBackspace} aria-label="退格">
        ⌫
      </button>
      <button type="button" className="key" onClick={() => onInput('0')}>
        0
      </button>
      <button
        type="button"
        className="key key--go"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="确认答案"
      >
        确认
      </button>
    </div>
  );
}
