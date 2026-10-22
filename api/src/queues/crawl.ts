import { Queue, Worker, Job } from "bullmq";
import { redis } from "./connection.js";
import { query } from "../db/client.js";
import { parsePage, detectPageIssues } from "../lighthouse/page-parser.js";

export const CRAWL_QUEUE_NAME = "crawl";

export interface CrawlJobData {
  runId: number;
  url: string;
  siteUrl: string;
}

export const crawlQueue = new Queue<CrawlJobData>(CRAWL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Fetch do HTML com timeout. Retorna { html, statusCode, responseMs } ou null.
 */
async function fetchPage(url: string): Promise<{
  html: string;
  statusCode: number;
  responseMs: number;
  finalUrl: string;
} | null> {
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    const html = await resp.text();
    return {
      html,
      statusCode: resp.status,
      responseMs: Date.now() - start,
      finalUrl: resp.url || url,
    };
  } catch (err) {
    return null;
  }
}

export function startCrawlWorker() {
  const concurrency = Number(process.env.CRAWL_CONCURRENCY ?? 3);

  const worker = new Worker<CrawlJobData>(
    CRAWL_QUEUE_NAME,
    async (job: Job<CrawlJobData>) => {
      const { runId, url, siteUrl } = job.data;

      console.log(`[crawl] processando run=${runId} url=${url}`);

      const result = await fetchPage(url);

      if (!result) {
        // Falha ao buscar — salva como erro
        await query(
          `INSERT INTO page_audits
             (run_id, url, error)
           VALUES ($1, $2, $3)`,
          [runId, url, "Falha ao carregar a página (timeout ou erro de rede)"]
        );
        console.log(`[crawl] run=${runId} url=${url} FALHOU`);
        return;
      }

      const parsed = parsePage(result.html, result.finalUrl);
      const issues = detectPageIssues(parsed, result.statusCode);

      await query(
        `INSERT INTO page_audits (
           run_id, url, final_url,
           status_code, response_ms,
           title, description, canonical, robots,
           h1_count, h2_count, h3_count,
           og_title, og_description, og_image, twitter_card,
           json_ld_count, json_ld_types,
           word_count, image_count, images_without_alt,
           internal_links, external_links,
           issues, raw_html_size
         ) VALUES (
           $1, $2, $3,
           $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12,
           $13, $14, $15, $16,
           $17, $18,
           $19, $20, $21,
           $22, $23,
           $24, $25
         )`,
        [
          runId,
          url,
          result.finalUrl,
          result.statusCode,
          result.responseMs,
          parsed.title,
          parsed.description,
          parsed.canonical,
          parsed.robots,
          parsed.h1Count,
          parsed.h2Count,
          parsed.h3Count,
          parsed.ogTitle,
          parsed.ogDescription,
          parsed.ogImage,
          parsed.twitterCard,
          parsed.jsonLdCount,
          parsed.jsonLdTypes,
          parsed.wordCount,
          parsed.imageCount,
          parsed.imagesWithoutAlt,
          parsed.internalLinks.length,
          parsed.externalLinks.length,
          JSON.stringify(issues),
          parsed.htmlSize,
        ]
      );

      console.log(
        `[crawl] run=${runId} url=${url} → ${result.statusCode} (${issues.length} problemas)`
      );
    },
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[crawl] job ${job?.id} falhou:`, err.message);
  });

  console.log(`[crawl] Worker iniciado (concorrência=${concurrency})`);
  return worker;
}
