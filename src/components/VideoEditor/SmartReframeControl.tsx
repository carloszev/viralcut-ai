import React from 'react';
import { AspectRatio, SmartReframeConfig } from '../../types/index.js';
import { Smartphone, Square, Monitor, UserCheck, MoveHorizontal, ZoomIn, ScanFace } from 'lucide-react';

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
  const hasFaceData = Boolean(reframeConfig.faceTrackingData && reframeConfig.faceTrackingData.length > 0);
  const avgFaceX = hasFaceData
    ? Math.round(
        reframeConfig.faceTrackingData!.reduce((acc, p) => acc + p.xPercent, 0) /
          reframeConfig.faceTrackingData!.length
      )
    : null;

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

          {/* Real AI Face Tracking Status Card */}
          <div className="p-3 rounded-xl bg-dark-850/80 border border-cyber-cyan/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
                <ScanFace className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Seguimiento Facial por Visión IA</span>
                  {hasFaceData && (
                    <span className="text-[10px] text-cyber-green bg-cyber-green/10 px-1.5 py-0.2 rounded font-mono">
                      X: {avgFaceX}%
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {hasFaceData
                    ? `${reframeConfig.faceTrackingData!.length} fotogramas analizados con suavizado cinemático`
                    : 'Encuadre centrado automático activo'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reframeConfig.activeSpeakerTracking}
                onChange={(e) =>
                  onReframeConfigChange({
                    ...reframeConfig,
                    activeSpeakerTracking: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-cyan"></div>
            </label>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'auto', label: 'Auto-Seguimiento (IA)', desc: 'Sigue al hablante activo' },
              { id: 'center', label: 'Fijo al Centro', desc: 'Recorte 9:16 centrado' },
              { id: 'split_screen', label: '🎙️ Split-Screen (Podcast)', desc: '2 personas (arriba/abajo)' },
              { id: 'speaker_switch', label: '🔄 Alternancia Hablantes', desc: 'Cambia entre persona 1 y 2' },
              { id: 'manual', label: 'Manual', desc: 'Ajuste estático libre' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => onReframeConfigChange({ ...reframeConfig, mode: m.id as any })}
                className={`py-2 px-3 rounded-xl text-xs text-left transition-all cursor-pointer ${
                  reframeConfig.mode === m.id
                    ? 'bg-cyber-cyan text-dark-950 font-bold shadow-glow-cyan/20'
                    : 'bg-dark-800 text-slate-300 hover:bg-dark-750'
                }`}
              >
                <div className="font-semibold truncate">{m.label}</div>
                <div className={`text-[10px] ${reframeConfig.mode === m.id ? 'text-dark-900/80' : 'text-slate-400'} truncate`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Conditional Split-Screen Speaker Offsets */}
          {reframeConfig.mode === 'split_screen' && (
            <div className="p-3 rounded-xl bg-dark-850/90 border border-cyber-cyan/30 space-y-3">
              <p className="text-xs font-bold text-cyber-cyan flex items-center gap-1.5">
                <span>🎙️ Configuración Podcast Split-Screen</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Hablante 1 (Arriba)</span>
                    <span className="text-cyber-cyan">{reframeConfig.speaker1OffsetPercent ?? -22}%</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="10"
                    value={reframeConfig.speaker1OffsetPercent ?? -22}
                    onChange={(e) =>
                      onReframeConfigChange({
                        ...reframeConfig,
                        speaker1OffsetPercent: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Hablante 2 (Abajo)</span>
                    <span className="text-cyber-cyan">{reframeConfig.speaker2OffsetPercent ?? 22}%</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="45"
                    value={reframeConfig.speaker2OffsetPercent ?? 22}
                    onChange={(e) =>
                      onReframeConfigChange({
                        ...reframeConfig,
                        speaker2OffsetPercent: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sliders for Standard Pan / Zoom */}
          {reframeConfig.mode !== 'split_screen' && (
            <div className="space-y-3 pt-2">
              {/* Interactive Drag Hint */}
              <div className="p-2 rounded-lg bg-cyber-cyan/5 border border-cyber-cyan/20 flex items-center gap-2 text-[11px] text-slate-300">
                <MoveHorizontal className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                <span>
                  <strong className="text-cyber-cyan">Arrastre directo:</strong> Hacé clic y arrastrá con el mouse sobre el reproductor de video para centrar el plano.
                </span>
              </div>

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
          )}
        </div>
      )}
    </div>
  );
};
