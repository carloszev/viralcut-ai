import React, { useState } from 'react';
import { ClipMetadata } from '../../types/index.js';
import { Copy, Check, Hash, FileText, Sparkles, MessageSquare } from 'lucide-react';

interface MetadataPanelProps {
  metadata: ClipMetadata;
  onMetadataChange: (metadata: ClipMetadata) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  metadata,
  onMetadataChange,
}) => {
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleCopyHashtags = () => {
    navigator.clipboard.writeText(metadata.hashtags.join(' '));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const formatted = newTag.trim().startsWith('#') ? newTag.trim() : `#${newTag.trim()}`;
      if (!metadata.hashtags.includes(formatted)) {
        onMetadataChange({
          ...metadata,
          hashtags: [...metadata.hashtags, formatted],
        });
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onMetadataChange({
      ...metadata,
      hashtags: metadata.hashtags.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div className="space-y-5">
      {/* Hook Section */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
          Hook / Gancho Inicial (Primeros 3 segundos)
        </label>
        <textarea
          rows={2}
          value={metadata.hook}
          onChange={(e) => onMetadataChange({ ...metadata, hook: e.target.value })}
          placeholder="Frase de impacto inicial para capturar retención..."
          className="w-full p-3 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyber-cyan font-serif"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-cyber-cyan" />
          Título Llamativo
        </label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => onMetadataChange({ ...metadata, title: e.target.value })}
          placeholder="Título del clip para Shorts / Reels / TikTok..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan font-display"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-cyber-cyan" />
          Descripción del Contenido
        </label>
        <textarea
          rows={3}
          value={metadata.description}
          onChange={(e) => onMetadataChange({ ...metadata, description: e.target.value })}
          placeholder="Descripción optimizada..."
          className="w-full p-3 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyber-cyan"
        />
      </div>

      {/* Hashtags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-cyber-cyan" />
            Hashtags Estratégicos
          </label>
          <button
            onClick={handleCopyHashtags}
            className="text-[11px] font-mono text-cyber-cyan hover:underline flex items-center gap-1 cursor-pointer"
          >
            {copiedHashtags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedHashtags ? 'Copiados!' : 'Copiar todos'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-dark-900 border border-white/10 mb-2 min-h-[42px]">
          {metadata.hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 text-cyber-cyan text-xs font-mono border border-cyber-cyan/30"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Escribe un hashtag y presiona Enter para agregar..."
          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyber-cyan font-mono"
        />
      </div>
    </div>
  );
};
