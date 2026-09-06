import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DetectionStatus } from '../../types/analysis';

interface StatusBadgeProps {
  status: DetectionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const configs = {
    verified: {
      label: 'Physics Verified',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      dot: 'bg-emerald-400',
    },
    uncertain: {
      label: 'Uncertain',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      dot: 'bg-amber-400',
    },
    rejected: {
      label: 'Physics Rejected',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: XCircle,
      dot: 'bg-rose-400',
    },
  };

  const config = configs[status] || configs.uncertain;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3 py-1.5 space-x-2 font-medium',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${config.bg} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
