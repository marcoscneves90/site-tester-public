type Size = "sm" | "md" | "lg";

interface Props {
  score: number | null | undefined;
  size?: Size;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs rounded-md min-w-[2.5rem]",
  md: "px-2.5 py-1 text-sm rounded-md min-w-[3rem]",
  lg: "px-3.5 py-1.5 text-base rounded-lg min-w-[3.5rem]",
};

export function ScoreBadge({ score, size = "md" }: Props) {
  if (score == null) {
    return (
      <span className={`inline-flex items-center justify-center text-slate-400 font-semibold ${SIZE_CLASSES[size]}`}>
        —
      </span>
    );
  }

  const isGood = score >= 90;
  const isOk = score >= 50;

  const colors = isGood
    ? {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-300",
        shadow: "0 2px 8px rgba(16, 185, 129, 0.20)",
      }
    : isOk
    ? {
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-300",
        shadow: "0 2px 8px rgba(245, 158, 11, 0.20)",
      }
    : {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-300",
        shadow: "0 2px 8px rgba(239, 68, 68, 0.20)",
      };

  return (
    <span
      className={`inline-flex items-center justify-center font-bold border ${SIZE_CLASSES[size]} ${colors.bg} ${colors.text} ${colors.border}`}
      style={{ boxShadow: colors.shadow }}
    >
      {score}
    </span>
  );
}
