import React, { useState } from 'react';
import { Sparkles, ArrowRight, Play, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';
import { VideoInfo } from '../types/index.js';

interface HeroInputProps {
  onVideoInspected: (videoInfo: VideoInfo, autoStart?: boolean) => void;
}

export const HeroInput: React.FC<HeroInputProps> = ({ onVideoInspected }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) {
      setErrorMessage('Introducí una URL de YouTube válida.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.inspectVideo(url.trim());
      if (res.success && res.videoInfo) {
        onVideoInspected(res.videoInfo, true);
      } else {
        setErrorMessage(res.message || 'Introducí una URL de YouTube válida.');
      }
    } catch {
      setErrorMessage('No pudimos acceder a este video.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setErrorMessage(null);
    setLoading(true);
    api.inspectVideo(sampleUrl)
      .then((res) => {
        if (res.success && res.videoInfo) {
          onVideoInspected(res.videoInfo, true);
        } else {
          setErrorMessage(res.message || 'No pudimos acceder a este video.');
        }
      })
      .catch(() => setErrorMessage('No pudimos acceder a este video.'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 md:py-28 flex flex-col items-center justify-center text-center">
      {/* Subtle Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono mb-8 tracking-wide animate-pulse-subtle">
        <Sparkles className="w-3.5 h-3.5" />
        <span>IA GENERATIVA Y DETECCIÓN DE RETENCIÓN</span>
      </div>

      {/* Main Title & Subtitle as requested */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-display text-white mb-6">
        ViralCut <span className="text-gradient-cyan">AI</span>
      </h1>
      
      <p className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto mb-12 tracking-tight">
        Transforma videos largos en clips cortos.
      </p>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl relative mb-4">
        <div className="relative flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-dark-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl focus-within:border-cyber-cyan/60 focus-within:shadow-glow-cyan/20 transition-all duration-300">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Pegá la URL de YouTube"
            disabled={loading}
            className="w-full px-5 py-4 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base md:text-lg font-normal"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-cyber-cyan text-dark-950 font-bold text-sm md:text-base hover:bg-cyan-300 active:scale-98 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-glow-cyan/30 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>INSPECCIONANDO...</span>
              </>
            ) : (
              <>
                <span>ANALIZAR VIDEO</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mt-4 animate-fade-in-down">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>

      {/* Micro-copy as requested */}
      <p className="text-sm text-slate-400 font-normal mb-10">
        Encuentra automáticamente los momentos más interesantes de tus videos.
      </p>

      {/* Quick Sample Videos for instant demonstration */}
      <div className="w-full max-w-2xl border-t border-white/5 pt-8">
        <p className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-4">
          O prueba con un video de muestra optimizado:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleSampleClick('sample_tech_ai')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-850/60 border border-white/5 hover:border-cyber-cyan/40 hover:bg-dark-800/80 active:scale-[0.98] text-left transition-all duration-200 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-cyber-cyan/20 transition-transform">
              <Play className="w-3.5 h-3.5 text-cyber-cyan fill-cyber-cyan" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-cyber-cyan transition-colors truncate">Podcast Tech & IA</p>
              <p className="text-[11px] text-slate-400 font-mono">05:48 min</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSampleClick('sample_mindset')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-850/60 border border-white/5 hover:border-purple-400/40 hover:bg-dark-800/80 active:scale-[0.98] text-left transition-all duration-200 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple-500/20 transition-transform">
              <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition-colors truncate">Mindset & Hábitos</p>
              <p className="text-[11px] text-slate-400 font-mono">06:52 min</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSampleClick('sample_finance')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-dark-850/60 border border-white/5 hover:border-emerald-400/40 hover:bg-dark-800/80 active:scale-[0.98] text-left transition-all duration-200 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-transform">
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">Estrategia Finanzas</p>
              <p className="text-[11px] text-slate-400 font-mono">08:40 min</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
