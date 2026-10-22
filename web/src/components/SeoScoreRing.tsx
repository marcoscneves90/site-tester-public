import { useEffect, useState } from "react";

interface Props {
  score: number;
  size?: number;
  label?: string;
}

// Cor por faixa de score
function colorForScore(score: number): { stroke: string; text: string; bg: string } {
  if (score >= 90) return { stroke: "#10b981", text: "#047857", bg: "rgba(16, 185, 129, 0.10)" };
  if (score >= 70) return { stroke: "#84cc16", text: "#4d7c0f", bg: "rgba(132, 204, 22, 0.10)" };
  if (score >= 50) return { stroke: "#f59e0b", text: "#b45309", bg: "rgba(245, 158, 11, 0.10)" };
  return { stroke: "#ef4444", text: "#b91c1c", bg: "rgba(239, 68, 68, 0.10)" };
}

export function SeoScoreRing({ score, size = 180, label = "SEO Score" }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const colors = colorForScore(score);

  // Animação: contador sobe de 0 até `score` em ~1s
  useEffect(() => {
    let frame = 0;
    const totalFrames = 40;
    const diff = score;
    const t = setInterval(() => {
      frame++;
      setAnimatedScore(Math.round((diff * frame) / totalFrames));
      if (frame >= totalFrames) {
        setAnimatedScore(score);
        clearInterval(t);
      }
    }, 25);
    return () => clearInterval(t);
  }, [score]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ display: "block" }}
        >
          {/* Círculo de fundo */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.18)"
            strokeWidth={strokeWidth}
          />
          {/* Círculo de progresso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: "stroke-dashoffset 0.05s linear",
              filter: `drop-shadow(0 2px 8px ${colors.stroke}40)`,
            }}
          />
        </svg>

        {/* Texto central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-bold tabular-nums leading-none"
            style={{
              fontSize: size * 0.28,
              color: colors.text,
            }}
          >
            {animatedScore}
          </div>
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mt-2"
            style={{ color: colors.text, opacity: 0.7 }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
