import React, { useState } from 'react';
import { Clip, VideoInfo } from '../types/index.js';
import { VideoPlayer } from './VideoPlayer.js';
import { Edit3, Download, Clock, Flame, CheckCircle2, Loader2, Info, Copy, Check, Scissors, Zap, Sparkles, Mic } from 'lucide-react';
import { formatTime } from '../utils/formatters.js';
import { triggerBrowserFileDownload } from '../utils/downloadHelper.js';
import { api } from '../services/api.js';

interface ClipCardProps {
  clip: Clip;
  videoInfo: VideoInfo;
  onEdit: (clip: Clip) => void;
  onExport: (clip: Clip) => void;
  onUpdateClip?: (clip: Clip) => void;
  isExporting?: boolean;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  videoInfo,
  onEdit,
  onExport,
  onUpdateClip,
  isExporting = false,
}) => {
  const [showRationale, setShowRationale] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloadingDirectly, setIsDownloadingDirectly] = useState(false);
  const { potentialScore, scoreRationale, scoreBreakdown, hook, category, title } = clip.metadata;

  const togglePotentiator = (key: keyof Clip, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentVal = clip[key];
    const newVal = currentVal === undefined ? false : !currentVal;
    const updated: Clip = {
      ...clip,
      [key]: newVal,
      exportedUrl: undefined,
      exportStatus: 'idle',
    };
    if (onUpdateClip) {
      onUpdateClip(updated);
    }
  };

  const handleActionClick = async () => {
    if (clip.exportStatus === 'completed' && clip.exportedUrl) {
      setIsDownloadingDirectly(true);
      try {
        const cleanTitle = (clip.metadata?.title || `clip_${clip.clipNumber || 1}`)
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_')
          .slice(0, 40);
        const fileName = `ViralCut_Clip_${clip.clipNumber || 1}_${cleanTitle}.mp4`;
        const downloadUrl = api.getClipDownloadUrl(clip.exportedUrl, fileName);
        await triggerBrowserFileDownload(downloadUrl, fileName);
      } finally {
        setTimeout(() => setIsDownloadingDirectly(false), 1000);
      }
      return;
    }
    onExport(clip);
  };

  const handleCopyCaption = () => {
    const hashtags = (clip.metadata.hashtags || []).join(' ');
    const text = `${title}\n\n"${hook}"\n\n${clip.metadata.description || ''}\n\n${hashtags}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Score color grading
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10 shadow-glow-cyan/20';
    if (score >= 80) return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10 shadow-glow-green/20';
    return 'text-amber-400 border-amber-400/40 bg-amber-400/10';
  };

  return (
    <div className="glass-panel card-hover rounded-3xl p-5 flex flex-col justify-between border border-white/10 hover:border-cyber-cyan/30 transition-all duration-300 group shadow-xl">
      {/* Top: 9:16 Vertical Video Preview Player */}
      <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden mb-4 relative bg-dark-950 shadow-inner">
        <VideoPlayer
          clip={clip}
          videoInfo={videoInfo}
          showControls={true}
          className="w-full h-full"
        />

        {/* Floating Potential Score Pill on Preview */}
        <div className="absolute top-3 right-3 z-30">
          <div 
            onClick={() => setShowRationale(!showRationale)}
            className={`px-3 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-1.5 cursor-pointer font-display font-extrabold text-xs transition-transform hover:scale-105 active:scale-95 ${getScoreColor(potentialScore)}`}
            title="Ver desglose del Potential Score"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{potentialScore}/100</span>
          </div>
        </div>

        {/* Category Pill on Preview */}
        <div className="absolute top-3 left-3 z-30">
          <span className="px-2.5 py-1 rounded-lg bg-dark-900/80 border border-white/10 text-slate-200 text-[10px] font-mono backdrop-blur uppercase">
            {category}
          </span>
        </div>

        {/* Status indicator: MP4 Cortado vs Corte 9:16 */}
        <div className="absolute bottom-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 flex-wrap">
          {clip.exportStatus === 'completed' && clip.exportedUrl ? (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-400 text-dark-950 text-[10px] font-black font-mono shadow-glow-green/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-dark-950" />
              <span>MP4 CORTADO</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/80 border border-white/10 text-cyber-cyan text-[10px] font-mono backdrop-blur">
              Corte 9:16 ({formatTime(clip.duration)})
            </span>
          )}

          {clip.smartJumpCut && (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/90 border border-cyber-cyan/30 text-cyber-cyan text-[9px] font-mono backdrop-blur">
              ✂️ JUMP-CUT
            </span>
          )}

          {clip.punchInZoom && (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/90 border border-amber-400/30 text-amber-400 text-[9px] font-mono backdrop-blur">
              ⚡ PUNCH-IN
            </span>
          )}

          {clip.hookBooster && (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/90 border border-amber-500/40 text-amber-300 text-[9px] font-mono backdrop-blur">
              🎯 HOOK 3s
            </span>
          )}

          {clip.pixelEnhance !== false && (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/90 border border-purple-500/40 text-purple-300 text-[9px] font-mono backdrop-blur">
              ✨ NITIDEZ
            </span>
          )}

          {clip.resolution !== '1080p' && clip.resolution !== '720p' ? (
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/30 border border-purple-400 text-purple-200 text-[9px] font-mono font-bold backdrop-blur">
              4K UHD
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-dark-900/90 border border-white/10 text-slate-400 text-[9px] font-mono backdrop-blur">
              {clip.resolution.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Information Details */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-display font-bold text-base md:text-lg text-white group-hover:text-cyber-cyan transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          {/* Hook */}
          <div className="mt-2 p-2 rounded-xl bg-dark-850/60 border border-white/5">
            <p className="text-[9px] uppercase font-mono text-slate-400 mb-0.5">Hook inicial:</p>
            <p className="text-xs text-slate-300 italic line-clamp-2 font-serif">
              "{hook}"
            </p>
          </div>

          {/* Potenciadores Virales IA Quick-Toggles */}
          <div className="mt-2.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 font-bold text-slate-200 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-cyber-cyan" />
                Potenciadores IA:
              </span>
              <span className="text-[8px] text-cyber-cyan font-mono">1-CLIC TOGGLE</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Hook Booster */}
              <button
                type="button"
                onClick={(e) => togglePotentiator('hookBooster', e)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.hookBooster !== false
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Hook Booster: Micro-zoom 1.25x en los primeros 2.5s para atrapar el scroll (+70% CTR)"
              >
                <Flame className="w-2.5 h-2.5 fill-current" />
                <span>Hook 3s</span>
              </button>

              {/* Smart Punch-In */}
              <button
                type="button"
                onClick={(e) => togglePotentiator('punchInZoom', e)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.punchInZoom
                    ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Smart Punch-In: Zoom dinámico 1.18x periódico en momentos clave"
              >
                <Zap className="w-2.5 h-2.5 fill-current" />
                <span>Punch-In</span>
              </button>

              {/* Smart Jump-Cut */}
              <button
                type="button"
                onClick={(e) => togglePotentiator('smartJumpCut', e)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.smartJumpCut
                    ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Smart Jump-Cut: Recorta silencios y pausas muertas mayores a 0.6s con FFmpeg"
              >
                <Scissors className="w-2.5 h-2.5" />
                <span>Jump-Cut</span>
              </button>

              {/* Nitidez & Anti-Blur */}
              <button
                type="button"
                onClick={(e) => togglePotentiator('pixelEnhance', e)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.pixelEnhance !== false
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Corrección de Píxeles: Deblocking y enfoque adaptativo para eliminar borrosidad"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Nitidez</span>
              </button>

              {/* Audio Estudio */}
              <button
                type="button"
                onClick={(e) => togglePotentiator('audioEnhance', e)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.audioEnhance !== false
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Audio Estudio: Denoise + Compresión + Ecualización vocal"
              >
                <Mic className="w-2.5 h-2.5" />
                <span>Audio Pro</span>
              </button>

              {/* 4K UHD Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextRes = (clip.resolution === '4k' || !clip.resolution) ? '1080p' : '4k';
                  if (onUpdateClip) {
                    onUpdateClip({
                      ...clip,
                      resolution: nextRes,
                      exportedUrl: undefined,
                      exportStatus: 'idle',
                    });
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  clip.resolution !== '1080p' && clip.resolution !== '720p'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-400/50 shadow-sm'
                    : 'bg-dark-850 text-slate-500 border border-white/5 hover:text-slate-300'
                }`}
                title="Resolución: 4K Ultra HD (2160x3840) automático por defecto"
              >
                <span>4K UHD</span>
              </button>
            </div>
          </div>
        </div>

        {/* Signals / Rationale Rationale preview */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTime(clip.duration)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCaption}
                className="text-[11px] text-slate-400 hover:text-cyber-cyan flex items-center gap-1 cursor-pointer transition-colors"
                title="Copiar título, descripción y hashtags para publicar en redes"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className={copied ? "text-emerald-400 font-bold" : ""}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </span>
              </button>
              <button
                onClick={() => setShowRationale(!showRationale)}
                className="text-[11px] text-cyber-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3 h-3" />
                <span>Señales</span>
              </button>
            </div>
          </div>

          {/* Collapsible Detailed Rationale */}
          {showRationale && (
            <div className="p-3 rounded-xl bg-dark-900/95 border border-cyber-cyan/30 text-xs text-slate-300 space-y-2 animate-fade-in-down mt-2 mb-2">
              <p className="font-semibold text-cyber-cyan text-[11px] uppercase tracking-wider">
                Motivos de puntuación:
              </p>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                {scoreRationale}
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono text-slate-400 border-t border-white/5">
                <div>Hook: <span className="text-slate-200 font-bold">{scoreBreakdown.hookImpact}/25</span></div>
                <div>Densidad: <span className="text-slate-200 font-bold">{scoreBreakdown.infoDensity}/25</span></div>
                <div>Emoción: <span className="text-slate-200 font-bold">{scoreBreakdown.emotionalSpike}/20</span></div>
                <div>Ritmo: <span className="text-slate-200 font-bold">{scoreBreakdown.pacingFlow}/15</span></div>
              </div>
              <p className="text-[9px] text-slate-400 italic pt-1">
                *Estimación basada en señales cuantificables, no es garantía de viralidad.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Buttons: [ EDITAR ] & [ EXPORTAR ] as requested */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
          <button
            onClick={() => onEdit(clip)}
            className="py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 active:scale-95 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>EDITAR</span>
          </button>

          <button
            onClick={handleActionClick}
            disabled={isExporting || clip.exportStatus === 'rendering'}
            className={`py-2.5 px-4 rounded-xl active:scale-95 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
              clip.exportStatus === 'completed'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-dark-950 shadow-glow-green/30'
                : 'bg-cyber-cyan hover:bg-cyan-300 text-dark-950 shadow-glow-cyan/30'
            }`}
            title={clip.exportStatus === 'completed' ? 'Descargar archivo MP4 directamente a tu equipo' : 'Renderizar y exportar clip en 9:16'}
          >
            {clip.exportStatus === 'rendering' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{clip.exportProgress || 15}%</span>
              </>
            ) : isDownloadingDirectly ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>DESCARGANDO...</span>
              </>
            ) : clip.exportStatus === 'completed' ? (
              <>
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>DESCARGAR</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>EXPORTAR</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
