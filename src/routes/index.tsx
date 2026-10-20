import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Planner } from "@/components/planner/Planner";
import { AuthScreen } from "@/components/planner/Auth";

const ALLOWED_EMAILS = new Set([
  "au.dantas@gmail.com",
  "hameceli.martins@gmail.com",
]);

function IndexPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const guard = async (s: { user: { id: string; email?: string | null } } | null) => {
      if (!s) { setSession(null); setBlocked(null); setAuthReady(true); return; }
      const email = (s.user.email ?? "").toLowerCase();
      if (!ALLOWED_EMAILS.has(email)) {
        await supabase.auth.signOut();
        if (!mounted) return;
        setSession(null);
        setBlocked(email || "conta sem email");
        setAuthReady(true);
        return;
      }
      setSession({ userId: s.user.id });
      setBlocked(null);
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      guard(data.session as any);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      guard(s as any);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Carregando…</p>
      </div>
    );
  }

  if (!session) return <AuthScreen blockedEmail={blocked} />;
  return <Planner />;
}

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Japão 2026 — Reservas e planejador de viagem" },
    { name: "description", content: "Roteiro, reservas de hotéis, orçamento e preparativos da viagem de Aurélio e Hameceli ao Japão em novembro de 2026." },
    { property: "og:title", content: "Japão 2026 — Reservas e planejador de viagem" },
    { property: "og:description", content: "Reservas confirmadas, roteiro terrestre, gastos e bagagem em um só planejador." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: IndexPage,
});
