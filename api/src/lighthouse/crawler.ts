import { crawlQueue } from "../queues/crawl.js";
import { parsePage } from "./page-parser.js";

/**
 * Limite de páginas por crawl. Configurável via env.
 */
export const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES ?? 10);

/**
 * Faz fetch do HTML com timeout.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SiteTester/1.0; +homelab)",
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

/**
 * Lê e parseia o robots.txt do domínio.
 * Retorna lista de padrões de URL bloqueados para o User-Agent "*".
 */
async function fetchRobotsDisallow(siteUrl: string): Promise<string[]> {
  try {
    const base = new URL(siteUrl).origin;
    const html = await fetchHtml(`${base}/robots.txt`);
    if (!html) return [];

    const lines = html.split(/\r?\n/);
    const disallow: string[] = [];
    let inUserAgentAll = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const [keyRaw, ...rest] = line.split(":");
      const key = keyRaw.trim().toLowerCase();
      const value = rest.join(":").trim();

      if (key === "user-agent") {
        inUserAgentAll = value === "*";
      } else if (key === "disallow" && inUserAgentAll && value) {
        disallow.push(value);
      }
    }

    return disallow;
  } catch {
    return [];
  }
}

/**
 * Verifica se uma URL está bloqueada pelos padrões de robots.txt.
 * Suporta apenas padrões básicos com `*` e prefixo.
 */
function isBlockedByRobots(url: string, disallowPatterns: string[]): boolean {
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }

  for (const pattern of disallowPatterns) {
    if (pattern === "/") return true;

    // Converte padrão em regex simples
    const regexStr =
      "^" +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
    try {
      if (new RegExp(regexStr).test(path)) return true;
    } catch {
      /* ignora padrão inválido */
    }
  }

  return false;
}

/**
 * Normaliza uma URL: remove hash, remove trailing slash, lowercase no host.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let str = u.toString();
    // Remove trailing slash (exceto na raiz)
    if (str.endsWith("/") && u.pathname !== "/") {
      str = str.slice(0, -1);
    }
    return str;
  } catch {
    return url;
  }
}

/**
 * Dado o siteUrl, descobre até MAX_PAGES páginas internas e enfileira o crawl.
 * A home (siteUrl) é sempre incluída como primeira página.
 */
export async function crawlSite(runId: number, siteUrl: string): Promise<void> {
  console.log(`[crawler] iniciando crawl para run=${runId} site=${siteUrl}`);

  // 1. Lê robots.txt
  const disallowPatterns = await fetchRobotsDisallow(siteUrl);
  if (disallowPatterns.length > 0) {
    console.log(
      `[crawler] robots.txt tem ${disallowPatterns.length} padrões de disallow`
    );
  }

  // 2. Pega a home e extrai links internos
  const homeHtml = await fetchHtml(siteUrl);
  if (!homeHtml) {
    console.log(`[crawler] falha ao buscar home ${siteUrl}`);
    return;
  }

  const homeParsed = parsePage(homeHtml, siteUrl);

  // 3. Filtra e normaliza links internos
  const candidates = new Set<string>();
  for (const link of homeParsed.internalLinks) {
    const normalized = normalizeUrl(link);
    candidates.add(normalized);
  }

  // 4. Filtra por robots.txt e por padrões indesejados
  const unwantedPatterns = [
    /\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|rar|doc|docx|xls|xlsx|ppt|pptx)$/i,
    /\/(wp-admin|wp-login|cart|checkout|my-account|login|logout|signin|signup)/i,
    /[?&](s|search|q)=/i, // Buscas dinâmicas
  ];

  const selected: string[] = [normalizeUrl(siteUrl)]; // home primeiro
  for (const url of candidates) {
    if (selected.length >= MAX_PAGES) break;
    if (selected.includes(url)) continue;
    if (isBlockedByRobots(url, disallowPatterns)) continue;
    if (unwantedPatterns.some((re) => re.test(url))) continue;

    selected.push(url);
  }

  console.log(
    `[crawler] run=${runId}: ${selected.length} páginas selecionadas (de ${candidates.size} candidatas)`
  );

  // 5. Enfileira cada página no crawlQueue
  for (const url of selected) {
    await crawlQueue.add("crawl-page", {
      runId,
      url,
      siteUrl,
    });
  }

  console.log(`[crawler] run=${runId}: ${selected.length} jobs enfileirados`);
}
