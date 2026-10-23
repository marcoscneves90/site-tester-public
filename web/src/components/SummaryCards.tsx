import { Globe2, Activity, Gauge, Clock } from "lucide-react";
import type { Overview } from "../lib/types";

interface Props {
  data: Overview | undefined;
  isLoading: boolean;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora há pouco";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function Card({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: accent }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="text-[28px] font-bold text-slate-900 dark:text-stone-100 leading-tight tabular-nums">
          {value}
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-stone-400 mt-1">
          {label}
        </div>
        {hint && (
          <div className="text-[11px] text-slate-400 dark:text-stone-500 mt-0.5">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

export function SummaryCards({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 h-[136px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={<Globe2 className="w-5 h-5 text-white" />}
        label="Sites monitorados"
        value={data.totalSites}
        hint={`${data.runsToday} testes hoje`}
        accent="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
      />
      <Card
        icon={<Activity className="w-5 h-5 text-white" />}
        label="Testes realizados"
        value={data.totalRuns}
        hint={`${data.runsWeek} nos últimos 7 dias`}
        accent="linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)"
      />
      <Card
        icon={<Gauge className="w-5 h-5 text-white" />}
        label="Performance média"
        value={data.avgPerformance ?? "—"}
        hint={
          data.avgAccessibility != null
            ? `Acessibilidade: ${data.avgAccessibility}`
            : undefined
        }
        accent="linear-gradient(135deg, #10b981 0%, #059669 100%)"
      />
      <Card
        icon={<Clock className="w-5 h-5 text-white" />}
        label="Último teste"
        value={timeAgo(data.lastRunAt)}
        hint={
          data.lastRunAt
            ? new Date(data.lastRunAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined
        }
        accent="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      />
    </div>
  );
}
