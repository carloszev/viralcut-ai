import React, { useState } from 'react';
import { SubtitleConfig, SubtitleSegment, SubtitleStylePreset } from '../../types/index.js';
import { Type, Sparkles, Check, Globe, Smile, Sliders, Palette, Loader2, Plus, Trash2, Clock, Play } from 'lucide-react';
import { api } from '../../services/api.js';

interface SubtitleEditorProps {
  clipId?: string;
  subtitles: SubtitleSegment[];
  subtitleConfig: SubtitleConfig;
  onSubtitlesChange: (subs: SubtitleSegment[]) => void;
  onConfigChange: (config: SubtitleConfig) => void;
  onSeekToTime?: (time: number) => void;
  currentTime?: number;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  clipId,
  subtitles,
  subtitleConfig,
  onSubtitlesChange,
  onConfigChange,
  onSeekToTime,
  currentTime,
}) => {
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [translationSuccess, setTranslationSuccess] = useState<string | null>(null);

  const styles: { id: SubtitleStylePreset; label: string; preview: string; desc: string }[] = [
    { id: 'hormozi', label: 'Hormozi Kinetic', preview: 'PALABRAS IMPACTO', desc: 'Negrita, resaltado oro/cyan y pop animado' },
    { id: 'devinci', label: 'Devinci Bold', preview: 'MOMENTO VIRAL', desc: 'Impact, verde neón y trazo potente' },
    { id: 'clean', label: 'Clean Modern', preview: 'Texto Minimalista', desc: 'Limpio y legible sin recargo' },
    { id: 'cyber', label: 'Cyberpunk Glow', preview: '[SISTEMA ACTIVO]', desc: 'Tipografía tech con resplandor cyan' },
    { id: 'cinema', label: 'Cinematic Minimal', preview: 'Elegancia Clásica', desc: 'Serif sutil con tracking amplio' },
  ];

  const languages = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  const fonts = [
    { id: 'Impact', label: 'Impact / Anton (Hormozi)' },
    { id: 'Montserrat', label: 'Montserrat (Ultra Bold)' },
    { id: 'Inter', label: 'Inter (Modern Clean)' },
    { id: 'Outfit', label: 'Outfit (Futuristic)' },
    { id: 'JetBrains Mono', label: 'JetBrains Mono (Cyber)' },
  ];

  const handleTranslate = async (langCode: string) => {
    if (!clipId || translatingLang) return;
    setTranslatingLang(langCode);
    setTranslationSuccess(null);
    try {
      const res = await api.translateClip(clipId, langCode);
      if (res.success && res.subtitles) {
        onSubtitlesChange(res.subtitles);
        setTranslationSuccess(`¡Subtítulos traducidos a ${res.targetLanguage}!`);
        setTimeout(() => setTranslationSuccess(null), 3500);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleTextChange = (id: string, newText: string) => {
    const updated = subtitles.map((s) => {
      if (s.id !== id) return s;
      const rawWords = newText.trim().split(/\s+/).filter(Boolean);
      const totalWords = rawWords.length;
      const segStart = s.start ?? 0;
      const segEnd = s.end ?? (segStart + 3);
      const segDuration = Math.max(0.2, segEnd - segStart);
      const step = totalWords > 0 ? segDuration / totalWords : 0;

      const words = rawWords.map((w, idx) => {
        const prevWord = s.words?.[idx];
        const isHighlight = prevWord?.word.toLowerCase() === w.toLowerCase() ? prevWord.highlight : false;
        return {
          word: w,
          start: parseFloat((segStart + idx * step).toFixed(2)),
          end: parseFloat((segStart + (idx + 1) * step).toFixed(2)),
          highlight: isHighlight,
        };
      });

      return {
        ...s,
        text: newText,
        words,
      };
    });
    onSubtitlesChange(updated);
  };

  const handleTimeChange = (id: string, field: 'start' | 'end', val: number) => {
    const updated = subtitles.map((s) => {
      if (s.id !== id) return s;
      const currentStart = s.start ?? 0;
      const currentEnd = s.end ?? (currentStart + 3);
      const newStart = field === 'start' ? Math.max(0, val) : currentStart;
      const newEnd = field === 'end' ? Math.max(newStart + 0.2, val) : Math.max(newStart + 0.2, currentEnd);

      const segDuration = Math.max(0.2, newEnd - newStart);
      const wordsCount = s.words?.length || 0;
      const step = wordsCount > 0 ? segDuration / wordsCount : 0;
      const updatedWords = (s.words || []).map((w, idx) => ({
        ...w,
        start: parseFloat((newStart + idx * step).toFixed(2)),
        end: parseFloat((newStart + (idx + 1) * step).toFixed(2)),
      }));

      return {
        ...s,
        start: parseFloat(newStart.toFixed(2)),
        end: parseFloat(newEnd.toFixed(2)),
        words: updatedWords,
      };
    });
    onSubtitlesChange(updated);
  };

  const handleAddSegment = () => {
    const lastSeg = subtitles[subtitles.length - 1];
    const newStart = lastSeg ? parseFloat((lastSeg.end + 0.2).toFixed(2)) : 0;
    const newEnd = parseFloat((newStart + 3.0).toFixed(2));
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}`;
    const defaultText = 'Nuevo subtítulo';
    const words = [
      { word: 'Nuevo', start: newStart, end: parseFloat((newStart + 1.5).toFixed(2)), highlight: true },
      { word: 'subtítulo', start: parseFloat((newStart + 1.5).toFixed(2)), end: newEnd, highlight: false },
    ];

    const newSeg: SubtitleSegment = {
      id: newId,
      start: newStart,
      end: newEnd,
      text: defaultText,
      words,
    };

    onSubtitlesChange([...subtitles, newSeg]);
    if (onSeekToTime) {
      onSeekToTime(newStart);
    }
  };

  const handleDeleteSegment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSubtitlesChange(subtitles.filter((s) => s.id !== id));
  };

  const handleWordToggleHighlight = (segId: string, wordIdx: number) => {
    const updated = subtitles.map((s) => {
      if (s.id === segId && s.words) {
        const words = [...s.words];
        words[wordIdx] = {
          ...words[wordIdx],
          highlight: !words[wordIdx].highlight,
        };
        return { ...s, words };
      }
      return s;
    });
    onSubtitlesChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Subtitles */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-dark-900/80 border border-white/10">
        <div className="flex items-center gap-3">
          <Type className="w-4 h-4 text-cyber-cyan" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Subtítulos Dinámicos e Incrustados
            </p>
            <p className="text-[11px] text-slate-400">
              Subtítulos quemados en el video (hardsubs) con estilo Hormozi o minimalista
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={subtitleConfig.enabled}
            onChange={(e) => onConfigChange({ ...subtitleConfig, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyber-cyan"></div>
        </label>
      </div>

      {subtitleConfig.enabled && (
        <>
          {/* Subtitle Style Presets */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              Estilo Visual de Subtítulos
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {styles.map((st) => {
                const isSelected = subtitleConfig.style === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => onConfigChange({ ...subtitleConfig, style: st.id })}
                    className={`p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-2 border-cyber-cyan text-white shadow-glow-cyan/10'
                        : 'bg-dark-850/70 border border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold">{st.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyber-cyan" />}
                    </div>
                    <p className="text-[11px] font-mono text-cyber-cyan bg-dark-950/80 px-2 py-0.5 rounded inline-block my-1 font-bold">
                      {st.preview}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{st.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Subtitle Multi-Language Translation (Feature 6) */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyber-cyan" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Traducción Multi-idioma con IA
                </span>
              </div>
              {translationSuccess && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold animate-pulse">
                  {translationSuccess}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Traduce los subtítulos manteniendo las marcas de tiempo exactas por palabra para audiencias internacionales.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  disabled={translatingLang !== null}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                    translatingLang === lang.code
                      ? 'bg-cyber-cyan text-dark-950 border-cyber-cyan'
                      : 'bg-dark-800 border-white/10 text-slate-300 hover:text-white hover:border-cyber-cyan/40'
                  }`}
                >
                  {translatingLang === lang.code ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>{lang.flag}</span>
                  )}
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Subtitle Preset Designer (Feature 10 & 3) */}
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-cyan" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Personalizador Tipográfico y Emojis
              </span>
            </div>

            {/* Font Family and Words per line */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                  Tipografía
                </label>
                <select
                  value={subtitleConfig.fontFamily || 'Montserrat'}
                  onChange={(e) => onConfigChange({ ...subtitleConfig, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-cyan cursor-pointer"
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id} className="bg-dark-900 text-white">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                  Palabras por Línea
                </label>
                <select
                  value={subtitleConfig.maxWordsPerLine || 3}
                  onChange={(e) => onConfigChange({ ...subtitleConfig, maxWordsPerLine: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-cyan cursor-pointer"
                >
                  <option value={1} className="bg-dark-900 text-white">1 Palabra (Ultra-Punchy)</option>
                  <option value={3} className="bg-dark-900 text-white">2-3 Palabras (Hormozi Viral)</option>
                  <option value={6} className="bg-dark-900 text-white">5-6 Palabras (Frase Continua)</option>
                </select>
              </div>
            </div>

            {/* Position and Font Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-2">
                  Posición Vertical
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-dark-800 p-1 rounded-xl">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => onConfigChange({ ...subtitleConfig, position: pos })}
                      className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all cursor-pointer ${
                        subtitleConfig.position === pos
                          ? 'bg-cyber-cyan text-dark-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos === 'top' ? 'Arriba' : pos === 'center' ? 'Centro' : 'Abajo'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>Tamaño de fuente</span>
                  <span className="text-cyber-cyan font-bold">{subtitleConfig.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="46"
                  value={subtitleConfig.fontSize}
                  onChange={(e) =>
                    onConfigChange({ ...subtitleConfig, fontSize: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Colors and Stroke */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Color Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.textColor}
                    onChange={(e) => onConfigChange({ ...subtitleConfig, textColor: e.target.value })}
                    className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-300">{subtitleConfig.textColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Resaltado Clave
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.highlightColor}
                    onChange={(e) => onConfigChange({ ...subtitleConfig, highlightColor: e.target.value })}
                    className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-300">{subtitleConfig.highlightColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  Borde / Trazo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.strokeColor || '#000000'}
                    onChange={(e) => onConfigChange({ ...subtitleConfig, strokeColor: e.target.value })}
                    className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-300">{subtitleConfig.strokeColor || '#000000'}</span>
                </div>
              </div>
            </div>

            {/* Emojis & Uppercase toggles */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-200">Emojis Automáticos en Palabras Clave</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleConfig.autoEmojis !== false}
                  onChange={(e) => onConfigChange({ ...subtitleConfig, autoEmojis: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-cyan"></div>
              </label>
            </div>
          </div>

          {/* Transcript Lines Editor */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Segmentos de Subtítulo ({subtitles.length})
              </label>
              <button
                type="button"
                onClick={handleAddSegment}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/30 text-cyber-cyan text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Subtítulo</span>
              </button>
            </div>

            <div className="space-y-3">
              {subtitles.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-dark-900/40">
                  <Type className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 mb-2">No hay subtítulos en este segmento</p>
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="px-3 py-1.5 rounded-xl bg-cyber-cyan text-dark-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Subtítulo</span>
                  </button>
                </div>
              ) : (
                subtitles.map((sub, idx) => {
                  const isActive =
                    currentTime !== undefined &&
                    currentTime >= sub.start &&
                    currentTime <= sub.end;

                  return (
                    <div
                      key={sub.id || idx}
                      onClick={() => onSeekToTime?.(sub.start)}
                      className={`p-3 rounded-xl border transition-all space-y-2 cursor-pointer ${
                        isActive
                          ? 'bg-dark-800/90 border-cyber-cyan/60 shadow-glow-cyan/10'
                          : 'bg-dark-850/80 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Segment Header: Timing and Actions */}
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeekToTime?.(sub.start);
                            }}
                            className={`p-1 rounded-md flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-cyber-cyan text-dark-950 font-bold'
                                : 'bg-dark-750 text-slate-400 hover:text-white hover:bg-dark-700'
                            }`}
                            title="Saltar a este momento en el video"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </button>
                          <span className="font-bold text-slate-300">
                            #{idx + 1}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-cyber-cyan/20 border border-cyber-cyan/40 text-cyber-cyan font-bold text-[9px] uppercase tracking-wider">
                              Reproduciendo
                            </span>
                          )}
                        </div>

                        {/* Timing controls */}
                        <div
                          className="flex items-center gap-1 text-slate-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-400">De:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={sub.start}
                            onChange={(e) =>
                              handleTimeChange(sub.id, 'start', parseFloat(e.target.value) || 0)
                            }
                            className="w-13 px-1 py-0.5 rounded bg-dark-900 border border-white/10 text-[10px] font-mono text-center text-slate-200 focus:outline-none focus:border-cyber-cyan"
                          />
                          <span className="text-[10px] text-slate-400">s - A:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={sub.end}
                            onChange={(e) =>
                              handleTimeChange(sub.id, 'end', parseFloat(e.target.value) || 0)
                            }
                            className="w-13 px-1 py-0.5 rounded bg-dark-900 border border-white/10 text-[10px] font-mono text-center text-slate-200 focus:outline-none focus:border-cyber-cyan"
                          />
                          <span className="text-[10px] text-slate-400">s</span>

                          {/* Delete Segment */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSegment(sub.id, e)}
                            className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar este subtítulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Word Chips */}
                      {sub.words && sub.words.length > 0 && (
                        <div
                          className="flex flex-wrap gap-1.5 py-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sub.words.map((w, wIdx) => (
                            <span
                              key={wIdx}
                              onClick={() => handleWordToggleHighlight(sub.id, wIdx)}
                              className={`text-[11px] px-2 py-0.5 rounded-lg cursor-pointer transition-all select-none ${
                                w.highlight
                                  ? 'bg-cyber-cyan text-dark-950 font-black shadow-glow-cyan/30 scale-105'
                                  : 'bg-dark-750/90 text-slate-300 hover:bg-dark-700 hover:text-white'
                              }`}
                              title="Haz clic para resaltar/desresaltar esta palabra clave"
                            >
                              {w.word}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Main Editable Text Input */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={sub.text}
                          onFocus={() => onSeekToTime?.(sub.start)}
                          onChange={(e) => handleTextChange(sub.id, e.target.value)}
                          placeholder="Texto del subtítulo..."
                          className="w-full px-3 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
