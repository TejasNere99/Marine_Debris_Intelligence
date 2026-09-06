import React, { useState } from 'react';
import { FileJson, FileSpreadsheet, Download, Check, AlertCircle } from 'lucide-react';
import { AnalysisResponse } from '../../types/analysis';
import { downloadJsonReport, downloadCsvReport } from '../../services/api';

interface ReportActionsProps {
  analysis: AnalysisResponse;
}

export const ReportActions: React.FC<ReportActionsProps> = ({ analysis }) => {
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleJson = async () => {
    setDownloadingJson(true);
    try {
      await downloadJsonReport(analysis.analysis_id, analysis);
      setLastAction('JSON downloaded successfully');
      setTimeout(() => setLastAction(null), 3000);
    } catch (e: any) {
      setLastAction('Failed to download JSON report');
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleCsv = async () => {
    setDownloadingCsv(true);
    try {
      await downloadCsvReport(analysis.analysis_id, analysis);
      setLastAction('CSV downloaded successfully');
      setTimeout(() => setLastAction(null), 3000);
    } catch (e: any) {
      setLastAction('Failed to download CSV report');
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      <button
        onClick={handleJson}
        disabled={downloadingJson}
        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition"
        title="Download complete structured JSON audit report"
      >
        <FileJson size={14} className="text-cyan-400" />
        <span>{downloadingJson ? 'Generating JSON...' : 'Export JSON Report'}</span>
        <Download size={12} className="text-slate-500" />
      </button>

      <button
        onClick={handleCsv}
        disabled={downloadingCsv}
        className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition"
        title="Download tabular CSV report with coordinates & shadow metrics"
      >
        <FileSpreadsheet size={14} className="text-emerald-400" />
        <span>{downloadingCsv ? 'Generating CSV...' : 'Export CSV Dataset'}</span>
        <Download size={12} className="text-slate-500" />
      </button>

      {lastAction && (
        <span className="text-[11px] text-cyan-400 flex items-center space-x-1 animate-fade-in pl-2">
          <Check size={12} />
          <span>{lastAction}</span>
        </span>
      )}
    </div>
  );
};
