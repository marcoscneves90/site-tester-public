import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { useSites, useSiteRuns, useRunSite, useRun, useDeleteRun } from "../lib/hooks";
import { ScoreBadge } from "../components/ScoreBadge";
import { SiteAvatar } from "../components/SiteAvatar";
import { RunTerminal } from "../components/RunTerminal";
import { RunDetailsPanel } from "../components/RunDetailsPanel";
import { GitCompare } from "lucide-react";
import { RunSiteButton } from "../components/RunSiteButton";
import type { Run } from "../lib/types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(run: Run): string {
  if (!run.started_at || !run.finished_at) return "—";
  const start = new Date(run.started_at).getTime();
  const end = new Date(run.finished_at).getTime();
  return `${((end - start) / 1000).toFixed(1)}s`;
}

function StatusIcon({ status }: { status: Run["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    case "queued":
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function RunRow({
  run,
  siteId,
  isExpanded,
  onToggle,
  onDelete,
}: {
  run: Run;
  siteId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { data: fullRun } = useRun(isExpanded ? run.id : null);

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-white/40 dark:border-stone-800/50 hover:bg-white/40 dark:hover:bg-stone-800/30 cursor-pointer transition"
      >
        <td className="py-3 px-3 w-8">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </td>
        <td className="py-3 px-3 text-sm text-slate-700 dark:text-stone-300 whitespace-nowrap">
          {fmtDate(run.started_at)}
        </td>
        <td className="py-3 px-3 text-center">
          {run.device === "mobile" ? (
            <span title="Mobile" className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-100 text-violet-700">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span title="Desktop" className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-cyan-100 text-cyan-700">
              <Monitor className="w-3.5 h-3.5" />
            </span>
          )}
        </td>
        <td className="py-3 px-3">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={run.status} />
            <span className="text-xs text-slate-600 dark:text-stone-400 capitalize">
              {run.status}
            </span>
          </div>
        </td>
        <td className="py-3 px-3 text-center">
          <ScoreBadge score={run.performance} size="sm" />
        </td>
        <td className="py-3 px-3 text-center">
          <ScoreBadge score={run.accessibility} size="sm" />
        </td>
        <td className="py-3 px-3 text-center">
          <ScoreBadge score={run.best_practices} size="sm" />
        </td>
        <td className="py-3 px-3 text-center">
          <ScoreBadge score={run.seo} size="sm" />
        </td>
        <td className="py-3 px-3 text-sm text-slate-600 dark:text-stone-300 text-right tabular-nums">
          {run.lcp_ms != null ? `${run.lcp_ms} ms` : "—"}
        </td>
        <td className="py-3 px-3 text-sm text-slate-500 dark:text-stone-400 text-right tabular-nums">
          {fmtDuration(run)}
        </td>
        <td className="py-3 px-2 w-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remover a execução #${run.id}?`)) {
                onDelete();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-900/20 transition"
            title="Remover esta execução"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={11} className="p-0" style={{ backgroundColor: "#eee8f8" }}>
            {fullRun ? (
              <RunDetailsPanel run={fullRun} />
            ) : (
              <div className="p-6 text-sm text-slate-500">
                Carregando detalhes...
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function SiteDetailPage() {
  const { id } = useParams();
  const siteId = Number(id);

  const { data: sites } = useSites();
  const site = sites?.find((s) => s.id === siteId);

  const runsQuery = useSiteRuns(siteId, { refetchInterval: 4000 });
  const runs = runsQuery.data ?? [];

  const runMutation = useRunSite();
  const deleteRunMutation = useDeleteRun(siteId);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  const latestRun = runs[0];
  const isRunning =
    latestRun &&
    (latestRun.status === "queued" || latestRun.status === "running");

  if (!site) {
    return (
      <div className="text-center py-12 text-slate-500">
        {sites ? "Site não encontrado." : "Carregando..."}
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-100 mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao dashboard
      </Link>

      {/* Header do site */}
      <div className="glass-card p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <SiteAvatar siteId={site.id} name={site.name || site.url} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-stone-100 truncate tracking-tight">
              {site.name || site.url}
            </h1>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline break-all"
            >
              {site.url}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/sites/${site.id}/compare`}
                    className="ios-btn-secondary"
                    title="Comparar execuções"
                  >
                    <GitCompare className="w-4 h-4" />
                    Comparar
                  </Link>
                  <RunSiteButton
                    siteId={site.id}
                    disabled={runMutation.isPending}
                    isRunning={!!isRunning}
                  />
            </div>
      </div>

      {/* Grid: tabela + terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histórico */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-stone-200">
                Histórico de execuções
                <span className="ml-2 text-xs text-slate-400 dark:text-stone-500 font-normal">
                  ({runs.length})
                </span>
              </h2>
            </div>

            {runsQuery.isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-stone-400 text-sm">
                Carregando...
              </div>
            ) : runs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Nenhuma execução ainda. Clique em "Testar agora".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr className="border-b border-white/50 dark:border-stone-800/50">
                      <th className="w-8"></th>
                      <th className="text-left py-3 px-3">Data</th>
                      <th className="text-center py-3 px-3">Device</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-center py-3 px-3">Perf</th>
                      <th className="text-center py-3 px-3">Acess</th>
                      <th className="text-center py-3 px-3">BP</th>
                      <th className="text-center py-3 px-3">SEO</th>
                      <th className="text-right py-3 px-3">LCP</th>
                      <th className="text-right py-3 px-3">Duração</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <RunRow
                        key={run.id}
                        run={run}
                        siteId={site.id}
                        isExpanded={expandedRunId === run.id}
                        onToggle={() =>
                          setExpandedRunId(
                            expandedRunId === run.id ? null : run.id
                          )
                        }
                        onDelete={() => {
                          deleteRunMutation.mutate(run.id);
                          if (expandedRunId === run.id) setExpandedRunId(null);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Terminal */}
        <div className="lg:col-span-1">
          <RunTerminal siteUrl={site.url} runs={runs} />
        </div>
      </div>
    </div>
  );
}
