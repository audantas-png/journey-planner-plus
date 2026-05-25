/** Aplicação é dark-only — toggle removido por decisão de design. */
export function ThemeToggle(_props: { className?: string }) {
  return null;
}

/** Força tema escuro no primeiro paint (sem flash). */
export const themeInitScript = `document.documentElement.classList.add("dark");`;
