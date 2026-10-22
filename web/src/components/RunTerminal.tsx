import { useEffect, useRef, useState } from "react";
import type { Run } from "../lib/types";

interface Props {
  siteUrl: string;
  runs: Run[] | undefined;
}

// Etapas "cosméticas" que aparecem enquanto a run está rodando.
// Marcos em segundos: 0s -> 4s -> 9s -> 18s (o último fica até terminar)
const STEP_STARTS_SEC = [0, 4, 9, 18];
const STEPS = [
  "Carregando o site",
  "Ligando ao analisador",
  "Verificando os dados",
  "Recebendo resultado",
];

// Velocidade da digitação (ms por caractere)
const TYPING_MS = 35;

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  return d.toTimeString().slice(0, 8);
}

function fmtDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const sec = ((end - start) / 1000).toFixed(1);
  return `${sec}s`;
}

function useCurrentStep(active: boolean, startedAt: string | null): number {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) {
      setElapsedSec(0);
      return;
    }

    const start = new Date(startedAt).getTime();

    const update = () => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    };
    update();

    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active, startedAt]);

  let idx = 0;
  for (let i = 0; i < STEP_STARTS_SEC.length; i++) {
    if (elapsedSec >= STEP_STARTS_SEC[i]) idx = i;
  }
  return idx;
}

/**
 * Hook que devolve o texto sendo "digitado" letra por letra.
 * - Quando `text` muda, reinicia do zero.
 * - Digita ~1 caractere a cada TYPING_MS.
 */
function useTypewriter(text: string, enabled: boolean): string {
  const [shown, setShown] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Limpa timer antigo
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) {
      // Modo "sem animação": mostra tudo de uma vez
      setShown(text);
      return;
    }

    // Reinicia do zero
    setShown("");
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        if (timerRef.current != null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, TYPING_MS);

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, enabled]);

  return shown;
}

interface Line {
  key: string;
  parts: React.ReactNode;
}

