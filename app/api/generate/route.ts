import { NextRequest, NextResponse } from "next/server";
import { getModel, MAX_REFERENCES } from "@/lib/models";

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
 * Our catalog id → Muapi endpoint slug.
 *
 * KNOWN RISK: these slugs were assembled from public search results / docs
 * browsing, NOT confirmed against a live Muapi key. Several — especially
 * "nano-banana-2", the "seedance-2-*" and "seedance-pro-*" family, and
 * "wan-2-2-animate" — may not match Muapi's actual catalog, and the request
 * body shape Muapi expects per-endpoint (field names, required params) has
 * not been verified either. Treat every entry here as unverified until
 * exercised against a real MUAPI_API_KEY; do not assume a 502 from
 * callGateway() means our code is wrong rather than the slug being wrong.
 * Run `muapi models` (muapi-cli) or check muapi.ai/docs/api-reference to
 * confirm before relying on this in production.
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

// ---- Request validation --------------------------------------------------
// Everything here is attacker-controlled JSON from the client. Validate
// shape/size BEFORE it reaches callGateway()/demoAsset(), so malformed or
// hostile input gets a clean 400 instead of an uncaught exception or a
// silently-wrong request to Muapi.
const MAX_PROMPT_LEN = 4000;
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024; // ~8MB decoded, per reference
const ASPECT_RATIO_RE = /^\d{1,3}:\d{1,3}$/;
// Only accept inline base64 data URLs here. References are forwarded to
// Muapi as `image_url`; if we accepted arbitrary http(s) strings too, this
// endpoint would let any caller make Muapi's infrastructure fetch a
// URL of their choosing (SSRF-by-proxy against a third party, plus it burns
// our API quota) without us ever fetching it ourselves. Reject anything that
// isn't a self-contained data: URL.
const DATA_URL_RE = /^data:[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/;

function validateBody(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return "request body must be a JSON object";
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.model !== "string" || !body.model.trim()) {
    return "model is required and must be a string";
  }
  if (typeof body.studio !== "string" || !body.studio.trim()) {
    return "studio is required and must be a string";
  }
  if (typeof body.aspectRatio !== "string" || !ASPECT_RATIO_RE.test(body.aspectRatio)) {
    return "aspectRatio must be a WIDTH:HEIGHT string, e.g. \"16:9\"";
  }
  if (body.prompt !== undefined && typeof body.prompt !== "string") {
    return "prompt must be a string";
  }
  if (typeof body.prompt === "string" && body.prompt.length > MAX_PROMPT_LEN) {
    return `prompt must be ${MAX_PROMPT_LEN} characters or fewer`;
  }
  if (body.negativePrompt !== undefined) {
    if (typeof body.negativePrompt !== "string" || body.negativePrompt.length > MAX_PROMPT_LEN) {
      return "negativePrompt must be a string";
    }
  }
  if (body.duration !== undefined) {
    if (typeof body.duration !== "number" || !Number.isFinite(body.duration) || body.duration <= 0 || body.duration > 60) {
      return "duration must be a number of seconds between 0 and 60";
    }
  }
  if (body.references !== undefined) {
    if (!Array.isArray(body.references)) {
      return "references must be an array of data: URLs";
    }
    if (body.references.length > MAX_REFERENCES) {
      return `at most ${MAX_REFERENCES} references are allowed`;
    }
    for (const ref of body.references) {
      if (typeof ref !== "string" || !DATA_URL_RE.test(ref)) {
        return "each reference must be an inline data: URL (data:<mime>;base64,<...>)";
      }
      // Rough decoded-size check from the base64 length; avoids fully
      // decoding attacker input just to measure it.
      const approxBytes = (ref.length * 3) / 4;
      if (approxBytes > MAX_REFERENCE_BYTES) {
        return "each reference image must be 8MB or smaller once decoded";
      }
    }
  }
  return null;
}

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

// Per-request timeout for calls to Muapi. Without this, a hung upstream
// request has no bound other than the platform's own function timeout,
// which kills the whole invocation ungracefully instead of letting us
// return a clean JSON error.
const MUAPI_REQUEST_TIMEOUT_MS = 20_000;

async function muapi(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MUAPI_REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${MUAPI_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY as string,
        ...init?.headers,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Muapi request to ${path} timed out after ${MUAPI_REQUEST_TIMEOUT_MS}ms`);
    }
    // Never let the raw fetch error (which can embed request internals)
    // bubble up verbatim; normalize it without echoing headers/body.
    throw new Error(`Muapi request to ${path} failed: network error`);
  } finally {
    clearTimeout(timer);
  }
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

// Leave real margin under `maxDuration` (300s) for the submit request, the
// final poll's own round trip, and JSON (de)serialization — don't let the
// poll loop itself claim the entire budget.
const GENERATION_DEADLINE_MS = 260_000;
const POLL_INTERVAL_MS = 3_000;

async function callGateway(body: Body): Promise<{ type: "image" | "video"; url: string }> {
  // `body.model` is attacker-controlled; look it up as an *own* property so
  // inherited Object.prototype members (e.g. model: "constructor") can never
  // resolve to a truthy-but-wrong "map" and silently build a bogus endpoint.
  const map = Object.prototype.hasOwnProperty.call(MUAPI_ENDPOINTS, body.model)
    ? MUAPI_ENDPOINTS[body.model]
    : undefined;
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
  // KNOWN GAP (unverified against a live key): this only ever sends a single
  // `image_url` field built from references[0]. Lip Sync and Motion Sync
  // studios conceptually need an audio and/or driving-video reference, not
  // just a still image, and any additional entries in `references` beyond
  // the first are silently dropped. The actual field names Muapi expects for
  // those inputs (e.g. `audio_url`, `video_url`) were not in the material
  // used to build MUAPI_ENDPOINTS, so guessing them here would risk sending
  // confidently-wrong requests. Needs confirming against Muapi's docs/a live
  // key before lipsync/motion studios can be trusted end-to-end.
  if (hasImage) payload.image_url = body.references![0]; // data URL; see upload-first note below

  const submit = await muapi(`/${endpoint}`, { method: "POST", body: JSON.stringify(payload) });
  const requestId = submit.request_id ?? submit.id;
  if (!requestId) throw new Error("Muapi did not return a request_id");

  // Poll on a wall-clock deadline (not a fixed iteration count) so slow
  // individual round trips can't push the total past the function's own
  // `maxDuration` and get killed without a clean error response.
  const deadline = Date.now() + GENERATION_DEADLINE_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
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
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const validationError = validateBody(raw);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const body = raw as Body;

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
