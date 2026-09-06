import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Layers } from 'lucide-react';

interface ConfidenceFusionProps {
  rawConfidence: number;
  consistencyScore: number;
  finalConfidence: number;
  isConsistent: boolean;
}

export const ConfidenceFusion: React.FC<ConfidenceFusionProps> = ({
  rawConfidence,
  consistencyScore,
  finalConfidence,
  isConsistent,
}) => {
  const rawPct = Math.round(rawConfidence * 100);
  const physicsPct = Math.round(consistencyScore * 100);
  const finalPct = Math.round(finalConfidence * 100);

  return (
    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
          Confidence Calibration Pipeline
        </span>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
          BACKEND CALIBRATED
        </span>
      </div>

      {/* 3-Stage Pipeline Cards: Detection → Physics → Final Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Raw AI Detection */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 relative">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1 font-mono text-[11px]">
            <Cpu size={13} className="text-cyan-400" />
            <span>STEP 1: AI PROPOSAL</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {rawPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Model Confidence
          </div>
        </div>

        {/* Step 2: Physics Verification */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 relative">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1 font-mono text-[11px]">
            <Layers size={13} className="text-emerald-400" />
            <span>STEP 2: PHYSICS CHECK</span>
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              isConsistent ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {physicsPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Physics Consistency
          </div>
        </div>

        {/* Step 3: Final Fused Confidence */}
        <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 relative shadow-sm">
          <div className="flex items-center space-x-1.5 text-cyan-400 mb-1 font-mono text-[11px]">
            <ShieldCheck size={13} />
            <span>STEP 3: FINAL SCORE</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {finalPct}%
          </div>
          <div className="text-[10px] text-cyan-400/70 font-mono mt-0.5">
            Final Confidence Score
          </div>
        </div>
      </div>

      {/* Visual Pipeline Logic Note */}
      <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span className="text-slate-300">Validation Status:</span>
        <span className={isConsistent ? 'text-emerald-400' : 'text-rose-400'}>
          {isConsistent
            ? '✓ Verified by Acoustic Shadow Geometry'
            : '✗ Flagged: Acoustic Shadow Discrepancy'}
        </span>
      </div>
    </div>
  );
};
