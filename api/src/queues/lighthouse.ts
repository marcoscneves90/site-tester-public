import { Queue, Worker, Job } from "bullmq";
import { redis } from "./connection.js";
import { runLighthouse } from "../lighthouse/run.js";
import { parseLighthouse } from "../lighthouse/parse.js";
import { calculateSeoScore } from "../lighthouse/seo-score.js";
import { query } from "../db/client.js";
import { crawlSite } from "../lighthouse/crawler.js";

export const QUEUE_NAME = "lighthouse";

export interface LighthouseJobData {
  runId: number;
  siteId: number;
  url: string;
}

export const lighthouseQueue = new Queue<LighthouseJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Tenta achar a URL do favicon no raw_report do Lighthouse.
 */
function extractFaviconUrl(raw: any): string | null {
  try {
    const audit = raw?.audits?.favicon;
    const items = audit?.details?.items;
    if (Array.isArray(items) && items.length > 0) {
      const url = items[0]?.url;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
  } catch {
    /* ignora */
  }
  return null;
}

/**
 * Busca o HTML do site com timeout. Se falhar, retorna string vazia.
 * Usado pra extrair <title> e <meta name="description"> corretamente.
 */
async function fetchHtml(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

export function startLighthouseWorker() {
  const concurrency = Number(process.env.LIGHTHOUSE_CONCURRENCY ?? 2);
  const timeoutMs = Number(process.env.LIGHTHOUSE_TIMEOUT_MS ?? 90_000);

  const worker = new Worker<LighthouseJobData>(
    QUEUE_NAME,
    async (job: Job<LighthouseJobData>) => {
      const { runId, url, siteId } = job.data;

      console.log(`[worker] processando run=${runId} url=${url}`);

      await query(
        `UPDATE runs SET status = 'running', started_at = now() WHERE id = $1`,
        [runId]
      );

      try {
        const { raw, durationMs } = await runLighthouse({ url, timeoutMs });
        const m = parseLighthouse(raw);

        // Busca o HTML pra extrair title/description corretos
        // (o Lighthouse 12 não expõe mais esses valores no raw_report)
        const html = await fetchHtml(url);

        // Calcula o score SEO antes de salvar
        const seoResult = calculateSeoScore(
          raw,
          {
            performance: m.performance,
            accessibility: m.accessibility,
          },
          html
        );

        await query(
          `UPDATE runs SET
             status = 'done',
             finished_at = now(),
             performance = $1,
             accessibility = $2,
             best_practices = $3,
             seo = $4,
             lcp_ms = $5,
             fcp_ms = $6,
             cls = $7,
             tbt_ms = $8,
             ttfb_ms = $9,
             speed_index_ms = $10,
             raw_report = $11,
             seo_score = $12,
             seo_subscores = $13
           WHERE id = $14`,
          [
            m.performance,
            m.accessibility,
            m.best_practices,
            m.seo,
            m.lcp_ms,
            m.fcp_ms,
            m.cls,
            m.tbt_ms,
            m.ttfb_ms,
            m.speed_index_ms,
            raw,
            seoResult.overall,
            JSON.stringify(seoResult.subscores),
            runId,
          ]
        );

        // Extrai favicon
        const faviconUrl = extractFaviconUrl(raw);
        if (faviconUrl) {
          await query(
            `UPDATE sites SET favicon_url = $1
             WHERE id = $2 AND (favicon_url IS NULL OR favicon_url = '')`,
            [faviconUrl, siteId]
          );
        }

        console.log(
        `[worker] run=${runId} concluída em ${durationMs}ms | SEO score: ${seoResult.overall}`
      );

      // Dispara o crawl de múltiplas páginas (assíncrono)
      crawlSite(runId, url).catch((err) => {
        console.error(
          `[worker] crawl falhou pra run=${runId}:`,
          (err as Error).message
        );
      });
      } catch (err) {
        const message = (err as Error).message;
        console.error(`[worker] run=${runId} falhou:`, message);

        await query(
          `UPDATE runs SET status = 'failed', finished_at = now(), error = $1 WHERE id = $2`,
          [message.slice(0, 1000), runId]
        );

        throw err;
      }
    },
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} falhou:`, err.message);
  });

  console.log(`[worker] Lighthouse worker iniciado (concorrência=${concurrency})`);
  return worker;
}
