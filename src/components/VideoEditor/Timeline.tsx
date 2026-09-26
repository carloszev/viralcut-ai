import React, { useRef } from 'react';
import { Clip } from '../../types/index.js';
import { formatTimeWithMs, formatTime } from '../../utils/formatters.js';
import { Scissors } from 'lucide-react';

interface TimelineProps {
  clip: Clip;
  totalVideoDuration: number;
  currentTime: number;
  onTimeSeek: (time: number) => void;
  onRangeChange: (start: number, end: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clip,
  totalVideoDuration,
  currentTime,
  onTimeSeek,
  onRangeChange,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const startSec = Math.max(0, clip.startTime);
  const endSec = Math.max(startSec + 1, clip.endTime);
  const duration = Math.max(0.1, endSec - startSec);
  const maxDuration = Math.max(10, totalVideoDuration || 0, endSec + 10);

  // Percent conversions
  const startPercent = Math.min(100, Math.max(0, (startSec / maxDuration) * 100));
  const endPercent = Math.min(100, Math.max(0, (endSec / maxDuration) * 100));
  const currentPercent = Math.min(100, Math.max(0, (currentTime / maxDuration) * 100));

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = parseFloat((ratio * maxDuration).toFixed(2));
    onTimeSeek(seekTime);
  };

  const handleStartChange = (valStr: string) => {
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) return;
    const validStart = Math.max(0, Math.min(parsed, endSec - 3));
    onRangeChange(parseFloat(validStart.toFixed(1)), endSec);
  };

  const handleEndChange = (valStr: string) => {
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) return;
    const validEnd = Math.max(startSec + 3, Math.min(parsed, maxDuration));
    onRangeChange(startSec, parseFloat(validEnd.toFixed(1)));
  };

  return (
    <div className="space-y-3 bg-dark-900/90 rounded-2xl p-4 border border-white/10">
      {/* Timecode Indicators */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Inicio:</span>
          <input
            type="number"
            step="0.5"
            value={startSec}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-16 px-2 py-1 rounded bg-dark-800 border border-white/10 text-cyber-cyan font-bold text-center focus:outline-none focus:border-cyber-cyan"
          />
          <span className="text-slate-400">({formatTime(startSec)})</span>
        </div>

        <div className="px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold text-xs">
          Duración: {formatTime(duration)} ({duration.toFixed(1)}s)
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Final:</span>
          <input
            type="number"
            step="0.5"
            value={endSec}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-16 px-2 py-1 rounded bg-dark-800 border border-white/10 text-cyber-cyan font-bold text-center focus:outline-none focus:border-cyber-cyan"
          />
          <span className="text-slate-400">({formatTime(endSec)})</span>
        </div>
      </div>

      {/* Visual Timeline Track with waveform and trim handles */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative h-16 rounded-xl bg-dark-950 border border-white/10 cursor-pointer overflow-hidden select-none"
      >
        {/* Synthetic Audio Waveform Graphic */}
        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
          {Array.from({ length: 70 }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.5) * 45 + ((i % 3) * 15);
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-slate-400"
                style={{ height: `${Math.min(90, Math.max(15, h))}%` }}
              />
            );
          })}
        </div>

        {/* Active Range Highlight */}
        <div
          className="absolute top-0 bottom-0 bg-cyber-cyan/20 border-x-2 border-cyber-cyan backdrop-blur-[2px] transition-all"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(1, endPercent - startPercent)}%`,
          }}
        >
          {/* Subtitle markers inside range */}
          {clip.subtitles && clip.subtitles.map((sub, idx) => {
            const subLeft = ((sub.start - startSec) / duration) * 100;
            const subWidth = ((sub.end - sub.start) / duration) * 100;
            return (
              <div
                key={idx}
                className="absolute bottom-1 h-2 rounded bg-cyber-cyan/60 border border-white/20"
                style={{
                  left: `${Math.max(0, subLeft)}%`,
                  width: `${Math.max(1, subWidth)}%`,
                }}
                title={sub.text}
              />
            );
          })}
        </div>

        {/* Current Playhead Scrubber */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_white] z-30 pointer-events-none"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="w-2.5 h-2.5 -ml-1 -mt-1 bg-white rounded-full shadow" />
        </div>
      </div>

      {/* Helper info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Scissors className="w-3 h-3 text-cyber-cyan" />
          Haz clic o ajusta las marcas de tiempo para recortar el clip
        </span>
        <span>Posición actual: {formatTimeWithMs(currentTime)}</span>
      </div>
    </div>
  );
};
