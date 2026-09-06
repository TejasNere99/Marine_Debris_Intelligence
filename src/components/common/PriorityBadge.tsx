import React from 'react';
import { AlertOctagon, AlertTriangle, Info, ArrowDown, HelpCircle, LucideIcon } from 'lucide-react';
import { DetectionPriority, PriorityLevel } from '../../types/analysis';

interface PriorityBadgeProps {
  priority?: DetectionPriority | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showScore = true,
  showIcon = true,
}) => {
  if (!priority) {
    const fallbackSizeClasses = {
      sm: 'text-[10px] px-2 py-0.5 space-x-1',
      md: 'text-xs px-2.5 py-1 space-x-1.5',
      lg: 'text-sm px-3 py-1.5 space-x-2',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-500 font-mono uppercase tracking-wider ${fallbackSizeClasses[size]}`}
        title="Priority intelligence unavailable"
      >
        {showIcon && <HelpCircle size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} className="shrink-0" />}
        <span>Priority N/A</span>
      </span>
    );
  }

  const { level, score } = priority;

  const configs: Record<
    PriorityLevel,
    {
      label: string;
      bg: string;
      text: string;
      border: string;
      icon: LucideIcon;
    }
  > = {
    critical: {
      label: 'Critical',
      bg: 'bg-rose-950/70',
      text: 'text-rose-300',
      border: 'border-rose-500/60',
      icon: AlertOctagon,
    },
    high: {
      label: 'High',
      bg: 'bg-amber-950/70',
      text: 'text-amber-300',
      border: 'border-amber-500/60',
      icon: AlertTriangle,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-sky-950/70',
      text: 'text-sky-300',
      border: 'border-sky-500/60',
      icon: Info,
    },
    low: {
      label: 'Low',
      bg: 'bg-slate-900/90',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: ArrowDown,
    },
  };

  const config = configs[level] || configs.low;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3 py-1.5 space-x-2 font-medium',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
      title={priority.reason || `Operational Priority: ${config.label} (${score})`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span className="font-semibold">{config.label}</span>
      {showScore && typeof score === 'number' && (
        <span className="opacity-90 pl-0.5 font-bold">
          • {score}
        </span>
      )}
    </span>
  );
};
