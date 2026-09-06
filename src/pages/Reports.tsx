import React, { useState, useEffect } from 'react';
import { FileText, FileDown, CheckCircle2, AlertTriangle, XCircle, Calendar, MapPin, Database } from 'lucide-react';
import { getRecentAnalyses, downloadJsonReport, downloadCsvReport, getIsMockMode } from '../services/api';
import { AnalysisHistoryItem } from '../types/analysis';
import { MOCK_ANALYSIS_001 } from '../mock/mockResponse';

export const Reports: React.FC = () => {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    getRecentAnalyses().then(setHistory);
  }, []);

  const handleDownload = async (analysisId: string, type: 'json' | 'csv') => {
    setDownloading(`${analysisId}-${type}`);
    try {
      if (type === 'json') {
        await downloadJsonReport(analysisId, getIsMockMode() ? MOCK_ANALYSIS_001 : undefined);
      } else {
        await downloadCsvReport(analysisId, getIsMockMode() ? MOCK_ANALYSIS_001 : undefined);
      }
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-sonar-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-slate-100 uppercase">
              Acoustic Survey Reports & Forensics
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Export verified target coordinates, shadow geometry metrics, and compliance logs
            </p>
          </div>
        </div>
      </div>

      {/* Reports Listing Table */}
      <div className="bg-sonar-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            Survey Audit Records ({history.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Export formats: JSON (Forensics) • CSV (GIS / Hydrographic)
          </span>
        </div>

        <div className="divide-y divide-slate-800/80 font-mono text-xs">
          {history.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-500">
              No survey reports available yet. Run a sonar scan from the Dashboard to generate forensics.
            </div>
          ) : (
            history.map((item) => (
            <div
              key={item.analysis_id}
              className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/40 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-slate-100 uppercase text-sm">
                    {item.analysis_id}
                  </span>
                  <span className="text-slate-300">
                    {item.location_name}
                  </span>
                  {item.is_synthetic_demo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                      SYNTHETIC DATA
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                  <span>Log File: {item.filename}</span>
                  <span>•</span>
                  <span>Recorded: {new Date(item.timestamp).toUTCString()}</span>
                </div>

                {/* Candidate Breakdown Pills */}
                <div className="flex items-center space-x-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    {item.summary.verified} Verified Debris
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    {item.summary.uncertain} Uncertain
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">
                    {item.summary.rejected} Geology Rejected
                  </span>
                </div>
              </div>

              {/* Download Triggers */}
              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleDownload(item.analysis_id, 'json')}
                  disabled={downloading === `${item.analysis_id}-json`}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition"
                >
                  <FileDown size={14} className="text-cyan-400" />
                  <span>
                    {downloading === `${item.analysis_id}-json` ? 'Downloading...' : 'JSON Report'}
                  </span>
                </button>

                <button
                  onClick={() => handleDownload(item.analysis_id, 'csv')}
                  disabled={downloading === `${item.analysis_id}-csv`}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition"
                >
                  <FileDown size={14} className="text-emerald-400" />
                  <span>
                    {downloading === `${item.analysis_id}-csv` ? 'Downloading...' : 'CSV Dataset'}
                  </span>
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
