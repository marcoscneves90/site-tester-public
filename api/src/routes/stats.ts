import type { FastifyInstance } from "fastify";
import { query } from "../db/client.js";

interface OverviewRow {
  total_sites: string;
  total_runs: string;
  runs_today: string;
  runs_week: string;
  avg_performance: string | null;
  avg_accessibility: string | null;
  avg_seo: string | null;
  last_run_at: string | null;
}

export default async function statsRoutes(app: FastifyInstance) {
  // GET /api/stats/overview
  // Cards de resumo da home
  app.get("/api/stats/overview", async () => {
    const rows = await query<OverviewRow>(`
      SELECT
        (SELECT COUNT(*)::text FROM sites)                                          AS total_sites,
        (SELECT COUNT(*)::text FROM runs WHERE status = 'done')                     AS total_runs,
        (SELECT COUNT(*)::text FROM runs
          WHERE status = 'done' AND finished_at >= date_trunc('day', now()))        AS runs_today,
        (SELECT COUNT(*)::text FROM runs
          WHERE status = 'done' AND finished_at >= now() - interval '7 days')       AS runs_week,
        (SELECT ROUND(AVG(performance))::text FROM runs
          WHERE status = 'done' AND performance IS NOT NULL)                        AS avg_performance,
        (SELECT ROUND(AVG(accessibility))::text FROM runs
          WHERE status = 'done' AND accessibility IS NOT NULL)                      AS avg_accessibility,
        (SELECT ROUND(AVG(seo))::text FROM runs
          WHERE status = 'done' AND seo IS NOT NULL)                                AS avg_seo,
        (SELECT MAX(finished_at)::text FROM runs WHERE status = 'done')             AS last_run_at
    `);

    const r = rows[0];

    return {
      totalSites: Number(r.total_sites),
      totalRuns: Number(r.total_runs),
      runsToday: Number(r.runs_today),
      runsWeek: Number(r.runs_week),
      avgPerformance: r.avg_performance != null ? Number(r.avg_performance) : null,
      avgAccessibility:
        r.avg_accessibility != null ? Number(r.avg_accessibility) : null,
      avgSeo: r.avg_seo != null ? Number(r.avg_seo) : null,
      lastRunAt: r.last_run_at,
    };
  });

  // GET /api/stats/timeline?days=30&siteId=2
  // Série temporal de performance por site (para o gráfico)
  app.get<{
    Querystring: { days?: string; siteId?: string };
  }>("/api/stats/timeline", async (req) => {
    const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 365);
    const siteId = req.query.siteId ? Number(req.query.siteId) : null;

    // Se vier siteId, filtra. Senão, traz todos os sites.
    const whereSite = siteId != null ? `AND r.site_id = $2` : "";
    const params: unknown[] = [days];
    if (siteId != null) params.push(siteId);

    const rows = await query<{
      site_id: number;
      site_name: string | null;
      site_url: string;
      day: string;
      avg_performance: string;
      avg_lcp: string | null;
      runs_count: string;
    }>(
      `
      SELECT
        r.site_id,
        s.name            AS site_name,
        s.url             AS site_url,
        date_trunc('day', r.finished_at)::date::text AS day,
        ROUND(AVG(r.performance))::text                AS avg_performance,
        ROUND(AVG(r.lcp_ms))::text                     AS avg_lcp,
        COUNT(*)::text                                 AS runs_count
      FROM runs r
      JOIN sites s ON s.id = r.site_id
      WHERE r.status = 'done'
        AND r.finished_at >= now() - ($1 || ' days')::interval
        ${whereSite}
      GROUP BY r.site_id, s.name, s.url, date_trunc('day', r.finished_at)
      ORDER BY day ASC
      `,
      params
    );

    return rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name ?? row.site_url,
      siteUrl: row.site_url,
      day: row.day,
      performance: Number(row.avg_performance),
      lcp: row.avg_lcp != null ? Number(row.avg_lcp) : null,
      runs: Number(row.runs_count),
    }));
  });

  // GET /api/stats/worst
  // Ranking dos sites com pior performance na última run
  app.get("/api/stats/worst", async () => {
    const rows = await query<{
      id: number;
      name: string | null;
      url: string;
      performance: number | null;
      lcp_ms: number | null;
      finished_at: string | null;
    }>(`
      WITH latest AS (
        SELECT DISTINCT ON (site_id) *
        FROM runs
        WHERE status = 'done'
        ORDER BY site_id, finished_at DESC
      )
      SELECT
        s.id, s.name, s.url,
        l.performance, l.lcp_ms, l.finished_at
      FROM latest l
      JOIN sites s ON s.id = l.site_id
      WHERE l.performance IS NOT NULL
      ORDER BY l.performance ASC
      LIMIT 5
    `);

    return rows;
  });
}
