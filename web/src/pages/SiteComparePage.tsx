import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitCompare } from "lucide-react";
import { useSites } from "../lib/hooks";
import { SiteAvatar } from "../components/SiteAvatar";
import { ComparePanel } from "../components/ComparePanel";

export function SiteComparePage() {
  const { id } = useParams();
  const siteId = Number(id);

  const { data: sites } = useSites();
  const site = sites?.find((s) => s.id === siteId);

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
        to={`/sites/${site.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao site
      </Link>

      {/* Header do site */}
      <div className="glass-card p-6 mb-6 flex items-center gap-4">
        <SiteAvatar siteId={site.id} name={site.name || site.url} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              Comparação
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 truncate tracking-tight mt-0.5">
            {site.name || site.url}
          </h1>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-600 hover:underline break-all"
          >
            {site.url}
          </a>
        </div>
      </div>

      {/* Painel de comparação */}
      <ComparePanel siteId={site.id} />
    </div>
  );
}
