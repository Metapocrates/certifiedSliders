import StarRating from '@/components/StarRating';

type Props = {
  value: number | null | undefined;  // 0..5
  className?: string;
};

export default function StarInline({ value, className = '' }: Props) {
  // Compact, no label — perfect for tables/lists
  return <StarRating value={value} size="sm" showLabel={false} className={className} />;
}
