import { useState } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Share2,
  MessageCircle,
  Link2,
  Code2,
  Globe,
  Eye,
  Bot,
} from "lucide-react";
import { useRunSeoTechnical } from "../lib/hooks";
import { SerpPreview } from "./SerpPreview";
import type { MetaTag, JsonLdBlock } from "../lib/types";

interface Props {
  runId: number;
}

// ============ Card de status ============
function StatusCard({
  icon,
  label,
  score,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  score: number; // 0-100
  detail: string;
}) {
  const color =
    score >= 90 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const bg =
    score >= 90
      ? "rgba(16, 185, 129, 0.10)"
      : score >= 50
      ? "rgba(245, 158, 11, 0.10)"
      : "rgba(239, 68, 68, 0.10)";

  return (
    <div
      className="rounded-xl p-4 bg-white/70 backdrop-blur-sm"
      style={{
        borderLeft: `4px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-semibold text-slate-700">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>
        {score}%
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{detail}</div>
    </div>
  );
}

// ============ Tabela de meta tags ============
function MetaTagList({
  title,
  tags,
}: {
  title: string;
  tags: MetaTag[];
}) {
  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {tags.map((t, i) => (
              <tr
                key={t.tag}
                className={`border-b border-white/40 last:border-0 ${
                  i % 2 === 0 ? "bg-white/20" : ""
                }`}
              >
                <td className="py-2.5 px-3 w-8">
                  {t.present ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-700 w-44">
                  {t.tag}
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-600 truncate max-w-md">
                  {t.value ?? (
                    <span className="text-slate-400 italic">ausente</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Bloco JSON-LD ============
function JsonLdCard({ block }: { block: JsonLdBlock }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg p-3 bg-white/70 backdrop-blur-sm"
      style={{
        borderLeft: `3px solid ${block.valid ? "#10b981" : "#ef4444"}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {block.valid ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-slate-700">
          Bloco #{block.index + 1}
        </span>
        <span className="text-xs text-slate-500">
          {block.types.length > 0
            ? block.types.join(", ")
            : "JSON inválido"}
        </span>
        <span className="ml-auto text-slate-400">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
      {expanded && (
        <pre className="mt-2 p-2 rounded bg-slate-900 text-slate-100 text-[10px] leading-relaxed overflow-x-auto max-h-60">
          {block.preview}
        </pre>
      )}
    </div>
  );
}

// ============ Componente principal ============
export function SeoTechnicalPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunSeoTechnical(runId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analisando SEO técnico...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível analisar o SEO técnico desta execução.
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Cards de status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard
          icon={<Share2 className="w-4 h-4" />}
          label="Open Graph"
          score={summary.openGraphScore}
          detail={
            summary.hasOgImage
              ? "Imagem presente"
              : "Sem og:image"
          }
        />
        <StatusCard
          icon={<MessageCircle className="w-4 h-4" />}
          label="Twitter Cards"
          score={summary.twitterScore}
          detail={
            summary.hasTwitterCard
              ? "Card configurado"
              : "Sem preview no Twitter/X"
          }
        />
        <StatusCard
          icon={<Code2 className="w-4 h-4" />}
          label="Structured Data"
          score={
            summary.jsonLdCount === 0
              ? 0
              : Math.round(
                  (summary.jsonLdValid / summary.jsonLdCount) * 100
                )
          }
          detail={
            summary.jsonLdCount === 0
              ? "Nenhum JSON-LD"
              : `${summary.jsonLdCount} bloco(s), ${summary.jsonLdValid} válido(s)`
          }
        />
        <StatusCard
          icon={<Bot className="w-4 h-4" />}
          label="Indexável"
          score={summary.indexable ? 100 : 0}
          detail={summary.indexable ? "Google pode indexar" : "Bloqueada por robots"}
        />
      </div>

      {/* SERP Preview */}
      <SerpPreview data={data.serpPreview} />

      {/* Open Graph */}
      <MetaTagList
        title="Open Graph (Facebook, LinkedIn, WhatsApp)"
        tags={data.openGraph}
      />

      {/* Twitter Cards */}
      <MetaTagList
        title="Twitter Cards"
        tags={data.twitterCards}
      />

      {/* Structured Data */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          Structured Data (JSON-LD)
        </h4>
        {data.jsonLd.length === 0 ? (
          <div className="flex items-start gap-2.5 text-sm bg-amber-50/80 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-slate-700">
              <strong className="font-semibold">Nenhum dado estruturado encontrado.</strong>{" "}
              Adicionar JSON-LD (Organization, LocalBusiness, Product, FAQ...)
              permite que o Google exiba rich snippets com mais informações nos
              resultados de busca.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.jsonLd.map((block) => (
              <JsonLdCard key={block.index} block={block} />
            ))}
          </div>
        )}
      </div>

      {/* Canonical + Robots + Hreflang */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Canonical
            </span>
          </div>
          {data.canonical ? (
            <a
              href={data.canonical}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-violet-600 hover:underline break-all"
            >
              {data.canonical}
            </a>
          ) : (
            <div className="text-xs text-slate-400 italic">Não definida</div>
          )}
        </div>

        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Meta robots
            </span>
          </div>
          {data.robots.value ? (
            <div className="text-xs font-mono text-slate-700">
              {data.robots.value}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Padrão (index, follow)
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hreflang
            </span>
          </div>
          {data.hreflang.length === 0 ? (
            <div className="text-xs text-slate-500">
              Não aplicável (site único idioma)
            </div>
          ) : (
            <div className="space-y-1">
              {data.hreflang.slice(0, 3).map((h) => (
                <div key={h.lang} className="text-xs text-slate-700">
                  <span className="font-mono">{h.lang}</span>
                </div>
              ))}
              {data.hreflang.length > 3 && (
                <div className="text-[10px] text-slate-400">
                  + {data.hreflang.length - 3} outros
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
