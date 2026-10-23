import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function resolveLighthouseBin(): string {
  const cliEntry = require.resolve("lighthouse/cli/index.js");
  const binPath = path.join(path.dirname(cliEntry), "..", "..", ".bin", "lighthouse");
  return binPath;
}

export interface LighthouseResult {
  raw: unknown;
  durationMs: number;
}

export interface LighthouseOptions {
  url: string;
  device?: "desktop" | "mobile";
  timeoutMs?: number;
}

export function runLighthouse(opts: LighthouseOptions): Promise<LighthouseResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const device = opts.device ?? "desktop";

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const bin = resolveLighthouseBin();

    const args = [
      opts.url,
      "--output=json",
      "--output-path=stdout",
      "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--throttling-method=provided",
      "--quiet",
    ];

    // Preset desktop (mobile é o padrão do Lighthouse)
    if (device === "desktop") {
      args.push("--preset=desktop");
    }

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
