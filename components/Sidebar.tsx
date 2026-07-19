"use client";

import { STUDIOS } from "@/lib/models";
import type { StudioId } from "@/lib/types";

export function Sidebar({
  active,
  onSelect,
  mode,
}: {
  active: StudioId;
  onSelect: (s: StudioId) => void;
  mode: "demo" | "live";
}) {
  return (
    <aside className="glass m-3 flex w-[248px] shrink-0 flex-col rounded-2xl p-4 max-lg:hidden">
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg shadow-glow">
          ◭
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Higgsfield</div>
          <div className="text-[11px] text-slate-400">Open Generative AI</div>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Studios
        </div>
        {STUDIOS.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                isActive
                  ? "bg-gradient-to-r from-brand-500/25 to-accent-500/10 ring-1 ring-brand-400/40"
                  : "hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${
                  isActive ? "bg-brand-500/30 text-brand-200" : "bg-white/[0.05] text-slate-400"
                }`}
              >
                {s.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                mode === "live" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="font-medium">{mode === "live" ? "Live gateway" : "Demo mode"}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            {mode === "live"
              ? "Connected to your model gateway."
              : "Put MUAPI_API_KEY in .env.local to go live."}
          </p>
        </div>
        <div className="px-1 text-[11px] text-slate-600">v0.1.0 · MIT</div>
      </div>
    </aside>
  );
}
