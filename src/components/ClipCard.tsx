import React, { useState } from 'react';
import { Clip, VideoInfo } from '../types/index.js';
import { VideoPlayer } from './VideoPlayer.js';
import { Edit3, Download, Sparkles, Clock, Tag, Flame, CheckCircle2, Loader2, Info, Copy, Check } from 'lucide-react';
import { formatTime } from '../utils/formatters.js';

interface ClipCardProps {
  clip: Clip;
  videoInfo: VideoInfo;
  onEdit: (clip: Clip) => void;
  onExport: (clip: Clip) => void;
  isExporting?: boolean;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  videoInfo,
  onEdit,
  onExport,
  isExporting = false,
}) => {
  const [showRationale, setShowRationale] = useState(false);
  const [copied, setCopied] = useState(false);
  const { potentialScore, scoreRationale, scoreBreakdown, hook, category, title } = clip.metadata;

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
        <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
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
          <div className="mt-2 p-2.5 rounded-xl bg-dark-850/60 border border-white/5">
            <p className="text-[10px] uppercase font-mono text-slate-400 mb-0.5">Hook inicial:</p>
            <p className="text-xs text-slate-300 italic line-clamp-2 font-serif">
              "{hook}"
            </p>
          </div>
        </div>

        {/* Signals / Rationale Rationale preview */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTime(clip.duration)}
            </span>
            <div className="flex items-center gap-2.5">
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
            onClick={() => onExport(clip)}
            disabled={isExporting || clip.exportStatus === 'rendering'}
            className="py-2.5 px-4 rounded-xl bg-cyber-cyan hover:bg-cyan-300 active:scale-95 text-dark-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-glow-cyan/30 cursor-pointer disabled:opacity-60"
          >
            {clip.exportStatus === 'rendering' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{clip.exportProgress || 15}%</span>
              </>
            ) : clip.exportStatus === 'completed' ? (
              <>
                <Download className="w-3.5 h-3.5" />
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
