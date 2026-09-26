import React from 'react';
import { Sparkles, Menu, Sun, Moon, Plus } from 'lucide-react';
import { AppSettings } from '../types/index.js';

interface NavbarProps {
  currentTab: 'dashboard' | 'projects' | 'clips' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'projects' | 'clips' | 'settings') => void;
  settings: AppSettings;
  onToggleTheme: () => void;
  onNewVideoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  settings,
  onToggleTheme,
  onNewVideoClick,
}) => {
  return (
    <header className="h-16 border-b border-white/5 bg-dark-950/60 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      {/* Mobile brand */}
      <div className="flex items-center gap-3 md:hidden">
        <div 
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyber-cyan" />
          </div>
          <span className="font-extrabold text-base tracking-tight font-display text-white">ViralCut AI</span>
        </div>
      </div>

      {/* Desktop breadcrumb/status */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
        <span className="text-slate-200">viralcut-ai</span>
        <span>/</span>
        <span className="capitalize text-cyber-cyan">{currentTab}</span>
        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 shadow-glow-cyan/20">
          v1.1
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewVideoClick}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyber-cyan text-dark-950 font-semibold text-xs hover:bg-cyan-300 transition-all shadow-glow-cyan/30 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Nuevo Video</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="w-9 h-9 rounded-lg bg-dark-800/80 border border-white/10 hover:border-white/25 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={`Cambiar a modo ${settings.theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};
