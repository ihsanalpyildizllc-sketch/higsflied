import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/models";

export const runtime = "nodejs";

/**
 * Generation endpoint.
 *
 * By default this runs in DEMO mode and returns a deterministic placeholder
 * asset so the interface is fully usable with zero configuration.
 *
 * To wire a real backend (the upstream project uses a single AI gateway),
 * set the env vars below and implement `callGateway()`:
 *   GENAI_GATEWAY_URL   – base URL of your model gateway
 *   GENAI_API_KEY       – your gateway / provider key
 */
const GATEWAY_URL = process.env.GENAI_GATEWAY_URL;
const API_KEY = process.env.GENAI_API_KEY;

interface Body {
  prompt: string;
  model: string;
  studio: string;
  aspectRatio: string;
  duration?: number;
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
  const isVideo =
    body.studio === "video" ||
    body.studio === "cinema" ||
    body.studio === "lipsync" ||
    body.studio === "motion";
  if (isVideo) {
    // A lightweight animated SVG stands in for a rendered clip in demo mode.
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

async function callGateway(body: Body): Promise<{ type: "image" | "video"; url: string }> {
  // Implement against your provider here. Shape is illustrative.
  const res = await fetch(`${GATEWAY_URL}/v1/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}`);
  const data = await res.json();
  return { type: data.type ?? "image", url: data.url };
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
  const live = Boolean(GATEWAY_URL && API_KEY);

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
