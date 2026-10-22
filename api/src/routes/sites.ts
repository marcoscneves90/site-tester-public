import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db/client.js";
import { lighthouseQueue } from "../queues/lighthouse.js";

export default async function sitesRoutes(app: FastifyInstance) {
  // GET /api/sites/seo-scores
  // Retorna o score SEO mais recente de cada site (batch)
  app.get("/api/sites/seo-scores", async () => {
    const rows = await query<{
      site_id: number;
      seo_score: number | null;
      seo_subscores: any;
      finished_at: string | null;
    }>(`
      WITH latest AS (
        SELECT DISTINCT ON (site_id) site_id, seo_score, seo_subscores, finished_at
        FROM runs
        WHERE status = 'done' AND seo_score IS NOT NULL
        ORDER BY site_id, finished_at DESC
      )
      SELECT * FROM latest
    `);

    return rows.map((r) => ({
      siteId: r.site_id,
      score: r.seo_score,
      subscores: r.seo_subscores,
      finishedAt: r.finished_at,
    }));
  });
  
  app.get("/api/sites", async () => {
    return query(`SELECT * FROM sites ORDER BY created_at DESC`);
  });

  app.post<{ Body: { url: string; name?: string } }>("/api/sites", async (req, reply) => {
    const { url, name } = req.body ?? {};
    if (!url || typeof url !== "string") {
      return reply.code(400).send({ error: "url é obrigatória" });
    }

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO sites (url, name) VALUES ($1, $2) RETURNING id`,
      [normalized, name ?? null]
    );

    return reply.code(201).send({ id: inserted!.id, url: normalized, name: name ?? null });
  });

  app.delete<{ Params: { id: string } }>("/api/sites/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "id inválido" });

    await query(`DELETE FROM sites WHERE id = $1`, [id]);
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/sites/:id/run", async (req, reply) => {
    const siteId = Number(req.params.id);
    if (!Number.isFinite(siteId)) return reply.code(400).send({ error: "id inválido" });

    const site = await queryOne<{ id: number; url: string }>(
      `SELECT id, url FROM sites WHERE id = $1`,
      [siteId]
    );
    if (!site) return reply.code(404).send({ error: "site não encontrado" });

    const run = await queryOne<{ id: number }>(
      `INSERT INTO runs (site_id, status) VALUES ($1, 'queued') RETURNING id`,
      [siteId]
    );

    await lighthouseQueue.add("run", {
      runId: run!.id,
      siteId: site.id,
      url: site.url,
    });

    return reply.code(202).send({ runId: run!.id, status: "queued" });
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/sites/:id/runs",
    async (req) => {
      const siteId = Number(req.params.id);
      const limit = Math.min(Number(req.query.limit ?? 50), 200);

      return query(
        `SELECT id, status, started_at, finished_at, error,
                performance, accessibility, best_practices, seo,
                seo_score, seo_subscores,
                lcp_ms, fcp_ms, cls, tbt_ms, ttfb_ms, speed_index_ms
         FROM runs
         WHERE site_id = $1
         ORDER BY id DESC
         LIMIT $2`,
        [siteId, limit]
      );
    }
  );
}
