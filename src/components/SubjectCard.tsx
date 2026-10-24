import type { SubjectMeta } from '../types/index.ts';

interface Props {
  subject: SubjectMeta;
  todayCount: number;
  onSelect: (subject: SubjectMeta) => void;
}

export function SubjectCard({ subject, todayCount, onSelect }: Props) {
  const disabled = !subject.ready;

  return (
    <button
      type="button"
      className={`subject${disabled ? ' subject--soon' : ''}`}
      onClick={() => onSelect(subject)}
      aria-disabled={disabled}
    >
      <span className="subject__icon" aria-hidden="true">
        {subject.icon}
      </span>
      <span className="subject__body">
        <span className="subject__name">
          {subject.name}
          <span className="subject__en">{subject.en}</span>
          {disabled && <span className="badge-soon">即将上线</span>}
        </span>
        <span className="subject__desc">{subject.desc}</span>
        {todayCount > 0 && (
          <span className="subject__meta">今天已练 {todayCount} 题 ✓</span>
        )}
      </span>
      <span className="subject__arrow" aria-hidden="true">
        {disabled ? '·' : '›'}
      </span>
    </button>
  );
}
