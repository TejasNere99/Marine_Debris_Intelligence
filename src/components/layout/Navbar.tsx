import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Database, FileText, Activity, ShieldCheck, ToggleLeft, ToggleRight, Radio } from 'lucide-react';
import { getIsMockMode, setIsMockMode, getApiBaseUrl } from '../../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isMock, setMock] = useState(getIsMockMode());

  const toggleMock = () => {
    const next = !isMock;
    setIsMockMode(next);
    setMock(next);
    // Reload to refresh active data providers
    window.location.reload();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Compass },
    { name: 'Analysis Workspace', path: '/analysis/analysis_001', icon: Activity },
    { name: 'Survey Reports', path: '/reports', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-sonar-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Project Identity */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition shadow-sm">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-bold tracking-wide text-slate-100 leading-tight">
                    Marine Debris Intelligence
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans leading-tight mt-0.5">
                    Side-Scan Sonar Analysis & Physics Verification
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path.split('/')[1]);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-mono tracking-wider transition ${
                    isActive
                      ? 'bg-slate-800/80 text-cyan-400 border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* System Telemetry & Mode Controller */}
          <div className="flex items-center space-x-3">
            {/* Mock / Live Backend Switch */}
            <div
              onClick={toggleMock}
              className={`cursor-pointer select-none flex items-center space-x-2 px-2.5 py-1 rounded border text-xs font-mono transition ${
                isMock
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                  : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
              }`}
              title={
                isMock
                  ? 'Currently running offline synthetic mock data. Click to switch to live FastAPI backend.'
                  : `Currently connected to live backend at ${getApiBaseUrl()}. Click to switch to offline mock.`
              }
            >
              {isMock ? (
                <>
                  <ToggleLeft size={16} className="text-amber-400" />
                  <span className="hidden sm:inline">DEMO MOCK MODE</span>
                  <span className="sm:hidden">MOCK</span>
                </>
              ) : (
                <>
                  <ToggleRight size={16} className="text-emerald-400" />
                  <span className="hidden sm:inline">LIVE FASTAPI MODE</span>
                  <span className="sm:hidden">LIVE</span>
                </>
              )}
            </div>

            {!isMock && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 hidden md:inline-block">
                SYNTHETIC PIPELINE DEMO
              </span>
            )}

            {/* Scientific Verification Motto */}
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 border-l border-slate-800 pl-3">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span className="text-[11px] font-mono text-slate-300">
                AI proposes. Sonar physics verifies.
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
