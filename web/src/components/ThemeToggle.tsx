import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition
                 hover:bg-white/60 dark:hover:bg-stone-800/60
                 active:scale-95"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {/* Ícone Sun (visível no dark, clicar pra ir pro light) */}
      {isDark ? (
        <Sun className="w-4.5 h-4.5 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="w-4.5 h-4.5 text-stone-600 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </button>
  );
}
