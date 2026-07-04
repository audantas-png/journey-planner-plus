import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthScreen({ blockedEmail }: { blockedEmail?: string | null } = {}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada. Você já está logado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Falha ao entrar com Google");
  }

  return (
    <div className="auth-shell relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute left-[8%] top-[12%] h-48 w-48 rounded-full border border-accent/10" />
      <div className="pointer-events-none absolute left-[calc(8%+3rem)] top-[calc(12%+3rem)] h-24 w-24 rounded-full border border-accent/20" />
      <div className="glass-panel relative w-full max-w-md rounded-[2rem] border p-8 md:p-10">
        <div className="mb-9">
          <div className="mb-7 flex items-center justify-between">
            <span className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Vol. III · Nov 2026
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-serif text-lg text-accent-foreground shadow-[0_8px_24px_oklch(0.6_0.2_25/0.3)]">
              日
            </span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
            Journey planner
          </p>
          <h1 className="mt-2 font-serif text-5xl leading-none">
            Japão<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sua terceira travessia, organizada do primeiro trem ao último ryokan.
          </p>
        </div>
        {blockedEmail && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-destructive">
            Acesso restrito. A conta <span className="normal-case">{blockedEmail}</span> não tem
            permissão.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-foreground/10 bg-secondary/45 px-4 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Senha
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-xl border-foreground/10 bg-secondary/45 px-4 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/20"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="modern-primary h-12 w-full rounded-xl font-mono text-xs uppercase tracking-widest transition-all duration-300"
          >
            {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-foreground/15" />
          <span className="font-mono text-[10px] uppercase text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-foreground/15" />
        </div>
        <Button
          onClick={handleGoogle}
          variant="outline"
          className="h-12 w-full rounded-xl border-foreground/10 bg-foreground/[0.03] font-mono text-xs uppercase tracking-widest hover:bg-foreground/[0.07]"
        >
          Continuar com Google
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-6 text-xs text-muted-foreground transition-colors hover:text-accent"
        >
          {mode === "signin" ? "Não tem conta? Criar uma" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}
