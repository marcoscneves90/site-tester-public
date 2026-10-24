import { useState } from "react";

type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  siteId: number;
  name: string;
  size?: Size;
}

const SIZES: Record<Size, { box: string; text: string }> = {
  xs: { box: "w-6 h-6 rounded-md", text: "text-[10px]" },
  sm: { box: "w-7 h-7 rounded-lg", text: "text-xs" },
  md: { box: "w-9 h-9 rounded-xl", text: "text-sm" },
  lg: { box: "w-12 h-12 rounded-2xl", text: "text-lg" },
};

// Paleta iOS-like. Escolhe uma cor determinística pelo nome do site.
const PALETTE = [
  "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)", // roxo
  "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)", // rosa
  "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)", // ciano
  "linear-gradient(135deg, #10b981 0%, #059669 100%)", // verde
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", // laranja
  "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", // vermelho
  "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)", // magenta
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function firstLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Pega a primeira letra alfanumérica
  const match = trimmed.match(/[a-zA-Z0-9]/);
  return (match ? match[0] : trimmed[0]).toUpperCase();
}

export function SiteAvatar({ siteId, name, size = "md" }: Props) {
  const [errored, setErrored] = useState(false);
  const { box, text } = SIZES[size];

  if (errored) {
    return (
      <div
        className={`${box} flex items-center justify-center flex-shrink-0 ${text} font-bold text-white`}
        style={{ background: pickGradient(name) }}
      >
        {firstLetter(name)}
      </div>
    );
  }

  return (
    <div
      className={`${box} flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/60 dark:bg-stone-800/60 border border-white/80 dark:border-stone-700 dark:bg-stone-800/60`}
    >
      <img
        src={`/api/favicon/${siteId}`}
        alt=""
        className="w-full h-full object-contain p-0.5"
        onError={() => setErrored(true)}
        loading="lazy"
      />
    </div>
  );
}
