export function StreakBadge({ days }: { days: number }) {
  const label = days === 0 ? '还没开始' : '连续天数';
  return (
    <div className="streak" title={`已连续练习 ${days} 天`}>
      <span aria-hidden="true">{days === 0 ? '🌱' : '🔥'}</span>
      <span className="streak__num">{days}</span>
      <span className="streak__label">{label}</span>
    </div>
  );
}
