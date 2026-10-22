import { useState, useMemo } from "react";
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Trash2,
  BarChart3,
  Layers,
  Waves,
  Search,
  Files,
  HardDrive,
} from "lucide-react";
import { ResourcesPanel } from "./ResourcesPanel";
import type { RunWithRaw } from "../lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { Eye } from "lucide-react";
import { VisualPanel } from "./VisualPanel";
import { SeoScoreRing } from "./SeoScoreRing";
import { SeoSubscores } from "./SeoSubscores";
import { useRunSeoScore } from "../lib/hooks";
import { SeoTechnicalPanel } from "./SeoTechnicalPanel";
import { WaterfallChart } from "./WaterfallChart";
import { PagesPanel } from "./PagesPanel";
import { InfraPanel } from "./InfraPanel";
import {
  buildAuditCategoryMap,
  CATEGORY_COLORS,
  type Category,
} from "../lib/auditCategories";

interface Props {
  run: RunWithRaw;
  onDelete?: () => void;
}

interface Opportunity {
  id: string;
  title: string;
  displayValue: string | null;
  score: number | null;
  description: string;
  category: Category;
}

function pickOpportunities(raw: RunWithRaw["raw_report"]): Opportunity[] {
  if (!raw?.audits) return [];

  const categoryMap = buildAuditCategoryMap(raw);
  const audits = raw.audits;
  const items: Opportunity[] = [];

  for (const [id, audit] of Object.entries(audits)) {
    if (!audit) continue;
    if (audit.scoreDisplayMode === "notApplicable") continue;
    if (audit.scoreDisplayMode === "informative" && !audit.displayValue) continue;
    if (audit.score == null && !audit.displayValue) continue;
    if (audit.score != null && audit.score >= 0.9) continue;

    if (
      [
        "first-contentful-paint",
        "largest-contentful-paint",
        "speed-index",
        "total-blocking-time",
        "cumulative-layout-shift",
        "interactive",
      ].includes(id)
    ) {
      continue;
    }

    items.push({
      id,
      title: audit.title ?? id,
      displayValue: audit.displayValue ?? null,
      score: audit.score ?? null,
      description: audit.description ?? "",
      category: categoryMap[id] ?? "best-practices",
    });
  }

  items.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
  return items.slice(0, 6);
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/70 rounded-xl px-3 py-2">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
        {value ?? "—"}
        {value != null && unit ? (
          <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  score,
}: {
  category: Category;
  score: number | null;
}) {
  const c = CATEGORY_COLORS[category];
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center gap-3 transition hover:brightness-[0.98]"
      style={{
        background: "#fafafa",
        borderLeft: `4px solid ${c.dot}`,
        borderTop: `1px solid ${c.border}`,
        borderRight: `1px solid ${c.border}`,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: c.text }}
      >
        {c.label}
      </div>
      <ScoreBadge score={score} size="lg" />
    </div>
  );
}

