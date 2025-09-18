type Props = {
  value: number | null | undefined;   // expected 0..5
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

export default function StarRating({
  value = 0,
  size = 'md',
  showLabel = false,
  className = '',
}: Props) {
  const n = clampToInt(value, 0, 5);
  const textSize =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label={`${n} star rating`}>
      <div className={textSize} role="img" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < n ? '★' : '☆'}</span>
        ))}
      </div>
      {showLabel && (
        <span className="text-sm subtle">{n === 0 ? 'Unrated' : `${n}★`}</span>
      )}
    </div>
  );
}

function clampToInt(v: number | null | undefined, min: number, max: number) {
  const num = Math.round(Number.isFinite(Number(v)) ? Number(v) : 0);
  return Math.min(max, Math.max(min, num));
}
