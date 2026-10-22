import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X as XIcon,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeftRight,
  FileText,
  Code2,
  Palette,
  Image as ImageIcon,
  Type,
  Film,
  Package,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useSiteRuns, useCompareRuns } from "../lib/hooks";
import { ScoreBadge } from "./ScoreBadge";
import type {
  Run,
  CompareDeltas,
  ComparedResource,
  ComparedOpportunity,
} from "../lib/types";

interface Props {
  siteId: number;
}

// Ícone por tipo de recurso (mesmo mapa do ResourcesPanel)
function iconForType(type: string) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case "document": return <FileText className={cls} />;
    case "script": return <Code2 className={cls} />;
    case "stylesheet": return <Palette className={cls} />;
    case "image": return <ImageIcon className={cls} />;
    case "font": return <Type className={cls} />;
    case "media": return <Film className={cls} />;
    case "third-party": return <Globe className={cls} />;
    default: return <Package className={cls} />;
  }
}

function colorForType(type: string): string {
  switch (type) {
    case "document": return "#64748b";
    case "script": return "#f59e0b";
    case "stylesheet": return "#8b5cf6";
    case "image": return "#ec4899";
    case "font": return "#06b6d4";
    case "media": return "#ef4444";
    case "xhr": return "#0ea5e9";
    case "fetch": return "#22d3ee";
    default: return "#94a3b8";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)} KB`;
  return `${sign}${(abs / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Delta visual: ▲ verde se melhorou, ▼ vermelho se piorou
// "melhorou" depende do tipo de métrica:
// - scores: maior é melhor
// - tempos (ms): menor é melhor
// - CLS: menor é melhor
function DeltaIndicator({
  delta,
  invert = false,
  unit = "",
  precision = 0,
}: {
  delta: number | null;
  invert?: boolean;
  unit?: string;
  precision?: number;
}) {
  if (delta == null) return <span className="text-slate-400 text-sm">—</span>;

  const isNeutral = Math.abs(delta) < 0.0001;
  const isBetter = invert ? delta < 0 : delta > 0;
  const color = isNeutral
    ? "text-slate-400"
    : isBetter
    ? "text-green-600"
    : "text-red-600";
  const Icon = isNeutral ? Minus : isBetter ? TrendingUp : TrendingDown;

  const formatted = delta.toFixed(precision);
  const sign = delta > 0 ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {sign}
      {formatted}
      {unit}
    </span>
  );
}

// Bloco de score comparado (A vs B + delta)
function ScoreCompareRow({
  label,
  a,
  b,
  delta,
}: {
  label: string;
  a: number | null;
  b: number | null;
  delta: number | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2.5 border-b border-white/40 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="w-16 flex justify-center">
        <ScoreBadge score={a} size="sm" />
      </div>
      <div className="w-16 flex justify-center">
        <ScoreBadge score={b} size="sm" />
      </div>
      <div className="w-20 flex justify-end">
        <DeltaIndicator delta={delta} />
      </div>
    </div>
  );
}

// Bloco de métrica comparada
function MetricCompareRow({
  label,
  a,
  b,
  delta,
  unit,
  invert,
}: {
  label: string;
  a: number | string | null;
  b: number | string | null;
  delta: number | null;
  unit: string;
  invert: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2.5 border-b border-white/40 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="w-20 text-right text-sm text-slate-500 tabular-nums">
        {a ?? "—"}
        {a != null && <span className="text-xs ml-0.5">{unit}</span>}
      </span>
      <span className="w-20 text-right text-sm font-semibold text-slate-900 tabular-nums">
        {b ?? "—"}
        {b != null && <span className="text-xs ml-0.5">{unit}</span>}
      </span>
      <div className="w-24 flex justify-end">
        <DeltaIndicator delta={delta} invert={invert} unit={unit} precision={unit === "" ? 4 : 0} />
      </div>
    </div>
  );
}

// Card de recurso (para os diffs)
function ResourceDiffCard({
  resource,
  variant,
}: {
  resource: ComparedResource;
  variant: "added" | "removed" | "grown";
}) {
  const color = colorForType(resource.type);
  const iconCls = "w-4 h-4";

  const badge = (() => {
    if (variant === "added")
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          + Novo
        </span>
      );
    if (variant === "removed")
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
          − Removido
        </span>
      );
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
        ▲ Cresceu {resource.deltaPct}%
      </span>
    );
  })();

  return (
    <div
      className="rounded-lg p-2.5 bg-white/70 backdrop-blur-sm flex items-start gap-2.5"
      style={{
        borderLeft: `3px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <span style={{ color }} className={iconCls}>
        {iconForType(resource.type)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {badge}
          {resource.thirdParty && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
              3rd
            </span>
          )}
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-slate-800 hover:text-violet-600 inline-flex items-center gap-1 group"
          title={resource.url}
        >
          <span className="truncate">{resource.fileName}</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 flex-shrink-0 transition" />
        </a>
        <div className="text-[10px] text-slate-400 truncate">
          {resource.domain}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs">
          {variant === "grown" && resource.previousBytes != null ? (
            <>
              <span className="text-slate-500 tabular-nums">
                {formatBytes(resource.previousBytes)}
              </span>
              <span className="text-slate-400">→</span>
              <span className="font-semibold text-amber-700 tabular-nums">
                {formatBytes(resource.transferBytes)}
              </span>
            </>
          ) : (
            <span className="font-semibold text-slate-800 tabular-nums">
              {formatBytes(resource.transferBytes)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Card de oportunidade
function OpportunityDiffCard({
  opp,
  variant,
}: {
  opp: ComparedOpportunity;
  variant: "new" | "resolved";
}) {
  const isNew = variant === "new";
  return (
    <div
      className="rounded-lg p-3 bg-white/70 backdrop-blur-sm flex items-start gap-2.5"
      style={{
        borderLeft: `3px solid ${isNew ? "#ef4444" : "#10b981"}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      {isNew ? (
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900">{opp.title}</div>
        {opp.displayValue && (
          <div className="text-xs text-slate-500 mt-0.5 font-mono">
            {opp.displayValue}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComparePanel({ siteId }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: runs, isLoading: loadingRuns } = useSiteRuns(siteId);

  // Runs prontas (só 'done')
  const doneRuns = useMemo(
    () => (runs ?? []).filter((r) => r.status === "done"),
    [runs]
  );

  // Estado dos dois lados — lê da URL, se existir
  const [aId, setAId] = useState<number | null>(null);
  const [bId, setBId] = useState<number | null>(null);

  // Inicializa com as 2 runs mais recentes quando a lista carregar
  useEffect(() => {
    if (doneRuns.length >= 2 && aId == null && bId == null) {
      const fromUrlA = Number(searchParams.get("a"));
      const fromUrlB = Number(searchParams.get("b"));
      if (
        Number.isFinite(fromUrlA) &&
        Number.isFinite(fromUrlB) &&
        fromUrlA !== fromUrlB
      ) {
        setAId(fromUrlA);
        setBId(fromUrlB);
      } else {
        // b = mais recente, a = anterior
        setBId(doneRuns[0].id);
        setAId(doneRuns[1].id);
      }
    }
  }, [doneRuns, aId, bId, searchParams]);

  // Sincroniza URL quando muda
  useEffect(() => {
    if (aId != null && bId != null) {
      setSearchParams({ a: String(aId), b: String(bId) }, { replace: true });
    }
  }, [aId, bId, setSearchParams]);

  const compareQuery = useCompareRuns(aId, bId);

  if (loadingRuns) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando execuções...
      </div>
    );
  }

  if (doneRuns.length < 2) {
    return (
      <div className="glass-card p-8 text-center text-slate-500 text-sm">
        É preciso ter pelo menos 2 execuções concluídas para comparar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de runs */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Execução A (antes)
            </label>
            <select
              value={aId ?? ""}
              onChange={(e) => setAId(Number(e.target.value))}
              className="ios-input w-full text-sm"
            >
              {doneRuns.map((r) => (
                <option key={r.id} value={r.id} disabled={r.id === bId}>
                  #{r.id} — {formatDate(r.finished_at)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center items-center pb-2">
            <ArrowLeftRight className="w-5 h-5 text-slate-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Execução B (depois)
            </label>
            <select
              value={bId ?? ""}
              onChange={(e) => setBId(Number(e.target.value))}
              className="ios-input w-full text-sm"
            >
              {doneRuns.map((r) => (
                <option key={r.id} value={r.id} disabled={r.id === aId}>
                  #{r.id} — {formatDate(r.finished_at)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo da comparação */}
      {compareQuery.isLoading ? (
        <div className="glass-card p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Comparando...
        </div>
      ) : compareQuery.error ? (
        <div className="glass-card p-8 text-center text-red-600 text-sm">
          Erro ao comparar: {(compareQuery.error as Error).message}
        </div>
      ) : !compareQuery.data ? null : (
        <>
          {/* Scores */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Scores
            </h3>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 pb-2 border-b border-white/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span></span>
              <span className="w-16 text-center">#{compareQuery.data.a.id}</span>
              <span className="w-16 text-center">#{compareQuery.data.b.id}</span>
              <span className="w-20 text-right">Delta</span>
            </div>
            <ScoreCompareRow
              label="Performance"
              a={compareQuery.data.a.performance}
              b={compareQuery.data.b.performance}
              delta={compareQuery.data.deltas.performance}
            />
            <ScoreCompareRow
              label="Acessibilidade"
              a={compareQuery.data.a.accessibility}
              b={compareQuery.data.b.accessibility}
              delta={compareQuery.data.deltas.accessibility}
            />
            <ScoreCompareRow
              label="Best Practices"
              a={compareQuery.data.a.best_practices}
              b={compareQuery.data.b.best_practices}
              delta={compareQuery.data.deltas.best_practices}
            />
            <ScoreCompareRow
              label="SEO"
              a={compareQuery.data.a.seo}
              b={compareQuery.data.b.seo}
              delta={compareQuery.data.deltas.seo}
            />
          </div>

          {/* Métricas */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Métricas
            </h3>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 pb-2 border-b border-white/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span></span>
              <span className="w-20 text-right">#{compareQuery.data.a.id}</span>
              <span className="w-20 text-right">#{compareQuery.data.b.id}</span>
              <span className="w-24 text-right">Delta</span>
            </div>
            <MetricCompareRow
              label="LCP"
              a={compareQuery.data.a.lcp_ms}
              b={compareQuery.data.b.lcp_ms}
              delta={compareQuery.data.deltas.lcp_ms}
              unit="ms"
              invert
            />
            <MetricCompareRow
              label="FCP"
              a={compareQuery.data.a.fcp_ms}
              b={compareQuery.data.b.fcp_ms}
              delta={compareQuery.data.deltas.fcp_ms}
              unit="ms"
              invert
            />
            <MetricCompareRow
              label="CLS"
              a={compareQuery.data.a.cls}
              b={compareQuery.data.b.cls}
              delta={compareQuery.data.deltas.cls}
              unit=""
              invert
            />
            <MetricCompareRow
              label="TBT"
              a={compareQuery.data.a.tbt_ms}
              b={compareQuery.data.b.tbt_ms}
              delta={compareQuery.data.deltas.tbt_ms}
              unit="ms"
              invert
            />
            <MetricCompareRow
              label="TTFB"
              a={compareQuery.data.a.ttfb_ms}
              b={compareQuery.data.b.ttfb_ms}
              delta={compareQuery.data.deltas.ttfb_ms}
              unit="ms"
              invert
            />
            <MetricCompareRow
              label="Speed Index"
              a={compareQuery.data.a.speed_index_ms}
              b={compareQuery.data.b.speed_index_ms}
              delta={compareQuery.data.deltas.speed_index_ms}
              unit="ms"
              invert
            />
          </div>

          {/* Recursos: resumo */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Mudanças em recursos
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-green-50/70 border border-green-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                  + Adicionados
                </div>
                <div className="text-lg font-bold text-green-800 tabular-nums">
                  {compareQuery.data.resourcesDiff.totals.addedCount}
                </div>
                <div className="text-[11px] text-green-700">
                  {formatBytes(compareQuery.data.resourcesDiff.totals.addedBytes)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50/70 border border-slate-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  − Removidos
                </div>
                <div className="text-lg font-bold text-slate-700 tabular-nums">
                  {compareQuery.data.resourcesDiff.totals.removedCount}
                </div>
                <div className="text-[11px] text-slate-600">
                  {formatBytes(-compareQuery.data.resourcesDiff.totals.removedBytes)}
                </div>
              </div>
              <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  ▲ Cresceram
                </div>
                <div className="text-lg font-bold text-amber-800 tabular-nums">
                  {compareQuery.data.resourcesDiff.totals.grownCount}
                </div>
                <div className="text-[11px] text-amber-700">
                  {formatBytes(compareQuery.data.resourcesDiff.totals.grownBytes)}
                </div>
              </div>
            </div>

            {compareQuery.data.resourcesDiff.added.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Adicionados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {compareQuery.data.resourcesDiff.added.map((r, i) => (
                    <ResourceDiffCard key={`add-${i}`} resource={r} variant="added" />
                  ))}
                </div>
              </div>
            )}

            {compareQuery.data.resourcesDiff.grown.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Cresceram
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {compareQuery.data.resourcesDiff.grown.map((r, i) => (
                    <ResourceDiffCard key={`grow-${i}`} resource={r} variant="grown" />
                  ))}
                </div>
              </div>
            )}

            {compareQuery.data.resourcesDiff.removed.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Removidos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {compareQuery.data.resourcesDiff.removed.map((r, i) => (
                    <ResourceDiffCard key={`rem-${i}`} resource={r} variant="removed" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Oportunidades */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Oportunidades
            </h3>

            {compareQuery.data.opportunitiesDiff.new.length === 0 &&
             compareQuery.data.opportunitiesDiff.resolved.length === 0 ? (
              <div className="text-sm text-slate-500 py-3 text-center">
                Sem mudanças nas oportunidades do Lighthouse entre essas execuções.
              </div>
            ) : (
              <>
                {compareQuery.data.opportunitiesDiff.new.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Plus className="w-3 h-3" />
                      Novas ({compareQuery.data.opportunitiesDiff.new.length})
                    </h4>
                    <div className="space-y-2">
                      {compareQuery.data.opportunitiesDiff.new.map((op) => (
                        <OpportunityDiffCard key={op.id} opp={op} variant="new" />
                      ))}
                    </div>
                  </div>
                )}

                {compareQuery.data.opportunitiesDiff.resolved.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolvidas ({compareQuery.data.opportunitiesDiff.resolved.length})
                    </h4>
                    <div className="space-y-2">
                      {compareQuery.data.opportunitiesDiff.resolved.map((op) => (
                        <OpportunityDiffCard key={op.id} opp={op} variant="resolved" />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
