import React from 'react';

interface ConfidenceBadgeProps {
  score: number; // 0.0 to 1.0
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'cyan' | 'emerald' | 'amber' | 'neutral';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  label,
  size = 'md',
  variant = 'cyan',
}) => {
  const percent = Math.round(score * 100);

  const variantStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div className="inline-flex items-center space-x-1.5">
      {label && (
        <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {label}
        </span>
      )}
      <span
        className={`inline-flex items-center font-mono font-medium rounded border ${variantStyles[variant]} ${sizeStyles[size]}`}
      >
        {percent}%
      </span>
    </div>
  );
};
