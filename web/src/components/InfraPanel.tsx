import {
  Loader2,
  Server,
  Code2,
  Package,
  Zap,
  BarChart3,
  Globe,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileArchive,
  Image as ImageIcon,
  Type,
  TrendingUp,
} from "lucide-react";
import { useRunInfra } from "../lib/hooks";
import type { DetectedTech, CompressionInfo, InfraData } from "../lib/types";

interface Props {
  runId: number;
}

// ============================================================
// Ícones e cores por categoria
// ============================================================
function iconForCategory(category: string) {
  const cls = "w-5 h-5";
  switch (category) {
    case "Servidor web": return <Server className={cls} />;
    case "Runtime": return <Code2 className={cls} />;
    case "CMS": return <Package className={cls} />;
    case "Framework": return <Box className={cls} />;
    case "Build tool": return <Zap className={cls} />;
    case "Analytics": return <BarChart3 className={cls} />;
    case "CDN": return <Globe className={cls} />;
    default: return <Package className={cls} />;
  }
}

function colorForCategory(category: string): string {
  switch (category) {
    case "Servidor web": return "#06b6d4";
    case "Runtime": return "#f59e0b";
    case "CMS": return "#8b5cf6";
    case "Framework": return "#ec4899";
    case "Build tool": return "#84cc16";
    case "Analytics": return "#ef4444";
    case "CDN": return "#0ea5e9";
    case "Biblioteca JS": return "#a855f7";
    case "CSS Framework": return "#a855f7";
    default: return "#94a3b8";
  }
}

function confidenceBadge(confidence: DetectedTech["confidence"]) {
  const map = {
    high: { label: "Alta", color: "#10b981" },
    medium: { label: "Média", color: "#f59e0b" },
    low: { label: "Baixa", color: "#94a3b8" },
  };
  const c = map[confidence];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: `${c.color}15`, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ============================================================
// Score badge para os cards de análise
// ============================================================
function scoreColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 70) return "#84cc16";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

