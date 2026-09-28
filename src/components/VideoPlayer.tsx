import React, { useRef, useState, useEffect } from 'react';
import { Clip, VideoInfo } from '../types/index.js';
import { Play, Pause, Volume2, VolumeX, RotateCcw, AlertTriangle, RefreshCw, Shield, Sparkles, Heart, MessageCircle, Share2, Music, MoveHorizontal, Flame, Zap } from 'lucide-react';
import { formatTime } from '../utils/formatters.js';

interface VideoPlayerProps {
  clip: Clip;
  videoInfo: VideoInfo;
  autoPlay?: boolean;
  className?: string;
  showControls?: boolean;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  enableDragReframe?: boolean;
  onOffsetChange?: (offset: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clip,
  videoInfo,
  autoPlay = false,
  className = '',
  showControls = true,
  currentTime: externalTime,
  onTimeUpdate,
  enableDragReframe = false,
  onOffsetChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [currentLocalTime, setCurrentLocalTime] = useState(clip.startTime);
  const [hasError, setHasError] = useState(false);
  const [safeZoneMode, setSafeZoneMode] = useState<'off' | 'tiktok' | 'reels' | 'shorts'>('off');

  // Interactive Drag-to-Reframe state
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragMovedRef = useRef<boolean>(false);
  const initialOffsetRef = useRef<number>(clip.reframeConfig?.horizontalOffsetPercent || 0);
  const [dragOffsetPreview, setDragOffsetPreview] = useState<number | null>(null);

  const isExported = clip.exportStatus === 'completed' && !!clip.exportedUrl;

  const handlePointerDown = (clientX: number, target: EventTarget | null) => {
    if (!enableDragReframe || clip.aspectRatio !== '9:16' || isExported) return;
    if ((target as HTMLElement)?.closest('button, input, [role="button"], a, iframe')) return;

    setIsDragging(true);
    dragMovedRef.current = false;
    dragStartXRef.current = clientX;
    initialOffsetRef.current = clip.reframeConfig?.horizontalOffsetPercent || 0;
    setDragOffsetPreview(initialOffsetRef.current);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const deltaX = clientX - dragStartXRef.current;
    if (Math.abs(deltaX) > 4) {
      dragMovedRef.current = true;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 320;
    // Moving pointer to the right shifts the camera frame to the right (+offset)
    const deltaPercent = (deltaX / width) * 70;
    const nextOffset = Math.max(-45, Math.min(45, Math.round(initialOffsetRef.current + deltaPercent)));
    setDragOffsetPreview(nextOffset);
    if (onOffsetChange) {
      onOffsetChange(nextOffset);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffsetPreview(null);
    }
  };
  const isSample = Boolean(videoInfo.videoId && videoInfo.videoId.startsWith('sample_'));
  const isYouTube = Boolean(
    videoInfo.videoId &&
    !isSample &&
    (/^[a-zA-Z0-9_-]{11}$/.test(videoInfo.videoId) || (videoInfo.url && videoInfo.url.includes('youtube')))
  );

  // A local MP4 is considered available ONLY if videoSourceUrl explicitly points to an uploaded file or is a verified sample
  const hasLocalMp4 = Boolean(
    (videoInfo.videoSourceUrl && videoInfo.videoSourceUrl.startsWith('/uploads/') && !videoInfo.videoSourceUrl.includes('sample_base.mp4')) ||
    isSample
  );

  const localUploadedFile = hasLocalMp4
    ? (isSample ? '/uploads/sample_base.mp4' : videoInfo.videoSourceUrl!)
    : (videoInfo.videoSourceUrl && videoInfo.videoSourceUrl.startsWith('/uploads/') ? videoInfo.videoSourceUrl : '');

  // Video source for HTML5 video element (local MP4 or exported clip)
  const videoSrc = isExported 
    ? (clip.exportedUrl || '') 
    : (localUploadedFile || (isSample ? '/uploads/sample_base.mp4' : ''));
  const posterUrl = clip.thumbnailUrl || videoInfo.thumbnailUrl;

  // Auto-reset error state when changing clips or video sources
  useEffect(() => {
    setHasError(false);
  }, [clip.id, clip.exportedUrl, videoInfo.videoSourceUrl]);

  const startSec = isExported ? 0 : Math.max(0, clip.startTime);
  const endSec = isExported ? Math.max(0.1, clip.duration) : Math.max(startSec + 1, clip.endTime);
  const duration = Math.max(0.1, endSec - startSec);

  const pendingSeekRef = useRef<number | null>(startSec);

  const seekTo = (target: number) => {
    setCurrentLocalTime(target);
    if (videoRef.current) {
      try {
        const dur = videoRef.current.duration;
        const validTime = (dur && !isNaN(dur) && dur > 0) ? Math.min(target, Math.max(0, dur - 0.1)) : target;
        videoRef.current.currentTime = validTime;
      } catch (_) {}
    }
  };

  // Sync external time only if paused (scrubbing/timeline drag) or on major timeline jump (> 1.2s)
  useEffect(() => {
    if (externalTime !== undefined && videoRef.current) {
      const isPaused = videoRef.current.paused;
      const diff = Math.abs(videoRef.current.currentTime - externalTime);
      if (isPaused ? diff > 0.05 : diff > 1.2) {
        seekTo(externalTime);
      }
    }
  }, [externalTime]);

  // Ensure current local time is clamped when clip boundaries change
  useEffect(() => {
    if (currentLocalTime < startSec || currentLocalTime > endSec) {
      seekTo(startSec);
    }
  }, [startSec, endSec]);

  // Seek to clip start time on mount / clip change
  useEffect(() => {
    pendingSeekRef.current = startSec;
    seekTo(startSec);
  }, [clip.id, startSec, isExported]);

  // Clean unmount release
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (_) {}
      }
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      if (cur < startSec || cur >= endSec || (dur && dur > 0 && cur >= dur - 0.2)) {
        seekTo(startSec);
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback autoplay blocked or interrupted:', e);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;

    // Loop smoothly within clip boundaries or if approaching physical EOF
    const dur = videoRef.current.duration;
    if (current >= endSec || (dur && dur > 0 && current >= dur - 0.1)) {
      seekTo(startSec);
      if (onTimeUpdate) onTimeUpdate(startSec);
      return;
    }

    setCurrentLocalTime(current);
    if (onTimeUpdate) onTimeUpdate(current);
  };

  // Reframe offset style calculation with interactive drag, Smart Punch-In zoom, and Hook Booster (0-2.5s)
  const elapsed = Math.max(0, currentLocalTime - startSec);
  const cycleTime = elapsed % 12;
  const isHookSnap = Boolean(clip.hookBooster && clip.aspectRatio === '9:16' && elapsed < 2.5);
  const hookScale = isHookSnap ? (1.25 - 0.10 * elapsed) : 1.0;
  const isPunchIn = Boolean(clip.punchInZoom && clip.aspectRatio === '9:16' && !isHookSnap && cycleTime >= 4 && cycleTime < 8);
  const punchScale = isPunchIn ? 1.18 : 1.0;
  const dynamicZoom = Math.max(hookScale, punchScale);

  const getReframeStyle = () => {
    if (isExported) {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        imageRendering: '-webkit-optimize-contrast' as const,
      };
    }

    const { mode, horizontalOffsetPercent, scaleFactor, activeSpeakerTracking } = clip.reframeConfig;
    const aspect = clip.aspectRatio;

    if (aspect === '16:9') {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        imageRendering: '-webkit-optimize-contrast' as const,
      };
    }

