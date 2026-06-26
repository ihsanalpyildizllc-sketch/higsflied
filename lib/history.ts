import type { GenerationResult } from "./types";

const KEY = "higsflied:history";

export function loadHistory(): GenerationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GenerationResult[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: GenerationResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 60)));
  } catch {
    /* storage full — ignore */
  }
}
