import { useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Globe,
  FileText,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useRunPages } from "../lib/hooks";
import type { PageAudit, PageIssue } from "../lib/types";

interface Props {
  runId: number;
}

// ============================================================
// Helpers visuais
// ============================================================
function statusColor(status: number | null): string {
  if (status == null) return "#94a3b8"; // cinza
  if (status >= 400) return "#ef4444"; // vermelho
  if (status >= 300) return "#f59e0b"; // amarelo
  return "#10b981"; // verde
}

function issueSeverityIcon(severity: PageIssue["severity"]) {
  const cls = "w-3.5 h-3.5 flex-shrink-0 mt-0.5";
  switch (severity) {
    case "error":
      return <XCircle className={`${cls} text-red-500`} />;
    case "warning":
      return <AlertTriangle className={`${cls} text-amber-500`} />;
    case "info":
      return <AlertTriangle className={`${cls} text-slate-400`} />;
  }
}

function issueSeverityColor(severity: PageIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "rgba(239, 68, 68, 0.10)";
    case "warning":
      return "rgba(245, 158, 11, 0.10)";
    case "info":
      return "rgba(148, 163, 184, 0.10)";
  }
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path === "/" ? "/" : path;
  } catch {
    return url;
  }
}

function summarizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    if (path === "" || path === "/") return "Home";
    // Pega o último segmento da URL
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? path;
  } catch {
    return url;
  }
}

// ============================================================
// Contadores de severidade
// ============================================================
function countBySeverity(issues: PageIssue[] | null): {
  errors: number;
  warnings: number;
  infos: number;
} {
  const list = issues ?? [];
  return {
    errors: list.filter((i) => i.severity === "error").length,
    warnings: list.filter((i) => i.severity === "warning").length,
    infos: list.filter((i) => i.severity === "info").length,
  };
}

// ============================================================
// Card de página (linha expansível)
// ============================================================
function PageRow({ page }: { page: PageAudit }) {
  const [expanded, setExpanded] = useState(false);
  const counts = countBySeverity(page.issues);
  const hasIssues = (page.issues?.length ?? 0) > 0;
  const color = statusColor(page.status_code);

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-3 transition ${
          hasIssues ? "cursor-pointer hover:bg-white/90" : ""
        }`}
        onClick={() => hasIssues && setExpanded((e) => !e)}
      >
        {/* Chevron */}
        <span className="w-4 flex-shrink-0">
          {hasIssues ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )
          ) : (
            <span className="block w-4" />
          )}
        </span>

        {/* Status */}
        <span
          className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded flex-shrink-0"
          style={{
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}40`,
          }}
        >
          {page.status_code ?? "ERR"}
        </span>

        {/* URL */}
        <div className="flex-1 min-w-0">
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-800 hover:text-violet-600 inline-flex items-center gap-1 group truncate max-w-full"
            title={page.url}
          >
            <span className="truncate">{summarizeUrl(page.url)}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 flex-shrink-0 transition" />
          </a>
          <div className="text-[10px] text-slate-400 truncate">
            {formatUrl(page.url)}
          </div>
        </div>

        {/* Palavras */}
        {page.word_count != null && page.word_count > 0 && (
          <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0 hidden md:inline">
            {page.word_count} palavras
          </span>
        )}

        {/* Badges de severidade */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {counts.errors > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
              {counts.errors} err
            </span>
          )}
          {counts.warnings > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              {counts.warnings} warn
            </span>
          )}
          {counts.infos > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {counts.infos} info
            </span>
          )}
          {!hasIssues && page.status_code === 200 && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && hasIssues && (
        <div className="border-t border-white/50 px-4 py-3 space-y-2 bg-white/40">
          {page.issues!.map((issue, idx) => (
            <div
              key={`${issue.code}-${idx}`}
              className="rounded-lg p-2.5 flex items-start gap-2.5"
              style={{
                background: issueSeverityColor(issue.severity),
                borderLeft: `3px solid ${
                  issue.severity === "error"
                    ? "#ef4444"
                    : issue.severity === "warning"
                    ? "#f59e0b"
                    : "#94a3b8"
                }`,
              }}
            >
              {issueSeverityIcon(issue.severity)}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800">
                  {issue.message}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {issue.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Filtros
// ============================================================
type Filter = "all" | "with-issues" | "errors";

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
        active
          ? "bg-violet-100 text-violet-700"
          : "text-slate-500 hover:bg-white/60"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Componente principal
// ============================================================
export function PagesPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunPages(runId);
  const [filter, setFilter] = useState<Filter>("all");

  const pages = data ?? [];

  const stats = useMemo(() => {
    const total = pages.length;
    const withIssues = pages.filter(
      (p) => (p.issues?.length ?? 0) > 0
    ).length;
    const totalIssues = pages.reduce(
      (sum, p) => sum + (p.issues?.length ?? 0),
      0
    );
    const errors = pages.reduce(
      (sum, p) =>
        sum +
        (p.issues?.filter((i) => i.severity === "error").length ?? 0),
      0
    );
    const notOk = pages.filter(
      (p) => p.status_code != null && p.status_code >= 400
    ).length;
    return { total, withIssues, totalIssues, errors, notOk };
  }, [pages]);

  const filteredPages = useMemo(() => {
    if (filter === "with-issues") {
      return pages.filter((p) => (p.issues?.length ?? 0) > 0);
    }
    if (filter === "errors") {
      return pages.filter((p) =>
        p.issues?.some((i) => i.severity === "error")
      );
    }
    return pages;
  }, [pages, filter]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando páginas rastreadas...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar as páginas desta execução.
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        <Globe className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Nenhuma página foi rastreada ainda.
        <br />
        <span className="text-xs text-slate-400">
          O crawl roda automaticamente após o teste principal.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sumário no topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Páginas rastreadas
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.total}
          </div>
        </div>
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Com problemas
          </div>
          <div className="text-2xl font-bold text-amber-600 tabular-nums mt-1">
            {stats.withIssues}
          </div>
        </div>
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total de issues
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.totalIssues}
          </div>
        </div>
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Erros críticos
          </div>
          <div
            className={`text-2xl font-bold tabular-nums mt-1 ${
              stats.errors > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {stats.errors}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          Todas ({pages.length})
        </FilterButton>
        <FilterButton
          active={filter === "with-issues"}
          onClick={() => setFilter("with-issues")}
        >
          Com problemas ({stats.withIssues})
        </FilterButton>
        <FilterButton
          active={filter === "errors"}
          onClick={() => setFilter("errors")}
        >
          Com erros ({stats.errors})
        </FilterButton>
      </div>

      {/* Lista de páginas */}
      <div className="space-y-2">
        {filteredPages.map((p) => (
          <PageRow key={p.id} page={p} />
        ))}
      </div>

      {filteredPages.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-500">
          Nenhuma página corresponde ao filtro selecionado.
        </div>
      )}
    </div>
  );
}
