import React from 'react';
import { Radar } from 'lucide-react';

interface LoadingStateProps {
  stage?: string;
  percent?: number;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  stage = 'Processing side-scan sonar image...',
  percent,
  message,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-sonar-900/60 border border-slate-800 rounded-xl backdrop-blur-sm text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-cyan-400 animate-spin flex items-center justify-center">
            <Radar className="text-cyan-400 w-6 h-6 animate-pulse" />
          </div>
        </div>
        <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-md pointer-events-none" />
      </div>

      <h3 className="text-lg font-medium text-slate-100 mb-2 font-mono tracking-wide">
        ANALYSIS PIPELINE ACTIVE
      </h3>
      
      <p className="text-sm text-cyan-400 font-mono mb-4 max-w-md">
        {stage}
      </p>

      {percent !== undefined && (
        <div className="w-64 max-w-full mb-3">
          <div className="flex justify-between text-xs text-slate-400 font-mono mb-1">
            <span>PIPELINE PROGRESS</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {message && (
        <p className="text-xs text-slate-500 max-w-sm">
          {message}
        </p>
      )}

      <div className="mt-4 inline-flex items-center space-x-2 text-[11px] text-slate-400 font-mono border border-slate-800 bg-sonar-950/60 px-3 py-1 rounded">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>STAGE: AI INFERENCE → ACOUSTIC SHADOW CHECK → GEOTAGGING</span>
      </div>
    </div>
  );
};
