/**
 * Parser de HTML leve (sem dependências externas) para extrair dados SEO.
 * Usa regex — não é um parser DOM completo, mas cobre 95% dos casos reais.
 */

export interface ParsedPage {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  jsonLdCount: number;
  jsonLdTypes: string[];
  wordCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: string[];
  externalLinks: string[];
  htmlSize: number;
}

// ============================================================
// Helpers
// ============================================================

function getMetaContent(html: string, nameOrProp: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*\\bname=["']${nameOrProp}["'][^>]*\\bcontent=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bname=["']${nameOrProp}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*\\bproperty=["']${nameOrProp}["'][^>]*\\bcontent=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\bproperty=["']${nameOrProp}["']`,
      "i"
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countTags(html: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, "gi");
  return (html.match(re) ?? []).length;
}

// ============================================================
// Parser principal
// ============================================================

export function parsePage(html: string, baseUrl: string): ParsedPage {
  const htmlSize = Buffer.byteLength(html, "utf8");

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Meta tags
  const description = getMetaContent(html, "description");
  const robots = getMetaContent(html, "robots");
  const ogTitle = getMetaContent(html, "og:title");
  const ogDescription = getMetaContent(html, "og:description");
  const ogImage = getMetaContent(html, "og:image");
  const twitterCard = getMetaContent(html, "twitter:card");

  // Canonical
  const canonicalMatch = html.match(
    /<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']*)["']/i
  );
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  // Headings
  const h1Count = countTags(html, "h1");
  const h2Count = countTags(html, "h2");
  const h3Count = countTags(html, "h3");

  // JSON-LD
  const jsonLdMatches = [
    ...html.matchAll(
      /<script[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const jsonLdCount = jsonLdMatches.length;
  const jsonLdTypes: string[] = [];
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item["@type"] === "string") {
          jsonLdTypes.push(item["@type"]);
        }
      }
    } catch {
      /* ignora JSON-LD inválido */
    }
  }

  // Contagem de palavras (sem scripts/styles/tags)
  const text = stripTags(html);
  const wordCount = text ? text.split(/\s+/).length : 0;

  // Imagens
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imageCount = imgTags.length;
  let imagesWithoutAlt = 0;
  for (const m of imgTags) {
    const tag = m[0];
    const hasAlt = /\balt=["'][^"']*["']/i.test(tag);
    if (!hasAlt) imagesWithoutAlt++;
  }

  // Links (internos vs externos)
  let baseDomain = "";
  try {
    baseDomain = new URL(baseUrl).hostname;
  } catch {
    /* deixa vazio */
  }

  const linkTags = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi)];
  const internalLinksSet = new Set<string>();
  const externalLinksSet = new Set<string>();

  for (const m of linkTags) {
    let href = m[1].trim();
    if (!href) continue;
    // Ignora âncoras, mailto, tel, javascript
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) continue;

    // Resolve URL relativa
    let absolute = "";
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    // Remove hash
    absolute = absolute.split("#")[0];
    if (!absolute) continue;

    // Filtra esquemas não-HTTP
    if (!/^https?:\/\//i.test(absolute)) continue;

    let hostname = "";
    try {
      hostname = new URL(absolute).hostname;
    } catch {
      continue;
    }

    if (hostname === baseDomain) {
      internalLinksSet.add(absolute);
    } else {
      externalLinksSet.add(absolute);
    }
  }

  return {
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    h1Count,
    h2Count,
    h3Count,
    jsonLdCount,
    jsonLdTypes,
    wordCount,
    imageCount,
    imagesWithoutAlt,
    internalLinks: Array.from(internalLinksSet),
    externalLinks: Array.from(externalLinksSet),
    htmlSize,
  };
}

// ============================================================
// Detecção de problemas
// ============================================================

export interface PageIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export function detectPageIssues(page: ParsedPage, statusCode: number): PageIssue[] {
  const issues: PageIssue[] = [];

  // Status HTTP
  if (statusCode >= 400) {
    issues.push({
      code: "http-error",
      severity: "error",
      message: `Página retorna HTTP ${statusCode}`,
    });
  } else if (statusCode >= 300 && statusCode < 400) {
    issues.push({
      code: "redirect",
      severity: "warning",
      message: `Redirecionamento (HTTP ${statusCode})`,
    });
  }

  // Title
  if (!page.title || page.title.length === 0) {
    issues.push({
      code: "missing-title",
      severity: "error",
      message: "Title ausente",
    });
  } else if (page.title.length < 30) {
    issues.push({
      code: "short-title",
      severity: "warning",
      message: `Title curto (${page.title.length} chars, ideal 30-60)`,
    });
  } else if (page.title.length > 60) {
    issues.push({
      code: "long-title",
      severity: "warning",
      message: `Title longo (${page.title.length} chars, ideal 30-60)`,
    });
  }

  // Description
  if (!page.description || page.description.length === 0) {
    issues.push({
      code: "missing-description",
      severity: "warning",
      message: "Meta description ausente",
    });
  } else if (page.description.length < 120) {
    issues.push({
      code: "short-description",
      severity: "info",
      message: `Description curta (${page.description.length} chars, ideal 120-160)`,
    });
  } else if (page.description.length > 160) {
    issues.push({
      code: "long-description",
      severity: "info",
      message: `Description longa (${page.description.length} chars, ideal 120-160)`,
    });
  }

  // Headings
  if (page.h1Count === 0) {
    issues.push({
      code: "missing-h1",
      severity: "warning",
      message: "Sem H1 na página",
    });
  } else if (page.h1Count > 1) {
    issues.push({
      code: "multiple-h1",
      severity: "warning",
      message: `${page.h1Count} tags H1 (ideal: 1)`,
    });
  }

  // Canonical
  if (!page.canonical) {
    issues.push({
      code: "missing-canonical",
      severity: "info",
      message: "Canonical ausente",
    });
  }

  // Imagens sem alt
  if (page.imagesWithoutAlt > 0) {
    issues.push({
      code: "images-without-alt",
      severity: "warning",
      message: `${page.imagesWithoutAlt} de ${page.imageCount} imagens sem alt`,
    });
  }

  // Conteúdo thin
  if (page.wordCount < 300 && statusCode === 200) {
    issues.push({
      code: "thin-content",
      severity: "info",
      message: `Conteúdo curto (${page.wordCount} palavras)`,
    });
  }

  // Open Graph
  if (!page.ogTitle) {
    issues.push({
      code: "missing-og-title",
      severity: "info",
      message: "og:title ausente",
    });
  }
  if (!page.ogImage) {
    issues.push({
      code: "missing-og-image",
      severity: "info",
      message: "og:image ausente",
    });
  }

  // Structured data
  if (page.jsonLdCount === 0) {
    issues.push({
      code: "missing-structured-data",
      severity: "info",
      message: "Sem structured data (JSON-LD)",
    });
  }

  // Robots
  if (page.robots && /noindex/i.test(page.robots)) {
    issues.push({
      code: "noindex",
      severity: "error",
      message: "Página marcada como noindex",
    });
  }

  return issues;
}
