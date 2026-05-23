import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Planner } from "@/components/planner/Planner";
import { AuthScreen } from "@/components/planner/Auth";

function IndexPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<{ userId: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ? { userId: data.session.user.id } : null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ? { userId: s.user.id } : null);
      setAuthReady(true);
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

  if (!session) return <AuthScreen />;
  return <Planner />;
}

export const Route = createFileRoute("/")({
  component: IndexPage,
});
