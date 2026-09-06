import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileText,
  Activity,
  Layers,
  Sparkles,
  AlertOctagon,
  Flame,
} from 'lucide-react';
import { SonarUploader } from '../components/sonar/SonarUploader';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { getRecentAnalyses, getAnalysis, getIsMockMode } from '../services/api';
import { AnalysisHistoryItem, SonarMetadata, Detection } from '../types/analysis';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { useAnalysis } from '../hooks/useAnalysis';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [recentRuns, setRecentRuns] = useState<AnalysisHistoryItem[]>([]);
  const [benchmarkDetections, setBenchmarkDetections] = useState<Detection[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { executeAnalysis, isLoading, currentStage, progressPercent, error } =
    useAnalysis();

  const isMock = getIsMockMode();

  useEffect(() => {
    if (isMock) {
      getRecentAnalyses().then(setRecentRuns);
      getAnalysis('analysis_001')
        .then((res) => {
          if (res?.detections) {
            setBenchmarkDetections(res.detections);
          }
        })
        .catch(() => {});
    } else {
      // Live backend mode: query recent analyses from FastAPI
      getRecentAnalyses()
        .then((runs) => {
          setRecentRuns(runs);
          if (runs && runs.length > 0) {
            getAnalysis(runs[0].analysis_id)
              .then((res) => {
                if (res?.detections) {
                  setBenchmarkDetections(res.detections);
                }
              })
              .catch(() => {});
          } else {
            setBenchmarkDetections([]);
          }
        })
        .catch(() => {
          setRecentRuns([]);
          setBenchmarkDetections([]);
        });
    }
  }, [isMock]);

  // Operational Priority Distribution from backend response
  const priorityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    benchmarkDetections.forEach((d) => {
      if (d.priority?.level) {
        counts[d.priority.level] = (counts[d.priority.level] || 0) + 1;
        counts.total++;
      }
    });
    return counts;
  }, [benchmarkDetections]);

  // Operational Priority Queue (top urgent items first)
  const priorityQueue = useMemo(() => {
    return [...benchmarkDetections]
      .filter((d) => d.priority && (d.priority.level === 'critical' || d.priority.level === 'high'))
      .sort((a, b) => (b.priority?.score ?? -1) - (a.priority?.score ?? -1))
      .slice(0, 3);
  }, [benchmarkDetections]);

  const handleUploadSubmit = async (file: File, metadata: Partial<SonarMetadata>) => {
    try {
      const res = await executeAnalysis(file, metadata);
      setShowUploadModal(false);
      navigate(`/analysis/${res.analysis_id}`);
    } catch (err) {
      // Error handled by hook
    }
  };

  // Aggregated Demo Statistics across runs
  const totalStats = recentRuns.reduce(
    (acc, run) => {
      acc.total += run.summary.total_candidates;
      acc.verified += run.summary.verified;
      acc.uncertain += run.summary.uncertain;
      acc.rejected += run.summary.rejected;
      return acc;
    },
    { total: 0, verified: 0, uncertain: 0, rejected: 0 }
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Mission Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-sonar-900 via-sonar-950 to-sonar-950 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        {/* Background Sonar Grid Overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#00e5ff 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px)',
            backgroundSize: '32px 32px, 64px 64px',
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white mb-2">
            Marine Debris Intelligence
          </h1>
          <p className="text-base sm:text-lg text-cyan-300/90 font-mono font-medium mb-3">
            Side-Scan Sonar Analysis & Physics Verification
          </p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-6">
            Autonomous pipeline to combat marine ghost gear and protect critical habitats
            like the Gulf of Mannar Dugong Sanctuary. Employs a two-layer verification principle:
            <span className="text-slate-200 font-semibold"> "AI proposes. Sonar physics verifies."</span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-semibold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 active:translate-y-0.5"
            >
              <UploadCloud size={18} />
              <span>Upload Sonar Scan</span>
            </button>

            <button
              onClick={() => {
                if (isMock) {
                  navigate('/analysis/analysis_001');
                } else if (recentRuns.length > 0) {
                  navigate(`/analysis/${recentRuns[0].analysis_id}`);
                } else {
                  setShowUploadModal(true);
                }
              }}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs uppercase tracking-wider transition"
            >
              <Activity size={18} className="text-cyan-400" />
              <span>
                {isMock
                  ? 'Open Benchmark Analysis'
                  : recentRuns.length > 0
                  ? 'Open Latest Analysis'
                  : 'Start Live Analysis'}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Floating Physics Verification Differentiator Badge */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              1
            </div>
            <div>
              <span className="text-slate-200 font-bold block">AI Proposes Candidates</span>
              <span>Fast acoustic pattern detection and preliminary localization.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              2
            </div>
            <div>
              <span className="text-slate-200 font-bold block">Sonar Physics Verifies</span>
              <span>Validates acoustic shadow geometry against sensor altitude and range.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
              3
            </div>
            <div>
              <span className="text-slate-200 font-bold block">False Positives Eliminated</span>
              <span>Filters natural rocks, sand ripples, and non-elevated seabed artifacts.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>SURVEY FLEET SUMMARY</span>
          <span className={isMock ? 'text-amber-400' : 'text-cyan-400'}>
            {isMock ? '[DEMO BENCHMARK DATASET]' : '[LIVE API - SYNTHETIC PIPELINE DEMO]'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Candidates */}
          <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Total Candidates
              </span>
              <Layers size={16} className="text-cyan-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-slate-100">
              {totalStats.total}
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Detected by side-scan network
            </p>
          </div>

          {/* Physics Verified */}
          <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Physics Verified
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400">
              {totalStats.verified}
            </div>
            <p className="text-[11px] text-emerald-500/80 font-mono mt-1">
              Confirmed acoustic shadow relief
            </p>
          </div>

          {/* Uncertain */}
          <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Uncertain
              </span>
              <AlertTriangle size={16} className="text-amber-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-amber-400">
              {totalStats.uncertain}
            </div>
            <p className="text-[11px] text-amber-500/80 font-mono mt-1">
              Marginal shadow or sand burial
            </p>
          </div>

          {/* Rejected */}
          <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Rejected (FP)
              </span>
              <XCircle size={16} className="text-rose-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-rose-400">
              {totalStats.rejected}
            </div>
            <p className="text-[11px] text-rose-500/80 font-mono mt-1">
              Shadow mismatch (Seafloor geology)
            </p>
          </div>
        </div>
      </div>

      {/* Operational Priority Intelligence & Triage Section */}
      <div className="bg-sonar-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <AlertOctagon size={18} className="text-rose-400" />
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                Operational Priority Intelligence
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Action triage: "Which detection should the operator investigate first?"
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
              BACKEND AUTHORITATIVE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
              SYNTHETIC DEMO CONTEXT
            </span>
          </div>
        </div>

        {/* Priority Tier Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 border border-rose-900/40 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Critical Priority
              </span>
              <span className="text-2xl font-bold font-mono text-rose-400">
                {priorityCounts.critical}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <AlertOctagon size={16} />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-amber-900/40 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                High Priority
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {priorityCounts.high}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <AlertTriangle size={16} />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-sky-900/40 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Medium Priority
              </span>
              <span className="text-2xl font-bold font-mono text-sky-400">
                {priorityCounts.medium}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <Layers size={16} />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Low Priority
              </span>
              <span className="text-2xl font-bold font-mono text-slate-400">
                {priorityCounts.low}
              </span>
            </div>
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <ShieldCheck size={16} />
            </div>
          </div>
        </div>

        {/* Priority Action Queue */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="font-semibold text-slate-300 uppercase">
              Priority Action Queue (Urgent Field Investigation)
            </span>
            <span>Sorted by Backend Priority Score</span>
          </div>

          <div className="space-y-2">
            {priorityQueue.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/80">
                {isMock
                  ? 'No critical priority candidates in queue.'
                  : recentRuns.length === 0
                  ? 'No survey data uploaded yet. Upload a sonar image to prioritize candidates.'
                  : 'No high-priority hazards flagged in current survey run.'}
              </div>
            ) : (
              priorityQueue.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/analysis/${recentRuns[0]?.analysis_id || 'analysis_001'}`)}
                  className="bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-cyan-400 transition uppercase">
                        {item.id}
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        {item.class_name.replace(/_/g, ' ')}
                      </span>
                      <PriorityBadge priority={item.priority} size="sm" />
                    </div>
                    {item.priority?.reason && (
                      <p className="text-xs font-mono text-slate-400">
                        {item.priority.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 font-mono text-xs text-slate-400">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-500 block">FINAL CONF</span>
                      <span className="text-cyan-400 font-bold">
                        {Math.round(item.final_confidence * 100)}%
                      </span>
                    </div>
                    <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-semibold group-hover:border-cyan-500/50 transition">
                      <span>Inspect</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Survey Runs Section */}
      <div className="bg-sonar-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-cyan-400" />
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-slate-200">
              Recent Survey Runs & Acoustic Analyses
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {recentRuns.length} Mission Logs
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No recent survey runs found. Upload a sonar scan to begin live analysis.
            </div>
          ) : (
            recentRuns.map((run) => (
              <div
                key={run.analysis_id}
                onClick={() => navigate(`/analysis/${run.analysis_id}`)}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group hover:bg-slate-900/40 px-3 rounded-lg transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition uppercase">
                      {run.analysis_id}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      {run.location_name}
                    </span>
                    {run.is_synthetic_demo && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                        SYNTHETIC DATA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 font-mono">
                    <span>File: {run.filename}</span>
                    <span>•</span>
                    <span>{new Date(run.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      {run.summary.verified} Verified
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                      {run.summary.uncertain} Uncertain
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">
                      {run.summary.rejected} Rejected
                    </span>
                  </div>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sonar Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-sonar-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-100">
                    Upload Sonar Waterfall Scan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Process imagery with AI detection & acoustic shadow verification
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isLoading}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono px-2 py-1 rounded hover:bg-slate-800 transition"
              >
                Close (ESC)
              </button>
            </div>

            {isLoading ? (
              <LoadingState stage={currentStage} percent={progressPercent} />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setShowUploadModal(true)} />
            ) : (
              <SonarUploader onUpload={handleUploadSubmit} isLoading={isLoading} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
