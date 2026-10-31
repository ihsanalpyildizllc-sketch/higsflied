import type { GenerationResult } from "./types";

const KEY = "higsflied:history";

/**
 * Structural check that `value` matches the GenerationResult shape closely
 * enough for every consumer (Gallery.tsx, ResultCard, Studio.tsx) to read it
 * safely. We intentionally don't validate enum membership (studio/type) —
 * just the fields and primitive types every consumer dereferences directly.
 */
function isGenerationResult(value: unknown): value is GenerationResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.studio === "string" &&
    typeof v.model === "string" &&
    typeof v.modelName === "string" &&
    typeof v.prompt === "string" &&
    typeof v.aspectRatio === "string" &&
    (v.type === "image" || v.type === "video") &&
    typeof v.url === "string" &&
    typeof v.createdAt === "number"
  );
}

export function loadHistory(): GenerationResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGenerationResult);
  } catch {
    return [];
  }
}

/**
 * Persists history to localStorage. Returns true on success, false if the
 * write failed (quota exceeded, private-mode zero-quota, storage disabled)
 * so callers can choose to surface this to the user. Retries once with a
 * smaller slice before giving up, since a full quota error can sometimes be
 * caused by the size of this particular write rather than total usage.
 */
export function saveHistory(items: GenerationResult[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 60)));
    return true;
  } catch {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 20)));
      return true;
    } catch {
      /* storage full or disabled — give up, let the caller decide what to tell the user */
      return false;
    }
  }
}
