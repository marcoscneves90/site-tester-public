import type { LighthouseRaw } from "./types";

export type Category = "performance" | "accessibility" | "best-practices" | "seo";

/**
 * Lê o raw_report do Lighthouse e monta um mapa:
 *   auditId -> categoria
 *
 * A fonte da verdade são as categorias oficiais do Lighthouse
 * (raw.categories[x].auditRefs[]). Se uma auditoria aparecer em mais
 * de uma categoria, a última ganha — mas na prática isso quase não acontece.
 */
export function buildAuditCategoryMap(
  raw: LighthouseRaw | null | undefined
): Record<string, Category> {
  const map: Record<string, Category> = {};
  if (!raw?.categories) return map;

  const known: Category[] = [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ];

  for (const cat of known) {
    const category = raw.categories[cat];
    if (!category?.auditRefs) continue;

    for (const ref of category.auditRefs) {
      if (ref?.id) {
        map[ref.id] = cat;
      }
    }
  }

  return map;
}

/**
 * Paleta de cores por categoria.
 */
export const CATEGORY_COLORS: Record<
  Category,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  performance: {
    label: "Performance",
    bg: "rgba(139, 92, 246, 0.10)",
    border: "rgba(139, 92, 246, 0.35)",
    text: "#6d28d9",
    dot: "#8b5cf6",
  },
  accessibility: {
    label: "Acessibilidade",
    bg: "rgba(59, 130, 246, 0.10)",
    border: "rgba(59, 130, 246, 0.35)",
    text: "#1d4ed8",
    dot: "#3b82f6",
  },
  "best-practices": {
    label: "Best Practices",
    bg: "rgba(245, 158, 11, 0.10)",
    border: "rgba(245, 158, 11, 0.35)",
    text: "#b45309",
    dot: "#f59e0b",
  },
  seo: {
    label: "SEO",
    bg: "rgba(16, 185, 129, 0.10)",
    border: "rgba(16, 185, 129, 0.35)",
    text: "#047857",
    dot: "#10b981",
  },
};
