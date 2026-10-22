import { Link, Outlet, useLocation } from "react-router-dom";
import { Gauge, Settings } from "lucide-react";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen">
      <header className="glass-header sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}>
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold text-slate-900">
                Site Tester
              </div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                homelab · lighthouse
              </div>
            </div>
          </Link>

          <nav className="ml-6 flex items-center gap-1">
            <Link
              to="/"
              className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition ${
                isHome
                  ? "bg-white/80 text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              Dashboard
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="p-2 rounded-lg text-slate-500 hover:bg-white/60 transition"
              title="Configurações (em breve)"
              disabled
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
