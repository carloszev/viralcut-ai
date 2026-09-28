import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.action ? 6000 : 3800);
    return () => clearTimeout(timer);
  }, [toast.id, toast.action, onDismiss]);

  const typeConfig = {
    success: {
      border: 'border-emerald-500/40',
      bg: 'bg-dark-950/90',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      accent: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    error: {
      border: 'border-red-500/40',
      bg: 'bg-dark-950/90',
      icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
      accent: 'text-red-400',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    },
    info: {
      border: 'border-cyber-cyan/40',
      bg: 'bg-dark-950/90',
      icon: <Info className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />,
      accent: 'text-cyber-cyan',
      glow: 'shadow-[0_0_20px_rgba(0,240,255,0.15)]',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl transition-all duration-200 animate-toast-enter ${typeConfig.bg} ${typeConfig.border} ${typeConfig.glow}`}
      role="alert"
    >
      {typeConfig.icon}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-xs font-bold leading-tight ${typeConfig.accent}`}>
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.action!.onClick();
            }}
            className="mt-2 px-2.5 py-1 rounded-lg bg-cyber-cyan/20 hover:bg-cyber-cyan text-cyber-cyan hover:text-dark-950 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border border-cyber-cyan/30"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
