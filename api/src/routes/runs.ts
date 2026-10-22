import type { FastifyInstance } from "fastify";
import { queryOne, query } from "../db/client.js";
import { calculateSeoScore } from "../lighthouse/seo-score.js";
import { analyzeImages, analyzeFonts } from "../lighthouse/infra-parser.js";

const GENERATOR_REGEX = new RegExp(
  '<meta[^>]*name="generator"[^>]*content="([^"]+)"',
  "i"
);

function labelForResourceType(type: string): string {
  const map: Record<string, string> = {
    document: "Document",
    script: "Script",
    stylesheet: "Stylesheet",
    image: "Imagem",
    font: "Fonte",
    media: "Mídia",
    xhr: "XHR",
    fetch: "Fetch",
    "third-party": "Terceiros",
    other: "Outros",
  };
  return map[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function bytesToNumber(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function buildResourceMap(raw: any): Map<string, any> {
  const map = new Map<string, any>();
  const items = raw?.audits?.["network-requests"]?.details?.items ?? [];
  const mainUrl = raw?.finalDisplayedUrl ?? raw?.finalUrl ?? "";
  let mainDomain = "";
  try {
    mainDomain = new URL(mainUrl).hostname;
  } catch {
    /* deixa vazio */
  }

  for (const it of items) {
    const url: string = it.url ?? "";
    if (!url) continue;
    let domain = "";
    let fileName = url;
    try {
      const u = new URL(url);
      domain = u.hostname;
      fileName = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    } catch {
      /* mantém padrão */
    }

    map.set(url, {
      url,
      fileName,
      domain,
      type: (it.resourceType ?? "other") as string,
      thirdParty: mainDomain !== "" && domain !== "" && domain !== mainDomain,
      transferBytes: bytesToNumber(it.transferSize),
      durationMs:
        typeof it.networkEndTime === "number" && typeof it.networkRequestTime === "number"
          ? Math.round(it.networkEndTime - it.networkRequestTime)
          : null,
    });
  }
  return map;
}

function extractOpportunities(raw: any): Map<string, any> {
  const map = new Map<string, any>();
  const audits = raw?.audits ?? {};
  for (const [id, audit] of Object.entries<any>(audits)) {
    if (!audit) continue;
    if (audit.scoreDisplayMode === "notApplicable") continue;
    if (audit.scoreDisplayMode === "informative" && !audit.displayValue) continue;
    if (audit.score == null && !audit.displayValue) continue;
    if (audit.score != null && audit.score >= 0.9) continue;

    if (
      [
        "first-contentful-paint",
        "largest-contentful-paint",
        "speed-index",
        "total-blocking-time",
        "cumulative-layout-shift",
        "interactive",
      ].includes(id)
    ) {
      continue;
    }

    map.set(id, {
      id,
      title: audit.title ?? id,
      displayValue: audit.displayValue ?? null,
      score: audit.score ?? null,
      description: audit.description ?? "",
    });
  }
  return map;
}

export default async function runsRoutes(app: FastifyInstance) {
  // GET /api/runs/compare?a=X&b=Y
  app.get<{
    Querystring: { a?: string; b?: string };
  }>("/api/runs/compare", async (req, reply) => {
    const aId = Number(req.query.a);
    const bId = Number(req.query.b);

    if (!Number.isFinite(aId) || !Number.isFinite(bId)) {
      return reply.code(400).send({ error: "parâmetros 'a' e 'b' obrigatórios" });
    }
    if (aId === bId) {
      return reply.code(400).send({ error: "as runs precisam ser diferentes" });
    }

    const [runA, runB] = await Promise.all([
      queryOne<any>(`SELECT * FROM runs WHERE id = $1`, [aId]),
      queryOne<any>(`SELECT * FROM runs WHERE id = $1`, [bId]),
    ]);

    if (!runA || !runB) {
      return reply.code(404).send({ error: "run não encontrada" });
    }
    if (runA.site_id !== runB.site_id) {
      return reply.code(400).send({ error: "as runs precisam ser do mesmo site" });
    }

    function delta(a: any, b: any): number | null {
      if (a == null || b == null) return null;
      const na = Number(a);
      const nb = Number(b);
      if (!isFinite(na) || !isFinite(nb)) return null;
      return Number((nb - na).toFixed(4));
    }

    const deltas = {
      performance: delta(runA.performance, runB.performance),
      accessibility: delta(runA.accessibility, runB.accessibility),
      best_practices: delta(runA.best_practices, runB.best_practices),
      seo: delta(runA.seo, runB.seo),
      lcp_ms: delta(runA.lcp_ms, runB.lcp_ms),
      fcp_ms: delta(runA.fcp_ms, runB.fcp_ms),
      cls: delta(runA.cls, runB.cls),
      tbt_ms: delta(runA.tbt_ms, runB.tbt_ms),
      ttfb_ms: delta(runA.ttfb_ms, runB.ttfb_ms),
      speed_index_ms: delta(runA.speed_index_ms, runB.speed_index_ms),
    };

    const resA = buildResourceMap(runA.raw_report);
    const resB = buildResourceMap(runB.raw_report);

    const added: any[] = [];
    const removed: any[] = [];
    const grown: any[] = [];

    for (const [url, itemB] of resB.entries()) {
      const itemA = resA.get(url);
      if (!itemA) {
        added.push(itemB);
      } else {
        const grew = itemB.transferBytes - itemA.transferBytes;
        const grewPct = itemA.transferBytes > 0 ? grew / itemA.transferBytes : 0;
        if (grew > 0 && (grewPct > 0.1 || grew > 50 * 1024)) {
          grown.push({
            ...itemB,
            previousBytes: itemA.transferBytes,
            deltaBytes: grew,
            deltaPct: Math.round(grewPct * 100),
          });
        }
      }
    }

    for (const [url, itemA] of resA.entries()) {
      if (!resB.has(url)) {
        removed.push(itemA);
      }
    }

    added.sort((a, b) => b.transferBytes - a.transferBytes);
    removed.sort((a, b) => b.transferBytes - a.transferBytes);
    grown.sort((a, b) => b.deltaBytes - a.deltaBytes);

    const resourcesDiff = {
      added: added.slice(0, 5),
      removed: removed.slice(0, 5),
      grown: grown.slice(0, 5),
      totals: {
        addedBytes: added.reduce((s, r) => s + r.transferBytes, 0),
        removedBytes: removed.reduce((s, r) => s + r.transferBytes, 0),
        grownBytes: grown.reduce((s, r) => s + r.deltaBytes, 0),
        addedCount: added.length,
        removedCount: removed.length,
        grownCount: grown.length,
      },
    };

    const oppA = extractOpportunities(runA.raw_report);
    const oppB = extractOpportunities(runB.raw_report);

    const newOpps: any[] = [];
    const resolvedOpps: any[] = [];

    for (const [id, itemB] of oppB.entries()) {
      if (!oppA.has(id)) newOpps.push(itemB);
    }
    for (const [id, itemA] of oppA.entries()) {
      if (!oppB.has(id)) resolvedOpps.push(itemA);
    }

    newOpps.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
    resolvedOpps.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

    const opportunitiesDiff = {
      new: newOpps,
      resolved: resolvedOpps,
    };

    return {
      a: {
        id: runA.id,
        finished_at: runA.finished_at,
        performance: runA.performance,
        accessibility: runA.accessibility,
        best_practices: runA.best_practices,
        seo: runA.seo,
        lcp_ms: runA.lcp_ms,
        fcp_ms: runA.fcp_ms,
        cls: runA.cls,
        tbt_ms: runA.tbt_ms,
        ttfb_ms: runA.ttfb_ms,
        speed_index_ms: runA.speed_index_ms,
      },
      b: {
        id: runB.id,
        finished_at: runB.finished_at,
        performance: runB.performance,
        accessibility: runB.accessibility,
        best_practices: runB.best_practices,
        seo: runB.seo,
        lcp_ms: runB.lcp_ms,
        fcp_ms: runB.fcp_ms,
        cls: runB.cls,
        tbt_ms: runB.tbt_ms,
        ttfb_ms: runB.ttfb_ms,
        speed_index_ms: runB.speed_index_ms,
      },
      deltas,
      resourcesDiff,
      opportunitiesDiff,
    };
  });

  // GET /api/runs/:id/waterfall
  app.get<{ Params: { id: string } }>("/api/runs/:id/waterfall", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ raw_report: any }>(
      `SELECT raw_report FROM runs WHERE id = $1`,
      [id]
    );

    if (!run) return reply.code(404).send({ error: "run não encontrada" });
    if (!run.raw_report) {
      return reply.code(404).send({ error: "run sem raw_report" });
    }

    const raw = run.raw_report;
    const audits = raw?.audits ?? {};

    const mainUrl = raw?.finalDisplayedUrl ?? raw?.finalUrl ?? "";
    let mainDomain = "";
    try {
      mainDomain = new URL(mainUrl).hostname;
    } catch {
      /* deixa vazio */
    }

    const netItems = audits["network-requests"]?.details?.items ?? [];

    const lastEnd = Math.max(
      ...netItems.map((it: any) => it.networkEndTime ?? 0),
      0
    );
    const isMicroseconds = lastEnd > 100_000;
    const toMs = (v: number | undefined | null): number =>
      typeof v === "number" ? (isMicroseconds ? v / 1000 : v) : 0;

    const totalDurationMs = toMs(lastEnd);

    const resources = netItems
      .map((it: any) => {
        const url: string = it.url ?? "";
        if (!url) return null;

        let domain = "";
        let fileName = url;
        try {
          const u = new URL(url);
          domain = u.hostname;
          fileName = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
        } catch {
          /* mantém padrão */
        }

        const startMs = toMs(it.networkRequestTime);
        const endMs = toMs(it.networkEndTime);
        const durationMs = Math.max(0, endMs - startMs);

        const thirdParty =
          mainDomain !== "" && domain !== "" && domain !== mainDomain;

        let ttfbMs = 0;
        let downloadMs = durationMs;

        if (it.resourceType === "Document" && it.mimeType?.startsWith("text/html")) {
          const ttfbAudit = audits["server-response-time"]?.numericValue;
          if (typeof ttfbAudit === "number" && ttfbAudit > 0) {
            ttfbMs = Math.min(ttfbAudit, durationMs);
            downloadMs = Math.max(0, durationMs - ttfbMs);
          }
        }

        return {
          url,
          fileName,
          domain,
          type: (it.resourceType ?? "other") as string,
          thirdParty,
          startMs: Math.round(startMs),
          endMs: Math.round(endMs),
          durationMs: Math.round(durationMs),
          transferBytes: it.transferSize ?? 0,
          statusCode: it.statusCode ?? null,
          phases: {
            dnsMs: 0,
            tcpMs: 0,
            sslMs: 0,
            ttfbMs,
            downloadMs,
          },
        };
      })
      .filter((r: any) => r != null)
      .sort((a: any, b: any) => a.startMs - b.startMs);

    return {
      totalDurationMs: Math.round(totalDurationMs),
      resources,
    };
  });

  // GET /api/runs/:id/seo-score
  app.get<{ Params: { id: string } }>("/api/runs/:id/seo-score", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{
      raw_report: any;
      performance: number | null;
      accessibility: number | null;
      site_id: number;
    }>(
      `SELECT raw_report, performance, accessibility, site_id FROM runs WHERE id = $1`,
      [id]
    );

    if (!run) return reply.code(404).send({ error: "run não encontrada" });
    if (!run.raw_report) {
      return reply.code(404).send({ error: "run sem raw_report" });
    }

    // Busca a URL do site pra fazer fetch do HTML
    const site = await queryOne<{ url: string }>(
      `SELECT url FROM sites WHERE id = $1`,
      [run.site_id]
    );

    // Busca HTML pra extrair title/description corretos
    let html = "";
    if (site?.url) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        const resp = await fetch(site.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
          },
        });
        clearTimeout(timer);
        if (resp.ok) html = await resp.text();
      } catch {
        /* segue sem HTML */
      }
    }

    return calculateSeoScore(
      run.raw_report,
      {
        performance: run.performance,
        accessibility: run.accessibility,
      },
      html
    );
  });

  // GET /api/runs/:id/seo-technical
  app.get<{ Params: { id: string } }>("/api/runs/:id/seo-technical", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ site_id: number }>(
      `SELECT site_id FROM runs WHERE id = $1`,
      [id]
    );
    if (!run) return reply.code(404).send({ error: "run não encontrada" });

    const site = await queryOne<{ url: string }>(
      `SELECT url FROM sites WHERE id = $1`,
      [run.site_id]
    );
    if (!site) return reply.code(404).send({ error: "site não encontrado" });

    let html = "";
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(site.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
        },
      });
      clearTimeout(timer);
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (err) {
      return reply.code(502).send({
        error: "falha ao buscar HTML do site",
        detail: (err as Error).message,
      });
    }

    function metaContent(nameOrProp: string): string | null {
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
        if (m && m[1]) return m[1];
      }
      return null;
    }

    function hasMeta(nameOrProp: string): boolean {
      return metaContent(nameOrProp) != null;
    }

    const ogTags = [
      "og:title",
      "og:description",
      "og:image",
      "og:url",
      "og:type",
      "og:site_name",
    ];
    const openGraph = ogTags.map((tag) => ({
      tag,
      present: hasMeta(tag),
      value: metaContent(tag),
    }));

    const twitterTags = [
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
      "twitter:site",
    ];
    const twitterCards = twitterTags.map((tag) => ({
      tag,
      present: hasMeta(tag),
      value: metaContent(tag),
    }));

    const canonicalMatch = html.match(
      /<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']*)["']/i
    );
    const canonical = canonicalMatch ? canonicalMatch[1] : null;

    const robotsContent = metaContent("robots");
    const isNoindex = robotsContent ? /noindex/i.test(robotsContent) : false;
    const isNofollow = robotsContent ? /nofollow/i.test(robotsContent) : false;

    const hreflangMatches = [
      ...html.matchAll(
        /<link[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']*)["'][^>]*\bhref=["']([^"']*)["']/gi
      ),
    ];
    const hreflang = hreflangMatches.map((m) => ({
      lang: m[1],
      url: m[2],
    }));

    const jsonLdMatches = [
      ...html.matchAll(
        /<script[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      ),
    ];
    const jsonLdRaw = jsonLdMatches.map((m) => m[1].trim());
    const jsonLd = jsonLdRaw.map((raw, idx) => {
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        return {
          index: idx,
          valid: true,
          types: items.map((it: any) => it["@type"] ?? "?"),
          preview: JSON.stringify(items[0] ?? {}, null, 2).slice(0, 300),
        };
      } catch {
        return {
          index: idx,
          valid: false,
          types: [] as string[],
          preview: raw.slice(0, 300),
        };
      }
    });

    const title =
      metaContent("title") ??
      (() => {
        const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return m ? m[1].trim() : null;
      })();

    const metaDescription = metaContent("description");
    const ogTitle = metaContent("og:title");
    const ogDescription = metaContent("og:description");
    const ogImage = metaContent("og:image");
    const ogSiteName = metaContent("og:site_name");

    const serpPreview = {
      title: ogTitle ?? title ?? "(sem título)",
      description: metaDescription ?? ogDescription ?? "(sem descrição)",
      url: site.url,
      siteName: ogSiteName,
    };

    const ogOk = openGraph.filter((t) => t.present).length;
    const twOk = twitterCards.filter((t) => t.present).length;

    const summary = {
      openGraphScore: Math.round((ogOk / ogTags.length) * 100),
      twitterScore: Math.round((twOk / twitterTags.length) * 100),
      canonicalOk: canonical != null,
      indexable: !isNoindex,
      hreflangCount: hreflang.length,
      jsonLdCount: jsonLd.length,
      jsonLdValid: jsonLd.filter((j) => j.valid).length,
      hasOgImage: ogImage != null,
      hasTwitterCard: hasMeta("twitter:card"),
    };

    return {
      summary,
      openGraph,
      twitterCards,
      canonical,
      robots: {
        value: robotsContent,
        noindex: isNoindex,
        nofollow: isNofollow,
      },
      hreflang,
      jsonLd,
      serpPreview,
    };
  });

  // GET /api/runs/:id/screenshots
  app.get<{ Params: { id: string } }>("/api/runs/:id/screenshots", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ raw_report: any }>(
      `SELECT raw_report FROM runs WHERE id = $1`,
      [id]
    );

    if (!run) return reply.code(404).send({ error: "run não encontrada" });
    if (!run.raw_report) {
      return reply.code(404).send({ error: "run sem raw_report" });
    }

    const raw = run.raw_report;

    const finalAudit = raw?.audits?.["final-screenshot"];
    const finalData = finalAudit?.details?.data ?? null;
    const finalWidth = finalAudit?.details?.width ?? null;
    const finalHeight = finalAudit?.details?.height ?? null;

    const thumbsAudit = raw?.audits?.["screenshot-thumbnails"];
    const items = thumbsAudit?.details?.items ?? [];

    const filmstrip = items
      .map((it: any) => ({
        data: it.data ?? null,
        timing: typeof it.timing === "number" ? it.timing : null,
        width: it.width ?? null,
        height: it.height ?? null,
      }))
      .filter((f: any) => f.data != null);

    const lastFrame = filmstrip[filmstrip.length - 1];
    const totalDurationMs = lastFrame?.timing ?? null;

    return {
      final: finalData
        ? { data: finalData, width: finalWidth, height: finalHeight }
        : null,
      filmstrip,
      totalDurationMs,
    };
  });

  // GET /api/runs/:id — detalhe de uma run
  app.get<{ Params: { id: string }; Querystring: { raw?: string } }>(
    "/api/runs/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

      const includeRaw = req.query.raw === "1";

      const columns = includeRaw
        ? "*"
        : `id, site_id, status, started_at, finished_at, error,
           performance, accessibility, best_practices, seo,
           lcp_ms, fcp_ms, cls, tbt_ms, ttfb_ms, speed_index_ms,
           seo_score, seo_subscores`;

      const run = await queryOne(
        `SELECT ${columns} FROM runs WHERE id = $1`,
        [id]
      );

      if (!run) return reply.code(404).send({ error: "run não encontrada" });
      return run;
    }
  );

  // GET /api/runs/:id/resources
  app.get<{ Params: { id: string } }>("/api/runs/:id/resources", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ raw_report: any }>(
      `SELECT raw_report FROM runs WHERE id = $1`,
      [id]
    );

    if (!run) return reply.code(404).send({ error: "run não encontrada" });
    if (!run.raw_report) {
      return reply.code(404).send({ error: "run sem raw_report" });
    }

    const raw = run.raw_report;

    const summaryAudit = raw?.audits?.["resource-summary"];
    const summaryItems = summaryAudit?.details?.items ?? [];

    const summary = summaryItems
      .filter((it: any) => it.resourceType !== "total")
      .map((it: any) => ({
        type: it.resourceType as string,
        label: labelForResourceType(it.resourceType),
        count: it.requestCount ?? 0,
        bytes: it.transferSize ?? 0,
      }));

    const totals = summaryItems.find((it: any) => it.resourceType === "total");
    const totalBytes = totals?.transferSize ?? 0;
    const totalRequests = totals?.requestCount ?? 0;

    const netAudit = raw?.audits?.["network-requests"];
    const netItems = netAudit?.details?.items ?? [];

    const mainUrl = raw?.finalDisplayedUrl ?? raw?.finalUrl ?? "";
    let mainDomain = "";
    try {
      mainDomain = new URL(mainUrl).hostname;
    } catch {
      /* deixa vazio */
    }

    const requests = netItems.map((it: any) => {
      const url: string = it.url ?? "";
      let domain = "";
      let fileName = url;
      try {
        const u = new URL(url);
        domain = u.hostname;
        fileName = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
      } catch {
        /* mantém padrão */
      }

      const thirdParty = mainDomain !== "" && domain !== "" && domain !== mainDomain;

      const durationMs =
        typeof it.networkEndTime === "number" && typeof it.networkRequestTime === "number"
          ? Math.round(it.networkEndTime - it.networkRequestTime)
          : null;

      return {
        url,
        fileName,
        domain,
        type: (it.resourceType ?? "other") as string,
        thirdParty,
        transferBytes: it.transferSize ?? 0,
        resourceBytes: it.resourceSize ?? 0,
        durationMs,
        statusCode: it.statusCode ?? null,
        mimeType: it.mimeType ?? null,
      };
    });

    const topRequests = requests
      .filter((r: any) => r.transferBytes > 0)
      .sort((a: any, b: any) => b.transferBytes - a.transferBytes)
      .slice(0, 6);

    const thirdPartyCount = requests.filter((r: any) => r.thirdParty).length;

    return {
      summary,
      topRequests,
      totalBytes,
      totalRequests,
      thirdPartyCount,
    };
  });

  // POST /api/admin/backfill-seo
  // Rota temporária: calcula seo_score das runs antigas que ainda têm NULL
  app.post("/api/admin/backfill-seo", async () => {
    const runs = await query<{
      id: number;
      raw_report: any;
      performance: number | null;
      accessibility: number | null;
    }>(
      `SELECT id, raw_report, performance, accessibility
       FROM runs
       WHERE status = 'done' AND raw_report IS NOT NULL AND seo_score IS NULL`
    );

    let updated = 0;
    for (const run of runs) {
      try {
        const result = calculateSeoScore(run.raw_report, {
          performance: run.performance,
          accessibility: run.accessibility,
        });
        await query(
          `UPDATE runs SET seo_score = $1, seo_subscores = $2 WHERE id = $3`,
          [result.overall, JSON.stringify(result.subscores), run.id]
        );
        updated++;
      } catch (err) {
        console.error(
          `[backfill] falha na run ${run.id}:`,
          (err as Error).message
        );
      }
    }

    return { updated, total: runs.length };
  });

  // GET /api/runs/:id/pages
  // Lista todas as páginas rastreadas de uma run
  app.get<{ Params: { id: string } }>("/api/runs/:id/pages", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const pages = await query(
      `SELECT
         id, url, final_url, status_code, response_ms, error,
         title, description, canonical, robots,
         h1_count, h2_count, h3_count,
         og_title, og_description, og_image, twitter_card,
         json_ld_count, json_ld_types,
         word_count, image_count, images_without_alt,
         internal_links, external_links,
         issues, raw_html_size, created_at
       FROM page_audits
       WHERE run_id = $1
       ORDER BY
         CASE
           WHEN status_code IS NULL THEN 3
           WHEN status_code >= 400 THEN 0
           WHEN status_code >= 300 THEN 1
           ELSE 2
         END,
         id ASC`,
      [id]
    );

    return pages;
  });

  // GET /api/runs/:id/security
  // Analisa headers de segurança do site
  app.get<{ Params: { id: string } }>("/api/runs/:id/security", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ site_id: number }>(
      `SELECT site_id FROM runs WHERE id = $1`,
      [id]
    );
    if (!run) return reply.code(404).send({ error: "run não encontrada" });

    const site = await queryOne<{ url: string }>(
      `SELECT url FROM sites WHERE id = $1`,
      [run.site_id]
    );
    if (!site) return reply.code(404).send({ error: "site não encontrado" });

    // Fetch do site com redirect seguido
    let finalUrl = site.url;
    let headers: Record<string, string> = {};
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(site.url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
        },
      });
      clearTimeout(timer);
      finalUrl = resp.url || site.url;
      // Normaliza headers pra lowercase
      for (const [key, value] of resp.headers.entries()) {
        headers[key.toLowerCase()] = value;
      }
    } catch (err) {
      return reply.code(502).send({
        error: "falha ao buscar site",
        detail: (err as Error).message,
      });
    }

    // ============================================================
    // Análise de cada header
    // ============================================================

    interface HeaderCheck {
      name: string;
      present: boolean;
      value: string | null;
      valid: boolean;
      severity: "critical" | "high" | "medium" | "low";
      description: string;
      recommendation: string;
    }

    const checks: HeaderCheck[] = [];

    // 1. Strict-Transport-Security (HSTS)
    const hsts = headers["strict-transport-security"];
    const hstsValid = hsts != null && /max-age=\d+/.test(hsts) && parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0") >= 31536000;
    checks.push({
      name: "Strict-Transport-Security",
      present: hsts != null,
      value: hsts ?? null,
      valid: hstsValid,
      severity: "high",
      description: "Força o navegador a usar HTTPS em todas as conexões futuras.",
      recommendation: hsts
        ? (hstsValid ? "Configurado corretamente" : "max-age recomendado é 31536000 (1 ano)")
        : "Adicione: Strict-Transport-Security: max-age=31536000; includeSubDomains",
    });

    // 2. Content-Security-Policy (CSP)
    const csp = headers["content-security-policy"];
    const cspValid = csp != null && csp.length > 20; // Simplificado
    checks.push({
      name: "Content-Security-Policy",
      present: csp != null,
      value: csp ?? null,
      valid: cspValid,
      severity: "critical",
      description: "Previne ataques XSS e injeção de código.",
      recommendation: csp
        ? (cspValid ? "Configurado" : "Verifique a política — muito permissiva")
        : "Adicione uma CSP básica: Content-Security-Policy: default-src 'self'",
    });

    // 3. X-Frame-Options
    const xfo = headers["x-frame-options"];
    const xfoValid = xfo != null && /^(DENY|SAMEORIGIN)$/i.test(xfo.trim());
    checks.push({
      name: "X-Frame-Options",
      present: xfo != null,
      value: xfo ?? null,
      valid: xfoValid,
      severity: "high",
      description: "Previne ataques de clickjacking (iframe malicioso).",
      recommendation: xfo
        ? (xfoValid ? "Configurado corretamente" : "Valores válidos: DENY ou SAMEORIGIN")
        : "Adicione: X-Frame-Options: SAMEORIGIN",
    });

    // 4. X-Content-Type-Options
    const xcto = headers["x-content-type-options"];
    const xctoValid = xcto != null && xcto.toLowerCase().includes("nosniff");
    checks.push({
      name: "X-Content-Type-Options",
      present: xcto != null,
      value: xcto ?? null,
      valid: xctoValid,
      severity: "medium",
      description: "Previne ataques de MIME sniffing.",
      recommendation: xcto
        ? (xctoValid ? "Configurado corretamente" : "Valor válido: nosniff")
        : "Adicione: X-Content-Type-Options: nosniff",
    });

    // 5. Referrer-Policy
    const rp = headers["referrer-policy"];
    const rpValid = rp != null && rp.length > 0;
    checks.push({
      name: "Referrer-Policy",
      present: rp != null,
      value: rp ?? null,
      valid: rpValid,
      severity: "low",
      description: "Controla quais informações de referrer são enviadas.",
      recommendation: rp
        ? (rpValid ? "Configurado" : "Considere: strict-origin-when-cross-origin")
        : "Adicione: Referrer-Policy: strict-origin-when-cross-origin",
    });

    // 6. Permissions-Policy
    const pp = headers["permissions-policy"];
    const ppValid = pp != null && pp.length > 0;
    checks.push({
      name: "Permissions-Policy",
      present: pp != null,
      value: pp ?? null,
      valid: ppValid,
      severity: "low",
      description: "Controla quais APIs do navegador o site pode usar.",
      recommendation: pp
        ? (ppValid ? "Configurado" : "Verifique a configuração")
        : "Adicione: Permissions-Policy: geolocation=(), microphone=(), camera=()",
    });

    // ============================================================
    // Score geral
    // ============================================================
    // Cada check contribui com base na severidade
    const weights = { critical: 25, high: 20, medium: 15, low: 10 };
    let maxScore = 0;
    let earnedScore = 0;
    for (const check of checks) {
      const weight = weights[check.severity];
      maxScore += weight;
      if (check.valid) earnedScore += weight;
      else if (check.present) earnedScore += weight * 0.5; // presente mas inválido
    }
    const score = Math.round((earnedScore / maxScore) * 100);

    // ============================================================
    // Cabeçalhos extras (informação)
    // ============================================================
    const extraHeaders = {
      server: headers["server"] ?? null,
      poweredBy: headers["x-powered-by"] ?? null,
      contentType: headers["content-type"] ?? null,
      cacheControl: headers["cache-control"] ?? null,
    };

    return {
      score,
      finalUrl,
      checks,
      extraHeaders,
      isHttps: finalUrl.startsWith("https://"),
    };
  });

  // GET /api/pages/:id
  // Detalhe de uma página rastreada
  app.get<{ Params: { id: string } }>("/api/pages/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const page = await queryOne(
      `SELECT * FROM page_audits WHERE id = $1`,
      [id]
    );

    if (!page) return reply.code(404).send({ error: "página não encontrada" });
    return page;
  });

  // GET /api/runs/:id/infra
  // Detecta tecnologias e analisa compressão
  app.get<{ Params: { id: string } }>("/api/runs/:id/infra", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    const run = await queryOne<{ site_id: number }>(
      `SELECT site_id FROM runs WHERE id = $1`,
      [id]
    );
    if (!run) return reply.code(404).send({ error: "run não encontrada" });

    const site = await queryOne<{ url: string }>(
      `SELECT url FROM sites WHERE id = $1`,
      [run.site_id]
    );
    if (!site) return reply.code(404).send({ error: "site não encontrado" });

    // Fetch do site
    let html = "";
    let headers: Record<string, string> = {};
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);  // 15s (era 10s)
      const resp = await fetch(site.url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      clearTimeout(timer);
      for (const [key, value] of resp.headers.entries()) {
        headers[key.toLowerCase()] = value;
      }
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (err) {
      return reply.code(502).send({
        error: "falha ao buscar site",
        detail: (err as Error).message,
      });
    }

    // ============================================================
    // DETECÇÃO DE TECNOLOGIA
    // ============================================================

    interface Tech {
      name: string;
      category: string;
      confidence: "high" | "medium" | "low";
      version?: string;
    }

    const technologies: Tech[] = [];

    const server = headers["server"] ?? "";
    const poweredBy = headers["x-powered-by"] ?? "";

    // -------- Servidor web --------
    if (/nginx/i.test(server)) {
      technologies.push({
        name: "Nginx",
        category: "Servidor web",
        confidence: "high",
        version: server.match(/nginx\/([\d.]+)/)?.[1],
      });
    }
    if (/apache/i.test(server)) {
      technologies.push({
        name: "Apache",
        category: "Servidor web",
        confidence: "high",
        version: server.match(/apache\/([\d.]+)/i)?.[1],
      });
    }
    if (/cloudflare/i.test(server) || headers["cf-ray"]) {
      technologies.push({
        name: "Cloudflare",
        category: "CDN",
        confidence: "high",
      });
    }
    if (/litespeed/i.test(server)) {
      technologies.push({ name: "LiteSpeed", category: "Servidor web", confidence: "high" });
    }
    if (/caddy/i.test(server)) {
      technologies.push({ name: "Caddy", category: "Servidor web", confidence: "high" });
    }
    if (/vercel/i.test(server) || headers["x-vercel-id"]) {
      technologies.push({ name: "Vercel", category: "CDN", confidence: "high" });
    }
    if (/netlify/i.test(server) || headers["x-nf-request-id"]) {
      technologies.push({ name: "Netlify", category: "CDN", confidence: "high" });
    }

    // -------- Runtime --------
    if (/php\/([\d.]+)/i.test(poweredBy)) {
      technologies.push({
        name: "PHP",
        category: "Runtime",
        confidence: "high",
        version: poweredBy.match(/PHP\/([\d.]+)/i)?.[1],
      });
    }
    if (/express/i.test(poweredBy)) {
      technologies.push({ name: "Express", category: "Runtime", confidence: "high" });
    }
    if (/asp\.net/i.test(poweredBy)) {
      technologies.push({ name: "ASP.NET", category: "Runtime", confidence: "high" });
    }
    if (/next\.js/i.test(poweredBy)) {
      technologies.push({ name: "Next.js", category: "Framework", confidence: "high" });
    }

    // -------- CMS (do HTML) --------
    const generatorMatch = html.match(GENERATOR_REGEX);
    const generator = generatorMatch?.[1] ?? "";

    if (/wordpress/i.test(generator) || /\/wp-content\//i.test(html)) {
      technologies.push({
        name: "WordPress",
        category: "CMS",
        confidence: /wordpress/i.test(generator) ? "high" : "medium",
        version: generator.match(/WordPress\s+([\d.]+)/i)?.[1],
      });
    }
    if (/drupal/i.test(generator) || /\/sites\/default\//i.test(html)) {
      technologies.push({
        name: "Drupal",
        category: "CMS",
        confidence: /drupal/i.test(generator) ? "high" : "medium",
        version: generator.match(/Drupal\s+([\d.]+)/i)?.[1],
      });
    }
    if (/joomla/i.test(generator)) {
      technologies.push({
        name: "Joomla",
        category: "CMS",
        confidence: "high",
        version: generator.match(/Joomla!?\s*([\d.]+)/i)?.[1],
      });
    }
    if (/ghost/i.test(generator)) {
      technologies.push({
        name: "Ghost",
        category: "CMS",
        confidence: "high",
        version: generator.match(/Ghost\s+([\d.]+)/i)?.[1],
      });
    }
    if (/shopify/i.test(generator) || /cdn\.shopify\.com/i.test(html)) {
      technologies.push({
        name: "Shopify",
        category: "E-commerce",
        confidence: "high",
      });
    }

    // -------- Framework JS (do HTML) --------
    // -------- Build tools e frameworks modernos --------
    // Detecta Vite pelos paths de assets típicos (hash de 8 caracteres)
    if (/\/assets\/index-[\w-]+\.js/i.test(html) || /\/assets\/[\w-]+-[a-z0-9]{8}\.(js|css)/i.test(html)) {
      technologies.push({ name: "Vite", category: "Build tool", confidence: "medium" });
      // Se Vite + React, provavelmente é React buildado
      if (/react/i.test(html)) {
        technologies.push({ name: "React", category: "Framework", confidence: "low" });
      }
    }
    if (/\/_next\/static\//i.test(html) || /__NEXT_DATA__/i.test(html)) {
      technologies.push({ name: "Next.js", category: "Framework", confidence: "high" });
    }
    if (/\/_nuxt\//i.test(html)) {
      technologies.push({ name: "Nuxt", category: "Framework", confidence: "high" });
    }
    if (/data-reactroot|react\.production\.min\.js|react-dom/i.test(html)) {
      technologies.push({ name: "React", category: "Framework", confidence: "medium" });
    }
    if (/__vue__|vue\.min\.js|vue\.runtime/i.test(html)) {
      technologies.push({ name: "Vue.js", category: "Framework", confidence: "medium" });
    }
    if (/svelte-[\w-]+/i.test(html) || /svelte\.js/i.test(html)) {
      technologies.push({ name: "Svelte", category: "Framework", confidence: "medium" });
    }
    if (/angular|ng-version/i.test(html)) {
      technologies.push({ name: "Angular", category: "Framework", confidence: "medium" });
    }

    // -------- Analytics --------
    if (/google-analytics\.com|gtag\(|googletagmanager\.com/i.test(html)) {
      technologies.push({ name: "Google Analytics", category: "Analytics", confidence: "high" });
    }
    if (/plausible\.io/i.test(html)) {
      technologies.push({ name: "Plausible", category: "Analytics", confidence: "high" });
    }
    if (/matomo\.js|piwik\.js/i.test(html)) {
      technologies.push({ name: "Matomo", category: "Analytics", confidence: "high" });
    }
    if (/hotjar/i.test(html)) {
      technologies.push({ name: "Hotjar", category: "Analytics", confidence: "high" });
    }
    if (/facebook\.net\/.*fbevents|fbq\(/i.test(html)) {
      technologies.push({ name: "Facebook Pixel", category: "Analytics", confidence: "high" });
    }

    // -------- Bibliotecas populares --------
    if (/jquery(?:[.-]|\.min\.js)/i.test(html)) {
      technologies.push({ name: "jQuery", category: "Biblioteca JS", confidence: "high" });
    }
    if (/bootstrap(?:\.min)?\.(css|js)/i.test(html)) {
      technologies.push({ name: "Bootstrap", category: "CSS Framework", confidence: "high" });
    }
    if (/tailwind/i.test(html)) {
      technologies.push({ name: "Tailwind CSS", category: "CSS Framework", confidence: "medium" });
    }

    // ============================================================
    // ANÁLISE DE COMPRESSÃO
    // ============================================================

    const encoding = (headers["content-encoding"] ?? "").toLowerCase();
    const hasBrotli = encoding.includes("br");
    const hasGzip = encoding.includes("gzip");
    const hasDeflate = encoding.includes("deflate");

    let compressionStatus: "brotli" | "gzip" | "deflate" | "none" = "none";
    if (hasBrotli) compressionStatus = "brotli";
    else if (hasGzip) compressionStatus = "gzip";
    else if (hasDeflate) compressionStatus = "deflate";

    const compressionScore =
      compressionStatus === "brotli" ? 100 :
      compressionStatus === "gzip" ? 75 :
      compressionStatus === "deflate" ? 50 :
      0;

    const compression = {
      encoding: encoding || "none",
      status: compressionStatus,
      score: compressionScore,
      hasBrotli,
      hasGzip,
      hasDeflate,
      recommendation:
        compressionStatus === "brotli"
          ? "Compressão ideal (Brotli ativo)"
          : compressionStatus === "gzip"
          ? "Gzip ativo — considere migrar para Brotli (20% menor)"
          : compressionStatus === "deflate"
          ? "Deflate é obsoleto — ative Gzip ou Brotli"
          : "Sem compressão — ative Brotli ou Gzip urgente",
    };

    // ============================================================
    // ANÁLISE DE IMAGENS E FONTES
    // ============================================================
    const imageAnalysis = analyzeImages(html);
    const fontAnalysis = analyzeFonts(html);

    // ============================================================
    // SCORE GERAL DE INFRA
    // ============================================================
    const infraScore = Math.round(
      compression.score * 0.35 + imageAnalysis.score * 0.35 + fontAnalysis.score * 0.30
    );

    // ============================================================
    // Resumo
    // ============================================================
    return {
        technologies,
        compression,
        imageAnalysis,
        fontAnalysis,
        infraScore,
        headers: {
          server: headers["server"] ?? null,
          poweredBy: headers["x-powered-by"] ?? null,
        },
        finalUrl: site.url,
      };
    });

  // DELETE /api/runs/:id — remove uma execução
  app.delete<{ Params: { id: string } }>("/api/runs/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    await query(`DELETE FROM runs WHERE id = $1`, [id]);
    return reply.code(204).send();
  });
}