// ============================================================
// Card de tecnologia
// ============================================================
function TechCard({ tech }: { tech: DetectedTech }) {
  const color = colorForCategory(tech.category);
  return (
    <div
      className="rounded-xl p-4 bg-white/70 backdrop-blur-sm transition hover:bg-white/90"
      style={{
        borderLeft: `4px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span style={{ color }}>{iconForCategory(tech.category)}</span>
        {confidenceBadge(tech.confidence)}
      </div>
      <div className="text-sm font-semibold text-slate-900 mb-0.5">
        {tech.name}
        {tech.version && (
          <span className="ml-1.5 text-xs font-mono" style={{ color }}>
            v{tech.version}
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
        {tech.category}
      </div>
    </div>
  );
}

// ============================================================
// Card de Infra Score geral
// ============================================================
function InfraScoreCard({ data }: { data: InfraData }) {
  const color = scoreColor(data.infraScore);
  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Infra Score geral
          </h4>
        </div>
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {data.infraScore}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${data.infraScore}%`, background: color }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 rounded-lg bg-white/40">
          <div className="font-bold text-slate-900 tabular-nums">
            {data.compression.score}
          </div>
          <div className="text-[10px] text-slate-500 uppercase">Compressão</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/40">
          <div className="font-bold text-slate-900 tabular-nums">
            {data.imageAnalysis.score}
          </div>
          <div className="text-[10px] text-slate-500 uppercase">Imagens</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/40">
          <div className="font-bold text-slate-900 tabular-nums">
            {data.fontAnalysis.score}
          </div>
          <div className="text-[10px] text-slate-500 uppercase">Fontes</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Card de compressão
// ============================================================
function CompressionCard({ info }: { info: CompressionInfo }) {
  const config = {
    brotli: { icon: CheckCircle2, color: "#10b981", label: "Brotli" },
    gzip: { icon: AlertTriangle, color: "#f59e0b", label: "Gzip" },
    deflate: { icon: AlertTriangle, color: "#f59e0b", label: "Deflate" },
    none: { icon: XCircle, color: "#ef4444", label: "Sem compressão" },
  };
  const c = config[info.status];
  const Icon = c.icon;

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileArchive className="w-4 h-4 text-slate-500" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Compressão
        </h4>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-8 h-8" style={{ color: c.color }} />
        <div>
          <div className="text-lg font-bold" style={{ color: c.color }}>
            {c.label}
          </div>
          <div className="text-[11px] text-slate-500">
            {info.encoding === "none" ? "Nenhum encoding" : `Encoding: ${info.encoding}`}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div
            className="text-2xl font-bold tabular-nums"
            style={{ color: c.color }}
          >
            {info.score}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            Score
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${info.score}%`, background: c.color }}
        />
      </div>
      <div className="text-sm text-slate-600">{info.recommendation}</div>
    </div>
  );
}

// ============================================================
// Card de Imagens
// ============================================================
function ImageAnalysisCard({ data }: { data: InfraData["imageAnalysis"] }) {
  const color = scoreColor(data.score);
  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-5">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-4 h-4 text-slate-500" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Imagens
        </h4>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>
            {data.score}
          </div>
          <div className="text-[11px] text-slate-500">
            {data.total} {data.total === 1 ? "imagem" : "imagens"} na home
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${data.score}%`, background: color }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="text-xs">
          <div className="text-slate-500">Formato moderno</div>
          <div className="font-semibold text-slate-900 tabular-nums">
            {data.modernFormat} / {data.total}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-slate-500">Lazy loading</div>
          <div className="font-semibold text-slate-900 tabular-nums">
            {data.lazyLoading} / {data.total}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-slate-500">Com width/height</div>
          <div className="font-semibold text-slate-900 tabular-nums">
            {data.withDimensions} / {data.total}
          </div>
        </div>
        <div className="text-xs">
          <div className="text-slate-500">Com alt</div>
          <div className="font-semibold text-slate-900 tabular-nums">
            {data.withAlt} / {data.total}
          </div>
        </div>
      </div>
      <div className="text-sm text-slate-600">{data.recommendation}</div>
    </div>
  );
}

// ============================================================
// Card de Fontes
// ============================================================
function FontAnalysisCard({ data }: { data: InfraData["fontAnalysis"] }) {
  const color = scoreColor(data.score);
  const checks = [
    { label: "Google Fonts", ok: data.usesGoogleFonts, neutral: false },
    { label: `Fontes locais (${data.localFontsCount})`, ok: data.localFontsCount > 0, neutral: false },
    { label: "font-display", ok: data.hasFontDisplay, neutral: false },
    { label: "Preload", ok: data.hasFontPreload, neutral: false },
    { label: "WOFF2", ok: data.hasWoff2, neutral: false },
  ];

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Type className="w-4 h-4 text-slate-500" />
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Fontes
        </h4>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>
            {data.score}
          </div>
          <div className="text-[11px] text-slate-500">
            {data.usesGoogleFonts ? "Usa Google Fonts" : data.localFontsCount > 0 ? "Fontes locais" : "Sem fontes customizadas"}
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${data.score}%`, background: color }}
        />
      </div>
      <div className="space-y-1.5 mb-4">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-xs">
            {c.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            <span className="text-slate-700">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="text-sm text-slate-600">{data.recommendation}</div>
    </div>
  );
}

// ============================================================
// Componente principal
// ============================================================
export function InfraPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunInfra(runId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analisando infraestrutura...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar a análise de infraestrutura.
      </div>
    );
  }

  const byCategory = data.technologies.reduce((acc, tech) => {
    if (!acc[tech.category]) acc[tech.category] = [];
    acc[tech.category].push(tech);
    return acc;
  }, {} as Record<string, DetectedTech[]>);

  return (
    <div className="space-y-6">
      {/* Infra Score geral */}
      <InfraScoreCard data={data} />

      {/* Grid de análises: Compressão, Imagens, Fontes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CompressionCard info={data.compression} />
        <ImageAnalysisCard data={data.imageAnalysis} />
        <FontAnalysisCard data={data.fontAnalysis} />
      </div>

      {/* Tecnologias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-4 h-4" />
            Tecnologias detectadas
            {data.technologies.length > 0 && (
              <span className="text-[10px] font-normal text-slate-400">
                ({data.technologies.length})
              </span>
            )}
          </h4>
          {data.headers.server && (
            <span className="text-[10px] text-slate-400">
              Server: {data.headers.server}
            </span>
          )}
        </div>

        {data.technologies.length === 0 ? (
          <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-6 text-center">
            <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm text-slate-600 font-medium mb-1">
              Nenhuma tecnologia identificada
            </div>
            <div className="text-xs text-slate-500 max-w-md mx-auto">
              Sites modernos com build otimizado podem não expor assinaturas
              detectáveis no HTML.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(byCategory).map(([category, techs]) => (
              <div key={category} className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {category} ({techs.length})
                </div>
                <div className="space-y-2">
                  {techs.map((tech, i) => (
                    <TechCard key={`${tech.name}-${i}`} tech={tech} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
