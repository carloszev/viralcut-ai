export type AspectRatio = '9:16' | '1:1' | '16:9';

export type SubtitleStylePreset = 'hormozi' | 'clean' | 'cinema' | 'cyber' | 'devinci';

export interface SubtitleWord {
  word: string;
  start: number; // seconds
  end: number;   // seconds
  highlight?: boolean;
}

export interface SubtitleSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words?: SubtitleWord[];
}

export interface SubtitleConfig {
  enabled: boolean;
  style: SubtitleStylePreset;
  fontSize: number; // in px or scale
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  position: 'top' | 'center' | 'bottom';
  yOffsetPercent: number; // 0 to 100
  uppercase: boolean;
  maxWordsPerLine: number;
  animation: 'pop' | 'glow' | 'fade' | 'none';
  fontFamily?: string;
  strokeColor?: string;
  strokeWidth?: number;
  autoEmojis?: boolean;
}

export interface SmartReframeConfig {
  mode: 'auto' | 'center' | 'manual' | 'split_screen' | 'speaker_switch';
  horizontalOffsetPercent: number; // -50 to 50
  speaker1OffsetPercent?: number;
  speaker2OffsetPercent?: number;
  scaleFactor: number; // 1.0 to 2.0
  activeSpeakerTracking: boolean;
  smoothingFactor: number;
  faceTrackingData?: Array<{ time: number; xPercent: number; yPercent: number; confidence: number }>;
}

export interface ClipMetadata {
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  category: 'Humor' | 'Información' | 'Emoción' | 'Debate' | 'Sorpresa' | 'Historia' | 'Educación';
  potentialScore: number; // 0 - 100
  scoreBreakdown: {
    hookImpact: number;      // max 25
    infoDensity: number;     // max 25
    emotionalSpike: number;  // max 20
    pacingFlow: number;      // max 15
    curiosityLoop: number;   // max 15
  };
  scoreRationale: string;
  socialPack?: {
    viralTitles: string[];
    seoDescription: string;
    hashtags: string[];
    pinnedComment: string;
  };
}

export interface Clip {
  id: string;
  projectId: string;
  clipNumber: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  duration: number;  // seconds
  aspectRatio: AspectRatio;
  metadata: ClipMetadata;
  subtitles: SubtitleSegment[];
  subtitleConfig: SubtitleConfig;
  reframeConfig: SmartReframeConfig;
  smartJumpCut?: boolean;
  silenceDurationRemoved?: number;
  punchInZoom?: boolean;
  audioEnhance?: boolean;
  hookBooster?: boolean;
  hookBoosterType?: 'zoom_snap' | 'cinematic_push';
  pixelEnhance?: boolean;
  resolution?: '4k' | '1080p' | '720p';
  exportedUrl?: string;
  exportStatus?: 'idle' | 'rendering' | 'completed' | 'error';
  exportProgress?: number;
  thumbnailUrl?: string;
}

export interface VideoInfo {
  url: string;
  videoId: string;
  title: string;
  channel: string;
  duration: number; // in seconds
  durationFormatted: string;
  thumbnailUrl: string;
  publishedAt?: string;
  viewCount?: number;
  description?: string;
  localVideoPath?: string;
  videoSourceUrl?: string;
  isLocalFile?: boolean;
}

export type PipelineStage = 
  | 'fetching_info'
  | 'analyzing_duration'
  | 'transcribing'
  | 'detecting_moments'
  | 'analyzing_scenes'
  | 'finding_hooks'
  | 'calculating_potential'
  | 'preparing_clips'
  | 'completed'
  | 'error';

export interface PipelineStepStatus {
  stage: PipelineStage;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
  progressPercent: number;
}

export interface Project {
  id: string;
  name: string;
  videoInfo: VideoInfo;
  createdAt: string;
  updatedAt: string;
  status: 'analyzing' | 'processing' | 'completed' | 'error';
  currentStage?: PipelineStage;
  stageDetail?: string;
  progressPercent: number;
  errorMessage?: string;
  transcript: SubtitleSegment[];
  clips: Clip[];
}

export interface AppSettings {
  theme: 'dark' | 'light';
  geminiApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  defaultAspectRatio: AspectRatio;
  defaultSubtitleStyle?: SubtitleStylePreset;
  exportQuality: '4k' | '1080p' | '720p';
  exportFps: 30 | 60;
  autoReframeEnabled: boolean;
}
