import Link from "next/link";

export default function SafeLink({
  href,
  children,
  fallback = "—",
  className,
  target,
}: {
  href?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  target?: string;
}) {
  if (!href) return <span className="text-gray-400">{fallback}</span>;
  return (
    <Link href={href} className={className} target={target}>
      {children}
    </Link>
  );
}
