/**
 * Calcula o Score SEO geral + subscores a partir do raw_report do Lighthouse.
 *
 * Recebe opcionalmente o HTML bruto da página pra extrair `<title>` e
 * `<meta name="description">` diretamente — o Lighthouse 12 deixou de
 * expor esses valores em `audits.document-title.details.items`.
 */
export interface SeoCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SeoScoreResult {
  overall: number;
  subscores: {
    technical: number;
    content: number;
    structure: number;
    performance: number;
    accessibility: number;
  };
  details: {
    technical: SeoCheck[];
    content: SeoCheck[];
    structure: SeoCheck[];
  };
}

// ============================================================
// Helpers de HTML
// ============================================================
function extractTitleFromHtml(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return m[1].trim();
}

function extractDescriptionFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i,
    /<meta[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

export function calculateSeoScore(
  raw: any,
  lighthouseScores: {
    performance: number | null;
    accessibility: number | null;
  },
  html?: string
): SeoScoreResult {
  const audits = raw?.audits ?? {};

  const auditScore = (auditId: string): number | null => {
    const s = audits[auditId]?.score;
    return typeof s === "number" ? Math.round(s * 100) : null;
  };

  const auditNumeric = (auditId: string): number | null => {
    const v = audits[auditId]?.numericValue;
    return typeof v === "number" ? v : null;
  };

  // ================================================================
  // 1. TÉCNICO
  // ================================================================
  const techChecks: SeoCheck[] = [];

  const titleScore = auditScore("document-title");
  const titleOk = titleScore != null && titleScore >= 90;
  techChecks.push({
    name: "Title presente",
    ok: titleOk,
    detail: titleOk ? "Presente e válido" : "Ausente ou inválido",
  });

  const descScore = auditScore("meta-description");
  const descOk = descScore != null && descScore >= 90;
  techChecks.push({
    name: "Meta description",
    ok: descOk,
    detail: descOk ? "Presente e válida" : "Ausente ou curta/longa",
  });

  const httpsScore = auditScore("is-on-https");
  const httpsOk = httpsScore != null && httpsScore >= 90;
  techChecks.push({
    name: "HTTPS",
    ok: httpsOk,
    detail: httpsOk ? "Conexão segura" : "Sem HTTPS",
  });

  const canonicalScore = auditScore("canonical");
  const canonicalOk = canonicalScore != null && canonicalScore >= 90;
  techChecks.push({
    name: "Canonical",
    ok: canonicalOk,
    detail: canonicalOk ? "Presente" : "Ausente",
  });

  const robotsAudit = audits["robots-txt"];
  const robotsOk = robotsAudit?.score == null || robotsAudit.score >= 0.9;
  techChecks.push({
    name: "Robots.txt",
    ok: robotsOk,
    detail: robotsOk ? "OK" : "Configuração restritiva detectada",
  });

  const crawlScore = auditScore("is-crawlable");
  const crawlOk = crawlScore != null && crawlScore >= 90;
  techChecks.push({
    name: "Página indexável",
    ok: crawlOk,
    detail: crawlOk ? "Indexável" : "Bloqueada por noindex",
  });

  // Structured data: procura JSON-LD no HTML (mais confiável que o audit
      // "plugins" do Lighthouse, que só detecta plugins específicos)
      let hasStructuredData = false;
      if (html) {
        hasStructuredData = /<script[^>]*type=["']application\/ld\+json["']/i.test(
          html
        );
      } else {
        const pluginsAudit = audits["plugins"];
        hasStructuredData =
          pluginsAudit?.score != null && pluginsAudit.score >= 0.5;
      }
  techChecks.push({
    name: "Structured data",
    ok: hasStructuredData,
    detail: hasStructuredData ? "Detectado" : "Ausente",
  });

  const hreflangAudit = audits["hreflang"];
  const hreflangOk =
    hreflangAudit?.score == null || hreflangAudit.score >= 0.9;
  techChecks.push({
    name: "Hreflang",
    ok: hreflangOk,
    detail: hreflangOk ? "OK / Não aplicável" : "Com erros",
  });

  const technicalScore = Math.round(
    (techChecks.filter((c) => c.ok).length / techChecks.length) * 100
  );

  // ================================================================
  // 2. CONTEÚDO — extrai título/description do HTML quando disponível
  // ================================================================
  const contentChecks: SeoCheck[] = [];

  let titleText = "";
  if (html) {
    titleText = extractTitleFromHtml(html) ?? "";
  }

  const titleLen = titleText.length;
  const titleLenOk = titleLen >= 30 && titleLen <= 60;
  contentChecks.push({
    name: "Tamanho do title",
    ok: titleLenOk,
    detail:
      titleLen === 0
        ? "Ausente"
        : `${titleLen} chars (ideal: 30-60)`,
  });

  let descText = "";
  if (html) {
    descText = extractDescriptionFromHtml(html) ?? "";
  }
  const descLen = descText.length;
  const descLenOk = descLen >= 120 && descLen <= 160;
  contentChecks.push({
    name: "Tamanho da description",
    ok: descLenOk,
    detail:
      descLen === 0
        ? "Ausente"
        : `${descLen} chars (ideal: 120-160)`,
  });

  const h1Audit = audits["heading-order"];
  const h1Ok = h1Audit?.score != null && h1Audit.score >= 0.9;
  contentChecks.push({
    name: "Hierarquia de headings",
    ok: h1Ok,
    detail: h1Ok ? "Correta" : "Ordem incorreta",
  });

  const domSize = auditNumeric("dom-size") ?? 0;
  const wordCountOk = domSize > 0 && domSize < 3000;
  contentChecks.push({
    name: "Estrutura do documento",
    ok: wordCountOk,
    detail: wordCountOk ? "Tamanho adequado" : "Documento muito extenso",
  });

  const linkTextScore = auditScore("link-text");
  const linkTextOk = linkTextScore != null && linkTextScore >= 90;
  contentChecks.push({
    name: "Texto dos links",
    ok: linkTextOk,
    detail: linkTextOk ? "Descritivos" : "Links sem descrição clara",
  });

  const fontSizeScore = auditScore("font-size");
  const fontSizeOk = fontSizeScore != null && fontSizeScore >= 90;
  contentChecks.push({
    name: "Legibilidade do texto",
    ok: fontSizeOk,
    detail: fontSizeOk ? "Tamanho adequado" : "Fonte muito pequena",
  });

  const contentScore = Math.round(
    (contentChecks.filter((c) => c.ok).length / contentChecks.length) * 100
  );

  // ================================================================
  // 3. ESTRUTURA
  // ================================================================
  const structureChecks: SeoCheck[] = [];

  const altScore = auditScore("image-alt");
  const altOk = altScore != null && altScore >= 90;
  structureChecks.push({
    name: "Alt em imagens",
    ok: altOk,
    detail: altOk ? "Todas com alt" : "Imagens sem alt",
  });

  const crawlableScore = auditScore("crawlable-anchors");
  const crawlableOk = crawlableScore != null && crawlableScore >= 90;
  structureChecks.push({
    name: "Âncoras rastreáveis",
    ok: crawlableOk,
    detail: crawlableOk ? "OK" : "Âncoras problemáticas",
  });

  const tapScore = auditScore("tap-targets");
  const tapOk = tapScore != null && tapScore >= 90;
  structureChecks.push({
    name: "Alvos de toque",
    ok: tapOk,
    detail: tapOk ? "Adequados" : "Muito pequenos/próximos",
  });

  structureChecks.push({
    name: "Hreflang",
    ok: hreflangOk,
    detail: hreflangOk ? "OK / Não aplicável" : "Com erros",
  });

  const relPreconnectOk =
    audits["uses-rel-preconnect"]?.score == null ||
    audits["uses-rel-preconnect"]?.score >= 0.5;
  structureChecks.push({
    name: "Pré-conexões externas",
    ok: relPreconnectOk,
    detail: relPreconnectOk ? "OK" : "Otimizável",
  });

  const structureScore = Math.round(
    (structureChecks.filter((c) => c.ok).length / structureChecks.length) * 100
  );

  // ================================================================
  // 4. PERFORMANCE e 5. ACESSIBILIDADE
  // ================================================================
  const perfScore = lighthouseScores.performance ?? 0;
  const a11yScore = lighthouseScores.accessibility ?? 0;

  // ================================================================
  // SCORE GERAL
  // ================================================================
  const weights = {
    technical: 0.25,
    content: 0.25,
    structure: 0.15,
    performance: 0.2,
    accessibility: 0.15,
  };

  const overall = Math.round(
    technicalScore * weights.technical +
      contentScore * weights.content +
      structureScore * weights.structure +
      perfScore * weights.performance +
      a11yScore * weights.accessibility
  );

  return {
    overall,
    subscores: {
      technical: technicalScore,
      content: contentScore,
      structure: structureScore,
      performance: perfScore,
      accessibility: a11yScore,
    },
    details: {
      technical: techChecks,
      content: contentChecks,
      structure: structureChecks,
    },
  };
}