function buildLines(
  siteUrl: string,
  run: Run | undefined,
  currentStep: number,
  typedStepText: string
): Line[] {
  const lines: Line[] = [];

  lines.push({
    key: "prompt",
    parts: (
      <>
        <span className="t-prompt">$ </span>
        <span className="t-path">lighthouse </span>
        <span className="t-flag">--output=json </span>
        <span className="t-value">{siteUrl}</span>
      </>
    ),
  });

  if (!run) {
    lines.push({
      key: "idle",
      parts: <span className="t-label">aguardando teste...</span>,
    });
    return lines;
  }

  const t0 = fmtTime(run.started_at);

  lines.push({
    key: "queued",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">job enfileirado no worker </span>
        <span className="t-value">#run-{run.id}</span>
      </>
    ),
  });

  if (run.status === "queued") {
    lines.push({
      key: "wait",
      parts: <span className="t-label">aguardando slot disponível</span>,
    });
    return lines;
  }

  lines.push({
    key: "chrome",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">iniciando Chrome headless</span>
      </>
    ),
  });

  lines.push({
    key: "nav",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">navegando para </span>
        <span className="t-path">{siteUrl}</span>
      </>
    ),
  });

  if (run.status === "running") {
    const stepNum = currentStep + 1;

    lines.push({
      key: `step-${currentStep}`,
      parts: (
        <>
          <span className="t-time">[{fmtTime(new Date().toISOString())}]</span>{" "}
          <span className="t-info">▸ </span>
          <span className="t-label">Etapa {stepNum}/4: </span>
          <span className="t-warn">{typedStepText}</span>
        </>
      ),
    });
    return lines;
  }

  if (run.status === "failed") {
    lines.push({
      key: "error",
      parts: (
        <>
          <span className="t-error">✗ </span>
          <span className="t-error">erro: {run.error ?? "desconhecido"}</span>
        </>
      ),
    });
    return lines;
  }

  lines.push({
    key: "metrics",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">coletando métricas de carregamento</span>
      </>
    ),
  });
  lines.push({
    key: "analyze",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">analisando recursos (JS, CSS, imagens)</span>
      </>
    ),
  });
  lines.push({
    key: "gen",
    parts: (
      <>
        <span className="t-time">[{t0}]</span>{" "}
        <span className="t-info">▸ </span>
        <span className="t-label">gerando relatório</span>
      </>
    ),
  });

  const dur = fmtDuration(run.started_at, run.finished_at);

  lines.push({
    key: "done",
    parts: (
      <>
        <span className="t-success">✓ </span>
        <span className="t-success">concluído em {dur}</span>
      </>
    ),
  });

  lines.push({ key: "blank", parts: <>&nbsp;</> });

  lines.push({
    key: "score-perf",
    parts: (
      <>
        <span className="t-label">Performance:     </span>
        <span className="t-metric">{run.performance ?? "—"}</span>
      </>
    ),
  });
  lines.push({
    key: "score-a11y",
    parts: (
      <>
        <span className="t-label">Accessibility:   </span>
        <span className="t-metric">{run.accessibility ?? "—"}</span>
      </>
    ),
  });
  lines.push({
    key: "score-bp",
    parts: (
      <>
        <span className="t-label">Best Practices:  </span>
        <span className="t-metric">{run.best_practices ?? "—"}</span>
      </>
    ),
  });
  lines.push({
    key: "score-seo",
    parts: (
      <>
        <span className="t-label">SEO:             </span>
        <span className="t-metric">{run.seo ?? "—"}</span>
      </>
    ),
  });

  lines.push({ key: "blank2", parts: <>&nbsp;</> });

  lines.push({
    key: "lcp",
    parts: (
      <>
        <span className="t-label">LCP:         </span>
        <span className="t-value">{run.lcp_ms ?? "—"}</span>
        <span className="t-label"> ms</span>
      </>
    ),
  });
  lines.push({
    key: "cls",
    parts: (
      <>
        <span className="t-label">CLS:         </span>
        <span className="t-value">{run.cls ?? "—"}</span>
      </>
    ),
  });
  lines.push({
    key: "tbt",
    parts: (
      <>
        <span className="t-label">TBT:         </span>
        <span className="t-value">{run.tbt_ms ?? "—"}</span>
        <span className="t-label"> ms</span>
      </>
    ),
  });
  lines.push({
    key: "ttfb",
    parts: (
      <>
        <span className="t-label">TTFB:        </span>
        <span className="t-value">{run.ttfb_ms ?? "—"}</span>
        <span className="t-label"> ms</span>
      </>
    ),
  });

  return lines;
}

export function RunTerminal({ siteUrl, runs }: Props) {
  const latest = runs?.[0];
  const isActive =
    latest != null &&
    (latest.status === "queued" || latest.status === "running");

  const currentStep = useCurrentStep(isActive, latest?.started_at ?? null);
  const stepText = STEPS[currentStep] + "...";

  // Texto sendo digitado. Só anima quando a run está de fato rodando.
  const typedStepText = useTypewriter(
    stepText,
    isActive && latest?.status === "running"
  );

  const lines = buildLines(siteUrl, latest, currentStep, typedStepText);

  return (
    <div className="terminal">
      <div className="terminal-header">
        <span className="terminal-dot" style={{ background: "#ff5f56" }} />
        <span className="terminal-dot" style={{ background: "#ffbd2e" }} />
        <span className="terminal-dot" style={{ background: "#27c93f" }} />
        <span
          className="ml-3 text-xs"
          style={{ color: "#8b949e", fontFamily: "inherit" }}
        >
          lighthouse — worker
        </span>
        <span
          className="ml-auto text-xs"
          style={{ color: "#6e7681", fontFamily: "inherit" }}
        >
          {latest ? `run #${latest.id}` : "idle"}
        </span>
      </div>

      <div className="terminal-body">
        {lines.map((line, i) => {
          const isLast = i === lines.length - 1;
          return (
            <div key={line.key}>
              {line.parts}
              {isLast && isActive && <span className="cursor ml-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
