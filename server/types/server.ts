import {
  AspectRatio,
  SubtitleStylePreset,
  SubtitleWord,
  SubtitleSegment,
  SubtitleConfig,
  SmartReframeConfig,
  ClipMetadata,
  Clip,
  VideoInfo,
  PipelineStage,
  PipelineStepStatus,
  Project,
  AppSettings
} from '../../src/types/index.js';

export type {
  AspectRatio,
  SubtitleStylePreset,
  SubtitleWord,
  SubtitleSegment,
  SubtitleConfig,
  SmartReframeConfig,
  ClipMetadata,
  Clip,
  VideoInfo,
  PipelineStage,
  PipelineStepStatus,
  Project,
  AppSettings
};

export interface ProcessProgressCallback {
  (stage: PipelineStage, progressPercent: number, detail?: string): void;
}
