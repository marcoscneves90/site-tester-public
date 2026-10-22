import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Trash2,
  Plus,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  useSites,
  useCreateSite,
  useDeleteSite,
  useRunSite,
  useOverview,
  useConfig,
} from "../lib/hooks";
import { useQueries } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ScoreBadge } from "../components/ScoreBadge";
import { SummaryCards } from "../components/SummaryCards";
import { SiteHealthGrid } from "../components/SiteHealthGrid";
import { SiteAvatar } from "../components/SiteAvatar";
import type { Site, Run } from "../lib/types";

// ============================================================
// Tipo de ordenação
// ============================================================
type SortKey = "name" | "performance" | "accessibility" | "seo" | "lcp";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

// ============================================================
// Saudação
// ============================================================
function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

// ============================================================
// Hook: busca as runs mais recentes de cada site (agrupado)
// ============================================================
function useAllLatestRuns(sites: Site[] | undefined): {
  latestBySite: Map<number, Run | undefined>;
  isLoading: boolean;
} {
  const queries = useQueries({
    queries: (sites ?? []).map((site) => ({
      queryKey: ["runs", site.id],
      queryFn: () => api.listRuns(site.id),
      refetchInterval: 1500,
      enabled: !!sites,
    })),
  });

  const latestBySite = new Map<number, Run | undefined>();
  (sites ?? []).forEach((site, idx) => {
    const runs = queries[idx]?.data;
    latestBySite.set(site.id, runs?.[0]);
  });

  const isLoading = queries.some((q) => q.isLoading);
  return { latestBySite, isLoading };
}

// ============================================================
// Helpers de ordenação
// ============================================================
function valueForSort(
  site: Site,
  latest: Run | undefined,
  key: SortKey
): number | string | null {
  if (key === "name") return (site.name || site.url).toLowerCase();
  if (!latest) return null;
  switch (key) {
    case "performance":
      return latest.performance;
    case "accessibility":
      return latest.accessibility;
    case "seo":
      return latest.seo;
    case "lcp":
      return latest.lcp_ms;
  }
}

function compareValues(
  a: number | string | null,
  b: number | string | null,
  dir: SortDir
): number {
  // Nulos sempre no fim
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let cmp = 0;
  if (typeof a === "string" && typeof b === "string") {
    cmp = a.localeCompare(b);
  } else {
    cmp = Number(a) - Number(b);
  }
  return dir === "asc" ? cmp : -cmp;
}

