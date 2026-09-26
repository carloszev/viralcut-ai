import React from 'react';
import { Project } from '../types/index.js';
import { Clock, Film, Calendar, Trash2, ArrowRight, FolderKanban, Plus, Sparkles, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

interface ProjectsViewProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProjectClick: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onOpenProject,
  onDeleteProject,
  onNewProjectClick,
}) => {
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completado</span>
          </span>
        );
      case 'analyzing':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-[10px] font-mono">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Procesando</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono">
            <AlertCircle className="w-3 h-3" />
            <span>Error</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white tracking-tight">
            MIS PROYECTOS
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Historial de videos analizados, clips generados y exportaciones
          </p>
        </div>

        <button
          onClick={onNewProjectClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-cyan text-dark-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 active:scale-95 transition-all shadow-glow-cyan/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Analizar Nuevo Video</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl border border-white/5 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <FolderKanban className="w-8 h-8 text-cyber-cyan/70" />
          </div>
          <h3 className="text-lg font-bold text-white font-display">No hay proyectos guardados todavía</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Pega una URL de YouTube o prueba un video de muestra para generar tus primeros clips verticales.
          </p>
          <button
            onClick={onNewProjectClick}
            className="px-6 py-3 rounded-xl bg-cyber-cyan text-dark-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-all cursor-pointer inline-flex items-center gap-2 shadow-glow-cyan/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crear Primer Proyecto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-panel card-hover rounded-3xl p-5 border border-white/10 hover:border-cyber-cyan/30 transition-all duration-300 flex flex-col justify-between group shadow-xl"
            >
              <div>
                {/* Thumbnail */}
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-dark-800 relative mb-4 border border-white/10 group-hover:border-cyber-cyan/30 transition-colors">
                  <img
                    src={project.videoInfo.thumbnailUrl}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-dark-950/80 text-white font-mono text-[10px] border border-white/10">
                    {project.videoInfo.durationFormatted}
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-display font-bold text-base text-white group-hover:text-cyber-cyan transition-colors line-clamp-2 mb-2 leading-snug">
                  {project.name}
                </h3>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 py-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>{project.clips.length} Clips</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons: [ ABRIR ] and [ ELIMINAR ] as requested */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={() => onOpenProject(project)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-cyber-cyan hover:bg-cyan-300 active:scale-95 text-dark-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-glow-cyan/20 cursor-pointer"
                >
                  <span>ABRIR</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <button
                  onClick={() => onDeleteProject(project.id)}
                  className="p-2.5 rounded-xl bg-dark-800 hover:bg-rose-500/20 active:scale-90 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