export function RunDetailsPanel({ run, onDelete }: Props) {
  const opportunities = useMemo(() => pickOpportunities(run.raw_report), [run]);
  const [tab, setTab] = useState<
    "analysis" | "resources" | "waterfall" | "visual" | "seo" | "pages" | "infra"
  >("analysis");
  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#eee8f8" }}>
      {/* Header com botão de deletar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          Detalhes da execução #{run.id}
        </h3>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Remover a execução #${run.id}?`)) {
                onDelete();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
            title="Remover esta execução"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover execução
          </button>
        )}
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 border-b border-white/50 pb-2">
        <button
          onClick={() => setTab("analysis")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "analysis"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Análise
        </button>
        <button
          onClick={() => setTab("resources")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "resources"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Recursos
        </button>
        <button
          onClick={() => setTab("visual")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "visual"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Visual
        </button>
        <button
          onClick={() => setTab("seo")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "seo"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          SEO
        </button>
        <button
          onClick={() => setTab("pages")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "pages"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <Files className="w-3.5 h-3.5" />
          Páginas
        </button>
        <button
          onClick={() => setTab("infra")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "infra"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Infra
        </button>
        <button
          onClick={() => setTab("waterfall")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            tab === "waterfall"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          Waterfall
        </button>
      </div>

      {/* Conteúdo da aba ativa */}
      {tab === "analysis" ? (
        <>
          {/* Categorias */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Categorias
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CategoryCard category="performance" score={run.performance} />
              <CategoryCard category="accessibility" score={run.accessibility} />
              <CategoryCard category="best-practices" score={run.best_practices} />
              <CategoryCard category="seo" score={run.seo} />
            </div>
          </div>

          {/* Métricas */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Métricas principais
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <MetricCard label="LCP" value={run.lcp_ms} unit="ms" />
              <MetricCard label="FCP" value={run.fcp_ms} unit="ms" />
              <MetricCard label="CLS" value={run.cls} />
              <MetricCard label="TBT" value={run.tbt_ms} unit="ms" />
              <MetricCard label="TTFB" value={run.ttfb_ms} unit="ms" />
              <MetricCard label="Speed Index" value={run.speed_index_ms} unit="ms" />
            </div>
          </div>

          {/* Oportunidades */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Oportunidades de melhoria
            </h4>

            {opportunities.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50/80 border border-green-200 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4" />
                Nenhuma oportunidade significativa — site está bem otimizado!
              </div>
            ) : (
              <div className="space-y-2">
                {opportunities.map((op) => {
                  const c = CATEGORY_COLORS[op.category];
                  return (
                    <div
                      key={op.id}
                      className="rounded-xl p-3 flex items-start gap-3"
                      style={{
                        background: c.bg,
                        borderLeft: `4px solid ${c.dot}`,
                        borderTop: `1px solid ${c.border}`,
                        borderRight: `1px solid ${c.border}`,
                        borderBottom: `1px solid ${c.border}`,
                      }}
                    >
                      <AlertTriangle
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: c.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <span className="font-semibold text-sm text-slate-900">
                            {op.title}
                          </span>
                          {op.displayValue && (
                            <span
                              className="text-xs font-mono flex-shrink-0 font-semibold"
                              style={{ color: c.text }}
                            >
                              {op.displayValue}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white"
                            style={{ background: c.dot }}
                          >
                            {c.label}
                          </span>
                        </div>
                        {op.description && (
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {op.description.replace(/\[.*?\]\(.*?\)/g, "").trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
       </>
      ) : tab === "resources" ? (
        <ResourcesPanel runId={run.id} />
      ) : tab === "waterfall" ? (
        <WaterfallChart runId={run.id} />
      ) : tab === "visual" ? (
        <VisualPanel runId={run.id} />
      ) : tab === "seo" ? (
        <SeoTab runId={run.id} />
      ) : tab === "infra" ? (
              <InfraPanel runId={run.id} />
      ) : (
        <PagesPanel runId={run.id} />
      )}
    </div>
  );
}

function SeoTab({ runId }: { runId: number }) {
  const [seoSubTab, setSeoSubTab] = useState<"overview" | "technical">("overview");

  return (
    <div className="space-y-5">
      {/* Sub-abas */}
      <div className="flex items-center gap-1 border-b border-white/50 pb-2">
        <button
          onClick={() => setSeoSubTab("overview")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            seoSubTab === "overview"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setSeoSubTab("technical")}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
            seoSubTab === "technical"
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:bg-white/60"
          }`}
        >
          Técnico
        </button>
      </div>

      {/* Conteúdo */}
      {seoSubTab === "overview" ? (
        <SeoOverviewTab runId={runId} />
      ) : (
        <SeoTechnicalPanel runId={runId} />
      )}
    </div>
  );
}

function SeoOverviewTab({ runId }: { runId: number }) {
  const { data, isLoading, error } = useRunSeoScore(runId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Calculando score SEO...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível calcular o score SEO desta execução.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <div className="flex justify-center lg:justify-start">
        <SeoScoreRing score={data.overall} size={200} />
      </div>
      <SeoSubscores data={data} />
    </div>
  );
}
