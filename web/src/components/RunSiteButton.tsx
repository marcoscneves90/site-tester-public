import { useState, useRef, useEffect } from "react";
import { Play, ChevronDown, Monitor, Smartphone, Layers } from "lucide-react";
import { useRunSite } from "../lib/hooks";

interface Props {
  siteId: number;
  disabled?: boolean;
  isRunning?: boolean;
}

type Device = "desktop" | "mobile" | "ambos";

export function RunSiteButton({ siteId, disabled, isRunning }: Props) {
  const [open, setOpen] = useState(false);
  const [lastDevice, setLastDevice] = useState<Device>("desktop");
  const menuRef = useRef<HTMLDivElement>(null);
  const runMutation = useRunSite();

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [open]);

  function handleRun(device: Device) {
    setLastDevice(device);
    setOpen(false);
    runMutation.mutate({ id: siteId, device });
  }

  const isDisabled = disabled || isRunning || runMutation.isPending;

  const deviceLabel: Record<Device, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    ambos: "Ambos",
  };

  const deviceIcon: Record<Device, React.ReactNode> = {
    desktop: <Monitor className="w-3.5 h-3.5" />,
    mobile: <Smartphone className="w-3.5 h-3.5" />,
    ambos: <Layers className="w-3.5 h-3.5" />,
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão principal — split button */}
      <div className="inline-flex">
        <button
          onClick={() => handleRun(lastDevice)}
          disabled={isDisabled}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-l-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.30)",
          }}
          title={`Testar (${deviceLabel[lastDevice]})`}
        >
          <Play className="w-4 h-4" />
          {isRunning ? "Rodando..." : `Testar ${deviceLabel[lastDevice]}`}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={isDisabled}
          className="inline-flex items-center px-2 py-2.5 rounded-r-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition border-l border-white/20"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.30)",
          }}
          title="Escolher modo"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden z-30"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04), 0 12px 32px -8px rgba(99,102,241,0.20)",
          }}
        >
          {(["desktop", "mobile", "ambos"] as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => handleRun(d)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition hover:bg-violet-50 ${
                lastDevice === d ? "bg-violet-50/50 font-semibold" : ""
              }`}
            >
              <span className="text-violet-600">{deviceIcon[d]}</span>
              <div className="flex-1">
                <div className="text-slate-800">Testar {deviceLabel[d]}</div>
                <div className="text-[10px] text-slate-500">
                  {d === "desktop" && "Simula viewport de desktop"}
                  {d === "mobile" && "Simula viewport de celular"}
                  {d === "ambos" && "Roda os 2 (em sequência)"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
