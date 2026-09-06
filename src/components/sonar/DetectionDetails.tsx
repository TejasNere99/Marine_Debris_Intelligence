import React from 'react';
import { Detection, SonarImage, SonarMetadata } from '../../types/analysis';
import { PhysicsVerificationPanel } from '../physics/PhysicsVerificationPanel';
import { HeatmapViewer } from '../explainability/HeatmapViewer';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceBadge } from '../common/ConfidenceBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { Target, MapPin, Copy, Check, AlertOctagon } from 'lucide-react';

interface DetectionDetailsProps {
  detection: Detection | null;
  fullImage: SonarImage;
  metadata: SonarMetadata;
}

export const DetectionDetails: React.FC<DetectionDetailsProps> = ({
  detection,
  fullImage,
  metadata,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!detection) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-sonar-900/40 border border-slate-800 rounded-xl text-center">
        <Target size={32} className="text-slate-600 mb-2 animate-pulse" />
        <h4 className="text-xs font-mono font-medium text-slate-300 uppercase">
          No Candidate Selected
        </h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a bounding box on the sonar canvas or choose an entry from the candidate list.
        </p>
      </div>
    );
  }

  const handleCopyGPS = () => {
    if (detection.geotag) {
      const coordStr = `${detection.geotag.latitude.toFixed(5)}, ${detection.geotag.longitude.toFixed(5)}`;
      navigator.clipboard.writeText(coordStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Target Header Card */}
      <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Target size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold font-mono text-slate-100 uppercase">
                  {detection.id}
                </h2>
                <span className="text-xs font-mono text-cyan-400">
                  {detection.class_name.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                BBox: [{detection.bbox.x}, {detection.bbox.y}, {detection.bbox.width}×{detection.bbox.height} px]
              </p>
            </div>
          </div>

          <StatusBadge status={detection.status} size="md" />
        </div>

        {/* Geotag bar */}
        {detection.geotag && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <MapPin size={13} className="text-cyan-400" />
              <span>
                {detection.geotag.latitude.toFixed(4)}° N, {detection.geotag.longitude.toFixed(4)}° E
              </span>
            </div>

            <button
              onClick={handleCopyGPS}
              className="inline-flex items-center space-x-1 text-[11px] hover:text-cyan-400 transition"
              title="Copy Coordinates"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy GPS'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Operational Priority Intelligence Section */}
      <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <AlertOctagon size={16} className="text-rose-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
              Operational Priority Intelligence
            </h3>
          </div>
          {detection.is_demo && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
              SYNTHETIC DEMO
            </span>
          )}
        </div>

        {detection.priority ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Priority Tier
                </span>
                <div className="mt-1">
                  <PriorityBadge priority={detection.priority} size="md" />
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Priority Score
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  {detection.priority.score} / 100
                </span>
              </div>
            </div>

            {detection.priority.reason && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-0.5">
                  Priority Justification
                </span>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {detection.priority.reason}
                </p>
              </div>
            )}

            {detection.context && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                <div>
                  <span className="text-slate-500 block text-[10px]">SEAGRASS HABITAT</span>
                  <span className={detection.context.near_seagrass ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                    {detection.context.near_seagrass ? 'Near Critical Habitat' : 'Open Substrate'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">HABITAT DISTANCE</span>
                  <span className="text-slate-200">
                    {typeof detection.context.habitat_distance_m === 'number'
                      ? `${detection.context.habitat_distance_m.toFixed(1)} m`
                      : 'Not Recorded'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-xs font-mono text-slate-400">
              Priority Unavailable
            </p>
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              Backend priority assessment has not been provided for this candidate.
            </p>
          </div>
        )}

        {/* Multi-Layer Pipeline Hierarchy: Class -> AI Confidence -> Physics -> Final Confidence */}
        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
            <span className="text-slate-500 block text-[9px] uppercase">Class</span>
            <span className="text-cyan-400 font-bold truncate block text-[10px]">
              {detection.class_name.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
            <span className="text-slate-500 block text-[9px] uppercase">AI Conf</span>
            <span className="text-slate-200 font-bold text-[10px]">
              {Math.round(detection.raw_confidence * 100)}%
            </span>
          </div>
          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
            <span className="text-slate-500 block text-[9px] uppercase">Physics</span>
            <span
              className={`font-bold text-[10px] ${
                detection.physics.is_consistent ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {detection.physics.is_consistent ? 'VERIFIED' : 'UNCERTAIN'}
            </span>
          </div>
          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
            <span className="text-slate-500 block text-[9px] uppercase">Final Conf</span>
            <span className="text-cyan-300 font-bold text-[10px]">
              {Math.round(detection.final_confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Physics-Informed Verification Section */}
      <PhysicsVerificationPanel detection={detection} metadata={metadata} />

      {/* Model Explainability / Heatmap Section */}
      <HeatmapViewer detection={detection} fullImage={fullImage} />
    </div>
  );
};
