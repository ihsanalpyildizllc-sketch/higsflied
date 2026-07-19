import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Generation endpoint.
 *
 * DEMO mode (default): no key set — returns deterministic placeholder assets
 * so the interface is fully usable with zero configuration.
 *
 * LIVE mode: put your key in `.env.local` at the project root:
 *
 *   MUAPI_API_KEY=your-key-from-muapi.ai
 *
 * Muapi flow: POST https://api.muapi.ai/api/v1/{model_endpoint} with an
 * `x-api-key` header → { request_id } → poll
 * GET /api/v1/predictions/{request_id}/result until completed.
 */
const MUAPI_BASE = process.env.MUAPI_BASE_URL ?? "https://api.muapi.ai/api/v1";
const API_KEY = process.env.MUAPI_API_KEY ?? process.env.GENAI_API_KEY;

/**
 * Our catalog id → Muapi endpoint slug. Run `muapi models` (muapi-cli) or see
 * muapi.ai/docs/api-reference for the full slug list; adjust freely.
 */
const MUAPI_ENDPOINTS: Record<string, { t2: string; i2?: string }> = {
  // image
  "soul-2": { t2: "flux-dev-image", i2: "flux-kontext-pro" },
  "soul-cast": { t2: "flux-dev-image" },
  "nano-banana-pro": { t2: "nano-banana-2", i2: "nano-banana-2" },
  "flux-pro": { t2: "flux-dev-image", i2: "flux-kontext-pro" },
  "z-image": { t2: "flux-schnell" },
  // video
  "kling3-0": { t2: "kling-master-text-to-video", i2: "kling-master-image-to-video" },
  "kling3-0-turbo": { t2: "kling-std-text-to-video", i2: "kling-std-image-to-video" },
  "seedance-2-0": { t2: "seedance-2-text-to-video", i2: "seedance-2-image-to-video" },
  sora: { t2: "sora-text-to-video" },
  // lipsync / motion / cinema
  "lipsync-studio": { t2: "kling-lipsync", i2: "kling-lipsync" },
  "motion-control": { t2: "wan-2-2-animate", i2: "wan-2-2-animate" },
  "wan-animate": { t2: "wan-2-2-animate", i2: "wan-2-2-animate" },
  "cinema-studio": { t2: "seedance-pro-text-to-video", i2: "seedance-pro-image-to-video" },
};

interface Body {
  prompt: string;
  negativePrompt?: string;
  model: string;
  studio: string;
  aspectRatio: string;
  duration?: number;
  references?: string[]; // data URLs from the client
}

const isVideoStudio = (s: string) =>
  s === "video" || s === "cinema" || s === "lipsync" || s === "motion";

function aspectToSize(ratio: string): { w: number; h: number } {
  const [a, b] = ratio.split(":").map(Number);
  if (!a || !b) return { w: 768, h: 768 };
  const base = 768;
  return a >= b
    ? { w: base, h: Math.round((base * b) / a) }
    : { w: Math.round((base * a) / b), h: base };
}

/** Deterministic, dependency-free placeholder so demo mode always renders. */
function demoAsset(body: Body): { type: "image" | "video"; url: string } {
  const { w, h } = aspectToSize(body.aspectRatio);
  const seed = encodeURIComponent(`${body.model}:${body.prompt}`.slice(0, 60));
  if (isVideoStudio(body.studio)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#4f6bff'/><stop offset='100%' stop-color='#a855f7'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='#0a0c16'/>
      <rect width='100%' height='100%' fill='url(#g)' opacity='0.25'/>
      <circle cx='${w / 2}' cy='${h / 2}' r='${Math.min(w, h) / 6}' fill='none' stroke='url(#g)' stroke-width='6'>
        <animate attributeName='r' values='${Math.min(w, h) / 8};${Math.min(w, h) / 5};${Math.min(w, h) / 8}' dur='2s' repeatCount='indefinite'/>
      </circle>
      <text x='50%' y='92%' fill='#9db4ff' font-family='monospace' font-size='14' text-anchor='middle'>demo clip</text>
    </svg>`;
    return { type: "video", url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` };
  }
  return { type: "image", url: `https://picsum.photos/seed/${seed}/${w}/${h}` };
}

async function muapi(path: string, init?: RequestInit) {
  const res = await fetch(`${MUAPI_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY as string,
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? data?.message ?? `Muapi ${res.status} on ${path}`);
  }
  return data;
}

/** Pull a usable media URL out of the various result shapes Muapi models return. */
function extractUrl(result: any): string | undefined {
  return (
    result?.outputs?.[0]?.url ??
    (typeof result?.outputs?.[0] === "string" ? result.outputs[0] : undefined) ??
    result?.output?.url ??
    (typeof result?.output === "string" ? result.output : undefined) ??
    result?.video?.url ??
    result?.image?.url ??
    result?.images?.[0]?.url ??
    result?.url
  );
}

async function callGateway(body: Body): Promise<{ type: "image" | "video"; url: string }> {
  const map = MUAPI_ENDPOINTS[body.model];
  if (!map) throw new Error(`No Muapi endpoint mapped for model "${body.model}"`);

  const hasImage = Boolean(body.references?.length);
  const endpoint = hasImage && map.i2 ? map.i2 : map.t2;
  const video = isVideoStudio(body.studio);

  const payload: Record<string, unknown> = {
    prompt: body.prompt,
    aspect_ratio: body.aspectRatio,
  };
  if (body.negativePrompt) payload.negative_prompt = body.negativePrompt;
  if (video && body.duration) payload.duration = body.duration;
  if (hasImage) payload.image_url = body.references![0]; // data URLs are accepted; or upload via /files first

  const submit = await muapi(`/${endpoint}`, { method: "POST", body: JSON.stringify(payload) });
  const requestId = submit.request_id ?? submit.id;
  if (!requestId) throw new Error("Muapi did not return a request_id");

  // Poll every 3s, up to ~4.5 min (video models can be slow).
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const result = await muapi(`/predictions/${requestId}/result`);
    const status = String(result.status ?? "").toLowerCase();
    if (status === "completed" || status === "succeeded" || status === "success") {
      const url = extractUrl(result);
      if (!url) throw new Error("Completed, but no media URL in the result");
      return { type: video ? "video" : "image", url };
    }
    if (status === "failed" || status === "error" || status === "canceled") {
      throw new Error(result.error ?? result.message ?? "Generation failed on Muapi");
    }
  }
  throw new Error("Timed out waiting for the generation to finish");
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.prompt?.trim() && body.studio !== "lipsync" && body.studio !== "motion") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const model = getModel(body.model);
  const live = Boolean(API_KEY);

  try {
    const asset = live ? await callGateway(body) : await mockDelay(() => demoAsset(body));
    return NextResponse.json({
      ...asset,
      model: body.model,
      modelName: model?.name ?? body.model,
      mode: live ? "live" : "demo",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generation failed" },
      { status: 502 },
    );
  }
}

function mockDelay<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), 1100));
}
