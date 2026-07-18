import type { AIModel, StudioId } from "./types";

/**
 * A curated slice of the Higgsfield model catalog. The real platform exposes
 * 200+ models through a single gateway; here we ship a representative set per
 * studio so the interface is fully navigable out of the box.
 */
export const MODELS: AIModel[] = [
  // ---- Image ----
  {
    id: "soul-2",
    name: "Soul 2",
    provider: "Higgsfield",
    studio: "image",
    modes: ["text-to-image", "image-to-image"],
    aspectRatios: ["1:1", "3:2", "2:3", "4:5", "16:9", "9:16"],
    description: "Photoreal portraits, fashion & editorial.",
    badge: "pro",
  },
  {
    id: "soul-cast",
    name: "Soul Cast",
    provider: "Higgsfield",
    studio: "image",
    modes: ["text-to-image"],
    aspectRatios: ["1:1", "3:4", "4:3", "16:9", "9:16"],
    description: "Text-only character & avatar generation.",
    badge: "new",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "Higgsfield",
    studio: "image",
    modes: ["text-to-image", "image-to-image"],
    aspectRatios: ["1:1", "3:2", "2:3", "16:9", "9:16", "21:9"],
    description: "4K, crisp text rendering & diagrams.",
  },
  {
    id: "flux-pro",
    name: "Flux Pro",
    provider: "Black Forest",
    studio: "image",
    modes: ["text-to-image", "image-to-image"],
    aspectRatios: ["1:1", "3:2", "2:3", "16:9", "9:16"],
    description: "High-fidelity general purpose diffusion.",
  },
  {
    id: "z-image",
    name: "Z-Image",
    provider: "Local · sd.cpp",
    studio: "image",
    modes: ["text-to-image"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    description: "Runs locally with Metal GPU acceleration.",
    badge: "fast",
  },

  // ---- Video ----
  {
    id: "kling3-0",
    name: "Kling 3.0",
    provider: "Kuaishou",
    studio: "video",
    modes: ["text-to-video", "image-to-video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    description: "Multi-shot motion with audio support.",
    badge: "pro",
  },
  {
    id: "kling3-0-turbo",
    name: "Kling 3.0 Turbo",
    provider: "Kuaishou",
    studio: "video",
    modes: ["text-to-video", "image-to-video"],
    aspectRatios: ["16:9", "9:16"],
    durations: [5],
    description: "Fast text-to-video & start-frame animation.",
    badge: "fast",
  },
  {
    id: "seedance-2-0",
    name: "Seedance 2.0",
    provider: "ByteDance",
    studio: "video",
    modes: ["text-to-video", "image-to-video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    description: "Identity-preserving character motion.",
  },
  {
    id: "sora",
    name: "Sora",
    provider: "OpenAI",
    studio: "video",
    modes: ["text-to-video"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10, 20],
    description: "Long-form, coherent text-to-video.",
    badge: "new",
  },

  // ---- Lip Sync ----
  {
    id: "lipsync-studio",
    name: "Lip Sync Studio",
    provider: "Higgsfield",
    studio: "lipsync",
    modes: ["lipsync"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    durations: [5, 10],
    description: "Animate a portrait or sync lips to audio.",
  },

  // ---- Motion Sync (hand & gesture transfer) ----
  {
    id: "motion-control",
    name: "Motion Control",
    provider: "Higgsfield",
    studio: "motion",
    modes: ["motion-transfer"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    description: "Puppeteer body & hand motion from a reference video.",
    badge: "pro",
  },
  {
    id: "wan-animate",
    name: "Wan Animate",
    provider: "Alibaba",
    studio: "motion",
    modes: ["motion-transfer"],
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 10],
    description: "Full-body gesture & hand tracking transfer.",
  },

  // ---- Cinema ----
  {
    id: "cinema-studio",
    name: "Cinema Studio",
    provider: "Higgsfield",
    studio: "cinema",
    modes: ["text-to-video", "image-to-video"],
    aspectRatios: ["21:9", "16:9", "2:1"],
    durations: [5, 10],
    description: "Pro camera controls — lens, aperture, focal length.",
    badge: "pro",
  },
];

export function modelsForStudio(studio: StudioId): AIModel[] {
  return MODELS.filter((m) => m.studio === studio);
}

export function getModel(id: string): AIModel | undefined {
  return MODELS.find((m) => m.id === id);
}

export const STUDIOS: { id: StudioId; label: string; blurb: string; icon: string }[] = [
  { id: "image", label: "Image", blurb: "Text & image to image", icon: "✦" },
  { id: "video", label: "Video", blurb: "Text & image to video", icon: "▶" },
  { id: "lipsync", label: "Lip Sync", blurb: "Talking portraits", icon: "◍" },
  { id: "motion", label: "Motion Sync", blurb: "Hand & gesture transfer", icon: "✋" },
  { id: "cinema", label: "Cinema", blurb: "Camera-controlled shots", icon: "❖" },
  { id: "workflow", label: "Workflow", blurb: "Node pipelines", icon: "⌗" },
];
