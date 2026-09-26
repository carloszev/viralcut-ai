import React, { useState, useEffect } from 'react';
import { Clip, VideoInfo } from '../../types/index.js';
import { VideoPlayer } from '../VideoPlayer.js';
import { Timeline } from './Timeline.js';
import { SubtitleEditor } from './SubtitleEditor.js';
import { SmartReframeControl } from './SmartReframeControl.js';
import { MetadataPanel } from './MetadataPanel.js';
import { X, Save, Download, Sparkles, Type, Crop, FileText, Check, Loader2, FolderOpen, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';

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
  const [activeTab, setActiveTab] = useState<'subtitles' | 'reframe' | 'metadata'>('subtitles');
  const [currentTime, setCurrentTime] = useState<number>(initialClip.startTime);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(clip.exportedUrl || null);
  const [hasSaved, setHasSaved] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);

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
    onSave(clip);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('Preparando exportación...');
    try {
      const url = await onExport(clip);
      if (url) {
        setDownloadUrl(url);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-dark-950/85 backdrop-blur-xl animate-modal-backdrop"
    >
      <div className="w-full max-w-6xl max-h-[96vh] bg-dark-900 border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-modal-panel">
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-dark-950/50">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold">
              CLIP #{clip.clipNumber}
            </div>
            <h2 className="text-sm md:text-base font-bold text-white font-display truncate max-w-md">
              {clip.metadata.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 active:scale-95 text-slate-200 border border-white/10 text-xs font-semibold transition-all cursor-pointer"
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

        {/* Editor Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left: Video Preview Player (responsive to aspect ratio) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-dark-950 rounded-2xl p-4 border border-white/5 relative min-h-[420px]">
            <div className={`w-full max-w-[280px] ${clip.aspectRatio === '1:1' ? 'aspect-square' : clip.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative transition-all duration-300`}>
              <VideoPlayer
                clip={clip}
                videoInfo={videoInfo}
                currentTime={currentTime}
                onTimeUpdate={(t) => setCurrentTime(t)}
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

            {/* Controls Bar for Preview */}
            <div className="flex items-center gap-2 mt-3 w-full max-w-[280px] justify-between">
              {/* Safe zone toggle */}
              <button
                type="button"
                onClick={() => setShowSafeZones(!showSafeZones)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  showSafeZones
                    ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                    : 'bg-dark-900 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
                title="Superponer guías de interfaz para TikTok, Reels y Shorts"
              >
                <Eye className="w-3 h-3" />
                <span>{showSafeZones ? 'Ocultar Zonas' : 'Zonas Seguras'}</span>
              </button>

              {/* Aspect Ratio switcher */}
              <div className="flex rounded-lg bg-dark-900 border border-white/10 p-0.5 text-[10px] font-mono">
                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setClip({ ...clip, aspectRatio: ratio })}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      clip.aspectRatio === ratio
                        ? 'bg-cyber-cyan text-dark-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-400 mt-1.5">
              Previsualización en tiempo real — {clip.aspectRatio}
            </span>
          </div>

          {/* Right: Tabbed Inspector */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Inspector Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-dark-950 border border-white/5 shrink-0">
              <button
                onClick={() => setActiveTab('subtitles')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'subtitles'
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Subtítulos</span>
              </button>

              <button
                onClick={() => setActiveTab('reframe')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'reframe'
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Reencuadre</span>
              </button>

              <button
                onClick={() => setActiveTab('metadata')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  activeTab === 'metadata'
                    ? 'bg-cyber-cyan text-dark-950 shadow-glow-cyan/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Metadatos</span>
              </button>
            </div>

            {/* Active Tab Content with animation */}
            <div key={activeTab} className="flex-1 overflow-y-auto max-h-[380px] pr-2 animate-fade-in">
              {activeTab === 'subtitles' && (
                <SubtitleEditor
                  subtitles={clip.subtitles}
                  subtitleConfig={clip.subtitleConfig}
                  onSubtitlesChange={(subs) => setClip({ ...clip, subtitles: subs })}
                  onConfigChange={(config) => setClip({ ...clip, subtitleConfig: config })}
                />
              )}

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
        <div className="p-6 border-t border-white/5 bg-dark-950/60 space-y-4 shrink-0">
          <Timeline
            clip={clip}
            totalVideoDuration={videoInfo.duration}
            currentTime={currentTime}
            onTimeSeek={handleTimeSeek}
            onRangeChange={handleRangeChange}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyber-green" />
              <span>Resolución de salida: 1080 × 1920 (MP4 H.264)</span>
              {exportMessage && (
                <span className="ml-2 text-cyber-cyan font-bold">[{exportMessage}]</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {downloadUrl ? (
                <>
                  <button
                    onClick={() => api.openSavedFolder()}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 text-cyber-cyan border border-cyber-cyan/30 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-cyber-cyan"
                    title="Abrir carpeta Documentos\Videos en el explorador de Windows"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>ABRIR CARPETA</span>
                  </button>

                  <a
                    href={api.getClipDownloadUrl(
                      downloadUrl,
                      `ViralCut_Clip_${clip.clipNumber}_${(clip.metadata?.title || 'clip').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').slice(0, 30)}.mp4`
                    )}
                    download={`ViralCut_Clip_${clip.clipNumber}_${(clip.metadata?.title || 'clip').replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').slice(0, 30)}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-dark-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-green/30 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>DESCARGAR MP4</span>
                  </a>
                </>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyber-cyan hover:bg-cyan-300 text-dark-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow-cyan/30 transition-all cursor-pointer disabled:opacity-60"
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
  );
};
