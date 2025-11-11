/**
 * EmptyState - Shared component for empty list/table states
 */

import { ReactNode } from 'react';
import Link from 'next/link';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-app/40 bg-muted/30 p-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-app">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-lg bg-scarlet px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-scarlet/90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
