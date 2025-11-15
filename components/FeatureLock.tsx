'use client';

import { Lock } from 'lucide-react';
import PremiumBadge from './PremiumBadge';

interface FeatureLockProps {
  featureName: string;
  onUpgrade: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FeatureLock({
  featureName,
  onUpgrade,
  className = '',
  size = 'md',
}: FeatureLockProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      onClick={onUpgrade}
      className={`inline-flex items-center gap-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-gray-800 transition-all ${sizeClasses[size]} ${className}`}
    >
      <Lock className={iconSizeClasses[size]} />
      <span>{featureName}</span>
      <PremiumBadge size={size === 'sm' ? 'sm' : 'md'} showText={false} />
    </button>
  );
}

