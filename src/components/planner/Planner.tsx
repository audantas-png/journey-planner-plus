import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "./Auth";
import { TripMap } from "./Map";
import {
  fetchDays, fetchActivities, fetchCatalog, fetchBudget, fetchExpenses,
  fetchChecklist, fetchGeo, fetchFxRate, PHASES,
  type TripDay, type DayActivity, type CatalogItem, type BudgetCategory, type Expense, type ChecklistItem,
} from "./queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronDown, Plus, Check, MapPin, ExternalLink, LogOut, Trash2 } from "lucide-react";

const fmtBRL = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const fmtJPY = (v: number) => "¥" + Math.round(v).toLocaleString("ja-JP");

export function Planner() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;
  if (!session) return <AuthScreen />;
  return <PlannerApp />;
}

type Tab = "overview" | "itinerary" | "map" | "activities" | "budget";

function PlannerApp() {
  const [tab, setTab] = useState<Tab>("overview");

  const days = useQuery({ queryKey: ["days"], queryFn: fetchDays });
  const acts = useQuery({ queryKey: ["acts"], queryFn: fetchActivities });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog });
  const budget = useQuery({ queryKey: ["budget"], queryFn: fetchBudget });
  const expenses = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });
  const checklist = useQuery({ queryKey: ["checklist"], queryFn: fetchChecklist });
  const geo = useQuery({ queryKey: ["geo"], queryFn: fetchGeo });
  const fx = useQuery({ queryKey: ["fx"], queryFn: fetchFxRate, staleTime: 3600_000 });

  const fxRate = fx.data ?? 0.038;
  const tripStart = new Date("2026-11-01");
  const daysLeft = Math.max(0, Math.ceil((tripStart.getTime() - Date.now()) / 86400000));

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Visão Geral" },
    { id: "itinerary", label: "Roteiro" },
    { id: "map", label: "Mapa" },
    { id: "activities", label: "Atividades" },
    { id: "budget", label: "Orçamento" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/15">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Vol. III · Edição Outono · 01—20 Nov 2026
              </p>
              <h1 className="font-serif text-5xl mt-2 leading-none">
                Japão <span className="italic text-accent">novembro</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Aurélio Dantas & Hameceli Francisquini · Tokyo Haneda
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-4xl tabular">{daysLeft}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">dias até decolar</div>
              <button onClick={() => supabase.auth.signOut()}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <LogOut className="w-3 h-3" /> Sair
              </button>
            </div>
          </div>
          <nav className="flex gap-6 mt-8 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`pb-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {tab === "overview" && <Overview days={days.data ?? []} acts={acts.data ?? []} budget={budget.data ?? []} expenses={expenses.data ?? []} daysLeft={daysLeft} fxRate={fxRate} />}
        {tab === "itinerary" && <Itinerary days={days.data ?? []} acts={acts.data ?? []} checklist={checklist.data ?? []} />}
        {tab === "map" && <MapTab days={days.data ?? []} geo={geo.data ?? []} />}
        {tab === "activities" && <Activities catalog={catalog.data ?? []} days={days.data ?? []} fxRate={fxRate} />}
        {tab === "budget" && <Budget budget={budget.data ?? []} expenses={expenses.data ?? []} fxRate={fxRate} />}
      </main>

      <footer className="border-t border-foreground/15 mt-16 py-6">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs font-mono text-muted-foreground">
          <span>¥1 = R$ {fxRate.toFixed(4)}</span>
          <span>EGOCZH · JL via AA</span>
        </div>
      </footer>
    </div>
  );
}

