"use client";

import type { AIModel } from "@/lib/types";

export function ModelSelect({
  models,
  value,
  onChange,
}: {
  models: AIModel[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">Model</label>
      <div className="grid gap-2">
        {models.map((m) => {
          const active = m.id === value;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all ${
                active
                  ? "border-brand-400/50 bg-brand-500/10 shadow-glow"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{m.name}</span>
                  {m.badge && <Badge kind={m.badge} />}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {m.provider} · {m.description}
                </div>
              </div>
              <span
                className={`ml-3 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                  active ? "border-brand-400 bg-brand-400" : "border-white/20"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-ink-950" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ kind }: { kind: "new" | "fast" | "pro" }) {
  const styles: Record<string, string> = {
    new: "bg-emerald-400/15 text-emerald-300",
    fast: "bg-amber-400/15 text-amber-300",
    pro: "bg-accent-500/20 text-accent-400",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${styles[kind]}`}>
      {kind}
    </span>
  );
}

export function ChipRow({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: (string | number)[];
  value: string | number;
  onChange: (v: any) => void;
  format?: (v: string | number) => string;
}) {
  if (!options.length) return null;
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={String(opt)}
              onClick={() => onChange(opt)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-brand-400/50 bg-brand-500/15 text-brand-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
              }`}
            >
              {format ? format(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
