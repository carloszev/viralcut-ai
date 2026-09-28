import React, { useState, useEffect } from 'react';
import { AppSettings, AspectRatio } from '../types/index.js';
import { Sun, Moon, Key, Sliders, Check, ShieldCheck, Cpu } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (saved) {
      timer = setTimeout(() => setSaved(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaved(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white tracking-tight">
          CONFIGURACIÓN
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Ajustes generales, apariencia del sistema e integración con motores de IA
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Apariencia & Tema */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-cyber-cyan" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Apariencia del Sistema
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, theme: 'dark' })}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${formData.theme === 'dark'
                ? 'bg-cyber-cyan/15 border-cyber-cyan text-white shadow-glow-cyan/20'
                : 'bg-dark-850/60 border-white/5 text-slate-400 hover:border-white/20'
                }`}
            >
              <div className="w-9 h-9 rounded-xl bg-dark-900 flex items-center justify-center text-slate-200">
                <Moon className="w-4 h-4 text-cyber-cyan" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Modo Oscuro (Principal)</p>
                <p className="text-[11px] text-slate-400">Estética obsidian futurista</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, theme: 'light' })}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${formData.theme === 'light'
                ? 'bg-cyber-cyan/15 border-cyber-cyan text-white shadow-glow-cyan/20'
                : 'bg-dark-850/60 border-white/5 text-slate-400 hover:border-white/20'
                }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800">
                <Sun className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Modo Claro</p>
                <p className="text-[11px] text-slate-400">Alto contraste limpio</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Claves de API de IA */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyber-cyan" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Integración de Motores de IA
              </h3>
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded border border-cyber-green/30">
              <ShieldCheck className="w-3 h-3" />
              <span>ALMACENAMIENTO SEGURO</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            ViralCut AI incluye un motor heurístico y algorítmico local de alta precisión integrado sin necesidad obligatoria de claves externas. Si deseas potenciar el análisis con modelos LLM externos, ingresa tus credenciales aquí:
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono text-slate-300">
                  Groq API Key (Whisper Ultra Rápido & Gratuito)
                </label>
                <span className="text-[10px] text-cyber-cyan font-mono bg-cyber-cyan/10 px-2 py-0.5 rounded border border-cyber-cyan/30">
                  RECOMENDADO PARA WHISPER
                </span>
              </div>
              <input
                type="password"
                value={formData.groqApiKey || ''}
                onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })}
                placeholder="gsk_..."
                className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-cyan font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Groq permite transcribir videos con Whisper en menos de 2 segundos con marcas de tiempo exactas por palabra.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Google Gemini API Key (Opcional)
              </label>
              <input
                type="password"
                value={formData.geminiApiKey || ''}
                onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-cyan font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                OpenAI API Key (Whisper & GPT Opcional)
              </label>
              <input
                type="password"
                value={formData.openaiApiKey || ''}
                onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-cyan font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Preferencias de Exportación y Edición */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-cyber-cyan" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Preferencias por Defecto
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Proporción por Defecto
              </label>
              <select
                value={formData.defaultAspectRatio}
                onChange={(e) =>
                  setFormData({ ...formData, defaultAspectRatio: e.target.value as AspectRatio })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan cursor-pointer"
              >
                <option value="9:16">9:16 Vertical (TikTok / Reels / Shorts)</option>
                <option value="1:1">1:1 Cuadrado (Instagram Feed)</option>
                <option value="16:9">16:9 Horizontal (YouTube)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Resolución de Exportación por Defecto
              </label>
              <select
                value={formData.exportQuality || '1080p'}
                onChange={(e) =>
                  setFormData({ ...formData, exportQuality: e.target.value as '4k' | '1080p' | '720p' })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-cyber-cyan font-mono focus:outline-none focus:border-cyber-cyan cursor-pointer"
              >
                <option value="1080p">1080 × 1920 (Full HD Pro — Ultra Rápido 60FPS)</option>
                <option value="720p">720 × 1280 (HD Rápido — Máxima Velocidad)</option>
                <option value="4k">2160 × 3840 (Ultra HD 4K)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Rendimiento & Aceleración de Hardware (GPU) */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyber-cyan" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Rendimiento & Motor de Renderizado
              </h3>
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>GPU & FFMPEG 9.0 DISPONIBLE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-dark-900/90 border border-white/5 space-y-1">
              <p className="text-[10px] font-mono uppercase text-slate-400">Encoder de Video</p>
              <p className="text-xs font-bold text-white">libx264 (veryfast)</p>
              <p className="text-[10px] text-slate-400">Máxima compatibilidad móvil MP4</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-900/90 border border-white/5 space-y-1">
              <p className="text-[10px] font-mono uppercase text-slate-400">Audio Masterizado</p>
              <p className="text-xs font-bold text-cyber-cyan">loudnorm (EBU R128)</p>
              <p className="text-[10px] text-slate-400">Audio cristalino sin distorsión</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-900/90 border border-white/5 space-y-1">
              <p className="text-[10px] font-mono uppercase text-slate-400">Carpeta de Destino</p>
              <p className="text-xs font-bold text-slate-200 truncate">Documentos\Videos</p>
              <p className="text-[10px] text-slate-400">Copia automática sin interrupciones</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-xl bg-cyber-cyan text-dark-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 active:scale-95 transition-all flex items-center gap-2 shadow-glow-cyan/30 cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'CAMBIOS GUARDADOS' : 'GUARDAR CONFIGURACIÓN'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
