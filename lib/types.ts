export type StudioId = "image" | "video" | "lipsync" | "motion" | "cinema" | "workflow";

export type ModelMode =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "lipsync"
  | "motion-transfer";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  studio: StudioId;
  modes: ModelMode[];
  /** supported aspect ratios, if constrained */
  aspectRatios?: string[];
  /** supported durations in seconds (video models) */
  durations?: number[];
  description?: string;
  badge?: "new" | "fast" | "pro";
}

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  studio: StudioId;
  aspectRatio: string;
  duration?: number;
  references?: string[]; // data URLs
  seed?: number;
}

export interface GenerationResult {
  id: string;
  studio: StudioId;
  model: string;
  modelName: string;
  prompt: string;
  aspectRatio: string;
  type: "image" | "video";
  url: string;
  createdAt: number;
}