    // Dynamic speaker follow motion simulation
    const trackingPan = (mode === 'auto' && activeSpeakerTracking) ? Math.sin(elapsed * 0.5) * 4 : 0;
    const effectiveOffset = dragOffsetPreview !== null ? dragOffsetPreview : horizontalOffsetPercent;
    const totalOffset = effectiveOffset + trackingPan;
    const baseScale = Math.max(1.0, scaleFactor || 1.0);
    const finalScale = baseScale * dynamicZoom;

    // In a 9:16 vertical box, objectFit: 'cover' naturally fills the vertical height and crops horizontal sides
    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transform: `scale(${finalScale}) translateX(${totalOffset * -0.5}%)`,
      transition: isDragging || isPlaying ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
      willChange: 'transform',
      imageRendering: '-webkit-optimize-contrast' as const,
    };
  };

  // Safe Zones Overlay
  const renderSafeZones = () => {
    if (safeZoneMode === 'off') return null;

    return (
      <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
        {/* Right rail icons */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3.5 opacity-70">
          <div className="w-8 h-8 rounded-full border-2 border-white/60 bg-black/40 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">UI</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-[8px] text-white/80 font-mono">124k</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-[8px] text-white/80 font-mono">1.8k</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-[8px] text-white/80 font-mono">Share</span>
          </div>
          <div className="w-6 h-6 rounded-full bg-dark-900 border border-white/40 flex items-center justify-center animate-spin">
            <Music className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Bottom description danger zone */}
        <div className="absolute left-3 right-14 bottom-3 space-y-1 opacity-70">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white">@viralcut_ai</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/80 text-white font-bold uppercase tracking-wider">
              {safeZoneMode} UI
            </span>
          </div>
          <div className="text-[9px] text-white/80 line-clamp-2 font-sans">
            Zona de título, pie de video y hashtags en {safeZoneMode.toUpperCase()}
          </div>
        </div>

        {/* Top bar zone */}
        <div className="absolute top-2 left-0 right-0 flex justify-center gap-4 text-[10px] font-bold text-white/70">
          <span className="border-b-2 border-white pb-0.5">Para ti</span>
          <span className="opacity-60">Siguiendo</span>
        </div>

        {/* Safe boundary lines (green = safe, red = danger) */}
        <div className="absolute inset-x-3 top-10 bottom-24 border border-dashed border-cyber-cyan/50 rounded-lg pointer-events-none">
          <span className="absolute top-1 left-2 text-[8px] font-mono text-cyber-cyan/80 bg-black/60 px-1 rounded">
            ZONA SEGURA {safeZoneMode.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  const progressPercent = Math.max(0, Math.min(100, ((currentLocalTime - startSec) / duration) * 100));

  const handleRetryVideo = () => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.target)}
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handlePointerDown(e.touches[0].clientX, e.target);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX);
        }
      }}
      onTouchEnd={handlePointerUp}
      className={`relative bg-dark-950 rounded-2xl overflow-hidden group shadow-2xl select-none ${
        enableDragReframe && clip.aspectRatio === '9:16' && !isExported
          ? isDragging ? 'cursor-grabbing' : 'cursor-grab'
          : ''
      } ${className}`}
    >
      {/* Hook Booster Opening Alert & Retention Overlay (First 2.8s) */}
      {clip.hookBooster && clip.aspectRatio === '9:16' && elapsed < 2.8 && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none animate-pulse">
          <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-mono font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>HOOK 3s ({Math.max(0, 2.5 - elapsed).toFixed(1)}s)</span>
          </div>
        </div>
      )}

      {/* Smart Punch-In Indicator Badge */}
      {clip.punchInZoom && clip.aspectRatio === '9:16' && isPunchIn && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none animate-pulse">
          <div className="px-2 py-0.5 rounded-full bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan text-[10px] font-mono font-bold shadow-glow-cyan backdrop-blur-md">
            ⚡ PUNCH-IN 1.18x
          </div>
        </div>
      )}

      {/* Interactive Reframe Drag HUD */}
      {enableDragReframe && clip.aspectRatio === '9:16' && !isExported && (
        <>
          {isDragging ? (
            <div className="absolute top-3 inset-x-0 flex items-center justify-center z-35 pointer-events-none animate-fade-in">
              <div className="px-3.5 py-1 rounded-full bg-dark-950/90 border border-cyber-cyan text-cyber-cyan text-xs font-mono font-bold shadow-glow-cyan flex items-center gap-2 backdrop-blur-md">
                <MoveHorizontal className="w-3.5 h-3.5 animate-pulse" />
                <span>ENCUADRE: {(dragOffsetPreview ?? clip.reframeConfig?.horizontalOffsetPercent) > 0 ? '+' : ''}{dragOffsetPreview ?? clip.reframeConfig?.horizontalOffsetPercent}%</span>
              </div>
            </div>
          ) : (
            <div className="absolute top-3 left-3 z-25 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                <MoveHorizontal className="w-3 h-3 text-cyber-cyan" />
                <span>Arrastrá para encuadrar</span>
              </div>
            </div>
          )}

          {/* Centering crosshairs while dragging */}
          {isDragging && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <div className="w-0.5 h-full bg-cyber-cyan/40 border-l border-dashed border-cyber-cyan/60" />
              <div className="absolute w-full h-0.5 bg-cyber-cyan/20" />
              <div className="absolute w-28 h-28 rounded-full border border-dashed border-cyber-cyan/50" />
            </div>
          )}
        </>
      )}

      {/* Video Stream */}
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-dark-950/90 backdrop-blur-md text-slate-400 relative z-10">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-xs font-semibold text-slate-200 mb-1">Stream de video en proceso</p>
          <p className="text-[10px] text-slate-400 mb-3">Sincronizando el archivo de video de alta definición local...</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetryVideo}
              className="px-3 py-1.5 rounded-lg bg-cyber-cyan text-dark-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-cyan-300 transition-colors shadow-lg shadow-cyber-cyan/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      ) : !videoSrc ? (
        <div className="w-full h-full relative z-10 bg-dark-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {posterUrl && (
            <img 
              src={posterUrl} 
              alt="Preview" 
              className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-105 pointer-events-none" 
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(6,182,212,0.25)] animate-pulse">
              <Sparkles className="w-6 h-6 text-cyber-cyan" />
            </div>
            <p className="text-xs text-white font-semibold mb-1">Procesando Clip 9:16</p>
            <p className="text-[10px] text-slate-400 font-mono">Sincronizando video local sin marcas de agua...</p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterUrl}
          preload="metadata"
          className="w-full h-full relative z-10 bg-black"
          style={getReframeStyle()}
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={() => {
            if (dragMovedRef.current) {
              dragMovedRef.current = false;
              return;
            }
            togglePlay();
          }}
          onError={() => {
            console.warn('[VideoPlayer] Error al cargar fuente de video:', videoSrc);
            setHasError(true);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              const target = pendingSeekRef.current !== null ? pendingSeekRef.current : startSec;
              const safeTime = (dur && !isNaN(dur) && dur > 0) ? Math.min(target, Math.max(0, dur - 0.1)) : target;
              videoRef.current.currentTime = safeTime;
              setCurrentLocalTime(safeTime);
              pendingSeekRef.current = null;
            }
          }}
          onCanPlay={() => {
            if (videoRef.current && videoRef.current.paused) {
              const cur = videoRef.current.currentTime;
              if (cur < startSec || cur >= endSec) {
                const dur = videoRef.current.duration;
                const safeTime = (dur && !isNaN(dur) && dur > 0) ? Math.min(startSec, Math.max(0, dur - 0.1)) : startSec;
                videoRef.current.currentTime = safeTime;
                setCurrentLocalTime(safeTime);
              }
            }
          }}
          onEnded={() => {
            seekTo(startSec);
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
          onPlay={(e) => {
            setIsPlaying(true);
            document.querySelectorAll('video').forEach((v) => {
              if (v !== e.currentTarget && !v.paused) {
                v.pause();
              }
            });
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
        />
      )}

      {/* Safe Zones Overlay */}
      {renderSafeZones()}

      {/* Live AI Potentiators Dynamic Badges */}
      {!hasError && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none flex flex-col gap-1.5 items-start">
          {isHookSnap && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-dark-950 font-black text-[9px] font-mono tracking-wider shadow-lg animate-pulse border border-amber-300">
              <Flame className="w-3 h-3 fill-current" />
              <span>HOOK BOOSTER (1.25x)</span>
            </div>
          )}
          {isPunchIn && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyber-cyan text-dark-950 font-black text-[9px] font-mono tracking-wider shadow-lg animate-pulse border border-cyan-300">
              <Zap className="w-3 h-3 fill-current" />
              <span>PUNCH-IN ZOOM (1.18x)</span>
            </div>
          )}
        </div>
      )}

      {/* Play/Pause Overlay Clicker */}
      {!hasError && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (dragMovedRef.current) {
              dragMovedRef.current = false;
              return;
            }
            togglePlay();
          }}
          className={`absolute inset-0 flex items-center justify-center bg-black/25 z-10 transition-opacity duration-200 cursor-pointer ${
            !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-dark-900/90 border border-white/25 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:border-cyber-cyan pointer-events-auto">
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      {showControls && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-dark-950/95 via-dark-950/60 to-transparent z-30 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Progress timeline bar with scrubbing */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const seekTarget = parseFloat((startSec + ratio * duration).toFixed(2));
              if (videoRef.current) {
                const dur = videoRef.current.duration;
                const safeTime = (dur && dur > 0 && seekTarget >= dur) ? (seekTarget % dur) : seekTarget;
                videoRef.current.currentTime = safeTime;
              }
              setCurrentLocalTime(seekTarget);
              if (onTimeUpdate) onTimeUpdate(seekTarget);
            }}
            className="w-full h-1.5 hover:h-2.5 bg-white/20 hover:bg-white/30 rounded-full mb-2 cursor-pointer overflow-hidden relative transition-all"
            title="Haz clic para avanzar o retroceder el clip"
          >
            <div
              className="h-full bg-cyber-cyan shadow-glow-cyan transition-all duration-75 rounded-full pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <button 
                onClick={togglePlay}
                className="hover:text-cyber-cyan transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button 
                onClick={toggleMute}
                className="hover:text-cyber-cyan transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyber-cyan" />}
              </button>

              <span>{formatTime(currentLocalTime - startSec)} / {formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Safe Zone Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSafeZoneMode(prev => 
                    prev === 'off' ? 'tiktok' :
                    prev === 'tiktok' ? 'reels' :
                    prev === 'reels' ? 'shorts' : 'off'
                  );
                }}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                  safeZoneMode !== 'off' 
                    ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan font-bold shadow-glow-cyan/20' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Alternar guía de Zonas Seguras (Safe Zones para TikTok, Reels, Shorts)"
              >
                <Shield className="w-2.5 h-2.5" />
                <span>{safeZoneMode === 'off' ? 'ZONAS' : safeZoneMode.toUpperCase()}</span>
              </button>

              <div className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">
                {clip.aspectRatio}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
