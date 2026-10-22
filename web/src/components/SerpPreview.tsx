import type { SeoTechnicalData } from "../lib/types";

interface Props {
  data: SeoTechnicalData["serpPreview"];
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

// Extrai o domínio sem www. e sem protocolo
function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}

function prettifyBreadcrumb(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const parts = host.split(".").reverse();
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" › ");
  } catch {
    return url;
  }
}

export function SerpPreview({ data }: Props) {
  const displayUrl = prettyUrl(data.url);
  const breadcrumb = prettifyBreadcrumb(data.url);

  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Preview no Google
      </h4>
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        {/* Estrutura visual do SERP do Google */}
        <div className="max-w-2xl">
          {/* Site name + URL */}
          <div className="flex items-center gap-2 mb-1">
            {/* Favicon (círculo cinza) */}
            <div className="w-5 h-5 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex flex-col">
              <div className="text-sm font-medium text-slate-800 leading-tight">
                {data.siteName ?? displayUrl.split("/")[0]}
              </div>
              <div className="text-xs text-slate-500 leading-tight">
                {displayUrl}
              </div>
            </div>
          </div>

          {/* Título (azul, clicável) */}
          <h3
            className="text-xl leading-snug mt-2 mb-1"
            style={{ color: "#1a0dab" }}
          >
            {truncate(data.title, 60)}
          </h3>

          {/* Breadcrumb */}
          <div
            className="text-xs mb-1"
            style={{ color: "#202124" }}
          >
            {breadcrumb}
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#4d5156" }}
          >
            {truncate(data.description, 160)}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-2 text-center">
        Simulação de como seu site aparece nos resultados de busca do Google
      </p>
    </div>
  );
}
