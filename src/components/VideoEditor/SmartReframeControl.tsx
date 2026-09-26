import React from 'react';
import { AspectRatio, SmartReframeConfig } from '../../types/index.js';
import { Smartphone, Square, Monitor, UserCheck, MoveHorizontal, ZoomIn } from 'lucide-react';

interface SmartReframeControlProps {
  aspectRatio: AspectRatio;
  reframeConfig: SmartReframeConfig;
  onAspectRatioChange: (aspect: AspectRatio) => void;
  onReframeConfigChange: (config: SmartReframeConfig) => void;
}

export const SmartReframeControl: React.FC<SmartReframeControlProps> = ({
  aspectRatio,
  reframeConfig,
  onAspectRatioChange,
  onReframeConfigChange,
}) => {
  const aspectOptions: { id: AspectRatio; label: string; icon: any; resolution: string }[] = [
    { id: '9:16', label: '9:16 Vertical', icon: Smartphone, resolution: '1080 × 1920 (TikTok / Reels / Shorts)' },
    { id: '1:1', label: '1:1 Cuadrado', icon: Square, resolution: '1080 × 1080 (Feed Posts)' },
    { id: '16:9', label: '16:9 Original', icon: Monitor, resolution: '1920 × 1080 (YouTube Horizontal)' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Formato / Proporción */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
          1. Formato de Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-3">
          {aspectOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = aspectRatio === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onAspectRatioChange(opt.id)}
                className={`p-3.5 rounded-2xl flex flex-col items-center text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyber-cyan/15 border-2 border-cyber-cyan text-white shadow-glow-cyan/20'
                    : 'bg-dark-850/70 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-dark-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cyber-cyan' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.id === '9:16' ? '1080×1920' : opt.id === '1:1' ? '1080×1080' : '1920×1080'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Smart Reframe Settings */}
      {aspectRatio !== '16:9' && (
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyber-cyan" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Smart Reframe & Speaker Follow
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-green/10 border border-cyber-green/30 text-cyber-green font-mono">
              IA TRACKING ACTIVO
            </span>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {(['auto', 'center', 'manual'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onReframeConfigChange({ ...reframeConfig, mode })}
                className={`py-2 px-3 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                  reframeConfig.mode === mode
                    ? 'bg-cyber-cyan text-dark-950 font-bold'
                    : 'bg-dark-800 text-slate-300 hover:bg-dark-700'
                }`}
              >
                {mode === 'auto' ? 'Auto-Seguimiento' : mode === 'center' ? 'Fijo al Centro' : 'Manual'}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <MoveHorizontal className="w-3.5 h-3.5" />
                  Desplazamiento horizontal (Pan)
                </span>
                <span className="text-cyber-cyan">{reframeConfig.horizontalOffsetPercent}%</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                value={reframeConfig.horizontalOffsetPercent}
                onChange={(e) =>
                  onReframeConfigChange({
                    ...reframeConfig,
                    horizontalOffsetPercent: parseInt(e.target.value, 10),
                  })
                }
                className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5" />
                  Factor de Escala (Zoom)
                </span>
                <span className="text-cyber-cyan">{reframeConfig.scaleFactor.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="1.5"
                step="0.05"
                value={reframeConfig.scaleFactor}
                onChange={(e) =>
                  onReframeConfigChange({
                    ...reframeConfig,
                    scaleFactor: parseFloat(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