// ============================================================
// Header clicável
// ============================================================
function SortableTh({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "center",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "center" | "right";
}) {
  const isActive = currentSort.key === sortKey;
  const alignClass =
    align === "left"
      ? "text-left"
      : align === "right"
      ? "text-right"
      : "text-center";

  return (
    <th className={`py-3 px-4 ${alignClass}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition ${
          isActive
            ? "text-violet-600"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {label}
        {isActive && (
          <span className="inline-flex">
            {currentSort.dir === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
          </span>
        )}
      </button>
    </th>
  );
}

// ============================================================
// Linha da tabela
// ============================================================
function SiteRow({ site, latest }: { site: Site; latest: Run | undefined }) {
  const runMutation = useRunSite();
  const deleteMutation = useDeleteSite();

  const isRunning =
    latest && (latest.status === "queued" || latest.status === "running");

  return (
    <tr className="border-b border-white/40 hover:bg-white/40 transition">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <SiteAvatar siteId={site.id} name={site.name || site.url} size="md" />
          <div className="min-w-0">
            <Link
              to={`/sites/${site.id}`}
              className="font-semibold text-slate-900 hover:text-violet-600"
            >
              {site.name || site.url}
            </Link>
            <div className="text-xs text-slate-500 truncate max-w-md mt-0.5">
              {site.url}
            </div>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 text-center">
        <ScoreBadge score={latest?.performance} />
      </td>
      <td className="py-3.5 px-4 text-center">
        <ScoreBadge score={latest?.accessibility} size="sm" />
      </td>
     <td className="py-3.5 px-4 text-center">
                <ScoreBadge
                  score={
                    latest?.seo != null && latest?.seo_score != null
                      ? Math.round((latest.seo + latest.seo_score) / 2)
                      : latest?.seo ?? latest?.seo_score
                  }
                  size="sm"
                />
              </td>

      <td className="py-3.5 px-4 text-center text-sm text-slate-600 tabular-nums">
        {latest?.lcp_ms != null ? `${latest.lcp_ms} ms` : "—"}
      </td>

      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => runMutation.mutate(site.id)}
            disabled={runMutation.isPending || !!isRunning}
            className="ios-btn-primary !px-3 !py-1.5 !text-xs"
            title="Testar agora"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Rodando..." : "Testar"}
          </button>

          <Link
            to={`/sites/${site.id}`}
            className="p-2 rounded-lg text-slate-500 hover:bg-white/80 transition"
            title="Ver detalhes"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            onClick={() => {
              if (confirm(`Remover ${site.name || site.url}?`)) {
                deleteMutation.mutate(site.id);
              }
            }}
            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
            title="Remover"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// Componente principal
// ============================================================
export function SitesListPage() {
  const { data: sites, isLoading, error } = useSites();
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: config } = useConfig();
  const { latestBySite, isLoading: runsLoading } = useAllLatestRuns(sites);

  const createMutation = useCreateSite();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  // Estado de ordenação
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });

  function handleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key !== key) {
        // Nova coluna — pra métricas numéricas, começa por maior primeiro
        // (exceto LCP, que é melhor menor)
        const defaultDir: SortDir = key === "lcp" ? "asc" : "desc";
        return { key, dir: key === "name" ? "asc" : defaultDir };
      }
      // Mesma coluna — inverte
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  // Ordena os sites
  const sortedSites = (() => {
    if (!sites) return [];
    return [...sites].sort((a, b) => {
      const va = valueForSort(a, latestBySite.get(a.id), sort.key);
      const vb = valueForSort(b, latestBySite.get(b.id), sort.key);
      return compareValues(va, vb, sort.dir);
    });
  })();

  const greet = config?.userName
    ? `${greeting()}, ${config.userName}`
    : greeting();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    createMutation.mutate(
      { url: url.trim(), name: name.trim() || undefined },
      {
        onSuccess: () => {
          setUrl("");
          setName("");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {greet}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Aqui está o resumo dos seus sites monitorados
        </p>
      </div>

      {/* 4 cards de resumo */}
      <SummaryCards data={overview} isLoading={overviewLoading} />

      {/* Painel de saúde por site */}
      <SiteHealthGrid />

      {/* Formulário de adicionar */}
      <form
        onSubmit={handleSubmit}
        className="glass-card p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com ou https://example.com"
            className="ios-input"
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nome (opcional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meu site"
            className="ios-input"
          />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || !url.trim()}
          className="ios-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      {createMutation.isError && (
        <div className="text-sm text-red-700 bg-red-50/80 backdrop-blur border border-red-200 rounded-xl p-3">
          Erro ao adicionar: {(createMutation.error as Error).message}
        </div>
      )}

      {/* Lista de sites */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Sites monitorados
          </h2>
          <span className="text-xs text-slate-400">
            clique nos cabeçalhos para ordenar
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Erro ao carregar: {(error as Error).message}
          </div>
        ) : !sites || sites.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhum site cadastrado ainda. Adicione o primeiro acima.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/50">
                <SortableTh
                  label="Site"
                  sortKey="name"
                  currentSort={sort}
                  onSort={handleSort}
                  align="left"
                />
                <SortableTh
                  label="Perf"
                  sortKey="performance"
                  currentSort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Acess"
                  sortKey="accessibility"
                  currentSort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label="SEO"
                  sortKey="seo"
                  currentSort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label="LCP"
                  sortKey="lcp"
                  currentSort={sort}
                  onSort={handleSort}
                />
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSites.map((s) => (
                <SiteRow
                  key={s.id}
                  site={s}
                  latest={latestBySite.get(s.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
