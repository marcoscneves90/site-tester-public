import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { useSites, useSiteRuns, useAllSeoScores } from "../lib/hooks";
import { SiteAvatar } from "./SiteAvatar";
import type { Site, Run, SiteSeoScore } from "../lib/types";

interface SiteHealth {
  site: Site;
  latest: Run | undefined;
  seoScore: SiteSeoScore | undefined;
}

function scoreColor(score: number | null): string {
  if (score == null) return "bg-slate-300";
  if (score >= 90) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColor(score: number | null): string {
  if (score == null) return "text-slate-400";
  if (score >= 90) return "text-green-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function seoBadgeColors(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 90)
    return {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#047857",
      border: "rgba(16, 185, 129, 0.35)",
    };
  if (score >= 70)
    return {
      bg: "rgba(132, 204, 22, 0.12)",
      text: "#4d7c0f",
      border: "rgba(132, 204, 22, 0.35)",
    };
  if (score >= 50)
    return {
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#b45309",
      border: "rgba(245, 158, 11, 0.35)",
    };
  return {
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#b91c1c",
    border: "rgba(239, 68, 68, 0.35)",
  };
}

function Bar({
  label,
  score,
  highlight = false,
}: {
  label: string;
  score: number | null;
  highlight?: boolean;
}) {
  const value = score ?? 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-24 text-xs flex-shrink-0 ${
          highlight ? "font-semibold text-slate-700" : "font-medium text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreColor(
            score
          )}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div
        className={`w-9 text-right text-sm tabular-nums ${scoreTextColor(
          score
        )} ${highlight ? "font-bold" : "font-semibold"}`}
      >
        {score ?? "—"}
      </div>
    </div>
  );
}

function SiteHealthCard({ site, latest, seoScore }: SiteHealth) {
  const hasRun = latest != null;
  const status = latest?.status;

  const icon = (() => {
    if (!hasRun || status === "queued" || status === "running") {
      return <div className="w-2 h-2 rounded-full bg-slate-300" />;
    }
    if (latest.performance != null && latest.performance >= 90) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (latest.performance != null && latest.performance >= 50) {
      return <TrendingUp className="w-4 h-4 text-amber-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  })();

  const badge = seoScore ? seoBadgeColors(seoScore.score) : null;

  return (
    <div className="glass-card p-5">
      {/* Header do card */}
      <div className="flex items-start gap-3 mb-4">
        <SiteAvatar siteId={site.id} name={site.name || site.url} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/sites/${site.id}`}
            className="font-semibold text-slate-900 hover:text-violet-600 truncate block"
          >
            {site.name || site.url}
          </Link>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {site.url}
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">{icon}</div>
      </div>

      {/* 4 barras */}
      {hasRun ? (
        <div className="space-y-2.5">
          <Bar label="Performance" score={latest.performance} />
          <Bar label="Acessibilidade" score={latest.accessibility} />
          <Bar label="SEO (Lighthouse)" score={latest.seo} />
          {seoScore && (
            <div className="pt-1.5 mt-1.5 border-t border-slate-200/60">
              <Bar
                label="SEO Score"
                score={seoScore.score}
                highlight
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic py-2">
          Nenhum teste ainda
        </div>
      )}
    </div>
  );
}

function SiteHealthGridItem({
  site,
  seoScore,
}: {
  site: Site;
  seoScore: SiteSeoScore | undefined;
}) {
  const { data: runs } = useSiteRuns(site.id, { refetchInterval: 3000 });
  return (
    <SiteHealthCard site={site} latest={runs?.[0]} seoScore={seoScore} />
  );
}

export function SiteHealthGrid() {
  const { data: sites, isLoading } = useSites();
  const { data: seoScores } = useAllSeoScores();

  const seoBySite = new Map<number, SiteSeoScore>();
  for (const s of seoScores ?? []) {
    seoBySite.set(s.siteId, s);
  }

  if (isLoading || !sites) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="glass-card p-5 h-[180px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-500 text-sm">
        Nenhum site cadastrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sites.map((s) => (
        <SiteHealthGridItem
          key={s.id}
          site={s}
          seoScore={seoBySite.get(s.id)}
        />
      ))}
    </div>
  );
}
