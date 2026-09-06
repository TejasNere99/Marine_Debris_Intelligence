import React from 'react';
import { PhysicsVerification } from '../../types/analysis';
import { ArrowRightLeft, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ShadowComparisonProps {
  physics: PhysicsVerification;
}

export const ShadowComparison: React.FC<ShadowComparisonProps> = ({ physics }) => {
  const {
    expected_shadow_length_m,
    observed_shadow_length_m,
    difference_percent,
    is_consistent,
  } = physics;

  // Visual scaling relative to max value
  const maxLen = Math.max(expected_shadow_length_m, observed_shadow_length_m, 7.0);
  const expectedWidth = Math.min((expected_shadow_length_m / maxLen) * 100, 100);
  const observedWidth = Math.min((observed_shadow_length_m / maxLen) * 100, 100);

  return (
    <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
          Acoustic Shadow Comparison
        </span>
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          {is_consistent ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 size={13} />
              <span>CONSISTENT (Δ {difference_percent}%)</span>
            </span>
          ) : (
            <span className="text-rose-400 flex items-center space-x-1">
              <XCircle size={13} />
              <span>MISMATCH (Δ {difference_percent}%)</span>
            </span>
          )}
        </div>
      </div>

      {/* Bar Gauges */}
      <div className="space-y-3 font-mono text-xs">
        {/* Expected Shadow Bar */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Expected Shadow Length</span>
            <span className="text-slate-200 font-bold">{expected_shadow_length_m.toFixed(2)} m</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-500/80 transition-all duration-300 rounded-sm"
              style={{ width: `${expectedWidth}%` }}
            />
          </div>
        </div>

        {/* Observed Shadow Bar */}
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Observed Sonar Shadow</span>
            <span className={is_consistent ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {observed_shadow_length_m.toFixed(2)} m
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-sm ${
                is_consistent ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${observedWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric Breakdown Table */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono">
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">EXPECTED</span>
          <span className="text-xs text-slate-200 font-bold">{expected_shadow_length_m} m</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">OBSERVED</span>
          <span className="text-xs text-slate-200 font-bold">{observed_shadow_length_m} m</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">VARIANCE</span>
          <span className={`text-xs font-bold ${is_consistent ? 'text-emerald-400' : 'text-rose-400'}`}>
            {difference_percent}%
          </span>
        </div>
      </div>
    </div>
  );
};
