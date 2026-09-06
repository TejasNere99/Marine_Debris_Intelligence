import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Analysis } from './pages/Analysis';
import { Reports } from './pages/Reports';
import { ShieldCheck, Info } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-200">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis/:analysisId" element={<Analysis />} />
            <Route path="/analysis" element={<Navigate to="/analysis/analysis_001" replace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/80 bg-sonar-950/80 py-6 mt-12 text-xs font-mono text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={15} className="text-cyan-400" />
              <span>Marine Debris Intelligence • AI-Powered Detection with Side-Scan Sonar</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-amber-400/80">[Synthetic Demo Mode Available]</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};
