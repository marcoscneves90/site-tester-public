export interface ParsedMetrics {
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  lcp_ms: number | null;
  fcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  speed_index_ms: number | null;
}

function toInt(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? Math.round(v) : null;
}

function toScore(category: any): number | null {
  if (!category || typeof category.score !== "number") return null;
  return Math.round(category.score * 100);
}

export function parseLighthouse(raw: any): ParsedMetrics {
  const cats = raw?.categories ?? {};
  const audits = raw?.audits ?? {};

  return {
    performance:    toScore(cats.performance),
    accessibility:  toScore(cats.accessibility),
    best_practices: toScore(cats["best-practices"]),
    seo:            toScore(cats.seo),

    lcp_ms:         toInt(audits["largest-contentful-paint"]?.numericValue),
    fcp_ms:         toInt(audits["first-contentful-paint"]?.numericValue),
    cls:            audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbt_ms:         toInt(audits["total-blocking-time"]?.numericValue),
    ttfb_ms:        toInt(audits["server-response-time"]?.numericValue),
    speed_index_ms: toInt(audits["speed-index"]?.numericValue),
  };
}
