'use client';

import { Clock } from 'lucide-react';

interface TrialIndicatorProps {
  remainingDays: number;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export default function TrialIndicator({
  remainingDays,
  size = 'md',
  showIcon = true,
  className = '',
}: TrialIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'Son gün';
    if (days === 1) return '1 gün kaldı';
    return `${days} gün kaldı`;
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 ${sizeClasses[size]} ${className}`}
    >
      {showIcon && (
        <Clock className={`${iconSizeClasses[size]} text-blue-400`} />
      )}
      <span className="font-medium">{getDaysText(remainingDays)}</span>
    </div>
  );
}

