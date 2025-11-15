'use client';

import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function PremiumBadge({
  size = 'md',
  showText = false,
  className = '',
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="relative">
        <Crown
          className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`}
        />
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-yellow-400`}>
          Pro
        </span>
      )}
    </div>
  );
}

