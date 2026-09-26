import React, { useState, useMemo } from 'react';
import { Clip, Project, VideoInfo } from '../types/index.js';
import { ClipCard } from './ClipCard.js';
import { Filter, ArrowUpDown, Sparkles, SlidersHorizontal, Download, Loader2 } from 'lucide-react';

interface ClipsShowcaseProps {
  clips: Clip[];
  videoInfo: VideoInfo;
  projects?: Project[];
  onEditClip: (clip: Clip) => void;
  onExportClip: (clip: Clip) => void;
  exportingClipId?: string | null;
}

type SortOption = 'potential' | 'duration' | 'newest' | 'original';
type CategoryFilter = 'Todas' | 'Humor' | 'Información' | 'Emoción' | 'Debate' | 'Sorpresa' | 'Historia' | 'Educación';

export const ClipsShowcase: React.FC<ClipsShowcaseProps> = ({
  clips,
  videoInfo,
  projects,
  onEditClip,
  onExportClip,
  exportingClipId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Todas');
  const [sortBy, setSortBy] = useState<SortOption>('potential');
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const categories: CategoryFilter[] = [
    'Todas',
    'Humor',
    'Información',
    'Emoción',
    'Debate',
    'Sorpresa',
    'Historia',
    'Educación'
  ];

  // Filtering & Sorting
  const filteredClips = useMemo(() => {
    let result = [...clips];

    // Filter by Category
    if (selectedCategory !== 'Todas') {
      result = result.filter((c) => c.metadata.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'potential':
        result.sort((a, b) => b.metadata.potentialScore - a.metadata.potentialScore);
        break;
      case 'duration':
        result.sort((a, b) => b.duration - a.duration);
        break;
      case 'newest':
        result.sort((a, b) => b.startTime - a.startTime);
        break;
      case 'original':
      default:
        result.sort((a, b) => a.clipNumber - b.clipNumber);
        break;
    }

    return result;
  }, [clips, selectedCategory, sortBy]);

  const handleExportAll = async () => {
    if (isBatchExporting || filteredClips.length === 0) return;
    setIsBatchExporting(true);
    for (let i = 0; i < filteredClips.length; i++) {
      setBatchProgress({ current: i + 1, total: filteredClips.length });
      const clip = filteredClips[i];
      if (clip.exportStatus !== 'completed') {
        await onExportClip(clip);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    setIsBatchExporting(false);
    setBatchProgress(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
      {/* Header with count and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ANÁLISIS COMPLETADO</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white tracking-tight">
            {clips.length} CLIPS DETECTADOS
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Segmentos optimizados en formato 9:16 para TikTok, Reels y YouTube Shorts
          </p>
        </div>

        {/* Actions bar: Export All + Sort selector */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={isBatchExporting || !!exportingClipId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyan-400 text-dark-950 font-bold text-xs uppercase tracking-wider shadow-glow-cyan/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
            title="Exportar todos los clips visibles automáticamente"
          >
            {isBatchExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exportando {batchProgress?.current}/{batchProgress?.total}...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Exportar Todos ({filteredClips.length})</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-dark-850/80 border border-white/10 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyber-cyan" />
            <span className="text-slate-400 font-mono">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="potential" className="bg-dark-900 text-white">Potential Score</option>
              <option value="duration" className="bg-dark-900 text-white">Duración</option>
              <option value="newest" className="bg-dark-900 text-white">Más reciente</option>
              <option value="original" className="bg-dark-900 text-white">Orden original</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-mono text-slate-400 uppercase mr-1 flex items-center gap-1 shrink-0">
          <Filter className="w-3 h-3 text-slate-400" />
          Filtrar:
        </span>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-cyber-cyan text-dark-950 font-bold shadow-glow-cyan/20'
                  : 'bg-dark-850/70 border border-white/5 text-slate-300 hover:text-white hover:bg-dark-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Clips Grid */}
      {filteredClips.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-white/5">
          <p className="text-slate-400 text-sm">No se encontraron clips en la categoría "{selectedCategory}".</p>
          <button
            onClick={() => setSelectedCategory('Todas')}
            className="mt-3 text-xs text-cyber-cyan font-bold hover:underline cursor-pointer"
          >
            Ver todos los clips
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClips.map((clip) => {
            const clipVideoInfo = (clip.projectId && projects)
              ? projects.find((p) => p.id === clip.projectId)?.videoInfo || videoInfo
              : videoInfo;
            return (
              <ClipCard
                key={clip.id}
                clip={clip}
                videoInfo={clipVideoInfo}
                onEdit={onEditClip}
                onExport={onExportClip}
                isExporting={exportingClipId === clip.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
