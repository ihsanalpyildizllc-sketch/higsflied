"use client";

import type { GenerationResult } from "@/lib/types";

export function Gallery({
  items,
  pending,
  onClear,
}: {
  items: GenerationResult[];
  pending: { aspectRatio: string } | null;
  onClear: () => void;
}) {
  if (!items.length && !pending) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 animate-floaty place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-accent-500/20 text-3xl">
            ◭
          </div>
          <h3 className="text-lg font-semibold">Your canvas is empty</h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Write a prompt, pick a model, and hit Generate. Results appear here and are saved to
            your browser history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">
          History <span className="text-slate-500">· {items.length}</span>
        </h3>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-lg px-2.5 py-1 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {pending && <PendingCard aspectRatio={pending.aspectRatio} />}
        {items.map((item) => (
          <ResultCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function aspectStyle(ratio: string) {
  const [a, b] = ratio.split(":").map(Number);
  return { aspectRatio: a && b ? `${a} / ${b}` : "1 / 1" };
}

function PendingCard({ aspectRatio }: { aspectRatio: string }) {
  return (
    <div
      className="shimmer relative overflow-hidden rounded-xl border border-white/10"
      style={aspectStyle(aspectRatio)}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xs text-slate-400">generating…</span>
      </div>
    </div>
  );
}

function ResultCard({ item }: { item: GenerationResult }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      download
      className="group relative block overflow-hidden rounded-xl border border-white/10 bg-ink-800"
      style={aspectStyle(item.aspectRatio)}
      title={item.prompt}
    >
      {item.type === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(item.url) ? (
        <video
          src={item.url}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.prompt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/85 to-transparent p-2.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <div className="line-clamp-2 text-[11px] leading-snug text-slate-200">{item.prompt}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="rounded bg-white/10 px-1.5 py-0.5">{item.modelName}</span>
          <span>{item.aspectRatio}</span>
        </div>
      </div>
      {item.type === "video" && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-[10px] backdrop-blur">
          ▶
        </span>
      )}
    </a>
  );
}
