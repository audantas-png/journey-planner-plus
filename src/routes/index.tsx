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
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      // #region agent log
      fetch('http://127.0.0.1:7941/ingest/7dc37b9f-23a0-4121-a8f6-0bf7a5f7ef54',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69c5cc'},body:JSON.stringify({sessionId:'69c5cc',location:'index.tsx:getSession',message:'initial session check',data:{hasSession:!!data.session,userId:data.session?.user?.id??null,errorMsg:error?.message??null},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setSession(data.session ? { userId: data.session.user.id } : null);
      setAuthReady(true);
    }).catch((err) => {
      if (!mounted) return;
      // #region agent log
      fetch('http://127.0.0.1:7941/ingest/7dc37b9f-23a0-4121-a8f6-0bf7a5f7ef54',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69c5cc'},body:JSON.stringify({sessionId:'69c5cc',location:'index.tsx:getSession',message:'getSession threw',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // #region agent log
      fetch('http://127.0.0.1:7941/ingest/7dc37b9f-23a0-4121-a8f6-0bf7a5f7ef54',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69c5cc'},body:JSON.stringify({sessionId:'69c5cc',location:'index.tsx:onAuthStateChange',message:'auth state changed',data:{event,hasSession:!!s,userId:s?.user?.id??null},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setSession(s ? { userId: s.user.id } : null);
      setAuthReady(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // #region agent log
  useEffect(() => {
    if (authReady) {
      fetch('http://127.0.0.1:7941/ingest/7dc37b9f-23a0-4121-a8f6-0bf7a5f7ef54',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69c5cc'},body:JSON.stringify({sessionId:'69c5cc',location:'index.tsx:render',message:'auth gate decision',data:{authReady,hasSession:!!session,rendering:authReady?(session?'Planner':'AuthScreen'):'loading'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    }
  }, [authReady, session]);
  // #endregion

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
