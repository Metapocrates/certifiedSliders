/**
 * RoleCard - Shared component for role selection cards
 */

import { type ReactNode } from 'react';

type RoleCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export default function RoleCard({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  className = ''
}: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-app bg-card p-8 text-center transition-all
        ${disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:-translate-y-1 hover:border-scarlet hover:shadow-xl'
        }
        ${className}
      `}
    >
      <div className="text-scarlet transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-app">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-scarlet">
        Continue
        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
