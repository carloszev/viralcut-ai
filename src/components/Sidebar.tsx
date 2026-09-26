import React from 'react';
import { LayoutDashboard, FolderKanban, Film, Settings, User, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'projects' | 'clips' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'projects' | 'clips' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Proyectos', icon: FolderKanban },
    { id: 'clips', label: 'Clips', icon: Film },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-dark-900/80 border-r border-white/5 flex flex-col justify-between p-5 backdrop-blur-xl h-screen sticky top-0 shrink-0 hidden md:flex">
      <div>
        {/* Brand */}
        <div 
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-3 px-3 py-3 cursor-pointer group mb-8"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-cyan/20 to-purple-500/20 border border-cyber-cyan/40 flex items-center justify-center group-hover:border-cyber-cyan transition-all shadow-glow-cyan/20">
            <Sparkles className="w-5 h-5 text-cyber-cyan group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight font-display text-white group-hover:text-cyber-cyan transition-colors">
              ViralCut <span className="text-cyber-cyan text-xs uppercase px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 ml-1">AI</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">SMART SHORT ENGINE</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25 shadow-glow-cyan/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyber-cyan' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-glow-cyan" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Clean Minimalist Workspace Footer */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span>Motor Local Activo</span>
        </span>
        <span className="text-[10px] text-slate-600">v1.0</span>
      </div>
    </aside>
  );
};
