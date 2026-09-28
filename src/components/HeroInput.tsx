import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Play, AlertCircle, Loader2, UploadCloud, Video, FileVideo, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { VideoInfo } from '../types/index.js';

interface HeroInputProps {
  onVideoInspected: (videoInfo: VideoInfo, autoStart?: boolean) => void;
}

export const HeroInput: React.FC<HeroInputProps> = ({ onVideoInspected }) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      setErrorMessage('Formato no compatible. Sube un archivo de video MP4, MOV o WEBM.');
      return;
    }

    if (file.size > 800 * 1024 * 1024) {
      setErrorMessage('El archivo excede el tamaño máximo permitido de 800 MB.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    try {
      const res = await api.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success && res.videoInfo) {
        setUploadProgress(100);
        setTimeout(() => {
          onVideoInspected(res.videoInfo!, true);
        }, 500);
      } else {
        setErrorMessage(res.message || 'Error al subir el video al servidor.');
      }
    } catch {
      setErrorMessage('Error de conexión al subir el archivo.');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
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
    <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 flex flex-col items-center justify-center text-center">
      {/* Subtle Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono mb-8 tracking-wide animate-pulse-subtle">
        <Sparkles className="w-3.5 h-3.5" />
        <span>WHISPER IA + SEGUIMIENTO FACIAL + SMART JUMP-CUT</span>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-display text-white mb-6">
        ViralCut <span className="text-gradient-cyan">AI</span>
      </h1>
      
      <p className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto mb-8 tracking-tight">
        Transforma videos largos en clips virales con inteligencia artificial.
      </p>

      {/* Tabs Selector: YouTube URL vs Local Upload */}
      <div className="inline-flex p-1 rounded-2xl bg-dark-900/90 border border-white/10 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('youtube');
            setErrorMessage(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'youtube'
              ? 'bg-cyber-cyan text-dark-950 font-bold shadow-glow-cyan/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>YouTube URL</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            setErrorMessage(null);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-cyber-cyan text-dark-950 font-bold shadow-glow-cyan/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Subir Archivo (.mp4)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-dark-950/60 text-cyber-cyan font-bold">WHISPER</span>
        </button>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-2xl mb-4">
        {activeTab === 'youtube' ? (
          <form onSubmit={handleSubmit} className="w-full relative">
            <div className="relative flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-dark-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl focus-within:border-cyber-cyan/60 focus-within:shadow-glow-cyan/20 transition-all duration-300">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Pegá la URL de YouTube (ej: https://youtube.com/watch?v=...)"
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
          </form>
        ) : (
          /* Local File Upload Dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 backdrop-blur-2xl ${
              isDragOver
                ? 'border-cyber-cyan bg-cyber-cyan/10 shadow-glow-cyan/20'
                : 'border-white/15 bg-dark-900/70 hover:border-cyber-cyan/50 hover:bg-dark-900/90'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
              className="hidden"
            />

            {loading ? (
              <div className="w-full max-w-md space-y-4">
                <Loader2 className="w-10 h-10 text-cyber-cyan animate-spin mx-auto" />
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span>Subiendo archivo y extrayendo metadatos...</span>
                    <span className="text-cyber-cyan font-bold">{uploadProgress ?? 0}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyber-cyan to-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress ?? 10}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-white mb-1">
                    Arrastrá tu archivo de video o hacé clic para explorar
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Soporta MP4, MOV, WEBM (Hasta 800 MB) • Transcripción automática con Whisper IA
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mt-4 animate-fade-in-down">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Micro-copy as requested */}
      <p className="text-sm text-slate-400 font-normal mb-8">
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
