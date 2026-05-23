import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthScreen() {
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
          email, password,
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
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Vol. III · Nov 2026
          </p>
          <h1 className="font-serif text-5xl leading-none">日本</h1>
          <p className="font-serif italic text-xl mt-2 text-foreground">Japão</p>
          <div className="w-12 h-px bg-foreground/30 mx-auto my-6" />
          <p className="text-xs text-muted-foreground">
            Planejador da terceira viagem<br />Aurélio · Hameceli
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="rounded-none border-0 border-b border-foreground/20 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider">Senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="rounded-none border-0 border-b border-foreground/20 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-foreground" />
          </div>
          <Button type="submit" disabled={loading}
            className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-widest h-11">
            {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-foreground/15" />
          <span className="font-mono text-[10px] uppercase text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-foreground/15" />
        </div>
        <Button onClick={handleGoogle} variant="outline"
          className="w-full rounded-none border-foreground/20 hover:bg-foreground/5 font-mono text-xs uppercase tracking-widest h-11">
          Continuar com Google
        </Button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-6 text-xs text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "Não tem conta? Criar uma" : "Já tenho conta"}
        </button>
      </div>
    </div>
  );
}