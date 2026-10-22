import { runLighthouse } from "./run.js";
import { parseLighthouse } from "./parse.js";

async function main() {
  const url = process.argv[2] ?? "https://example.com";
  console.log(`Testando: ${url}`);
  console.log("Rodando Lighthouse (pode levar 30-60s)...\n");

  try {
    const { raw, durationMs } = await runLighthouse({ url });
    const metrics = parseLighthouse(raw);

    console.log("=== RESULTADO ===");
    console.log(`Duração total: ${durationMs}ms`);
    console.log("");
    console.log("Scores (0-100):");
    console.log(`  Performance:    ${metrics.performance}`);
    console.log(`  Acessibilidade: ${metrics.accessibility}`);
    console.log(`  Best Practices: ${metrics.best_practices}`);
    console.log(`  SEO:            ${metrics.seo}`);
    console.log("");
    console.log("Métricas:");
    console.log(`  LCP:         ${metrics.lcp_ms} ms`);
    console.log(`  FCP:         ${metrics.fcp_ms} ms`);
    console.log(`  CLS:         ${metrics.cls}`);
    console.log(`  TBT:         ${metrics.tbt_ms} ms`);
    console.log(`  TTFB:        ${metrics.ttfb_ms} ms`);
    console.log(`  Speed Index: ${metrics.speed_index_ms} ms`);
  } catch (err) {
    console.error("ERRO:", (err as Error).message);
    process.exit(1);
  }
}

main();