// ============ OVERVIEW ============
function Overview({ days, acts, budget, expenses, daysLeft, fxRate }: {
  days: TripDay[]; acts: DayActivity[]; budget: BudgetCategory[]; expenses: Expense[]; daysLeft: number; fxRate: number;
}) {
  const cities = new Set(days.map(d => d.city)).size;
  const totalPlan = budget.reduce((s, b) => s + Number(b.planned_jpy), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount_jpy), 0);
  const doneActs = acts.filter(a => a.done).length;

  const metrics = [
    { label: "Duração", val: `${days.length}d`, sub: "01 → 20 nov" },
    { label: "Cidades", val: String(cities), sub: "5 regiões" },
    { label: "Atividades", val: `${doneActs}/${acts.length}`, sub: "concluídas" },
    { label: "Orçamento", val: fmtBRL(totalPlan * fxRate), sub: fmtJPY(totalPlan) },
    { label: "Gasto", val: fmtBRL(totalSpent * fxRate), sub: `${totalPlan ? Math.round((totalSpent/totalPlan)*100) : 0}% usado` },
    { label: "Partida", val: `${daysLeft}d`, sub: "a partir de hoje" },
  ];

  return (
    <div className="space-y-12">
      {/* Metrics editorial grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-px bg-foreground/15 border border-foreground/15">
        {metrics.map(m => (
          <div key={m.label} className="bg-background p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
            <div className="font-serif text-4xl mt-2 tabular">{m.val}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
          </div>
        ))}
      </section>

      {/* Route */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">— Rota</h2>
        <p className="font-serif text-2xl leading-relaxed">
          {Array.from(days.reduce((acc, d) => {
            if (acc[acc.length - 1] !== d.city) acc.push(d.city);
            return acc;
          }, [] as string[])).map((c, i, arr) => (
            <span key={i}>
              {c}
              {i < arr.length - 1 && <span className="text-accent mx-2">·</span>}
            </span>
          ))}
        </p>
      </section>

      {/* Alerts */}
      <section className="space-y-px bg-foreground/15 border border-foreground/15">
        {[
          { tag: "Crítico", title: "Ghibli Park — Dia 7 (07/11)", body: "Reservas internacionais abrem ~2-3 meses antes. Monitorar a partir de agosto/2026. Prioridade máxima — não repetir 2025." },
          { tag: "Logística", title: "Hokkaido não é coberto pelo JR Pass", body: "Voos domésticos FUK→CTS e CTS→HND custam ~¥15-25k/pessoa cada. Reservar com antecedência via ANA/JAL." },
          { tag: "Trânsito", title: "Shinkansen Osaka → Kumamoto (Dia 11)", body: "Via Sanyo + Kyushu Shinkansen, ~5h de viagem. JR Pass cobre o trecho. Sair de manhã." },
          { tag: "Outono", title: "Koyo no auge em Kyoto (4-6/11)", body: "Pico de folhagem entre 15-25 nov. Sua janela pega o início. Inokashira (Tóquio) estará no auge no dia 18." },
        ].map((a, i) => (
          <div key={i} className="bg-background p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-accent">{a.tag}</div>
            <div className="font-serif text-xl mt-1">{a.title}</div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// ============ ITINERARY ============
function Itinerary({ days, acts, checklist }: { days: TripDay[]; acts: DayActivity[]; checklist: ChecklistItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  async function toggleAct(a: DayActivity) {
    await supabase.from("day_activities").update({ done: !a.done }).eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["acts"] });
  }
  async function deleteAct(id: string) {
    await supabase.from("day_activities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["acts"] });
  }
  async function addAct(dayId: string, title: string) {
    if (!title.trim()) return;
    await supabase.from("day_activities").insert({ day_id: dayId, title: title.trim() });
    qc.invalidateQueries({ queryKey: ["acts"] });
  }
  async function saveNotes(dayId: string, notes: string) {
    await supabase.from("trip_days").update({ notes }).eq("id", dayId);
    qc.invalidateQueries({ queryKey: ["days"] });
    toast.success("Notas salvas");
  }
  async function toggleCheck(c: ChecklistItem) {
    await supabase.from("checklist_items").update({ done: !c.done }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["checklist"] });
  }
  async function addCheck(dayId: string, text: string) {
    if (!text.trim()) return;
    await supabase.from("checklist_items").insert({ day_id: dayId, text: text.trim() });
    qc.invalidateQueries({ queryKey: ["checklist"] });
  }

  return (
    <div className="space-y-px bg-foreground/15 border border-foreground/15">
      {days.map(d => {
        const dayActs = acts.filter(a => a.day_id === d.id);
        const dayChecks = checklist.filter(c => c.day_id === d.id);
        const open = openId === d.id;
        const phase = PHASES[d.phase] ?? PHASES.tokyo;
        const date = new Date(d.date);
        const wd = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][date.getUTCDay()];
        return (
          <div key={d.id} className="bg-background">
            <button onClick={() => setOpenId(open ? null : d.id)}
              className="w-full text-left px-6 py-5 flex items-center gap-5 hover:bg-foreground/[0.02]">
              <div className="font-mono text-xs tabular text-muted-foreground w-10">{String(d.day_number).padStart(2,"0")}</div>
              <div className="font-mono text-xs tabular text-muted-foreground w-20">{wd} {String(date.getUTCDate()).padStart(2,"0")}/{String(date.getUTCMonth()+1).padStart(2,"0")}</div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-xl">{d.city}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{d.summary}</div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1" style={{ color: phase.color }}>{phase.label}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="px-6 pb-8 pt-2 border-t border-foreground/10 space-y-6">
                {/* Activities */}
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Atividades</h3>
                  <ul className="space-y-1">
                    {dayActs.map(a => (
                      <li key={a.id} className="flex items-start gap-3 group py-1">
                        <button onClick={() => toggleAct(a)}
                          className={`mt-1 w-4 h-4 border flex-shrink-0 flex items-center justify-center ${
                            a.done ? "bg-success border-success" : "border-foreground/30 hover:border-foreground"
                          }`}>
                          {a.done && <Check className="w-3 h-3 text-background" />}
                        </button>
                        <span className={`flex-1 text-sm ${a.done ? "line-through text-muted-foreground" : ""}`}>
                          {a.title}
                          {a.cost_jpy ? <span className="ml-2 font-mono text-xs text-muted-foreground">{fmtJPY(a.cost_jpy)}</span> : null}
                          {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground hover:text-accent inline-block"><ExternalLink className="w-3 h-3 inline" /></a>}
                        </span>
                        <button onClick={() => deleteAct(a.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-accent">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <AddInline placeholder="+ adicionar atividade" onAdd={(v) => addAct(d.id, v)} />
                </div>

                {/* Checklist */}
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Checklist</h3>
                  <ul className="space-y-1">
                    {dayChecks.map(c => (
                      <li key={c.id} className="flex items-center gap-3 py-1">
                        <button onClick={() => toggleCheck(c)}
                          className={`w-4 h-4 border flex items-center justify-center ${
                            c.done ? "bg-success border-success" : "border-foreground/30"
                          }`}>
                          {c.done && <Check className="w-3 h-3 text-background" />}
                        </button>
                        <span className={`text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                  <AddInline placeholder="+ adicionar item" onAdd={(v) => addCheck(d.id, v)} />
                </div>

                {/* Notes */}
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Notas</h3>
                  <NotesEditor initial={d.notes ?? ""} onSave={(v) => saveNotes(d.id, v)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(""); }} className="mt-2">
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        className="w-full text-sm bg-transparent border-0 border-b border-transparent hover:border-foreground/20 focus:border-foreground/40 outline-none py-1 placeholder:text-muted-foreground/60" />
    </form>
  );
}

function NotesEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-2">
      <Textarea value={v} onChange={e => setV(e.target.value)} rows={3}
        className="rounded-none border-foreground/15 bg-transparent text-sm" placeholder="Reservas, links, observações…" />
      {v !== initial && (
        <Button onClick={() => onSave(v)} size="sm" className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest h-7">
          Salvar
        </Button>
      )}
    </div>
  );
}

// ============ MAP ============
function MapTab({ days, geo }: { days: TripDay[]; geo: any[] }) {
  return (
    <div className="space-y-4">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">— Rota geográfica</h2>
      <TripMap days={days} geo={geo} />
      <p className="text-xs text-muted-foreground">
        Linha tracejada vermelha indica a sequência. Clique nos pinos para ver os dias em cada cidade.
      </p>
    </div>
  );
}

// ============ ACTIVITIES CATALOG ============
function Activities({ catalog, days, fxRate }: { catalog: CatalogItem[]; days: TripDay[]; fxRate: number }) {
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const qc = useQueryClient();

  const cities = Array.from(new Set(catalog.map(c => c.city))).sort();
  const cats = Array.from(new Set(catalog.map(c => c.category))).sort();
  const filtered = catalog.filter(c =>
    (filterCity === "all" || c.city === filterCity) &&
    (filterCat === "all" || c.category === filterCat)
  );

  async function addToDay(item: CatalogItem, dayId: string) {
    await supabase.from("day_activities").insert({
      day_id: dayId, title: item.title, description: item.description,
      cost_jpy: item.avg_cost_jpy, link: item.gmaps_url,
    });
    qc.invalidateQueries({ queryKey: ["acts"] });
    toast.success(`"${item.title}" adicionado`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterCity} onChange={setFilterCity} options={[["all", "Todas cidades"], ...cities.map(c => [c, c] as [string, string])]} />
        <Select value={filterCat} onChange={setFilterCat} options={[["all", "Todas categorias"], ...cats.map(c => [c, c] as [string, string])]} />
        <span className="font-mono text-xs text-muted-foreground ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-px bg-foreground/15 border border-foreground/15">
        {filtered.map(item => (
          <div key={item.id} className="bg-background p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent">{item.city} · {item.category}</div>
                <div className="font-serif text-xl mt-1">{item.title}</div>
              </div>
              {item.gmaps_url && (
                <a href={item.gmaps_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <MapPin className="w-4 h-4" />
                </a>
              )}
            </div>
            {item.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.description}</p>}
            {item.tip && <p className="text-xs italic text-foreground/70 mt-2">— {item.tip}</p>}
            <div className="flex items-center gap-4 mt-3 font-mono text-xs text-muted-foreground tabular">
              {item.duration_minutes && <span>{Math.round(item.duration_minutes/60*10)/10}h</span>}
              {item.avg_cost_jpy ? <span>{fmtJPY(item.avg_cost_jpy)} · {fmtBRL(item.avg_cost_jpy * fxRate)}</span> : <span>grátis</span>}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">→</span>
              <select onChange={e => { if (e.target.value) { addToDay(item, e.target.value); e.target.value = ""; } }}
                className="text-xs bg-transparent border border-foreground/20 px-2 py-1 hover:border-foreground/40">
                <option value="">adicionar ao dia…</option>
                {days.map(d => <option key={d.id} value={d.id}>Dia {d.day_number} · {d.city}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-xs bg-transparent border border-foreground/20 px-3 py-1.5 font-mono uppercase tracking-wider hover:border-foreground/40">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ============ BUDGET ============
function Budget({ budget, expenses, fxRate }: { budget: BudgetCategory[]; expenses: Expense[]; fxRate: number }) {
  const [unit, setUnit] = useState<"jpy" | "brl">("brl");
  const [adding, setAdding] = useState<string | null>(null);
  const qc = useQueryClient();

  const totalPlan = budget.reduce((s, b) => s + Number(b.planned_jpy), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount_jpy), 0);
  const pct = totalPlan ? Math.round((totalSpent / totalPlan) * 100) : 0;

  const fmt = (jpy: number) => unit === "jpy" ? fmtJPY(jpy) : fmtBRL(jpy * fxRate);

  async function addExpense(catId: string, amountJpy: number, note: string) {
    if (!amountJpy) return;
    await supabase.from("expenses").insert({ category_id: catId, amount_jpy: amountJpy, note });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    setAdding(null);
    toast.success("Gasto registrado");
  }
  async function updatePlanned(id: string, planned: number) {
    await supabase.from("budget_categories").update({ planned_jpy: planned }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["budget"] });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-foreground/15 pb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Planejado · Gasto</div>
          <div className="font-serif text-4xl mt-1 tabular">
            {fmt(totalSpent)} <span className="text-muted-foreground">/ {fmt(totalPlan)}</span>
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">{pct}% utilizado · ¥1 = R$ {fxRate.toFixed(4)}</div>
        </div>
        <div className="flex border border-foreground/20">
          <button onClick={() => setUnit("brl")} className={`px-4 py-1.5 font-mono text-xs uppercase ${unit==="brl"?"bg-foreground text-background":""}`}>BRL</button>
          <button onClick={() => setUnit("jpy")} className={`px-4 py-1.5 font-mono text-xs uppercase ${unit==="jpy"?"bg-foreground text-background":""}`}>JPY</button>
        </div>
      </div>

      <div className="space-y-px bg-foreground/15 border border-foreground/15">
        {budget.map(cat => {
          const catExp = expenses.filter(e => e.category_id === cat.id);
          const spent = catExp.reduce((s, e) => s + Number(e.amount_jpy), 0);
          const catPct = cat.planned_jpy ? Math.round((spent / Number(cat.planned_jpy)) * 100) : 0;
          return (
            <div key={cat.id} className="bg-background p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-serif text-lg">{cat.name}</div>
                <div className="font-mono text-xs tabular text-muted-foreground">
                  {fmt(spent)} / <input type="number" defaultValue={cat.planned_jpy}
                    onBlur={e => { const v = Number(e.target.value); if (v !== cat.planned_jpy) updatePlanned(cat.id, v); }}
                    className="w-24 bg-transparent border-b border-transparent hover:border-foreground/30 focus:border-foreground/60 outline-none text-right tabular" /> JPY
                </div>
              </div>
              <div className="h-px bg-foreground/10 mt-3 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.min(catPct, 100)}%`, background: catPct > 90 ? "var(--accent)" : "var(--foreground)" }} />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-mono text-[10px] text-muted-foreground tabular">{catPct}%</span>
                <button onClick={() => setAdding(adding === cat.id ? null : cat.id)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> registrar gasto
                </button>
              </div>
              {adding === cat.id && (
                <ExpenseForm onCancel={() => setAdding(null)} onSubmit={(amt, note) => addExpense(cat.id, amt, note)} />
              )}
              {catExp.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {catExp.slice(0, 5).map(e => (
                    <li key={e.id} className="flex justify-between text-xs text-muted-foreground py-0.5">
                      <span>{new Date(e.date).toLocaleDateString("pt-BR")} · {e.note || "—"}</span>
                      <span className="font-mono tabular">{fmt(Number(e.amount_jpy))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpenseForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (amt: number, note: string) => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(Number(amt), note); }}
      className="mt-3 flex gap-2 items-center">
      <Input type="number" placeholder="¥" value={amt} onChange={e => setAmt(e.target.value)}
        className="w-24 rounded-none border-foreground/20 bg-transparent h-8 text-sm tabular" required />
      <Input placeholder="nota" value={note} onChange={e => setNote(e.target.value)}
        className="flex-1 rounded-none border-foreground/20 bg-transparent h-8 text-sm" />
      <Button type="submit" size="sm" className="rounded-none bg-foreground text-background h-8 font-mono text-[10px] uppercase">Add</Button>
      <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">×</button>
    </form>
  );
}