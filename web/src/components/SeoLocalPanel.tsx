import {
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Building2,
  Map as MapIcon,
  Share2,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { useRunSeoLocal } from "../lib/hooks";
import type { SeoLocalData, SeoLocalCheck } from "../lib/types";

interface Props {
  runId: number;
}

// ============================================================
// Ícone por check
// ============================================================
function iconForCheck(id: string) {
  const cls = "w-5 h-5";
  switch (id) {
    case "schema-localbusiness":
      return <Building2 className={cls} />;
    case "schema-address":
      return <MapPin className={cls} />;
    case "schema-phone":
      return <Phone className={cls} />;
    case "schema-hours":
      return <Hash className={cls} />;
    case "schema-rating":
      return <CheckCircle2 className={cls} />;
    case "tel-link":
      return <Phone className={cls} />;
    case "map-embed":
      return <MapIcon className={cls} />;
    case "social-links":
      return <Share2 className={cls} />;
    case "cep":
      return <MapPin className={cls} />;
    default:
      return <CheckCircle2 className={cls} />;
  }
}

// ============================================================
// Cor por score
// ============================================================
function colorForScore(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 70) return "#84cc16";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

// ============================================================
// Card de check individual
// ============================================================
function CheckCard({ check }: { check: SeoLocalCheck }) {
  const color = check.ok ? "#10b981" : "#ef4444";
  return (
    <div
      className="rounded-xl p-4 bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm"
      style={{
        borderLeft: `4px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.7)",
        borderRight: "1px solid rgba(255,255,255,0.7)",
        borderBottom: "1px solid rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="flex items-center gap-2 text-slate-700 dark:text-stone-300"
          style={{ color: check.ok ? undefined : undefined }}
        >
          {iconForCheck(check.id)}
        </span>
        {check.ok ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-stone-100 mb-1">
        {check.label}
      </div>
      <div className="text-xs text-slate-500 dark:text-stone-400">
        {check.detail}
      </div>
    </div>
  );
}

// ============================================================
// Componente principal
// ============================================================
export function SeoLocalPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunSeoLocal(runId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-stone-400 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analisando SEO local...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-stone-400 text-sm">
        Não foi possível carregar a análise de SEO local.
      </div>
    );
  }

  return <SeoLocalContent data={data} />;
}

function SeoLocalContent({ data }: { data: SeoLocalData }) {
  const color = colorForScore(data.score);
  const hasNps = data.nap.phone || data.nap.address;
  const isLocalBusiness = data.schemaLocalBusiness.present;

  return (
    <div className="space-y-6">
      {/* Score geral */}
      <div className="rounded-xl bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Score SEO Local
            </div>
            <div className="text-sm text-slate-600 dark:text-stone-300">
              Baseado em dados do HTML (Schema.org, NAP, mapa)
            </div>
          </div>
          <div
            className="text-4xl font-bold tabular-nums flex-shrink-0"
            style={{ color }}
          >
            {data.score}
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-200/70 dark:bg-stone-700/50 overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${data.score}%`, background: color }}
          />
        </div>
      </div>

      {/* Alerta de contexto */}
      {!isLocalBusiness && (
        <div className="flex items-start gap-2.5 text-sm bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-slate-700 dark:text-stone-300">
            <strong className="font-semibold">Sem Schema LocalBusiness.</strong>{" "}
            Este site não declara ser um negócio local via JSON-LD. Se ele{" "}
            <em>é</em> um negócio local (restaurante, clínica, escritório),
            adicionar Schema LocalBusiness melhora o ranking no Google Maps.
            Se é um site online (SaaS, blog), o SEO local não se aplica.
          </div>
        </div>
      )}

      {/* NAP — Name, Address, Phone */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          NAP detectado no HTML
        </h4>
        <div className="rounded-xl bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 p-4 space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-slate-500 dark:text-stone-400 text-xs">
                Nome:
              </span>{" "}
              <span className="text-slate-900 dark:text-stone-100">
                {data.nap.name ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-slate-500 dark:text-stone-400 text-xs">
                Endereço:
              </span>{" "}
              <span className="text-slate-900 dark:text-stone-100">
                {data.nap.address ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-slate-500 dark:text-stone-400 text-xs">
                Telefone:
              </span>{" "}
              <span className="text-slate-900 dark:text-stone-100">
                {data.nap.phone ?? "—"}
              </span>
              {data.nap.phoneIsLink && (
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Clicável
                </span>
              )}
            </div>
          </div>
          {!hasNps && (
            <div className="text-xs text-slate-400 dark:text-stone-500 italic mt-2">
              Nenhum dado NAP encontrado no HTML
            </div>
          )}
        </div>
      </div>

      {/* Checks detalhados */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Checks detalhados
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </div>

      {/* Schema LocalBusiness resumo */}
      {data.schemaLocalBusiness.present && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-3">
            Schema LocalBusiness detectado
          </h4>
          <div className="rounded-xl bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-slate-900 dark:text-stone-100">
                Tipo: {data.schemaLocalBusiness.type}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {data.schemaLocalBusiness.hasAddress ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className="text-slate-600 dark:text-stone-300">Endereço</span>
              </div>
              <div className="flex items-center gap-1.5">
                {data.schemaLocalBusiness.hasPhone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className="text-slate-600 dark:text-stone-300">Telefone</span>
              </div>
              <div className="flex items-center gap-1.5">
                {data.schemaLocalBusiness.hasOpeningHours ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className="text-slate-600 dark:text-stone-300">Horário</span>
              </div>
              <div className="flex items-center gap-1.5">
                {data.schemaLocalBusiness.hasRating ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className="text-slate-600 dark:text-stone-300">Rating</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redes sociais */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Redes sociais e mapa
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div
            className={`rounded-lg p-3 bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 ${
              data.socialLinks.facebook ? "" : "opacity-50"
            }`}
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-stone-300">
              Facebook
            </div>
            <div className="text-[10px] text-slate-500 dark:text-stone-400 mt-0.5">
              {data.socialLinks.facebook ? "Presente" : "Ausente"}
            </div>
          </div>
          <div
            className={`rounded-lg p-3 bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 ${
              data.socialLinks.instagram ? "" : "opacity-50"
            }`}
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-stone-300">
              Instagram
            </div>
            <div className="text-[10px] text-slate-500 dark:text-stone-400 mt-0.5">
              {data.socialLinks.instagram ? "Presente" : "Ausente"}
            </div>
          </div>
          <div
            className={`rounded-lg p-3 bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 ${
              data.socialLinks.whatsapp ? "" : "opacity-50"
            }`}
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-stone-300">
              WhatsApp
            </div>
            <div className="text-[10px] text-slate-500 dark:text-stone-400 mt-0.5">
              {data.socialLinks.whatsapp ? "Presente" : "Ausente"}
            </div>
          </div>
          <div
            className={`rounded-lg p-3 bg-white/70 dark:bg-stone-800/60 backdrop-blur-sm border border-white/70 dark:border-stone-700/50 ${
              data.mapEmbed.present ? "" : "opacity-50"
            }`}
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-stone-300">
              Mapa
            </div>
            <div className="text-[10px] text-slate-500 dark:text-stone-400 mt-0.5">
              {data.mapEmbed.present
                ? data.mapEmbed.provider
                : "Não incorporado"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
