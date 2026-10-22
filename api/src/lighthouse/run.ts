import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

/**
 * Resolve o caminho do binário `lighthouse` instalado em node_modules/.bin
 * Isso evita depender do PATH do processo — que não inclui .bin quando
 * rodamos via `node dist/...` direto.
 */
function resolveLighthouseBin(): string {
  // require.resolve("lighthouse/cli/index.js") -> /app/node_modules/lighthouse/cli/index.js
  const cliEntry = require.resolve("lighthouse/cli/index.js");
  // Sobe dois níveis pra chegar em /app/node_modules/.bin/lighthouse
  const binPath = path.join(path.dirname(cliEntry), "..", "..", ".bin", "lighthouse");
  return binPath;
}

export interface LighthouseResult {
  raw: unknown;
  durationMs: number;
}

export interface LighthouseOptions {
  url: string;
  timeoutMs?: number;
}

export function runLighthouse(opts: LighthouseOptions): Promise<LighthouseResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const bin = resolveLighthouseBin();

    const args = [
      opts.url,
      "--output=json",
      "--output-path=stdout",
      "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disk-cache-dir=/dev/null --disable-application-cache --disable-offline-load-stale-cache",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--throttling-method=provided",
      "--quiet",
    ];

    const child = spawn(bin, args, {
      env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? "/usr/bin/chromium" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Lighthouse timeout após ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Falha ao executar lighthouse (${bin}): ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Lighthouse saiu com código ${code}. stderr: ${stderr.slice(0, 800)}`));
        return;
      }

      try {
        const raw = JSON.parse(stdout);
        resolve({ raw, durationMs: Date.now() - startedAt });
      } catch (err) {
        reject(new Error(`Falha ao parsear JSON do Lighthouse: ${(err as Error).message}`));
      }
    });
  });
}
