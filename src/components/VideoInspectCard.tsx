import React from 'react';
import { VideoInfo } from '../types/index.js';
import { Play, User, Clock, Calendar, Sparkles, ArrowLeft, Eye } from 'lucide-react';
import { formatDate, formatNumber } from '../utils/formatters.js';

interface VideoInspectCardProps {
  videoInfo: VideoInfo;
  onStartAnalysis: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const VideoInspectCard: React.FC<VideoInspectCardProps> = ({
  videoInfo,
  onStartAnalysis,
  onBack,
  isLoading = false,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyber-cyan mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>CAMBIAR URL</span>
      </button>

      {/* Card Container */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Thumbnail with overlay badge */}
          <div className="w-full md:w-72 aspect-video rounded-2xl overflow-hidden relative bg-dark-800 shrink-0 border border-white/10 group shadow-lg">
            <img
              src={videoInfo.thumbnailUrl}
              alt={videoInfo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-dark-950/90 text-white font-mono text-xs border border-white/10 flex items-center gap-1.5 shadow">
              <Clock className="w-3 h-3 text-cyber-cyan" />
              <span>{videoInfo.durationFormatted}</span>
            </div>
          </div>

          {/* Info Details */}
          <div className="flex-1 flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyber-cyan mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Video verificado y listo para segmentación</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-display text-white leading-snug line-clamp-2">
                {videoInfo.title}
              </h2>
            </div>

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-dark-850/70 border border-white/5">
                <p className="text-[10px] text-slate-400 uppercase font-mono mb-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Canal
                </p>
                <p className="text-xs font-semibold text-slate-200 truncate">{videoInfo.channel}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-dark-850/70 border border-white/5">
                <p className="text-[10px] text-slate-400 uppercase font-mono mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Duración
                </p>
                <p className="text-xs font-semibold text-slate-200">{videoInfo.durationFormatted}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-dark-850/70 border border-white/5 col-span-2 sm:col-span-1">
                <p className="text-[10px] text-slate-400 uppercase font-mono mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Fecha
                </p>
                <p className="text-xs font-semibold text-slate-200">{formatDate(videoInfo.publishedAt)}</p>
              </div>
            </div>

            {/* Start Action Button as specified */}
            <div className="pt-4">
              <button
                onClick={onStartAnalysis}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-cyber-cyan text-dark-950 font-extrabold text-base tracking-wide hover:bg-cyan-300 active:scale-98 transition-all flex items-center justify-center gap-3 shadow-glow-cyan/40 cursor-pointer disabled:opacity-70"
              >
                <Sparkles className="w-5 h-5 text-dark-950 fill-dark-950" />
                <span>COMENZAR ANÁLISIS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
