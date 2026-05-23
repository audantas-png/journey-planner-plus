import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "japan-planner-theme";

function getInitialDark(): boolean {
  if (typeof document === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={cn(
        "inline-flex items-center justify-center w-8 h-8 border border-background/30 text-background hover:bg-background/10 transition-colors",
        className,
      )}
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}

/** Evita flash de tema errado no primeiro paint (SSR). */
export const themeInitScript = `(function(){try{var k="${STORAGE_KEY}";var s=localStorage.getItem(k);var d=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
