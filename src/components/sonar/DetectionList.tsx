import React from 'react';
import { Detection, FilterStatus, SortOption } from '../../types/analysis';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { Filter, ArrowUpDown, Search, ShieldCheck } from 'lucide-react';

interface DetectionListProps {
  detections: Detection[];
  selectedDetectionId: string | null;
  onSelectDetection: (id: string) => void;
  filterStatus: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  counts: {
    total: number;
    verified: number;
    uncertain: number;
    rejected: number;
  };
}

export const DetectionList: React.FC<DetectionListProps> = ({
  detections,
  selectedDetectionId,
  onSelectDetection,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  counts,
}) => {
  return (
    <div className="flex flex-col h-full bg-sonar-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100">
              Candidate Detections ({detections.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {counts.verified} Verified • {counts.uncertain} Uncertain • {counts.rejected} Rejected
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search candidate ID or debris class..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition"
          />
        </div>

        {/* Filter Badges & Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterStatus === 'all'
                  ? 'bg-cyan-500 text-black font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => onFilterChange('verified')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterStatus === 'verified'
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'bg-slate-800 text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              Verified ({counts.verified})
            </button>
            <button
              onClick={() => onFilterChange('uncertain')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterStatus === 'uncertain'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'bg-slate-800 text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Uncertain ({counts.uncertain})
            </button>
            <button
              onClick={() => onFilterChange('rejected')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                filterStatus === 'rejected'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-slate-800 text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1 text-slate-400">
            <ArrowUpDown size={12} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-300 focus:outline-none"
            >
              <option value="priority_desc">Operational Priority</option>
              <option value="confidence_desc">Highest Confidence</option>
              <option value="confidence_asc">Lowest Confidence</option>
              <option value="id">Detection ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detections Scrollable Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {detections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No detections match the selected criteria.
          </div>
        ) : (
          detections.map((det) => {
            const isSelected = det.id === selectedDetectionId;

            return (
              <div
                key={det.id}
                onClick={() => onSelectDetection(det.id)}
                className={`p-3 rounded-lg cursor-pointer transition border ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/30 hover:bg-slate-900/70 border-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                      {det.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 truncate">
                      {det.class_name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <PriorityBadge priority={det.priority} size="sm" />
                    <StatusBadge status={det.status} size="sm" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-slate-800/40 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">PRIORITY</span>
                    <span className={det.priority ? 'text-rose-300 font-bold' : 'text-slate-500'}>
                      {det.priority ? `${det.priority.score}/100` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">AI RAW</span>
                    <span className="text-slate-300">{Math.round(det.raw_confidence * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">PHYSICS</span>
                    <span
                      className={
                        det.physics.is_consistent ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {Math.round(det.physics.consistency_score * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">FINAL FUSED</span>
                    <span className="text-cyan-400 font-bold">
                      {Math.round(det.final_confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
