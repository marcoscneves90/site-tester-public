import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import path from "node:path";
import { queryOne } from "../db/client.js";

const FAVICON_DIR = process.env.FAVICON_DIR ?? "/app/data/favicons";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

async function ensureDir() {
  await fs.mkdir(FAVICON_DIR, { recursive: true });
}

async function findCached(siteId: number): Promise<{ fullPath: string; ext: string } | null> {
  for (const ext of ["png", "ico", "jpg", "gif", "svg", "webp"]) {
    const full = path.join(FAVICON_DIR, `${siteId}.${ext}`);
    try {
      await fs.access(full);
      return { fullPath: full, ext };
    } catch {
      /* segue */
    }
  }
  return null;
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case "png": return "image/png";
    case "svg": return "image/svg+xml";
    case "jpg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return "image/x-icon";
  }
}

/**
 * Baixa uma URL de imagem e devolve buffer + content-type. Retorna null se falhar.
 */
async function tryDownload(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (SiteTester/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timer);

    if (!resp.ok) return null;

    const contentType = (resp.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 512 * 1024) return null;

    return { buffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Tenta achar favicon por uma lista de URLs candidatas derivadas do site.
 */
async function fetchFaviconFromSite(siteUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const base = siteUrl.replace(/\/+$/, "");

  const candidates = [
    `${base}/favicon.ico`,
    `${base}/favicon.png`,
    `${base}/apple-touch-icon.png`,
    `${base}/apple-touch-icon-precomposed.png`,
  ];

  for (const url of candidates) {
    const result = await tryDownload(url);
    if (result) return result;
  }

  // Fallback: parse do HTML buscando <link rel="icon">
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(base, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (SiteTester/1.0)" },
    });
    clearTimeout(timer);

    if (resp.ok) {
      const html = await resp.text();
      // procura <link ... rel="icon" ... href="...">
      const linkRe = /<link\b[^>]*\brel=["'](?:shortcut\s+)?icon["'][^>]*>/gi;
      const hrefRe = /\bhref=["']([^"']+)["']/i;

      const matches = html.match(linkRe) ?? [];
      for (const tag of matches) {
        const m = tag.match(hrefRe);
        if (!m) continue;
        let iconUrl = m[1];
        if (iconUrl.startsWith("//")) iconUrl = "https:" + iconUrl;
        else if (iconUrl.startsWith("/")) iconUrl = base + iconUrl;
        else if (!/^https?:\/\//i.test(iconUrl)) iconUrl = base + "/" + iconUrl;

        const result = await tryDownload(iconUrl);
        if (result) return result;
      }
    }
  } catch {
    /* ignora */
  }

  return null;
}

export default async function faviconRoutes(app: FastifyInstance) {
  await ensureDir();

  app.get<{ Params: { siteId: string } }>(
    "/api/favicon/:siteId",
    async (req, reply) => {
      const siteId = Number(req.params.siteId);
      if (!Number.isFinite(siteId)) {
        return reply.code(400).send({ error: "siteId inválido" });
      }

      // 1. Cache
      const cached = await findCached(siteId);
      if (cached) {
        const data = await fs.readFile(cached.fullPath);
        return reply
          .header("Content-Type", mimeFromExt(cached.ext))
          .header("Cache-Control", "public, max-age=86400")
          .send(data);
      }

      // 2. Pega URL do site
      const site = await queryOne<{ url: string }>(
        `SELECT url FROM sites WHERE id = $1`,
        [siteId]
      );
      if (!site?.url) {
        return reply.code(404).send({ error: "site não encontrado" });
      }

      // 3. Baixa
      const result = await fetchFaviconFromSite(site.url);
      if (!result) {
        return reply.code(404).send({ error: "favicon não encontrado" });
      }

      // 4. Salva no disco
      const ext = EXT_BY_MIME[result.contentType] ?? "ico";
      const target = path.join(FAVICON_DIR, `${siteId}.${ext}`);
      await fs.writeFile(target, result.buffer);

      // 5. Serve
      return reply
        .header("Content-Type", result.contentType)
        .header("Cache-Control", "public, max-age=86400")
        .send(result.buffer);
    }
  );

  // Rota pra limpar cache (útil se um favicon mudar)
  app.delete<{ Params: { siteId: string } }>(
    "/api/favicon/:siteId",
    async (req, reply) => {
      const siteId = Number(req.params.siteId);
      if (!Number.isFinite(siteId)) {
        return reply.code(400).send({ error: "siteId inválido" });
      }

      for (const ext of ["png", "ico", "jpg", "gif", "svg", "webp"]) {
        const full = path.join(FAVICON_DIR, `${siteId}.${ext}`);
        try {
          await fs.unlink(full);
        } catch {
          /* ignora */
        }
      }

      return reply.code(204).send();
    }
  );
}
