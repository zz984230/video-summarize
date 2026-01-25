export interface VideoInfo {
  url: string;
  title: string;
  duration?: number;
  cover?: string;
  bvid?: string;
  cid?: string;
}

export interface SummaryResult {
  overall?: string;
  summary?: string;
  segments?: VideoSegment[];
  timestamp: number;
  analysisStrategy?: string;
  frameCount?: number;
  videoSource?: string;
  model?: string;
  success?: boolean;
}

export interface VideoSegment {
  startTime: string;
  endTime: string;
  content: string;
  keyPoints: string[];
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
}

export interface CacheRecord {
  url: string;
  result: SummaryResult;
  timestamp: number;
}