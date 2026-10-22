import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sitesRoutes from "./routes/sites.js";
import runsRoutes from "./routes/runs.js";
import statsRoutes from "./routes/stats.js";
import faviconRoutes from "./routes/favicon.js";
import { startLighthouseWorker } from "./queues/lighthouse.js";
import configRoutes from "./routes/config.js";
import { startCrawlWorker } from "./queues/crawl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);

const app = Fastify({ logger: true });

// Healthcheck
app.get("/api/health", async () => ({ ok: true, ts: new Date().toISOString() }));

// ============================================================
// Robots.txt e Sitemap.xml dinâmicos (usam PUBLIC_URL do .env)
// ============================================================
app.get("/robots.txt", async (req, reply) => {
  const publicUrl = process.env.PUBLIC_URL?.trim() || "";
  const sitemapUrl = publicUrl ? `${publicUrl.replace(/\/$/, "")}/sitemap.xml` : "";

  const content = `User-agent: *
Allow: /
${sitemapUrl ? `\nSitemap: ${sitemapUrl}` : ""}
`.trimStart();

  reply
    .header("Content-Type", "text/plain; charset=utf-8")
    .header("Cache-Control", "public, max-age=3600")
    .send(content);
});

app.get("/sitemap.xml", async (req, reply) => {
  const publicUrl = process.env.PUBLIC_URL?.trim() || "";
  if (!publicUrl) {
    return reply.code(404).send({ error: "PUBLIC_URL não configurada" });
  }
  const base = publicUrl.replace(/\/$/, "");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  reply
    .header("Content-Type", "application/xml; charset=utf-8")
    .header("Cache-Control", "public, max-age=3600")
    .send(content);
});

// Rotas REST
await app.register(sitesRoutes);
await app.register(runsRoutes);
await app.register(statsRoutes);
await app.register(configRoutes);
await app.register(faviconRoutes);

// Serve o React buildado (só em produção)
if (process.env.NODE_ENV === "production") {
  app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/",
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not found" });
    }
    return reply.sendFile("index.html");
  });
}

// Inicia o worker BullMQ
startLighthouseWorker();
startCrawlWorker();

app.listen({ host: "0.0.0.0", port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
