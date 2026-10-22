import {
  FileText,
  Code2,
  Palette,
  Image as ImageIcon,
  Type,
  Film,
  Package,
  Globe,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { useRunResources } from "../lib/hooks";
import type { ResourceSummaryItem, ResourceRequest } from "../lib/types";

interface Props {
  runId: number;
}

// Ícone por tipo de recurso
function iconForType(type: string) {
  const cls = "w-4 h-4";
  switch (type) {
    case "document":
      return <FileText className={cls} />;
    case "script":
      return <Code2 className={cls} />;
    case "stylesheet":
      return <Palette className={cls} />;
    case "image":
      return <ImageIcon className={cls} />;
    case "font":
      return <Type className={cls} />;
    case "media":
      return <Film className={cls} />;
    case "third-party":
      return <Globe className={cls} />;
    default:
      return <Package className={cls} />;
  }
}

// Cor por tipo (para a barra de proporção)
function colorForType(type: string): string {
  switch (type) {
    case "document":
      return "#64748b";
    case "script":
      return "#f59e0b";
    case "stylesheet":
      return "#8b5cf6";
    case "image":
      return "#ec4899";
    case "font":
      return "#06b6d4";
    case "media":
      return "#ef4444";
    case "third-party":
      return "#f97316";
    default:
      return "#94a3b8";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

// ============ Summary card ============
function SummaryCard({
  item,
  totalBytes,
}: {
  item: ResourceSummaryItem;
  totalBytes: number;
}) {
  const pct = totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0;
  const color = colorForType(item.type);

  return (
    <div
      className="rounded-xl p-3 bg-white/70 backdrop-blur-sm"
      style={{
        borderLeft: `4px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{iconForType(item.type)}</span>
        <span className="text-xs font-semibold text-slate-700">{item.label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 tabular-nums">
        {formatBytes(item.bytes)}
      </div>
      <div className="text-[11px] text-slate-500 mb-2">
        {item.count} {item.count === 1 ? "arquivo" : "arquivos"}
      </div>
      <div className="h-1 rounded-full bg-slate-200/70 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ============ Tabela de top recursos ============
function ResourceRow({ req }: { req: ResourceRequest }) {
  return (
    <tr className="border-b border-white/40 hover:bg-white/40 transition">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span style={{ color: colorForType(req.type) }}>
            {iconForType(req.type)}
          </span>
          <a
            href={req.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-slate-800 hover:text-violet-600 truncate max-w-md inline-flex items-center gap-1 group"
            title={req.url}
          >
            {req.fileName}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition flex-shrink-0" />
          </a>
          {req.thirdParty && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0">
              3rd
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 truncate max-w-md mt-0.5">
          {req.domain}
        </div>
      </td>
      <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
        {formatBytes(req.transferBytes)}
      </td>
      <td className="py-2.5 px-3 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
        {formatDuration(req.durationMs)}
      </td>
    </tr>
  );
}

// ============ Componente principal ============
export function ResourcesPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunResources(runId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando recursos...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar os recursos desta execução.
      </div>
    );
  }

  // Separa "third-party" dos tipos puros (third-party é ortogonal,
  // se sobrepõe a image/script/etc)
  const thirdPartyItem = data.summary.find((s) => s.type === "third-party");
  const typeSummary = data.summary.filter(
    (s) => s.count > 0 && s.type !== "third-party"
  );

  // Percentual de peso que é third-party
  const thirdPartyPct =
    data.totalBytes > 0 && thirdPartyItem
      ? Math.round((thirdPartyItem.bytes / data.totalBytes) * 100)
      : 0;

  // Alerta se total > 5 MB
  const isHeavy = data.totalBytes > 5 * 1024 * 1024;
  const biggest = typeSummary.reduce(
    (max, s) => (s.bytes > max.bytes ? s : max),
    typeSummary[0] ?? { bytes: 0, label: "", type: "" }
  );

  return (
    <div className="space-y-6">
      {/* Resumo no topo — 3 cards, agora com % no terceiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total carregado
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatBytes(data.totalBytes)}
          </div>
        </div>

        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Requisições
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {data.totalRequests}
          </div>
        </div>

        {/* Card de terceiros: agora com % em destaque */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(249, 115, 22, 0.08)",
            borderLeft: "4px solid #f97316",
            borderTop: "1px solid rgba(249, 115, 22, 0.25)",
            borderRight: "1px solid rgba(249, 115, 22, 0.25)",
            borderBottom: "1px solid rgba(249, 115, 22, 0.25)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-700">
            <Globe className="w-3 h-3" />
            Terceiros
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-700 tabular-nums">
              {thirdPartyPct}%
            </span>
            <span className="text-xs text-orange-700/70 font-medium">
              do peso
            </span>
          </div>
          <div className="text-[11px] text-orange-700/80 mt-0.5">
            {thirdPartyItem?.count ?? 0} recursos externos
          </div>
        </div>
      </div>

      {/* Alerta contextual */}
      {isHeavy && biggest.bytes > 0 && (
        <div className="flex items-start gap-2.5 text-sm bg-amber-50/80 border border-amber-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-slate-700">
            <strong className="font-semibold">Site pesado.</strong>{" "}
            {biggest.label} representa{" "}
            <strong>{Math.round((biggest.bytes / data.totalBytes) * 100)}%</strong>{" "}
            do peso ({formatBytes(biggest.bytes)}).
            {thirdPartyPct >= 50 && (
              <>
                {" "}Além disso, <strong>{thirdPartyPct}%</strong> do peso vem de
                domínios externos.
              </>
            )}
            {biggest.type === "image" && (
              <> Considere formatos modernos (WebP/AVIF) e lazy loading.</>
            )}
            {biggest.type === "script" && (
              <> Considere code splitting e remoção de dependências não usadas.</>
            )}
            {biggest.type === "stylesheet" && (
              <> Verifique se o CSS está minificado e se há regras não usadas.</>
            )}
          </div>
        </div>
      )}

      {/* Grid de summary por tipo (sem third-party) */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Por tipo de recurso
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {typeSummary.map((item) => (
            <SummaryCard
              key={item.type}
              item={item}
              totalBytes={data.totalBytes}
            />
          ))}
        </div>
      </div>

      {/* Top recursos */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4" />
          Top 6 recursos mais pesados
        </h4>
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 overflow-hidden">
          <table className="w-full">
            <thead className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-white/50">
              <tr>
                <th className="text-left py-2.5 px-3">Recurso</th>
                <th className="text-right py-2.5 px-3">Tamanho</th>
                <th className="text-right py-2.5 px-3">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {data.topRequests.map((req, idx) => (
                <ResourceRow key={`${req.url}-${idx}`} req={req} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
