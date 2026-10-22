import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useSites, useTimeline } from "../lib/hooks";
import type { TimelinePoint } from "../lib/types";

// Paleta de cores por site (cicla se tiver mais que isso)
const COLORS = [
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#06b6d4", // ciano
  "#10b981", // verde
  "#f59e0b", // laranja
  "#ef4444", // vermelho
  "#a855f7", // magenta
];

type Period = 7 | 30 | 90;

interface ChartPoint {
  day: string;
  [key: string]: string | number | null;
}

function fmtDay(iso: string): string {
  // iso = "2026-09-30" → "30/09"
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function transformTimeline(points: TimelinePoint[]): {
  data: ChartPoint[];
  siteKeys: { id: number; name: string; color: string }[];
} {
  // Descobre todos os sites
  const siteMap = new Map<number, { name: string; color: string }>();
  points.forEach((p) => {
    if (!siteMap.has(p.siteId)) {
      siteMap.set(p.siteId, {
        name: p.siteName,
        color: COLORS[siteMap.size % COLORS.length],
      });
    }
  });

  const siteKeys = Array.from(siteMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    color: v.color,
  }));

  // Agrupa por dia
  const byDay = new Map<string, ChartPoint>();
  points.forEach((p) => {
    if (!byDay.has(p.day)) {
      byDay.set(p.day, { day: p.day });
    }
    const row = byDay.get(p.day)!;
    row[`site_${p.siteId}`] = p.performance;
  });

  const data = Array.from(byDay.values()).sort((a, b) =>
    a.day < b.day ? -1 : 1
  );

  return { data, siteKeys };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-2xl p-3 text-sm"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.9)",
        boxShadow:
          "0 1px 3px rgba(15,23,42,0.04), 0 12px 32px -8px rgba(99,102,241,0.18)",
      }}
    >
      <div className="text-xs font-semibold text-slate-500 mb-1.5">
        {fmtDay(label)}
      </div>
      {payload.map((entry: any) => (
        <div
          key={entry.dataKey}
          className="flex items-center gap-2 text-xs text-slate-700"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.stroke }}
          />
          <span className="font-medium">{entry.name}</span>
          <span className="ml-auto font-bold tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChart() {
  const [period, setPeriod] = useState<Period>(30);
  const [selectedSite, setSelectedSite] = useState<number | "all">("all");

  const { data: sites } = useSites();
  const { data: timeline, isLoading } = useTimeline(
    period,
    selectedSite === "all" ? undefined : selectedSite
  );

  const { data, siteKeys } = useMemo(
    () => (timeline ? transformTimeline(timeline) : { data: [], siteKeys: [] }),
    [timeline]
  );

  // Calcula a variação (primeiro vs último ponto) do primeiro site exibido
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0];
    const last = data[data.length - 1];
    const key = `site_${siteKeys[0]?.id}`;
    const f = first[key] as number | undefined;
    const l = last[key] as number | undefined;
    if (f == null || l == null) return null;
    return l - f;
  }, [data, siteKeys]);

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            Evolução da performance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Score de performance ao longo do tempo
          </p>
        </div>

        {trend != null && (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              trend >= 0
                ? "bg-green-100/80 text-green-700"
                : "bg-red-100/80 text-red-700"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend >= 0 ? "+" : ""}
            {trend} pts
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Dropdown de site */}
          <select
            value={selectedSite}
            onChange={(e) =>
              setSelectedSite(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 border border-white/80
                       focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          >
            <option value="all">Todos os sites</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.url}
              </option>
            ))}
          </select>

          {/* Período */}
          <div className="flex items-center bg-white/70 border border-white/80 rounded-lg p-0.5">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition ${
                  period === p
                    ? "bg-violet-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      {isLoading ? (
        <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
          Carregando...
        </div>
      ) : data.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
          <BarChart3 className="w-8 h-8 opacity-40" />
          Nenhum teste no período selecionado
        </div>
      ) : (
        <div className="h-72 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                {siteKeys.map((s) => (
                  <linearGradient
                    key={s.id}
                    id={`grad-${s.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tickFormatter={fmtDay}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              {siteKeys.length > 1 && (
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              )}

              {siteKeys.map((s) => (
                <Area
                  key={s.id}
                  type="monotone"
                  dataKey={`site_${s.id}`}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill={`url(#grad-${s.id})`}
                  dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
