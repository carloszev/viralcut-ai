import React from 'react';
import { SubtitleConfig, SubtitleSegment, SubtitleStylePreset } from '../../types/index.js';
import { Type, Sparkles, Check, AlignVerticalSpaceAround, Palette } from 'lucide-react';

interface SubtitleEditorProps {
  subtitles: SubtitleSegment[];
  subtitleConfig: SubtitleConfig;
  onSubtitlesChange: (subs: SubtitleSegment[]) => void;
  onConfigChange: (config: SubtitleConfig) => void;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  subtitleConfig,
  onSubtitlesChange,
  onConfigChange,
}) => {
  const styles: { id: SubtitleStylePreset; label: string; preview: string; desc: string }[] = [
    { id: 'hormozi', label: 'Hormozi Kinetic', preview: 'PALABRAS IMPACTO', desc: 'Negrita, palabras resaltadas en color neón' },
    { id: 'clean', label: 'Clean Modern', preview: 'Texto Minimalista', desc: 'Limpio y legible sin fondo' },
    { id: 'cyber', label: 'Cyberpunk Glow', preview: '[SISTEMA ACTIVO]', desc: 'Tipografía monospace con resplandor' },
    { id: 'cinema', label: 'Cinematic Minimal', preview: 'Elegancia Clásica', desc: 'Serif sutil con tracking amplio' },
  ];

  const handleTextChange = (id: string, newText: string) => {
    const updated = subtitles.map((s) => (s.id === id ? { ...s, text: newText } : s));
    onSubtitlesChange(updated);
  };

  const handleWordToggleHighlight = (segId: string, wordIdx: number) => {
    const updated = subtitles.map((s) => {
      if (s.id === segId && s.words) {
        const words = [...s.words];
        words[wordIdx] = {
          ...words[wordIdx],
          highlight: !words[wordIdx].highlight,
        };
        return { ...s, words };
      }
      return s;
    });
    onSubtitlesChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable switch */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-dark-900/80 border border-white/10">
        <div className="flex items-center gap-3">
          <Type className="w-4 h-4 text-cyber-cyan" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Subtítulos Dinámicos
            </p>
            <p className="text-[11px] text-slate-400">Incrustar subtítulos sincronizados en el clip</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={subtitleConfig.enabled}
            onChange={(e) => onConfigChange({ ...subtitleConfig, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-cyan"></div>
        </label>
      </div>

      {subtitleConfig.enabled && (
        <>
          {/* Subtitle Style Presets */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Estilo Visual de Subtítulos
            </label>
            <div className="grid grid-cols-2 gap-3">
              {styles.map((st) => {
                const isSelected = subtitleConfig.style === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => onConfigChange({ ...subtitleConfig, style: st.id })}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-2 border-cyber-cyan text-white shadow-glow-cyan/10'
                        : 'bg-dark-850/70 border border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold">{st.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyber-cyan" />}
                    </div>
                    <p className="text-[11px] font-mono text-cyber-cyan bg-dark-950/80 px-2 py-1 rounded inline-block my-1">
                      {st.preview}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{st.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sizing and Position Controls */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/10 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Position */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-2">
                  Posición
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-dark-800 p-1 rounded-xl">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => onConfigChange({ ...subtitleConfig, position: pos })}
                      className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all cursor-pointer ${
                        subtitleConfig.position === pos
                          ? 'bg-cyber-cyan text-dark-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos === 'top' ? 'Arriba' : pos === 'center' ? 'Centro' : 'Abajo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>Tamaño de fuente</span>
                  <span className="text-cyber-cyan">{subtitleConfig.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="44"
                  value={subtitleConfig.fontSize}
                  onChange={(e) =>
                    onConfigChange({ ...subtitleConfig, fontSize: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Color de Texto Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.textColor}
                    onChange={(e) => onConfigChange({ ...subtitleConfig, textColor: e.target.value })}
                    className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{subtitleConfig.textColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Color de Resaltado (Hook/Clave)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.highlightColor}
                    onChange={(e) => onConfigChange({ ...subtitleConfig, highlightColor: e.target.value })}
                    className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{subtitleConfig.highlightColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Lines Editor */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Transcripción por Segmento (Haz clic en una palabra para resaltarla)
            </label>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {subtitles.map((sub, idx) => (
                <div key={sub.id || idx} className="p-3 rounded-xl bg-dark-850/80 border border-white/5 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Segmento #{idx + 1} ({sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s)</span>
                  </div>
                  
                  {/* Interactive Word Chips */}
                  {sub.words && sub.words.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {sub.words.map((w, wIdx) => (
                        <span
                          key={wIdx}
                          onClick={() => handleWordToggleHighlight(sub.id, wIdx)}
                          className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-all ${
                            w.highlight
                              ? 'bg-cyber-cyan text-dark-950 font-extrabold shadow-glow-cyan/20'
                              : 'bg-dark-750 text-slate-300 hover:bg-dark-700'
                          }`}
                          title="Haz clic para resaltar esta palabra"
                        >
                          {w.word}
                        </span>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={sub.text}
                    onChange={(e) => handleTextChange(sub.id, e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
