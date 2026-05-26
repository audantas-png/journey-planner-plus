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
  component: IndexPage,
});
