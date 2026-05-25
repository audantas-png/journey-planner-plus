import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Luggage, ShoppingBag, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem } from "./queries";

type Kind = "pack" | "buy";

const SECTIONS: { kind: Kind; title: string; subtitle: string; Icon: any }[] = [
  {
    kind: "pack",
    title: "Bagagem · O que levar",
    subtitle: "Itens essenciais para a mala antes do embarque",
    Icon: Luggage,
  },
  {
    kind: "buy",
    title: "Compras · No Japão",
    subtitle: "Ingressos, omiyage e itens para adquirir na chegada",
    Icon: ShoppingBag,
  },
];

export function Packing({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="space-y-12">
      <header className="border-b border-foreground/15 pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          § 06 — Checklist
        </div>
        <h2 className="font-serif text-3xl mt-1 leading-none">Bagagem &amp; Compras</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Duas listas vivas: o que precisa estar na mala antes de embarcar e o que vale a pena adquirir
          já em território japonês. Marque conforme avançar.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10">
        {SECTIONS.map(s => (
          <ChecklistColumn key={s.kind} {...s} items={items.filter(i => i.kind === s.kind)} />
        ))}
      </div>
    </div>
  );
}

function ChecklistColumn({
  kind, title, subtitle, Icon, items,
}: {
  kind: Kind; title: string; subtitle: string; Icon: any; items: ChecklistItem[];
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState("");
  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position),
    [items],
  );

  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function toggle(item: ChecklistItem) {
    const { error } = await supabase
      .from("checklist_items")
      .update({ done: !item.done })
      .eq("id", item.id);
    if (error) toast.error("Não foi possível completar a operação. Tente novamente.");
    qc.invalidateQueries({ queryKey: ["checklist"] });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = adding.trim();
    if (!text) return;
    const nextPos = (items.at(-1)?.position ?? -1) + 1;
    const { error } = await supabase.from("checklist_items").insert({
      text, kind, position: nextPos,
    });
    if (error) { toast.error("Não foi possível completar a operação. Tente novamente."); return; }
    setAdding("");
    qc.invalidateQueries({ queryKey: ["checklist"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("checklist_items").delete().eq("id", id);
    if (error) toast.error("Não foi possível completar a operação. Tente novamente.");
    qc.invalidateQueries({ queryKey: ["checklist"] });
  }

  return (
    <section className="border border-foreground/15 bg-card">
      <header className="px-5 py-4 border-b border-foreground/15 flex items-start gap-3">
        <div className="w-10 h-10 border border-accent/40 flex items-center justify-center text-accent shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-xl leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs tabular text-foreground">
            {done}<span className="text-muted-foreground">/{total}</span>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            {pct}% pronto
          </div>
        </div>
      </header>

      <div className="h-1 bg-foreground/10">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="divide-y divide-foreground/10">
        {sorted.map(item => (
          <li key={item.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-foreground/[0.03]">
            <button
              type="button"
              onClick={() => toggle(item)}
              aria-label={item.done ? "Desmarcar" : "Marcar como feito"}
              className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-colors ${
                item.done
                  ? "bg-accent border-accent text-accent-foreground"
                  : "border-foreground/30 hover:border-accent"
              }`}
            >
              {item.done && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="Remover item"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-5 py-8 text-center text-xs text-muted-foreground font-mono uppercase tracking-widest">
            Lista vazia — adicione o primeiro item abaixo
          </li>
        )}
      </ul>

      <form onSubmit={add} className="border-t border-foreground/15 p-3 flex gap-2">
        <input
          value={adding}
          onChange={e => setAdding(e.target.value)}
          placeholder={kind === "pack" ? "Ex: Adaptador de tomada" : "Ex: Ingresso teamLab"}
          className="flex-1 bg-transparent border border-foreground/20 px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!adding.trim()}
          className="inline-flex items-center gap-1.5 bg-foreground text-background px-3 py-2 text-xs font-mono uppercase tracking-widest disabled:opacity-40 hover:bg-foreground/85"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </form>
    </section>
  );
}