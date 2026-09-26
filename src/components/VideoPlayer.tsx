import React, { useRef, useState, useEffect } from 'react';
import { Clip, VideoInfo } from '../types/index.js';
import { Play, Pause, Volume2, VolumeX, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatTime } from '../utils/formatters.js';

interface VideoPlayerProps {
  clip: Clip;
  videoInfo: VideoInfo;
  autoPlay?: boolean;
  className?: string;
  showControls?: boolean;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clip,
  videoInfo,
  autoPlay = false,
  className = '',
  showControls = true,
  currentTime: externalTime,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [currentLocalTime, setCurrentLocalTime] = useState(clip.startTime);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [hasError, setHasError] = useState(false);

  const isExported = clip.exportStatus === 'completed' && !!clip.exportedUrl;
  const videoSrc = isExported ? clip.exportedUrl! : (videoInfo.videoSourceUrl || '/uploads/sample_base.mp4');
  const posterUrl = clip.thumbnailUrl || videoInfo.thumbnailUrl;

  const startSec = isExported ? 0 : Math.max(0, clip.startTime);
  const endSec = isExported ? Math.max(0.1, clip.duration) : Math.max(startSec + 1, clip.endTime);
  const duration = Math.max(0.1, endSec - startSec);

  // Sync external time if provided
  useEffect(() => {
    if (externalTime !== undefined && videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - externalTime) > 0.3) {
        videoRef.current.currentTime = externalTime;
      }
    }
  }, [externalTime]);

  // Ensure current local time is clamped when clip boundaries change
  useEffect(() => {
    if (currentLocalTime < startSec || currentLocalTime > endSec) {
      setCurrentLocalTime(startSec);
      if (videoRef.current) {
        const dur = videoRef.current.duration;
        const safeTime = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
        videoRef.current.currentTime = safeTime;
      }
    }
  }, [startSec, endSec]);

  // Seek to clip start time on mount / clip change
  useEffect(() => {
    setCurrentLocalTime(startSec);
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      const targetTime = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
      try {
        videoRef.current.currentTime = targetTime;
      } catch (_) {}
    }
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
        const safeStart = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
        videoRef.current.currentTime = safeStart;
        setCurrentLocalTime(safeStart);
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

    // Loop within clip boundaries or if approaching physical EOF
    const dur = videoRef.current.duration;
    if (current >= endSec || current < startSec || (dur && dur > 0 && current >= dur - 0.25)) {
      const safeStart = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
      videoRef.current.currentTime = safeStart;
      setCurrentLocalTime(safeStart);
      if (onTimeUpdate) onTimeUpdate(safeStart);
      return;
    }

    setCurrentLocalTime(current);
    if (onTimeUpdate) onTimeUpdate(current);

    // Find active subtitle
    if (clip.subtitles && clip.subtitleConfig.enabled) {
      const currentSub = clip.subtitles.find(
        (s) => current >= s.start && current <= s.end
      );
      if (currentSub) {
        setActiveSubtitle(currentSub.text);
        if (currentSub.words && currentSub.words.length > 0) {
          const wIdx = currentSub.words.findIndex(
            (w) => current >= w.start && current <= w.end
          );
          setActiveWordIndex(wIdx >= 0 ? wIdx : 0);
        } else {
          setActiveWordIndex(-1);
        }
      } else {
        setActiveSubtitle('');
        setActiveWordIndex(-1);
      }
    }
  };

  // Reframe offset style calculation
  const getReframeStyle = () => {
    if (isExported) {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
      };
    }

    const { mode, horizontalOffsetPercent, scaleFactor, activeSpeakerTracking } = clip.reframeConfig;
    const aspect = clip.aspectRatio;

    if (aspect === '16:9') {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
      };
    }

    // Dynamic speaker follow motion simulation
    const elapsed = currentLocalTime - startSec;
    const trackingPan = (mode === 'auto' && activeSpeakerTracking) ? Math.sin(elapsed * 0.5) * 4 : 0;
    const totalOffset = horizontalOffsetPercent + trackingPan;
    const scale = Math.max(1.0, scaleFactor || 1.0);

    // In a 9:16 vertical box, objectFit: 'cover' naturally fills the vertical height and crops horizontal sides
    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transform: `scale(${scale}) translateX(${totalOffset * -0.5}%)`,
      transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
    };
  };

  // Subtitles disabled per user preference
  const renderSubtitles = () => {
    return null;
  };

  const progressPercent = Math.max(0, Math.min(100, ((currentLocalTime - startSec) / duration) * 100));

  const handleRetryVideo = () => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className={`relative bg-dark-950 rounded-2xl overflow-hidden group shadow-2xl ${className}`}>
      {/* Video Stream */}
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-dark-950/90 backdrop-blur-md text-slate-400 relative z-10">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-xs font-semibold text-slate-200 mb-1">Stream de video no disponible</p>
          <p className="text-[10px] text-slate-400 mb-3">No se pudo cargar el archivo de video.</p>
          <button
            onClick={handleRetryVideo}
            className="px-3 py-1.5 rounded-lg bg-cyber-cyan text-dark-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
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
          onClick={togglePlay}
          onError={() => {
            console.warn('[VideoPlayer] Error al cargar fuente de video:', videoSrc);
            setHasError(true);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              const safeTime = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
              videoRef.current.currentTime = safeTime;
              setCurrentLocalTime(safeTime);
            }
          }}
          onCanPlay={() => {
            if (videoRef.current) {
              const cur = videoRef.current.currentTime;
              if (cur < startSec || cur >= endSec) {
                const dur = videoRef.current.duration;
                const safeTime = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
                videoRef.current.currentTime = safeTime;
                setCurrentLocalTime(safeTime);
              }
            }
          }}
          onEnded={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              const safeStart = (dur && dur > 0 && startSec >= dur) ? (startSec % dur) : startSec;
              videoRef.current.currentTime = safeStart;
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

      {/* Subtitle Overlay */}
      {!hasError && renderSubtitles()}

      {/* Play/Pause Overlay Clicker */}
      {!hasError && (
        <div 
          onClick={togglePlay}
          className={`absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer z-10 transition-opacity duration-200 ${
            !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-dark-900/90 border border-white/25 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:border-cyber-cyan">
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      {showControls && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-dark-950/95 via-dark-950/60 to-transparent z-30 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Progress timeline bar */}
          <div className="w-full h-1.5 bg-white/20 hover:h-2 rounded-full mb-2 cursor-pointer overflow-hidden relative transition-all">
            <div
              className="h-full bg-cyber-cyan shadow-glow-cyan transition-all duration-100 rounded-full"
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

            <div className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">
              {clip.aspectRatio}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
