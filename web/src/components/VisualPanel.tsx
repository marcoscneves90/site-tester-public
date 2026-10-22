import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Play,
  Pause,
  X as XIcon,
  Maximize2,
  Image as ImageIcon,
} from "lucide-react";
import { useRunScreenshots } from "../lib/hooks";
import type { ScreenshotFrame } from "../lib/types";

interface Props {
  runId: number;
}

const FRAME_DELAY_MS = 240;

function fmtTiming(ms: number | null): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============ Modal de screenshot ampliado ============
function ScreenshotModal({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg bg-slate-900/80 text-white hover:bg-slate-900 transition z-10"
          title="Fechar (Esc)"
        >
          <XIcon className="w-4 h-4" />
        </button>
        <img
            src={src}
            alt="Screenshot completo"
            className="block max-w-full h-auto"
        />
      </div>
    </div>
  );
}

// ============ Componente principal ============
export function VisualPanel({ runId }: Props) {
  const { data, isLoading, error } = useRunScreenshots(runId);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const frames: ScreenshotFrame[] = useMemo(
    () => data?.filmstrip ?? [],
    [data]
  );

  // Reset quando troca de run
  useEffect(() => {
    setFrameIdx(0);
    setPlaying(true);
  }, [runId]);

  // Loop da animação
  useEffect(() => {
    if (!playing || frames.length === 0) return;

    const t = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, FRAME_DELAY_MS);

    return () => clearInterval(t);
  }, [playing, frames.length]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando visual...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Não foi possível carregar o visual desta execução.
      </div>
    );
  }

  const currentFrame = frames[frameIdx];

  return (
    <div className="space-y-6">
      {/* Filmstrip animado */}
      {frames.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Filmstrip do carregamento
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 tabular-nums">
                {fmtTiming(currentFrame?.timing ?? null)}
              </span>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white/80 transition"
                title={playing ? "Pausar" : "Reproduzir"}
              >
                {playing ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/95 p-4">
            <div className="flex items-center justify-center min-h-[300px]">
              {currentFrame?.data && (
                <img
                    key={frameIdx}
                    src={currentFrame.data}
                    alt={`Frame ${frameIdx + 1}`}
                  className="block max-w-[260px] h-auto rounded-lg shadow-2xl transition-opacity duration-200"
                  style={{ opacity: 1 }}
                />
              )}
            </div>

            {/* Dots de navegação */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {frames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFrameIdx(i);
                    setPlaying(false);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === frameIdx
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                  title={`Frame ${i + 1} — ${fmtTiming(frames[i].timing)}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot final */}
      {data.final && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              Página completa
            </h4>
            <span className="text-xs text-slate-500">
              clique para ampliar
            </span>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="block w-full rounded-2xl overflow-hidden bg-slate-900/95 p-4 group"
          >
            <div className="flex items-center justify-center max-h-[500px] overflow-hidden">
              <img
                  src={data.final.data}
                  alt="Screenshot final"
                className="block max-w-full h-auto rounded-lg shadow-2xl transition group-hover:scale-[1.02]"
              />
            </div>
          </button>
        </div>
      )}

      {!data.final && frames.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhum screenshot disponível para esta execução.
        </div>
      )}

      {/* Modal */}
      {modalOpen && data.final && (
        <ScreenshotModal
          src={data.final.data}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
