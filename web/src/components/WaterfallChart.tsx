import { useMemo, useState } from "react";
import {
  Loader2,
  Clock,
  FileText,
  Code2,
  Palette,
  Image as ImageIcon,
  Type,
  Film,
  Package,
  Globe,
} from "lucide-react";
import { useRunWaterfall } from "../lib/hooks";
import type { WaterfallResource } from "../lib/types";

interface Props {
  runId: number;
}

const MAX_RESOURCES = 20;

// Ícone por tipo
function iconForType(type: string) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case "Document": return <FileText className={cls} />;
    case "Script": return <Code2 className={cls} />;
    case "Stylesheet": return <Palette className={cls} />;
    case "Image": return <ImageIcon className={cls} />;
    case "Font": return <Type className={cls} />;
    case "Media": return <Film className={cls} />;
    default: return <Package className={cls} />;
  }
}

// Cor por tipo
function colorForType(type: string): string {
  switch (type) {
    case "Document": return "#64748b";
    case "Script": return "#f59e0b";
    case "Stylesheet": return "#8b5cf6";
    case "Image": return "#ec4899";
    case "Font": return "#06b6d4";
    case "Media": return "#ef4444";
    case "XHR": return "#0ea5e9";
    case "Fetch": return "#22d3ee";
    default: return "#94a3b8";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============ Tooltip flutuante ============
function Tooltip({
  resource,
  x,
  y,
}: {
  resource: WaterfallResource;
  x: number;
  y: number;
}) {
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${x + 12}px`,
        top: `${y + 12}px`,
        maxWidth: "380px",
      }}
    >
      <div
        className="rounded-xl p-3 text-xs"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          color: "#e2e8f0",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="font-semibold text-white truncate mb-1">
          {resource.fileName}
        </div>
        <div className="text-[10px] opacity-70 truncate mb-2">
          {resource.domain}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="opacity-60">Início</span>
          <span className="text-right tabular-nums">{formatMs(resource.startMs)}</span>

          <span className="opacity-60">Fim</span>
          <span className="text-right tabular-nums">{formatMs(resource.endMs)}</span>

          <span className="opacity-60">Duração</span>
          <span className="text-right tabular-nums font-semibold text-white">
            {formatMs(resource.durationMs)}
          </span>

          <span className="opacity-60">Tamanho</span>
          <span className="text-right tabular-nums">
            {formatBytes(resource.transferBytes)}
          </span>

          <span className="opacity-60">Tipo</span>
          <span className="text-right">{resource.type}</span>

          {resource.statusCode && (
            <>
              <span className="opacity-60">Status</span>
              <span className="text-right tabular-nums">{resource.statusCode}</span>
            </>
          )}
        </div>

        {resource.thirdParty && (
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-orange-400 font-semibold uppercase tracking-wider">
            Recurso de terceiros
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Barra de um recurso ============
function ResourceBar({
  resource,
  totalDurationMs,
  onHover,
  onLeave,
}: {
  resource: WaterfallResource;
  totalDurationMs: number;
  onHover: (r: WaterfallResource, e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = colorForType(resource.type);

  // Posição e largura em % (do total)
  const leftPct = totalDurationMs > 0 ? (resource.startMs / totalDurationMs) * 100 : 0;
  const widthPct = totalDurationMs > 0 ? (resource.durationMs / totalDurationMs) * 100 : 0;

  return (
    <div
      className="grid grid-cols-[200px_1fr] gap-3 items-center py-1.5 hover:bg-white/50 rounded-md transition cursor-pointer"
      onMouseEnter={(e) => {
        setHovered(true);
        onHover(resource, e);
      }}
      onMouseMove={(e) => onHover(resource, e)}
      onMouseLeave={() => {
        setHovered(false);
        onLeave();
      }}
    >
      {/* Coluna esquerda: nome + domínio */}
      <div className="min-w-0 flex items-start gap-1.5">
        <span style={{ color }} className="mt-0.5 flex-shrink-0">
          {iconForType(resource.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span
              className="text-[11px] font-medium text-slate-800 truncate"
              title={resource.url}
            >
              {resource.fileName}
            </span>
            {resource.thirdParty && (
              <span className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0">
                3RD
              </span>
            )}
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {resource.domain}
          </div>
        </div>
      </div>

      {/* Coluna direita: barra */}
      <div className="relative h-5">
        {/* Grid de fundo (marcas a cada 20%) */}
        <div className="absolute inset-0 flex">
          {[0, 20, 40, 60, 80, 100].map((p) => (
            <div
              key={p}
              className="absolute top-0 bottom-0 w-px bg-slate-200/40"
              style={{ left: `${p}%` }}
            />
          ))}
        </div>

        {/* Barra do recurso */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md transition-all"
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 0.3)}%`, // mínimo 0.3% pra ficar visível
            background: color,
            opacity: hovered ? 1 : 0.8,
            boxShadow: hovered ? `0 0 0 2px ${color}40, 0 2px 8px ${color}60` : "none",
            minWidth: "4px",
          }}
        />

        {/* Duração na ponta da barra (se hovered) */}
        {hovered && (
          <div
            className="absolute top-0.5 bottom-0.5 flex items-center text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none"
            style={{
              left: `calc(${leftPct + widthPct}% + 6px)`,
            }}
          >
            {formatMs(resource.durationMs)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Componente principal ============
export function WaterfallChart({ runId }: Props) {
  const { data, isLoading, error } = useRunWaterfall(runId);
  const [hovered, setHovered] = useState<{
    resource: WaterfallResource;
    x: number;
    y: number;
  } | null>(null);

  // Top 20 por start time + agrupamento por domínio
  const grouped = useMemo(() => {
    if (!data) return [];
    const top = [...data.resources]
      .sort((a, b) => a.startMs - b.startMs)
      .slice(0, MAX_RESOURCES);

    const groups = new Map<string, WaterfallResource[]>();
    for (const r of top) {
      const key = r.domain;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // Ordena grupos pelo primeiro start do primeiro recurso
    return Array.from(groups.entries())
      .map(([domain, items]) => ({
        domain,
        items: items.sort((a, b) => a.startMs - b.startMs),
        firstStart: Math.min(...items.map((i) => i.startMs)),
      }))
      .sort((a, b) => a.firstStart - b.firstStart);
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando waterfall...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar o waterfall desta execução.
      </div>
    );
  }

  if (data.resources.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Nenhum recurso registrado nesta execução.
      </div>
    );
  }

  const total = data.totalDurationMs;
  const totalResources = data.resources.length;
  const shownResources = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Timeline de carregamento
        </h4>
        <span className="text-xs text-slate-500">
          Mostrando {shownResources} de {totalResources} recursos · {formatMs(total)} total
        </span>
      </div>

      <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4 overflow-hidden">
        {/* Régua de tempo no topo */}
        <div className="grid grid-cols-[200px_1fr] gap-3 mb-3 pb-2 border-b border-white/50">
          <div />
          <div className="relative h-4 text-[10px] text-slate-400 font-medium">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => (
              <span
                key={p}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${p * 100}%` }}
              >
                {formatMs(Math.round(p * total))}
              </span>
            ))}
          </div>
        </div>

        {/* Grupos por domínio */}
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.domain}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.domain}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({group.items.length})
                </span>
                {group.domain !== new URL(data.resources[0]?.url ?? "http://x").hostname && (
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                    3RD
                  </span>
                )}
              </div>
              <div>
                {group.items.map((r) => (
                  <ResourceBar
                    key={`${r.url}-${r.startMs}`}
                    resource={r}
                    totalDurationMs={total}
                    onHover={(res, e) =>
                      setHovered({ resource: res, x: e.clientX, y: e.clientY })
                    }
                    onLeave={() => setHovered(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <Tooltip
          resource={hovered.resource}
          x={hovered.x}
          y={hovered.y}
        />
      )}
    </div>
  );
}
