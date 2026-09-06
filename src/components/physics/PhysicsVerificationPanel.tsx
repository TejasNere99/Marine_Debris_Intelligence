import React, { useState } from 'react';
import { Detection, SonarMetadata } from '../../types/analysis';
import { ShadowComparison } from './ShadowComparison';
import { ConfidenceFusion } from './ConfidenceFusion';
import { StatusBadge } from '../common/StatusBadge';
import { ChevronDown, ChevronUp, HelpCircle, Shield, Compass, Ruler } from 'lucide-react';

interface PhysicsVerificationPanelProps {
  detection: Detection;
  metadata: SonarMetadata;
}

export const PhysicsVerificationPanel: React.FC<PhysicsVerificationPanelProps> = ({
  detection,
  metadata,
}) => {
  const [isWhyOpen, setIsWhyOpen] = useState(true);
  const { physics, raw_confidence, final_confidence, status } = detection;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Shield size={16} className="text-cyan-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
              Physics-Informed Verification
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Cross-checks deep-learning proposal against acoustic shadow geometry
          </p>
        </div>
        <StatusBadge status={status} size="md" />
      </div>

      {/* Confidence Fusion Card */}
      <ConfidenceFusion
        rawConfidence={raw_confidence}
        consistencyScore={physics.consistency_score}
        finalConfidence={final_confidence}
        isConsistent={physics.is_consistent}
      />

      {/* Shadow Comparison Component */}
      <ShadowComparison physics={physics} />

      {/* Survey Telemetry Context */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center font-mono text-xs">
        <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[10px] mb-1">
            <Ruler size={11} />
            <span>ALTITUDE (H)</span>
          </div>
          <span className="text-slate-200 font-bold">{metadata.altitude_m} m</span>
        </div>
        <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[10px] mb-1">
            <Compass size={11} />
            <span>SLANT RANGE (R)</span>
          </div>
          <span className="text-slate-200 font-bold">{metadata.slant_range_m} m</span>
        </div>
        <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[10px] mb-1">
            <Ruler size={11} />
            <span>EST. ELEVATION (h)</span>
          </div>
          <span className="text-cyan-400 font-bold">
            {physics.estimated_height_m ? `${physics.estimated_height_m} m` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Expandable "Why?" Reason Panel (Authoritative Backend Value) */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        <button
          type="button"
          onClick={() => setIsWhyOpen(!isWhyOpen)}
          className="w-full px-4 py-2.5 bg-slate-900/80 hover:bg-slate-900 flex items-center justify-between text-xs font-mono text-slate-200 transition"
        >
          <div className="flex items-center space-x-2">
            <HelpCircle size={14} className="text-cyan-400" />
            <span>EXPLAINABILITY: PHYSICS REASONING</span>
          </div>
          {isWhyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isWhyOpen && (
          <div className="p-4 text-xs font-mono space-y-2 border-t border-slate-800">
            <div className="text-slate-300 bg-slate-900/80 p-3 rounded border border-slate-800 leading-relaxed">
              "{physics.reason}"
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
              <span>Source: Backend Acoustic Verification Module</span>
              <span className="text-cyan-400/80">Authoritative Assessment</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
