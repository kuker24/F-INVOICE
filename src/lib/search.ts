/** Sanitize free-text list search for PostgREST .or / .ilike filters. */
export function sanitizeSearch(q?: string | null): string {
  if (!q) return "";
  return q
    .trim()
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}
