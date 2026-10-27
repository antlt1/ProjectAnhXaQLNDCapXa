import type { ReactNode } from 'react';
import type { StatusMeta } from '../format';

interface BadgeProps {
  tone: StatusMeta['tone'];
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ tone, children, dot = true, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${tone} ${className}`.trim()}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
