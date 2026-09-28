import React, { useState, useEffect } from 'react';
import { Clip, VideoInfo } from '../../types/index.js';
import { VideoPlayer } from '../VideoPlayer.js';
import { Timeline } from './Timeline.js';
import { SmartReframeControl } from './SmartReframeControl.js';
import { MetadataPanel } from './MetadataPanel.js';
import { X, Save, Download, Sparkles, Crop, FileText, Check, Loader2, FolderOpen, Eye, Scissors, Maximize2, Minimize2, Zap, Mic, Flame, Tv } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { triggerBrowserFileDownload } from '../../utils/downloadHelper.js';

interface VideoEditorModalProps {
  clip: Clip;
  videoInfo: VideoInfo;
  onClose: () => void;
  onSave: (updatedClip: Clip) => void;
  onExport: (clip: Clip) => Promise<string | undefined>;
}

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({
  clip: initialClip,
  videoInfo,
  onClose,
  onSave,
  onExport,
}) => {
  const [clip, setClip] = useState<Clip>({ ...initialClip });
  const [activeTab, setActiveTab] = useState<'reframe' | 'metadata'>('reframe');
  const [currentTime, setCurrentTime] = useState<number>(initialClip.startTime);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(clip.exportedUrl || null);
  const [hasSaved, setHasSaved] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isLargePreview, setIsLargePreview] = useState(true);

  // Synchronize clip state when initialClip changes
  useEffect(() => {
    setClip({ ...initialClip });
    setCurrentTime(initialClip.startTime);
    setDownloadUrl(initialClip.exportedUrl || null);
  }, [initialClip.id, initialClip.startTime, initialClip.endTime]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTimeSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleRangeChange = (start: number, end: number) => {
    const duration = parseFloat((end - start).toFixed(2));
    setClip({
      ...clip,
      startTime: start,
      endTime: end,
      duration,
    });
  };

  const handleSave = () => {
    const updated: Clip = {
      ...clip,
      exportStatus: 'idle',
      exportedUrl: undefined,
    };
    onSave(updated);
    setClip(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('Guardando ajustes y exportando video...');
    try {
      // Guardar estado del clip actualizado antes de exportar
      onSave(clip);
      const url = await onExport(clip);
      if (url) {
        setDownloadUrl(url);
        setClip((prev) => ({
          ...prev,
          exportedUrl: url,
          exportStatus: 'completed',
          exportProgress: 100,
        }));
        setExportMessage('¡Guardado en Documentos\\Videos!');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch {
      setExportMessage('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 bg-dark-950/85 backdrop-blur-xl animate-modal-backdrop"
    >
      <div className="w-full max-w-[1600px] h-[98vh] max-h-[1140px] min-h-[680px] bg-dark-900 border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-modal-panel">
        {/* Top Header */}
        <div className="h-13 px-5 sm:px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-dark-950/80">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold">
              CLIP #{clip.clipNumber}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-dark-800 text-[10px] text-slate-400 font-mono border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EDITOR ESTUDIO
            </span>
          </div>

          <div className="flex-1 text-center px-4 hidden md:block">
            <h2 className="text-sm md:text-base font-bold text-white font-display truncate max-w-lg mx-auto">
              {clip.metadata.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-95 text-slate-200 border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-cyber-cyan/40"
            >
              {hasSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{hasSaved ? 'Guardado' : 'Guardar'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-dark-800 border border-white/10 hover:border-white/30 active:scale-90 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Main Studio Workspace: 2-column layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Video Preview & Display Mode (Dominant Cinema Preview) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center justify-between bg-dark-950/80 rounded-2xl p-2.5 sm:p-3.5 border border-white/5 shadow-xl min-h-[460px] lg:min-h-0">
            {/* Centered Preview Screen with Dynamic Responsive Scaling */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-0.5">
              <div className={`h-full w-auto ${
                clip.aspectRatio === '1:1' 
                  ? isLargePreview ? 'aspect-square max-h-[680px] 2xl:max-h-[780px]' : 'aspect-square max-h-[540px]' 
                  : clip.aspectRatio === '16:9' 
                    ? isLargePreview ? 'aspect-video max-h-[540px] w-full max-w-[920px]' : 'aspect-video max-h-[420px] w-full max-w-[760px]' 
                    : isLargePreview ? 'aspect-[9/16] max-h-[780px] 2xl:max-h-[880px]' : 'aspect-[9/16] max-h-[680px] 2xl:max-h-[760px]'
              } rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-black flex items-center justify-center transition-all duration-300`}>
                <VideoPlayer
                  clip={clip}
                  videoInfo={videoInfo}
                  currentTime={currentTime}
                  onTimeUpdate={(t) => setCurrentTime(t)}
                  enableDragReframe={clip.aspectRatio === '9:16'}
                  onOffsetChange={(newOffset) => {
                    setClip((prev) => ({
                      ...prev,
                      reframeConfig: {
                        ...prev.reframeConfig,
                        horizontalOffsetPercent: newOffset,
                        mode: 'manual',
                      },
                    }));
                  }}
                  className="w-full h-full"
                />

                {/* TikTok / Reels / Shorts Safe Zones Overlay */}
                {showSafeZones && clip.aspectRatio === '9:16' && (
                  <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
                    {/* Top Header UI Zone */}
                    <div className="h-[14%] bg-red-500/20 border-b border-red-500/40 flex items-center justify-center">
                      <span className="text-[9px] font-mono text-red-200 tracking-wider bg-black/60 px-1.5 py-0.5 rounded">
                        INTERFAZ SUPERIOR
                      </span>
                    </div>

                    {/* Middle Safe Zone Guide */}
                    <div className="flex-1 flex">
                      <div className="flex-1 border-2 border-dashed border-cyber-cyan/50 m-2 rounded-lg flex items-center justify-center relative">
                        <span className="text-[10px] font-mono text-cyan-300 font-bold bg-dark-950/80 px-2 py-0.5 rounded border border-cyber-cyan/30">
                          ZONA SEGURA
                        </span>
                      </div>
                      {/* Right interaction column */}
                      <div className="w-[18%] bg-red-500/20 border-l border-red-500/40 flex flex-col items-center justify-center gap-2 p-1">
                        <span className="text-[7px] font-mono text-red-200 uppercase text-center leading-tight">
                          Likes & Shares
                        </span>
                      </div>
                    </div>

                    {/* Bottom Captions & Audio Zone */}
                    <div className="h-[22%] bg-red-500/20 border-t border-red-500/40 flex items-center justify-center">
                      <span className="text-[9px] font-mono text-red-200 tracking-wider bg-black/60 px-1.5 py-0.5 rounded">
                        DESCRIPCIÓN Y AUDIO
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Bar for Preview */}
            <div className="shrink-0 flex items-center gap-2 mt-2 w-full max-w-[420px] justify-between">
              {/* Safe zone toggle */}
              <button
                type="button"
                onClick={() => setShowSafeZones(!showSafeZones)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  showSafeZones
                    ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                    : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
                title="Superponer guías de interfaz para TikTok, Reels y Shorts"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showSafeZones ? 'Ocultar Zonas' : 'Zonas Seguras'}</span>
                <span className="sm:hidden">Zonas</span>
              </button>

              {/* Preview Size Toggle */}
              <button
                type="button"
                onClick={() => setIsLargePreview(!isLargePreview)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  isLargePreview
                    ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan font-bold shadow-sm'
                    : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
                title={isLargePreview ? 'Restaurar tamaño normal' : 'Agrandar previsualización al máximo'}
              >
                {isLargePreview ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isLargePreview ? 'Normal' : 'Zoom +'}</span>
              </button>

              {/* Aspect Ratio switcher */}
              <div className="flex rounded-xl bg-dark-900 border border-white/10 p-0.5 text-[10px] font-mono">
                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setClip({ ...clip, aspectRatio: ratio })}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      clip.aspectRatio === ratio
                        ? 'bg-cyber-cyan text-dark-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <span className="shrink-0 text-[10px] font-mono text-slate-400 mt-1 text-center">
              Previsualización en tiempo real — {clip.aspectRatio} {isLargePreview && '• Vista Ampliada'}
            </span>
          </div>

          {/* Right Column: Editing Tools Inspector (THE ONLY SCROLLBAR) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-dark-950/40 rounded-2xl border border-white/5 p-3.5 sm:p-4 overflow-hidden">
            {/* AI Optimizations Studio Card */}
            <div className="shrink-0 p-3 rounded-xl bg-dark-900/90 border border-white/10 space-y-2 mb-3.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
                  Potenciadores Virales IA
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-green/10 text-cyber-green font-mono font-bold border border-cyber-green/30">
                  GPU READY
                </span>
              </div>

              {/* 1. Smart Jump-Cut IA */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-dark-850/80 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    clip.smartJumpCut ? 'bg-cyber-cyan/15 text-cyber-cyan' : 'bg-dark-800 text-slate-500'
                  }`}>
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">Smart Jump-Cut</p>
                      <span className="text-[8px] px-1 rounded bg-cyber-cyan/10 text-cyber-cyan font-mono font-bold shrink-0">RITMO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {clip.smartJumpCut
                        ? clip.silenceDurationRemoved && clip.silenceDurationRemoved > 0
                          ? `✂️ ~${clip.silenceDurationRemoved}s recortados`
                          : 'Elimina pausas > 0.6s'
                        : 'Sin eliminar silencios'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.smartJumpCut)}
                    onChange={(e) => setClip({ ...clip, smartJumpCut: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyber-cyan"></div>
                </label>
              </div>

              {/* 2. Smart Punch-In Zoom IA */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-dark-850/80 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    clip.punchInZoom ? 'bg-cyber-cyan/15 text-cyber-cyan' : 'bg-dark-800 text-slate-500'
                  }`}>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">Smart Punch-In Zoom</p>
                      <span className="text-[8px] px-1 rounded bg-amber-500/10 text-amber-400 font-mono font-bold shrink-0">RETENCIÓN</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {clip.punchInZoom ? 'Zoom 1.18x dinámico en keyframes' : 'Encuadre estático'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(clip.punchInZoom)}
                    onChange={(e) => setClip({ ...clip, punchInZoom: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyber-cyan"></div>
                </label>
              </div>

              {/* 3. Hook Booster (Primeros 3s) IA */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-dark-850/80 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    clip.hookBooster !== false ? 'bg-amber-500/15 text-amber-400' : 'bg-dark-800 text-slate-500'
                  }`}>
                    <Flame className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">Hook Booster (3s)</p>
                      <span className="text-[8px] px-1 rounded bg-amber-500/15 text-amber-300 font-mono font-bold shrink-0">CTR +70%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {clip.hookBooster !== false ? 'Micro-zoom de 1.25x a 1.0x para romper el scroll' : 'Inicio normal sin gancho'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={clip.hookBooster !== false}
                    onChange={(e) => setClip({ ...clip, hookBooster: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>

              {/* 4. Audio de Estudio y Denoise IA */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-dark-850/80 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    clip.audioEnhance !== false ? 'bg-cyber-green/15 text-cyber-green' : 'bg-dark-800 text-slate-500'
                  }`}>
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">Audio de Estudio</p>
                      <span className="text-[8px] px-1 rounded bg-cyber-green/10 text-cyber-green font-mono font-bold shrink-0">CLARIDAD</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {clip.audioEnhance !== false ? 'Denoise FFT -25dB + Compresión + Loudnorm' : 'Audio original sin procesar'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={clip.audioEnhance !== false}
                    onChange={(e) => setClip({ ...clip, audioEnhance: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyber-green"></div>
                </label>
              </div>

              {/* 5. Corrección de Píxeles & Super Nitidez (Anti-Blur) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-dark-850/80 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    clip.pixelEnhance !== false ? 'bg-purple-500/15 text-purple-400' : 'bg-dark-800 text-slate-500'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">Corrección Píxeles & Nitidez</p>
                      <span className="text-[8px] px-1 rounded bg-purple-500/15 text-purple-300 font-mono font-bold shrink-0">ANTI-BLUR</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {clip.pixelEnhance !== false ? 'Deblock + Unsharp + Micro-contraste en bordes' : 'Sin corrección óptica'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={clip.pixelEnhance !== false}
                    onChange={(e) => setClip({ ...clip, pixelEnhance: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {/* 6. Selector de Resolución de Salida */}
              <div className="p-2.5 rounded-lg bg-dark-850/90 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-cyber-cyan" />
                    Calidad de Salida:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {clip.resolution === '4k' ? 'Ultra HD 4K (2160p)' : (clip.resolution === '720p' ? '720p Express' : '1080p Full HD Pro')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setClip({ ...clip, resolution: '1080p' })}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      (clip.resolution === '1080p' || !clip.resolution)
                        ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-sm'
                        : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    1080p Pro ⭐
                  </button>
                  <button
                    type="button"
                    onClick={() => setClip({ ...clip, resolution: '4k' })}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      clip.resolution === '4k'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-sm'
                        : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    4K Ultra HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setClip({ ...clip, resolution: '720p' })}
                    className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      clip.resolution === '720p'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                        : 'bg-dark-900 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    720p Rápido
                  </button>
                </div>
                {clip.resolution === '4k' && (
                  <p className="text-[9px] text-amber-400 font-mono">
                    ⚠️ 4K renderiza en 2160x3840 (Lanczos). Tomará más tiempo de renderizado debido al cálculo de 8.3M de píxeles.
                  </p>
                )}
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="shrink-0 grid grid-cols-2 gap-2 p-1 rounded-xl bg-dark-900 border border-white/5">
              <button
                onClick={() => setActiveTab('reframe')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'reframe'
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span className="truncate">Enfoque (Crop)</span>
              </button>

              <button
                onClick={() => setActiveTab('metadata')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'metadata'
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Metadatos y Hooks</span>
              </button>
            </div>

            {/* Active Tab Content Container — The ONLY unified vertical scroll container */}
            <div key={activeTab} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-3.5 pr-2 animate-fade-in">
              {activeTab === 'reframe' && (
                <SmartReframeControl
                  aspectRatio={clip.aspectRatio}
                  reframeConfig={clip.reframeConfig}
                  onAspectRatioChange={(aspect) => setClip({ ...clip, aspectRatio: aspect })}
                  onReframeConfigChange={(config) => setClip({ ...clip, reframeConfig: config })}
                />
              )}

              {activeTab === 'metadata' && (
                <MetadataPanel
                  metadata={clip.metadata}
                  onMetadataChange={(meta) => setClip({ ...clip, metadata: meta })}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Interactive Timeline & Export Action */}
        <div className="px-5 py-2.5 sm:py-3 border-t border-white/5 bg-dark-950/90 backdrop-blur-md shrink-0">
          <div className="max-w-[1500px] mx-auto space-y-2">
            <Timeline
              clip={clip}
              totalVideoDuration={videoInfo.duration}
              currentTime={currentTime}
              onTimeSeek={handleTimeSeek}
              onRangeChange={handleRangeChange}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                <span className="text-white font-bold">
                  {clip.resolution !== '1080p' && clip.resolution !== '720p' ? 'Ultra HD 4K (2160 × 3840)' : (clip.resolution === '720p' ? 'HD Express (720 × 1280)' : 'Full HD Pro (1080 × 1920)')}
                </span>
                <span className="text-slate-500">•</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {clip.hookBooster !== false && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">🔥 Hook 3s</span>}
                  {clip.punchInZoom && <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-bold">⚡ Punch-In</span>}
                  {clip.smartJumpCut && <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-bold">✂️ Jump-Cut</span>}
                  {clip.pixelEnhance !== false && <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300 font-bold">✨ Nitidez</span>}
                  {clip.audioEnhance !== false && <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">🎙️ Audio Pro</span>}
                </div>
                {exportMessage && (
                  <span className="ml-1 text-cyber-cyan font-bold">[{exportMessage}]</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {downloadUrl ? (
                  <>
                    <button
                      onClick={() => api.openSavedFolder()}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-cyber-cyan border border-cyber-cyan/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-cyber-cyan"
                      title="Abrir carpeta Documentos\Videos en el explorador de Windows"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>ABRIR CARPETA</span>
                    </button>

                    <button
                      onClick={async () => {
                        const cleanTitle = (clip.metadata?.title || 'clip').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').slice(0, 30);
                        const fileName = `ViralCut_Clip_${clip.clipNumber}_${cleanTitle}.mp4`;
                        const finalUrl = api.getClipDownloadUrl(downloadUrl, fileName);
                        await triggerBrowserFileDownload(finalUrl, fileName);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-dark-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-green/30 transition-all cursor-pointer active:scale-95"
                      title="Descargar archivo MP4 directamente a tu equipo"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>DESCARGAR MP4</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyber-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan/30 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>RENDERIZANDO MP4...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>EXPORTAR CLIP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

