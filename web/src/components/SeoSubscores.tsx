import { useState } from "react";
import {
  Cpu,
  FileText,
  GitBranch,
  Gauge,
  Accessibility,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { SeoCheck, SeoScore } from "../lib/types";

interface Props {
  data: SeoScore;
}

type SubscoreKey = keyof SeoScore["subscores"];

// Configuração visual de cada subscore
const CONFIG: Record<
  SubscoreKey,
  {
    label: string;
    icon: React.ReactNode;
    weight: string;
    hasDetails: boolean;
  }
> = {
  technical: {
    label: "Técnico",
    icon: <Cpu className="w-4 h-4" />,
    weight: "25%",
    hasDetails: true,
  },
  content: {
    label: "Conteúdo",
    icon: <FileText className="w-4 h-4" />,
    weight: "25%",
    hasDetails: true,
  },
  structure: {
    label: "Estrutura",
    icon: <GitBranch className="w-4 h-4" />,
    weight: "15%",
    hasDetails: true,
  },
  performance: {
    label: "Performance",
    icon: <Gauge className="w-4 h-4" />,
    weight: "20%",
    hasDetails: false,
  },
  accessibility: {
    label: "Acessibilidade",
    icon: <Accessibility className="w-4 h-4" />,
    weight: "15%",
    hasDetails: false,
  },
};

function colorForScore(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 70) return "#84cc16";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function BarRow({
  subscoreKey,
  score,
  checks,
}: {
  subscoreKey: SubscoreKey;
  score: number;
  checks?: SeoCheck[];
}) {
  const [expanded, setExpanded] = useState(false);
  const config = CONFIG[subscoreKey];
  const color = colorForScore(score);
  const canExpand = config.hasDetails && checks && checks.length > 0;
  const okCount = checks?.filter((c) => c.ok).length ?? 0;
  const totalCount = checks?.length ?? 0;

  return (
    <div className="border-b border-white/40 last:border-0">
      <div
        className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3 px-1 rounded-lg transition ${
          canExpand ? "cursor-pointer hover:bg-white/40" : ""
        }`}
        onClick={() => canExpand && setExpanded((e) => !e)}
      >
        {/* Ícone */}
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {config.icon}
        </span>

        {/* Label + barra */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800">
              {config.label}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              peso {config.weight}
            </span>
            {canExpand && (
              <span className="text-[10px] text-slate-400">
                · {okCount}/{totalCount} checks
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: color }}
            />
          </div>
        </div>

        {/* Score numérico */}
        <span
          className="text-lg font-bold tabular-nums w-10 text-right"
          style={{ color }}
        >
          {score}
        </span>

        {/* Chevron de expandir */}
        <span className="w-5 flex justify-center text-slate-400">
          {canExpand ? (
            expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : null}
        </span>
      </div>

      {/* Lista de checks expandidos */}
      {expanded && checks && (
        <div className="pl-10 pr-2 pb-3 space-y-1.5">
          {checks.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-2 text-xs py-1"
            >
              {c.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-700">
                  {c.name}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {c.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeoSubscores({ data }: Props) {
  const order: SubscoreKey[] = [
    "technical",
    "content",
    "structure",
    "performance",
    "accessibility",
  ];

  return (
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Subscores
      </h4>
      <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 p-2">
        {order.map((key) => (
          <BarRow
            key={key}
            subscoreKey={key}
            score={data.subscores[key]}
            checks={data.details[key as keyof typeof data.details]}
          />
        ))}
      </div>
    </div>
  );
}
