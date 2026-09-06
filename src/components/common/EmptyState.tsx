import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl text-center bg-sonar-950/40">
      <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
        <Icon size={20} />
      </div>
      <h4 className="text-sm font-medium text-slate-300 mb-1 font-mono">{title}</h4>
      <p className="text-xs text-slate-500 max-w-xs mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 rounded text-xs font-mono transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
