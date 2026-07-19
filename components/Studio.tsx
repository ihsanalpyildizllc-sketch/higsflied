"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { modelsForStudio, getModel, STUDIOS } from "@/lib/models";
import { loadHistory, saveHistory } from "@/lib/history";
import type { GenerationResult, StudioId } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { Gallery } from "./Gallery";
import { ModelSelect, ChipRow } from "./Controls";

export function Studio() {
  const [studio, setStudio] = useState<StudioId>("image");
  const [modelId, setModelId] = useState<string>("soul-2");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [duration, setDuration] = useState<number>(5);
  const [references, setReferences] = useState<string[]>([]);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [pending, setPending] = useState<{ aspectRatio: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const fileRef = useRef<HTMLInputElement>(null);

  const models = useMemo(() => modelsForStudio(studio), [studio]);
  const model = getModel(modelId);
  const isVideoStudio =
    studio === "video" || studio === "cinema" || studio === "lipsync" || studio === "motion";

  // Load saved history once.
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // When the studio changes, snap the model + constrained controls to valid values.
  useEffect(() => {
    const list = modelsForStudio(studio);
    if (!list.find((m) => m.id === modelId)) {
      const first = list[0];
      if (first) {
        setModelId(first.id);
        if (first.aspectRatios?.length) setAspect(first.aspectRatios[0]);
        if (first.durations?.length) setDuration(first.durations[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio]);

  // Keep aspect/duration valid for the selected model.
  useEffect(() => {
    if (model?.aspectRatios?.length && !model.aspectRatios.includes(aspect)) {
      setAspect(model.aspectRatios[0]);
    }
    if (model?.durations?.length && !model.durations.includes(duration)) {
      setDuration(model.durations[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files)
      .slice(0, 14 - references.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => setReferences((r) => [...r, reader.result as string]);
        reader.readAsDataURL(file);
      });
  }

  async function generate() {
    if (!prompt.trim() && studio !== "lipsync" && studio !== "motion") {
      setError("Enter a prompt first.");
      return;
    }
    if (studio === "motion" && !references.length && !prompt.trim()) {
      setError("Add a driving motion reference or describe the motion.");
      return;
    }
    setError(null);
    setPending({ aspectRatio: aspect });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: negative,
          model: modelId,
          studio,
          aspectRatio: aspect,
          duration: isVideoStudio ? duration : undefined,
          references,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setMode(data.mode === "live" ? "live" : "demo");

      const result: GenerationResult = {
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        studio,
        model: modelId,
        modelName: data.modelName,
        prompt: prompt || (studio === "motion" ? "(motion transfer)" : "(lip sync)"),
        aspectRatio: aspect,
        type: data.type,
        url: data.url,
        createdAt: Date.now(),
      };
      const next = [result, ...history];
      setHistory(next);
      saveHistory(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  const studioMeta = STUDIOS.find((s) => s.id === studio)!;
  const isWorkflow = studio === "workflow";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={studio} onSelect={setStudio} mode={mode} />

      {/* mobile studio switcher */}
      <div className="fixed inset-x-0 top-0 z-20 flex gap-1.5 overflow-x-auto bg-ink-950/80 p-2 backdrop-blur lg:hidden">
        {STUDIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStudio(s.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
              s.id === studio ? "bg-brand-500/25 text-brand-200" : "bg-white/5 text-slate-300"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <main className="flex min-w-0 flex-1 gap-3 p-3 max-lg:pt-14">
        {/* Controls column */}
        <section className="glass flex w-[360px] shrink-0 flex-col rounded-2xl max-md:hidden">
          <div className="border-b border-white/10 p-5">
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="text-brand-300">{studioMeta.icon}</span> {studioMeta.label} Studio
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">{studioMeta.blurb}</p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {isWorkflow ? (
              <WorkflowPlaceholder />
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    {studio === "lipsync"
                      ? "Script / dialogue"
                      : studio === "motion"
                        ? "Motion description"
                        : "Prompt"}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder={
                      studio === "lipsync"
                        ? "What should the character say…"
                        : studio === "motion"
                          ? "Waving hello, then a thumbs up with the right hand…"
                          : "A cinematic portrait, soft rim light, 85mm…"
                    }
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm outline-none ring-brand-400/40 placeholder:text-slate-600 focus:ring-2"
                  />
                </div>

                <ReferenceUploader
                  references={references}
                  onPick={() => fileRef.current?.click()}
                  onRemove={(i) => setReferences((r) => r.filter((_, idx) => idx !== i))}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => onFiles(e.target.files)}
                />

                <ModelSelect models={models} value={modelId} onChange={setModelId} />

                {model?.aspectRatios && (
                  <ChipRow
                    label="Aspect ratio"
                    options={model.aspectRatios}
                    value={aspect}
                    onChange={setAspect}
                  />
                )}

                {isVideoStudio && model?.durations && (
                  <ChipRow
                    label="Duration"
                    options={model.durations}
                    value={duration}
                    onChange={setDuration}
                    format={(v) => `${v}s`}
                  />
                )}

                {!isVideoStudio && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-400">
                      Negative prompt
                    </label>
                    <input
                      value={negative}
                      onChange={(e) => setNegative(e.target.value)}
                      placeholder="blurry, low quality…"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none ring-brand-400/40 placeholder:text-slate-600 focus:ring-2"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {!isWorkflow && (
            <div className="border-t border-white/10 p-5">
              {error && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
              <button
                onClick={generate}
                disabled={!!pending}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-3 text-sm font-semibold shadow-glow transition-all hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "Generating…" : "Generate"}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                {mode === "demo" ? "Demo mode · no API key needed" : "Live · model gateway"}
              </p>
            </div>
          )}
        </section>

        {/* Canvas / output */}
        <section className="glass min-w-0 flex-1 overflow-y-auto rounded-2xl p-4">
          {/* mobile prompt bar */}
          <div className="mb-4 md:hidden">
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to generate…"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400/40"
              />
              <button
                onClick={generate}
                disabled={!!pending}
                className="rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 text-sm font-semibold disabled:opacity-60"
              >
                Go
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          </div>

          <Gallery items={history} pending={pending} onClear={clearHistory} />
        </section>
      </main>
    </div>
  );
}

function ReferenceUploader({
  references,
  onPick,
  onRemove,
}: {
  references: string[];
  onPick: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">Reference images</label>
        <span className="text-[11px] text-slate-600">{references.length}/14</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {references.map((src, i) => (
          <div key={i} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute inset-0 grid place-items-center bg-black/60 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        {references.length < 14 && (
          <button
            onClick={onPick}
            className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-white/20 text-slate-500 transition-colors hover:border-brand-400/50 hover:text-brand-300"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

function WorkflowPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-white/15 p-5 text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-white/[0.04] text-2xl">
          ⌗
        </div>
        <h3 className="text-sm font-semibold">Node-based pipelines</h3>
        <p className="mt-1 text-xs text-slate-400">
          Chain multiple studios into a single multi-step generation graph.
        </p>
      </div>
      {["Image → Upscale → Video", "Portrait → Lip Sync → Cinema", "Text → Image → Reframe"].map(
        (w) => (
          <div
            key={w}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-300"
          >
            <span className="text-brand-300">⌗</span>
            {w}
            <span className="ml-auto text-[10px] text-slate-600">template</span>
          </div>
        ),
      )}
    </div>
  );
}
