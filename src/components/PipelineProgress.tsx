import React from 'react';
import { PipelineStage } from '../types/index.js';
import { Check, Circle, Loader2, Sparkles } from 'lucide-react';

interface PipelineProgressProps {
  currentStage: PipelineStage;
  progressPercent: number;
  stageDetail?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

interface StepItem {
  id: PipelineStage;
  label: string;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStage,
  progressPercent,
  stageDetail,
  videoTitle,
  thumbnailUrl,
  errorMessage,
  onRetry,
  onCancel,
}) => {
  const steps: StepItem[] = [
    { id: 'fetching_info', label: 'Obteniendo información' },
    { id: 'analyzing_duration', label: 'Analizando duración' },
    { id: 'transcribing', label: 'Transcribiendo contenido' },
    { id: 'detecting_moments', label: 'Detectando momentos importantes' },
    { id: 'analyzing_scenes', label: 'Analizando escenas' },
    { id: 'finding_hooks', label: 'Buscando hooks' },
    { id: 'calculating_potential', label: 'Calculando potencial' },
    { id: 'preparing_clips', label: 'Preparando clips' },
  ];

  const getStepStatus = (stepId: PipelineStage) => {
    const stageOrder: PipelineStage[] = [
      'fetching_info',
      'analyzing_duration',
      'transcribing',
      'detecting_moments',
      'analyzing_scenes',
      'finding_hooks',
      'calculating_potential',
      'preparing_clips',
      'completed'
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const stepIndex = stageOrder.indexOf(stepId);

    if (currentStage === 'completed' || stepIndex < currentIndex) {
      return 'completed';
    }
    if (stepIndex === currentIndex) {
      return 'running';
    }
    return 'pending';
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16 animate-fade-in-up">
      <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Background subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyber-cyan/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          {currentStage === 'completed' ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-3 animate-pulse-subtle">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>¡ANÁLISIS COMPLETADO!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono mb-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>PROCESAMIENTO ACTIVO</span>
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-white mb-2">
            {currentStage === 'completed' ? 'CLIPS GENERADOS' : 'ANALIZANDO VIDEO'}
          </h2>
          {thumbnailUrl && (
            <div className="w-24 h-14 mx-auto my-3 rounded-lg overflow-hidden border border-white/10 shadow-md">
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
            </div>
          )}
          {videoTitle && (
            <p className="text-xs text-slate-300 font-medium truncate max-w-sm mx-auto font-mono">
              {videoTitle}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8 relative z-10">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
            <span>Progreso general</span>
            <span className="text-cyber-cyan font-bold transition-all duration-300">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-dark-800 border border-white/5 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-cyan via-cyan-400 to-purple-500 shadow-glow-cyan transition-all duration-700 ease-out"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            />
          </div>
          {stageDetail && currentStage !== 'completed' && (
            <p className="text-center text-xs text-cyber-cyan/90 font-mono mt-2.5 animate-pulse truncate px-2">
              {stageDetail}
            </p>
          )}
        </div>

        {/* Real Step-by-Step Tracker */}
        <div className="space-y-3.5 relative z-10">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  status === 'running'
                    ? 'bg-cyber-cyan/10 border border-cyber-cyan/30 text-white shadow-glow-cyan/10'
                    : status === 'completed'
                    ? 'text-slate-300 bg-white/[0.02]'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                {/* Status Indicator: ✓ (completed), ● (active), ○ (pending) */}
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {status === 'completed' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/80 flex items-center justify-center text-emerald-400">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : status === 'running' ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyber-cyan shadow-glow-cyan" />
                      <div className="absolute w-4 h-4 rounded-full border border-cyber-cyan/60 animate-ping pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-600" />
                  )}
                </div>

                <span className={`text-sm font-medium ${status === 'running' ? 'font-semibold text-cyber-cyan' : ''}`}>
                  {step.label}
                </span>

                {status === 'running' && (
                  <span className="ml-auto text-[10px] font-mono text-cyber-cyan uppercase tracking-wider animate-pulse">
                    En curso...
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error / Retry box */}
        {errorMessage && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <p className="text-sm text-rose-300 mb-3">{errorMessage}</p>
            <div className="flex items-center justify-center gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  REINTENTAR
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg bg-dark-800 text-slate-300 text-xs font-bold hover:bg-dark-700 transition-colors border border-white/10 cursor-pointer"
                >
                  PROBAR OTRO VIDEO
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cancel button during active processing */}
        {!errorMessage && onCancel && (
          <div className="text-center mt-6">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-300 underline font-mono transition-colors cursor-pointer"
            >
              Cancelar y volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
