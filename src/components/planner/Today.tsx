import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { replanRemainingDays, type ReplanProposal } from "@/lib/planner.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BudgetCategory, DayActivity, TripDay } from "./queries";
import { replanUpdates, statusFor, tokyoToday } from "./today-rules";

const KIND_LABEL: Record<string, string> = { base: "Em Tóquio", day_trip: "Bate-volta", overnight: "Pernoite fora" };
const BASE_CITY = "Tóquio";
const BASE_UNTIL = "2026-11-20";

export function Today({ days, acts, budget }: { days: TripDay[]; acts: DayActivity[]; budget: BudgetCategory[] }) {
  const qc = useQueryClient();
  const today = tokyoToday();
  const todayDay = days.find(d => d.date === today);
  const lived = days.filter(d => d.date < today);
  const future = days.filter(d => d.date > today);
  const replan = useServerFn(replanRemainingDays);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<{ days: ReplanProposal[]; rationale: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["days"] });

  const saveDay = async (id: string, patch: Partial<TripDay>) => {
    const { error } = await supabase.from("trip_days").update(patch).eq("id", id);
    if (error) return toast.error("Não foi possível salvar");
    refresh();
  };

  const runReplan = async () => {
    setLoading(true);
    const r = await replan({ data: {
      today, baseCity: BASE_CITY, baseUntil: BASE_UNTIL, notes: notes || undefined,
      lived: [...lived, ...(todayDay ? [todayDay] : [])].map(d => ({ date: d.date, city: d.city, summary: d.summary })),
      remaining: future.map(d => d.date),
    } }).catch(() => null);
    setLoading(false);
    if (!r || r.error || !r.days.length) return toast.error(r?.error ?? "Falha ao replanejar");
    setProposal({ days: r.days, rationale: r.rationale });
  };

  const applyReplan = async () => {
    if (!proposal) return;
    const updates = replanUpdates(days, proposal.days, today);
    for (const u of updates) await supabase.from("trip_days").update({ city: u.city, kind: u.kind, summary: u.summary }).eq("id", u.id);
    setProposal(null); refresh();
    toast.success(`${updates.length} dias atualizados — os dias já vividos ficaram intactos`);
  };

  const overnights = future.filter(d => d.kind === "overnight" && d.date < BASE_UNTIL);
  const dayTrips = future.filter(d => d.kind === "day_trip").length;

  return (
    <div className="space-y-10">
      {/* Hoje */}
      <section className="border border-foreground/15 p-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hoje · {today}</div>
        {todayDay ? (
          <>
            <div className="font-serif text-4xl mt-2">D{String(todayDay.day_number).padStart(2, "0")} · {todayDay.city}</div>
            <p className="text-sm text-muted-foreground mt-2">{todayDay.summary}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {acts.filter(a => a.day_id === todayDay.id).map(a => <li key={a.id}>· {a.title}</li>)}
            </ul>
            <QuickExpense budget={budget} date={today} />
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">Hoje está fora das datas da viagem.</p>}
      </section>

      {/* Vividos */}
      <section>
        <h3 className="font-serif text-2xl mb-3">Diário — dias vividos</h3>
        <div className="space-y-2">
          {lived.map(d => <DayRow key={d.id} day={d} today={today} onSave={saveDay} />)}
          {!lived.length && <p className="text-sm text-muted-foreground">Nenhum dia vivido ainda.</p>}
        </div>
      </section>

      {/* Próximos */}
      <section>
        <h3 className="font-serif text-2xl mb-3">Próximos dias</h3>
        {overnights.length > 0 && (
          <div className="border border-warning/40 text-warning text-xs p-3 mb-3">
            {overnights.length} pernoite(s) fora de Tóquio antes de 20/11 — o hotel em Tóquio continua reservado nessas noites (diária dupla).
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-3">
          {dayTrips} bate-voltas planejados. {dayTrips >= 3 ? "Com viagens longas (Kyoto/Osaka), compare um JR Pass de 7 dias com bilhetes avulsos." : "Poucos bate-voltas: bilhetes avulsos/Suica tendem a sair mais barato que o JR Pass."}
        </p>
        <div className="space-y-2">
          {future.map(d => <DayRow key={d.id} day={d} today={today} onSave={saveDay} />)}
        </div>
      </section>

      {/* IA */}
      <section className="border border-foreground/15 p-5 space-y-3">
        <h3 className="font-serif text-2xl">Planejar com IA os dias restantes</h3>
        <p className="text-xs text-muted-foreground">Considera o que você já fez e o hotel em Tóquio até 20/11. Só altera dias a partir de amanhã.</p>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: quero 2 noites em Kyoto, manter Nikko amanhã, um dia em Hakone…" className="rounded-none" />
        <Button onClick={runReplan} disabled={loading || !future.length} className="rounded-none w-full sm:w-auto">
          {loading ? "Planejando…" : "Gerar proposta"}
        </Button>
        {proposal && (
          <div className="space-y-2 pt-2">
            {proposal.rationale && <p className="text-sm italic text-muted-foreground">{proposal.rationale}</p>}
            {proposal.days.map(p => (
              <div key={p.date} className="border-l-2 border-primary pl-3 text-sm">
                <div className="font-mono text-[10px] text-muted-foreground">{p.date} · {KIND_LABEL[p.kind] ?? p.kind}</div>
                <div className="font-medium">{p.city}</div>
                <div className="text-muted-foreground">{p.summary}</div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={applyReplan} className="rounded-none">Aplicar</Button>
              <Button variant="outline" onClick={() => setProposal(null)} className="rounded-none">Descartar</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DayRow({ day, today, onSave }: { day: TripDay; today: string; onSave: (id: string, p: Partial<TripDay>) => void }) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(day.city);
  const [summary, setSummary] = useState(day.summary ?? "");
  const [notes, setNotes] = useState(day.notes ?? "");
  const status = statusFor(day.date, today);
  return (
    <div className={cn("border border-foreground/10 p-3", status === "lived" && "opacity-80")}>
      <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(o => !o)}>
        <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0 mt-1">D{String(day.day_number).padStart(2, "0")} {day.date.slice(5)}</span>
        <span className="flex-1 min-w-0">
          <span className="font-medium">{day.city}</span>
          <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">{status === "lived" ? "vivido" : KIND_LABEL[day.kind ?? "base"]}</span>
          <span className="block text-xs text-muted-foreground truncate">{day.summary}</span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <Input value={city} onChange={e => setCity(e.target.value)} className="rounded-none h-8" />
          {status !== "lived" && (
            <div className="flex gap-1 flex-wrap">
              {Object.entries(KIND_LABEL).map(([k, l]) => (
                <Button key={k} size="sm" variant={day.kind === k ? "default" : "outline"} className="rounded-none h-7 text-xs" onClick={() => onSave(day.id, { kind: k })}>{l}</Button>
              ))}
            </div>
          )}
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="O que foi/será feito" className="rounded-none text-sm" />
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas pessoais" className="rounded-none text-sm" />
          <Button size="sm" className="rounded-none" onClick={() => onSave(day.id, { city, summary, notes })}>Salvar</Button>
        </div>
      )}
    </div>
  );
}

function QuickExpense({ budget, date }: { budget: BudgetCategory[]; date: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const catId = useMemo(() => cat || budget[0]?.id || "", [cat, budget]);
  const save = async () => {
    const n = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!n || !catId) return;
    const { error } = await supabase.from("expenses").insert({ category_id: catId, amount_jpy: Math.round(n), date, note: "Registrado no dia" });
    if (error) return toast.error("Não foi possível registrar");
    setAmount(""); qc.invalidateQueries(); toast.success("Gasto registrado");
  };
  return (
    <div className="mt-4 flex flex-wrap gap-2 items-center">
      <Input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="¥ gasto" className="rounded-none h-9 w-28" />
      <select value={catId} onChange={e => setCat(e.target.value)} className="h-9 bg-transparent border border-input px-2 text-sm flex-1 min-w-0">
        {budget.map(b => <option key={b.id} value={b.id} className="bg-background">{b.name}</option>)}
      </select>
      <Button onClick={save} className="rounded-none h-9">Registrar gasto</Button>
    </div>
  );
}
