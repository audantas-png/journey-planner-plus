import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeItinerary } from "@/lib/planner.functions";
import { regenerateItinerary, type ProposedDay, type ProposedCity } from "@/lib/planner.functions";
import { supabase } from "@/integrations/supabase/client";
import { TripMap } from "./Map";
import { Activities } from "./Activities";
import { Packing } from "./Packing";
import { Deals } from "./Deals";
import {
  fetchDays, fetchActivities, fetchCatalog, fetchBudget, fetchExpenses,
  fetchChecklist, fetchGeo, fetchFxRate, fetchFxMulti, fxRateWithIof, IOF_RATE, PHASES,
  type TripDay, type DayActivity, type BudgetCategory, type Expense, type ChecklistItem,
} from "./queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ChevronDown, Plus, Check, MapPin, ExternalLink, LogOut, Trash2,
  Compass, CalendarDays, Map as MapIcon, Sparkles, Wallet, Train,
  AlertTriangle, ShieldAlert, Info, Loader2, Wand2, Luggage, Tag,
} from "lucide-react";

const fmtBRL = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const fmtJPY = (v: number) => "¥" + Math.round(v).toLocaleString("ja-JP");
const WD = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export function Planner() {
  return <PlannerApp />;
}

type Tab = "overview" | "itinerary" | "map" | "activities" | "budget" | "packing" | "deals";

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

  const spotFx = fx.data ?? 0.038;
  const fxRate = fxRateWithIof(spotFx);
  const tripStart = new Date("2026-11-01T00:00:00Z");
  const tripEnd = new Date("2026-11-20T00:00:00Z");
  const daysLeft = Math.max(0, Math.ceil((tripStart.getTime() - Date.now()) / 86400000));

  const tabs: { id: Tab; label: string; num: string; Icon: any }[] = [
    { id: "overview", label: "Visão geral", num: "01", Icon: Compass },
    { id: "itinerary", label: "Roteiro diário", num: "02", Icon: CalendarDays },
    { id: "map", label: "Mapa da rota", num: "03", Icon: MapIcon },
    { id: "activities", label: "Atividades", num: "04", Icon: Sparkles },
    { id: "budget", label: "Orçamento", num: "05", Icon: Wallet },
    { id: "packing", label: "Bagagem & Compras", num: "06", Icon: Luggage },
    { id: "deals", label: "Ofertas", num: "07", Icon: Tag },
  ];

  const activeTab = tabs.find(t => t.id === tab)!;

  return (
    <div className="planner-shell min-h-screen">
      {/* Top brand bar */}
      <div className="border-b border-foreground/10 bg-card/70 text-foreground backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-6 py-2 flex items-center justify-between text-[10px] font-mono tracking-[0.25em] uppercase">
          <span>日本 · Nihon · 2026</span>
          <span className="hidden md:inline">Diário de Viagem · Volume III · Outono</span>
          <div className="inline-flex items-center gap-2">
            <button onClick={() => supabase.auth.signOut()} className="inline-flex items-center gap-1.5 hover:opacity-70">
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>
      </div>

      {/* Editorial masthead */}
      <header className="border-b border-foreground/10 bg-background/30">
        <div className="max-w-[1280px] mx-auto px-6 py-10">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                <span className="w-8 h-px bg-accent" />
                <span>Edição de Outono · 01 — 20 Nov 2026</span>
              </div>
              <h1 className="font-serif text-[88px] leading-[0.85] mt-5 tracking-tight">
                Japão<span className="text-accent">.</span>
                <br />
                <span className="italic text-stone">vinte dias</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-6 max-w-md leading-relaxed">
                Terceira travessia. De Tóquio à Kyushu, sem voos domésticos —
                apenas Shinkansen, ryokan e quilômetros de koyo.
                Por <span className="text-foreground">Aurélio Dantas</span> &amp; <span className="text-foreground">Hameceli Francisquini</span>.
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Contagem regressiva</div>
              <div className="font-serif text-7xl tabular leading-none mt-2">{daysLeft}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">dias até partir</div>
              <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
                <Train className="w-3 h-3" /> JR Pass · 21 dias
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Section header for active tab */}
      <div className="sticky top-0 z-40 border-b border-foreground/10 bg-background/75 backdrop-blur-2xl">
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            § {activeTab.num} — {activeTab.label}
          </div>
          <nav className="flex gap-1">
            {tabs.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 transition-all ${
                    active ? "bg-accent text-accent-foreground shadow-[0_8px_24px_oklch(0.6_0.2_25/0.24)]" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}>
                  <t.Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-6 py-12">
        {tab === "overview" && <Overview days={days.data ?? []} acts={acts.data ?? []} budget={budget.data ?? []} expenses={expenses.data ?? []} daysLeft={daysLeft} fxRate={fxRate} tripStart={tripStart} tripEnd={tripEnd} />}
        {tab === "itinerary" && <Itinerary days={days.data ?? []} acts={acts.data ?? []} checklist={checklist.data ?? []} />}
        {tab === "map" && <MapTab days={days.data ?? []} geo={geo.data ?? []} />}
        {tab === "activities" && (
          <Activities
            catalog={catalog.data ?? []}
            days={days.data ?? []}
            acts={acts.data ?? []}
            budget={budget.data ?? []}
            geo={geo.data ?? []}
            fxRate={fxRate}
          />
        )}
        {tab === "budget" && <Budget budget={budget.data ?? []} expenses={expenses.data ?? []} fxRate={fxRate} />}
        {tab === "packing" && <Packing items={checklist.data ?? []} />}
        {tab === "deals" && <Deals days={days.data ?? []} />}
      </main>

      <footer className="border-t border-foreground/15 mt-20">
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground flex-wrap gap-2">
          <span>
            ¥1 = R$ {fxRate.toFixed(4)} (spot {spotFx.toFixed(4)} + IOF {(IOF_RATE * 100).toFixed(2)}%)
          </span>
          <span>EGOCZH — 100% terrestre · Sem trechos aéreos domésticos</span>
        </div>
      </footer>
    </div>
  );
}

// ============ OVERVIEW ============
function Overview({ days, acts, budget, expenses, daysLeft, fxRate, tripStart, tripEnd }: {
  days: TripDay[]; acts: DayActivity[]; budget: BudgetCategory[]; expenses: Expense[];
  daysLeft: number; fxRate: number; tripStart: Date; tripEnd: Date;
}) {
  const uniqueCities = useMemo(() => Array.from(days.reduce((acc, d) => {
    if (acc[acc.length - 1] !== d.city) acc.push(d.city);
    return acc;
  }, [] as string[])), [days]);

  const totalPlan = budget.reduce((s, b) => s + Number(b.planned_jpy), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount_jpy), 0);
  const doneActs = acts.filter(a => a.done).length;
  const pctSpent = totalPlan ? Math.round((totalSpent / totalPlan) * 100) : 0;
  const pctActs = acts.length ? Math.round((doneActs / acts.length) * 100) : 0;

  // Phase distribution
  const phaseCounts = days.reduce((acc, d) => {
    acc[d.phase] = (acc[d.phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const metrics = [
    { label: "Duração", val: `${days.length}`, sub: "dias no Japão", num: "I" },
    { label: "Cidades", val: `${uniqueCities.length}`, sub: "paradas únicas", num: "II" },
    { label: "Atividades", val: `${doneActs}/${acts.length}`, sub: `${pctActs}% prontas`, num: "III" },
    { label: "Investimento", val: fmtBRL(totalPlan * fxRate), sub: fmtJPY(totalPlan), num: "IV" },
    { label: "Já gasto", val: fmtBRL(totalSpent * fxRate), sub: `${pctSpent}% do total`, num: "V" },
    { label: "Partida", val: `${daysLeft}d`, sub: tripStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), num: "VI" },
  ];

  return (
    <div className="space-y-16">
      {/* Hero quote */}
      <section className="grid md:grid-cols-12 gap-8 border-b border-foreground/15 pb-12">
        <div className="md:col-span-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">— Prólogo</div>
          <p className="font-serif text-3xl leading-[1.25] text-foreground/90">
            <span className="text-accent text-5xl leading-none align-top mr-1">“</span>
            Vinte dias atravessando o arquipélago pelo trilho —
            das ruas iluminadas de Shinjuku ao silêncio de um <em>ryokan</em> em Hakone,
            do <em>koyo</em> em Kyoto aos <em>jigoku</em> termais de Beppu.
            <span className="text-accent text-5xl leading-none ml-1">”</span>
          </p>
          <p className="text-sm text-muted-foreground mt-6 leading-relaxed max-w-lg">
            Esta edição organiza o trajeto em cinco capítulos geográficos.
            Cada dia tem espaço para atividades, checklist e notas pessoais.
            O orçamento se ajusta em tempo real conforme registros de gastos.
          </p>
        </div>
        <div className="md:col-span-5 md:border-l md:border-foreground/15 md:pl-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Em números</div>
          <div className="space-y-3">
            <ProgressRow label="Atividades planejadas" value={pctActs} sub={`${doneActs} de ${acts.length}`} />
            <ProgressRow label="Orçamento utilizado" value={pctSpent} sub={`${fmtJPY(totalSpent)} de ${fmtJPY(totalPlan)}`} accent={pctSpent > 90} />
            <ProgressRow label="Tempo até embarque" value={Math.max(0, 100 - (daysLeft / 365) * 100)} sub={`${daysLeft} dias restantes`} />
          </div>
        </div>
      </section>

      {/* Metrics grid */}
      <section>
        <SectionTitle eyebrow="§ Indicadores" title="Panorama" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-foreground/15 border border-foreground/15">
          {metrics.map(m => (
            <div key={m.label} className="bg-background p-5 relative">
              <div className="absolute top-3 right-4 font-mono text-[9px] text-muted-foreground/40 tracking-widest">{m.num}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{m.label}</div>
              <div className="font-serif text-3xl mt-3 tabular leading-none">{m.val}</div>
              <div className="text-[11px] text-muted-foreground mt-2 font-mono">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Route as horizontal journey */}
      <section>
        <SectionTitle eyebrow="§ Trajeto" title="A rota terrestre" sub="Cidade a cidade, conectadas por Shinkansen, Romancecar e ônibus regionais." />
        <div className="border border-foreground/15 p-8 bg-foreground/[0.015]">
          <div className="flex items-start gap-2 flex-wrap">
            {uniqueCities.map((c, i) => {
              const cityDays = days.filter(d => d.city === c);
              const startDate = cityDays[0] && new Date(cityDays[0].date);
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-start">
                    <div className="font-mono text-[10px] text-muted-foreground tabular">
                      {startDate ? `${String(startDate.getUTCDate()).padStart(2,"0")}/${String(startDate.getUTCMonth()+1).padStart(2,"0")}` : ""}
                    </div>
                    <div className="font-serif text-xl leading-tight mt-0.5">{c}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-accent mt-1">
                      {cityDays.length}d
                    </div>
                  </div>
                  {i < uniqueCities.length - 1 && (
                    <div className="mx-3 mt-3 flex items-center text-accent/40">
                      <span className="w-6 h-px bg-current" />
                      <Train className="w-3 h-3 mx-1" />
                      <span className="w-6 h-px bg-current" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Phase distribution */}
      <section>
        <SectionTitle eyebrow="§ Capítulos" title="Distribuição do tempo" />
        <div className="space-y-2">
          {Object.entries(phaseCounts)
            .sort(([,a],[,b]) => b - a)
            .map(([phase, count]) => {
              const p = PHASES[phase] ?? PHASES.tokyo;
              const pct = (count / days.length) * 100;
              return (
                <div key={phase} className="grid grid-cols-12 items-center gap-3 text-sm">
                  <div className="col-span-3 md:col-span-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: p.color }}>{p.label}</div>
                  <div className="col-span-7 md:col-span-9 h-1.5 bg-foreground/8 relative">
                    <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: p.color }} />
                  </div>
                  <div className="col-span-2 md:col-span-1 font-mono text-xs tabular text-muted-foreground text-right">{count} dias</div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Alerts */}
      <section>
        <SectionTitle eyebrow="§ Atenção" title="Pontos críticos" />
        <div className="grid md:grid-cols-2 gap-px bg-foreground/15 border border-foreground/15">
          {[
            { tag: "Reserva", title: "Ghibli Park — Dia 7", date: "07 / 11", body: "Reservas internacionais abrem cerca de 2 a 3 meses antes. Monitorar a partir de agosto/2026. Prioridade absoluta — não repetir a frustração de 2025." },
            { tag: "Trajeto", title: "Sanyo + Kyushu Shinkansen", date: "Dia 11", body: "Osaka → Kumamoto leva cerca de 5h via Sanyo + Kyushu. Coberto integralmente pelo JR Pass. Sair de manhã cedo para aproveitar a tarde." },
            { tag: "Volta cênica", title: "Kokura → Tóquio em Shinkansen", date: "Dia 16", body: "Aproximadamente 6h de viagem panorâmica. Sentar à direita após Shin-Osaka para ver o Monte Fuji. Reservar poltronas com antecedência." },
            { tag: "Estação", title: "Koyo no auge em Kyoto", date: "04 — 06 / 11", body: "O pico da folhagem de outono se concentra entre 15 e 25 de novembro. Sua janela pega o início da temporada — Tofuku-ji e Eikando ainda em transição." },
          ].map((a, i) => (
            <div key={i} className="bg-background p-6 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">— {a.tag}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">{a.date}</div>
              </div>
              <div className="font-serif text-xl mt-2 leading-tight">{a.title}</div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sanity Check via IA */}
      <SanityCheck days={days} />

      {/* Reroteirizador via IA */}
      <Reroute days={days} tripStart={tripStart} tripEnd={tripEnd} />
    </div>
  );
}

// ============ SANITY CHECK ============
function SanityCheck({ days }: { days: TripDay[] }) {
  const callAnalyze = useServerFn(analyzeItinerary);
  const payload = useMemo(() => days.map(d => ({
    day_number: d.day_number, date: d.date, city: d.city, phase: d.phase, summary: d.summary,
  })), [days]);

  const q = useQuery({
    queryKey: ["sanity", payload.map(p => p.day_number + p.city).join("|")],
    queryFn: () => callAnalyze({ data: { days: payload } }),
    enabled: payload.length > 0,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const score = q.data?.score ?? 0;
  const scoreColor = score >= 80 ? "var(--success)" : score >= 60 ? "var(--accent)" : "var(--destructive)";

  const sevConfig: Record<string, { icon: any; color: string; label: string }> = {
    critical: { icon: ShieldAlert, color: "var(--destructive)", label: "crítico" },
    warning:  { icon: AlertTriangle, color: "var(--accent)", label: "atenção" },
    info:     { icon: Info, color: "var(--muted-foreground)", label: "sugestão" },
  };

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-6 flex-wrap border-b border-foreground/15 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-2">
            <Wand2 className="w-3 h-3 text-accent" /> § Sanity check IA
          </div>
          <h2 className="font-serif text-3xl mt-1 leading-none">Diagnóstico de roteiro</h2>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="text-[10px] font-mono uppercase tracking-widest border border-foreground/20 px-3 py-1.5 hover:bg-foreground/5 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {q.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {q.isFetching ? "Analisando…" : "Reanalisar"}
        </button>
      </div>

      {q.isLoading && (
        <div className="border border-foreground/15 p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
          IA está revisando trajetos, distâncias e janelas sazonais…
        </div>
      )}

      {q.data?.error && (
        <div className="border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">{q.data.error}</div>
      )}

      {q.data && !q.data.error && (
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="border border-foreground/15 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Pontuação</div>
            <div className="font-serif text-6xl tabular leading-none mt-2" style={{ color: scoreColor }}>
              {score}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{q.data.summary}</p>
            <div className="mt-4 pt-4 border-t border-foreground/10 grid grid-cols-3 gap-2 text-center">
              {(["critical","warning","info"] as const).map(s => {
                const n = q.data!.alerts.filter(a => a.severity === s).length;
                const cfg = sevConfig[s];
                return (
                  <div key={s}>
                    <div className="font-mono text-2xl tabular" style={{ color: cfg.color }}>{n}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="space-y-2">
            {q.data.alerts.length === 0 && (
              <div className="border border-success/40 bg-success/5 p-6 text-sm">
                <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-success">
                  <Check className="w-3 h-3" /> Tudo coerente
                </div>
                <p className="font-serif text-xl mt-2">Nenhuma inconsistência detectada</p>
                <p className="text-sm text-muted-foreground mt-1">A sequência de cidades, distâncias e janelas sazonais estão alinhadas.</p>
              </div>
            )}
            {q.data.alerts.map((a, i) => {
              const cfg = sevConfig[a.severity];
              const Icon = cfg.icon;
              return (
                <article key={i} className="border bg-background p-5" style={{ borderColor: `color-mix(in oklab, ${cfg.color} 40%, transparent)` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: cfg.color }}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </div>
                    <div className="font-mono text-[10px] tabular text-muted-foreground">
                      {a.day_numbers.length > 0 ? "D" + a.day_numbers.map(n => String(n).padStart(2,"0")).join(" · D") : "geral"}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl mt-2 leading-tight">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a.body}</p>
                  {a.suggestion && (
                    <p className="text-sm mt-3 border-l-2 pl-3 leading-relaxed" style={{ borderColor: cfg.color }}>
                      <span className="font-mono text-[9px] uppercase tracking-widest mr-2" style={{ color: cfg.color }}>sugestão</span>
                      {a.suggestion}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6 flex-wrap border-b border-foreground/15 pb-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</div>
        <h2 className="font-serif text-3xl mt-1 leading-none">{title}</h2>
      </div>
      {sub && <p className="text-xs text-muted-foreground max-w-md leading-relaxed">{sub}</p>}
    </div>
  );
}

function ProgressRow({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular text-[11px] text-muted-foreground">{sub}</span>
      </div>
      <div className="h-[2px] bg-foreground/10 mt-2 overflow-hidden">
        <div className="h-full transition-all" style={{
          width: `${Math.min(100, value)}%`,
          background: accent ? "var(--accent)" : "var(--foreground)"
        }} />
      </div>
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
    const { error } = await supabase.from("day_activities").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível completar a operação. Tente novamente.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["acts"] });
    toast.success("Atividade removida");
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

  // Group days by city for visual chapters
  const chapters = useMemo(() => {
    const out: { city: string; days: TripDay[] }[] = [];
    for (const d of days) {
      const last = out[out.length - 1];
      if (last && last.city === d.city) last.days.push(d);
      else out.push({ city: d.city, days: [d] });
    }
    return out;
  }, [days]);

  return (
    <div className="grid lg:grid-cols-[180px_1fr] gap-10">
      {/* Side index */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">— Índice</div>
          {chapters.map((ch, i) => {
            const firstDay = ch.days[0];
            return (
              <a key={i} href={`#day-${firstDay.id}`}
                className="block py-1 group">
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  D{String(firstDay.day_number).padStart(2,"0")}
                  {ch.days.length > 1 && `–${String(ch.days[ch.days.length-1].day_number).padStart(2,"0")}`}
                </div>
                <div className="font-serif text-sm group-hover:text-accent leading-tight">{ch.city}</div>
              </a>
            );
          })}
        </div>
      </aside>

      {/* Days list */}
      <div className="space-y-10">
        {chapters.map((ch, chIdx) => (
          <div key={chIdx} id={`day-${ch.days[0].id}`}>
            <div className="flex items-baseline justify-between border-b border-foreground/15 pb-3 mb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Capítulo {String(chIdx + 1).padStart(2, "0")}
                </div>
                <h2 className="font-serif text-3xl leading-none mt-1">{ch.city}</h2>
              </div>
              <div className="font-mono text-xs tabular text-muted-foreground">
                {ch.days.length} {ch.days.length === 1 ? "dia" : "dias"}
              </div>
            </div>

            <div className="border border-foreground/15 divide-y divide-foreground/10">
              {ch.days.map(d => {
                const dayActs = acts.filter(a => a.day_id === d.id);
                const dayChecks = checklist.filter(c => c.day_id === d.id);
                const open = openId === d.id;
                const phase = PHASES[d.phase] ?? PHASES.tokyo;
                const date = new Date(d.date);
                const doneCount = dayActs.filter(a => a.done).length;

                return (
                  <div key={d.id} className="bg-background">
                    <button onClick={() => setOpenId(open ? null : d.id)}
                      className="w-full text-left px-5 py-4 flex items-center gap-5 hover:bg-foreground/[0.02] transition-colors">
                      <div className="text-center">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".","")}
                        </div>
                        <div className="font-serif text-2xl tabular leading-none mt-0.5">
                          {String(date.getUTCDate()).padStart(2,"0")}
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">
                          {WD[date.getUTCDay()]}
                        </div>
                      </div>
                      <div className="w-px h-12 bg-foreground/10" />
                      <div className="font-mono text-[10px] tabular text-muted-foreground w-8">D{String(d.day_number).padStart(2,"0")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono uppercase tracking-widest mb-1" style={{ color: phase.color }}>· {phase.label}</div>
                        <div className="text-sm text-foreground/85 truncate leading-snug">{d.summary}</div>
                      </div>
                      {dayActs.length > 0 && (
                        <div className="hidden md:flex flex-col items-end font-mono text-[10px] text-muted-foreground tabular">
                          <span>{doneCount}/{dayActs.length}</span>
                          <div className="w-12 h-px bg-foreground/10 mt-1 overflow-hidden">
                            <div className="h-full bg-foreground" style={{ width: `${dayActs.length ? (doneCount/dayActs.length)*100 : 0}%` }} />
                          </div>
                        </div>
                      )}
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-8 pt-3 border-t border-foreground/10 bg-foreground/[0.015]">
                        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                          <div>
                            <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">— Atividades</h3>
                            <ul className="space-y-1">
                              {dayActs.map(a => (
                                <li key={a.id} className="flex items-start gap-3 group py-1">
                                  <button onClick={() => toggleAct(a)}
                                    className={`mt-1 w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors ${
                                      a.done ? "bg-success border-success" : "border-foreground/30 hover:border-foreground"
                                    }`}>
                                    {a.done && <Check className="w-3 h-3 text-background" />}
                                  </button>
                                  <span className={`flex-1 text-sm ${a.done ? "line-through text-muted-foreground" : ""}`}>
                                    {a.title}
                                    {a.cost_jpy ? <span className="ml-2 font-mono text-[11px] text-muted-foreground">{fmtJPY(a.cost_jpy)}</span> : null}
                                    {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="ml-2 text-muted-foreground hover:text-accent inline-block"><ExternalLink className="w-3 h-3 inline" /></a>}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteAct(a.id)}
                                    aria-label="Remover atividade"
                                    className="opacity-0 group-hover:opacity-100 shrink-0 inline-flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </li>
                              ))}
                              {!dayActs.length && <li className="text-xs text-muted-foreground/70 italic">Nada planejado ainda.</li>}
                            </ul>
                            <AddInline placeholder="+ adicionar atividade" onAdd={(v) => addAct(d.id, v)} />
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">— Checklist</h3>
                              <ul className="space-y-1">
                                {dayChecks.map(c => (
                                  <li key={c.id} className="flex items-center gap-3 py-1">
                                    <button onClick={() => toggleCheck(c)}
                                      className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                                        c.done ? "bg-success border-success" : "border-foreground/30 hover:border-foreground"
                                      }`}>
                                      {c.done && <Check className="w-3 h-3 text-background" />}
                                    </button>
                                    <span className={`text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.text}</span>
                                  </li>
                                ))}
                                {!dayChecks.length && <li className="text-xs text-muted-foreground/70 italic">Sem itens.</li>}
                              </ul>
                              <AddInline placeholder="+ adicionar item" onAdd={(v) => addCheck(d.id, v)} />
                            </div>

                            <div>
                              <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">— Notas</h3>
                              <NotesEditor initial={d.notes ?? ""} onSave={(v) => saveNotes(d.id, v)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(""); }} className="mt-3">
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        className="w-full text-sm bg-transparent border-0 border-b border-foreground/10 hover:border-foreground/25 focus:border-foreground/50 outline-none py-1 placeholder:text-muted-foreground/50 transition-colors" />
    </form>
  );
}

function NotesEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-2">
      <Textarea value={v} onChange={e => setV(e.target.value)} rows={4}
        className="rounded-none border-foreground/15 bg-background text-sm leading-relaxed" placeholder="Reservas, endereços, links, observações pessoais…" />
      {v !== initial && (
        <Button onClick={() => onSave(v)} size="sm" className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest h-7">
          Salvar nota
        </Button>
      )}
    </div>
  );
}

// ============ MAP ============
function MapTab({ days, geo }: { days: TripDay[]; geo: any[] }) {
  const uniqueCities = useMemo(() => {
    const seen = new Set<string>();
    return days.filter(d => { if (seen.has(d.city)) return false; seen.add(d.city); return true; });
  }, [days]);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div>
        <SectionTitle eyebrow="§ Cartografia" title="Rota geográfica" sub="Linha tracejada vermelha indica a sequência das paradas. Clique nos pinos para detalhes." />
        <div className="border border-foreground/15">
          <TripMap days={days} geo={geo} />
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 border-t border-dashed border-accent" /> sequência da viagem
          </span>
          <span>OpenStreetMap · 100% terrestre</span>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-b border-foreground/15 pb-2">— Paradas</div>
        <ol className="space-y-2">
          {uniqueCities.map((d, i) => {
            const allInCity = days.filter(x => x.city === d.city);
            return (
              <li key={d.id} className="flex items-start gap-3 py-2 border-b border-foreground/8">
                <span className="font-mono text-[10px] tabular text-muted-foreground w-6 mt-1">{String(i+1).padStart(2,"0")}</span>
                <div className="flex-1">
                  <div className="font-serif text-base leading-tight">{d.city}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {allInCity.length} {allInCity.length === 1 ? "dia" : "dias"} · D{allInCity.map(x => x.day_number).join(",")}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}

// ============ BUDGET ============
function Budget({ budget, expenses, fxRate }: { budget: BudgetCategory[]; expenses: Expense[]; fxRate: number }) {
  const [unit, setUnit] = useState<"jpy" | "brl">("brl");
  const [adding, setAdding] = useState<string | null>(null);
  const qc = useQueryClient();
  const fxMulti = useQuery({ queryKey: ["fxMulti"], queryFn: fetchFxMulti, staleTime: 3600_000 });
  const rates = fxMulti.data ?? { jpyBrl: 0.038, jpyUsd: 0.0064 };

  const totalPlan = budget.reduce((s, b) => s + Number(b.planned_jpy), 0);
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount_jpy), 0);
  const pct = totalPlan ? Math.round((totalSpent / totalPlan) * 100) : 0;
  const remaining = Math.max(0, totalPlan - totalSpent);

  const fmt = (jpy: number) => unit === "jpy" ? fmtJPY(jpy) : fmtBRL(jpy * fxRate);

  async function addExpense(catId: string, amountJpy: number, note: string) {
    if (!amountJpy || !Number.isFinite(amountJpy)) return;
    await supabase.from("expenses").insert({ category_id: catId, amount_jpy: amountJpy, note });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    setAdding(null);
    toast.success("Gasto registrado");
  }

  async function updatePlanned(id: string, planned: number) {
    await supabase.from("budget_categories").update({ planned_jpy: planned }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["budget"] });
  }

  async function deleteExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("Gasto removido");
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Remover categoria "${name}" e todos os seus registros?`)) return;
    await supabase.from("expenses").delete().eq("category_id", id);
    const { error } = await supabase.from("budget_categories").delete().eq("id", id);
    if (error) { toast.error("Não foi possível completar a operação. Tente novamente."); return; }
    qc.invalidateQueries({ queryKey: ["budget"] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("Categoria removida");
  }

  async function addCategory(name: string, planned: number) {
    const nextPos = (budget.reduce((m, b) => Math.max(m, b.position), 0) ?? 0) + 1;
    const { error } = await supabase.from("budget_categories").insert({
      name: name.trim(), planned_jpy: planned, position: nextPos,
    });
    if (error) { toast.error("Não foi possível completar a operação. Tente novamente."); return; }
    qc.invalidateQueries({ queryKey: ["budget"] });
    toast.success("Categoria adicionada");
  }

  return (
    <div className="space-y-10">
      <SectionTitle eyebrow="§ Finanças" title="Orçamento da expedição" sub="Edite valores planejados clicando no número. Registre gastos por categoria." />

      <section className="grid md:grid-cols-12 gap-4">
        <div className="md:col-span-5 rounded-3xl border border-foreground/15 bg-background p-8">
          <div className="flex items-center gap-6">
            <BudgetSpendDonut budget={budget} expenses={expenses} pct={pct} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Resumo geral</div>
              <div className="font-serif text-3xl tabular leading-tight mt-2">{fmt(totalSpent)}</div>
              <div className="font-mono text-xs text-muted-foreground tabular mt-1">de {fmt(totalPlan)} planejado</div>
              <div className="font-mono text-[11px] text-success/80 tabular mt-3">↓ {fmt(remaining)} disponível</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 rounded-3xl border border-foreground/15 bg-background p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Câmbio do dia</div>
          <div className="font-serif text-3xl tabular mt-2">¥1 = R${fxRate.toFixed(4)}</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            Spot R${(fxRate / (1 + IOF_RATE)).toFixed(4)} + IOF {(IOF_RATE * 100).toFixed(2)}%
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">Frankfurter API · cache 1h</div>
          <div className="mt-5 inline-flex rounded-full border border-foreground/20 overflow-hidden">
            <button onClick={() => setUnit("brl")} className={`px-4 py-2 font-mono text-xs uppercase tracking-wider ${unit === "brl" ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>BRL</button>
            <button onClick={() => setUnit("jpy")} className={`px-4 py-2 font-mono text-xs uppercase tracking-wider ${unit === "jpy" ? "bg-foreground text-background" : "hover:bg-foreground/5"}`}>JPY</button>
          </div>
        </div>

        <div className="md:col-span-3 rounded-3xl border border-foreground/15 bg-background p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Por pessoa</div>
          <div className="font-serif text-3xl tabular mt-2">{fmt(totalPlan / 2)}</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">divisão 50/50</div>
        </div>
      </section>

      <div className="flex items-center justify-between border-b border-foreground/15 pb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">— Categorias</div>
        <NewCategoryForm onAdd={addCategory} />
      </div>

      <section className="space-y-2">
        {budget.map(cat => {
          const catExp = expenses.filter(e => e.category_id === cat.id);
          const spent = catExp.reduce((s, e) => s + Number(e.amount_jpy), 0);
          const planned = Number(cat.planned_jpy);
          const catPct = planned ? Math.round((spent / planned) * 100) : 0;
          return (
            <div key={cat.id} className="rounded-3xl border border-foreground/15 bg-background p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-serif text-xl leading-none">{cat.name}</div>
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      aria-label="Remover categoria"
                      className="inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{catExp.length} registros</div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{catPct}% utilizado</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{fmt(spent)} de {fmt(planned)}</span>
                  </div>
                  <div className="h-1 mt-3 rounded-full bg-foreground/10 overflow-hidden">
                    <div className="h-full transition-all" style={{
                      width: `${Math.min(catPct, 100)}%`,
                      background: catPct > 80 ? "var(--accent)" : "var(--foreground)"
                    }} />
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <PlannedAmountEditor
                    plannedJpy={planned}
                    rates={rates}
                    onSave={(jpy) => updatePlanned(cat.id, jpy)}
                  />
                  <button type="button" onClick={() => setAdding(adding === cat.id ? null : cat.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:border-foreground/40 hover:text-foreground">
                    <Plus className="w-3 h-3" /> add
                  </button>
                </div>
              </div>
              {adding === cat.id && (
                <ExpenseForm rates={rates} onCancel={() => setAdding(null)} onSubmit={(amt, note) => addExpense(cat.id, amt, note)} />
              )}
              <ul className="mt-4 pt-4 border-t border-foreground/10 space-y-2">
                {catExp.length > 0 ? catExp.slice(0, 6).map(e => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground py-2 border-b border-foreground/5">
                    <span>{new Date(e.date).toLocaleDateString("pt-BR")} · {e.note || "—"}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular">{fmt(Number(e.amount_jpy))}</span>
                      <button
                        type="button"
                        onClick={() => deleteExpense(e.id)}
                        aria-label="Remover gasto"
                        className="inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                )) : (
                  <li className="text-xs text-muted-foreground py-2">Nenhum registro</li>
                )}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

type SpendTier = "high" | "mid" | "low";

function expenseStrokeClass(tier: SpendTier): string {
  if (tier === "high") return "stroke-accent";
  if (tier === "mid") return "stroke-foreground";
  return "stroke-muted-foreground";
}

function BudgetSpendDonut({
  budget,
  expenses,
  pct,
}: {
  budget: BudgetCategory[];
  expenses: Expense[];
  pct: number;
}) {
  const radius = 70;
  const circ = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    const items = budget
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        spent: expenses
          .filter((e) => e.category_id === cat.id)
          .reduce((s, e) => s + Number(e.amount_jpy), 0),
      }))
      .filter((s) => s.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    const max = items[0]?.spent ?? 1;
    return items.map((item) => ({
      ...item,
      tier: (item.spent >= max * 0.66 ? "high" : item.spent >= max * 0.33 ? "mid" : "low") as SpendTier,
    }));
  }, [budget, expenses]);

  const totalSeg = segments.reduce((s, x) => s + x.spent, 0);
  let cumulative = 0;

  return (
    <div className="flex-shrink-0">
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Distribuição de gastos por categoria">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          className="stroke-foreground/10"
          strokeWidth="6"
        />
        {totalSeg > 0 ? (
          segments.map((seg) => {
            const arc = (seg.spent / totalSeg) * circ;
            const rot = (cumulative / totalSeg) * 360 - 90;
            cumulative += seg.spent;
            return (
              <circle
                key={seg.id}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                className={cn(expenseStrokeClass(seg.tier), "stroke-[6]")}
                strokeLinecap="butt"
                strokeDasharray={`${arc} ${circ - arc}`}
                transform={`rotate(${rot} 80 80)`}
              >
                <title>{`${seg.name}: ¥${Math.round(seg.spent).toLocaleString("ja-JP")}`}</title>
              </circle>
            );
          })
        ) : (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            className="stroke-muted-foreground/30"
            strokeWidth="6"
            strokeDasharray={`${circ * 0.02} ${circ}`}
            transform="rotate(-90 80 80)"
          />
        )}
        <text x="80" y="76" textAnchor="middle" className="font-serif fill-foreground" fontSize="32">
          {pct}%
        </text>
        <text x="80" y="96" textAnchor="middle" className="font-mono fill-muted-foreground uppercase tracking-widest" fontSize="9">
          utilizado
        </text>
      </svg>
      {segments.length > 0 && (
        <ul className="mt-2 space-y-0.5 max-w-[160px]">
          {segments.slice(0, 4).map((seg) => (
            <li key={seg.id} className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground truncate">
              <span className={cn("w-2 h-2 rounded-full shrink-0", {
                "bg-accent": seg.tier === "high",
                "bg-foreground": seg.tier === "mid",
                "bg-muted-foreground": seg.tier === "low",
              })} />
              <span className="truncate">{seg.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Currency = "JPY" | "BRL" | "USD";

function ExpenseForm({
  onCancel, onSubmit, rates,
}: {
  onCancel: () => void;
  onSubmit: (amtJpy: number, note: string) => void;
  rates: { jpyBrl: number; jpyUsd: number };
}) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [cur, setCur] = useState<Currency>("JPY");

  const toJpy = (raw: number): number => {
    if (!Number.isFinite(raw)) return 0;
    if (cur === "JPY") return Math.round(raw);
    // O gasto em BRL/USD já representa o valor cobrado no cartão brasileiro
    // (spot + IOF). Para converter de volta a JPY corretamente, usamos a
    // taxa efetiva COM IOF — assim o round-trip JPY → BRL bate.
    const iof = 1 + IOF_RATE;
    if (cur === "BRL") return Math.round(raw / ((rates.jpyBrl || 0.038) * iof));
    return Math.round(raw / ((rates.jpyUsd || 0.0064) * iof));
  };

  const preview = toJpy(Number(amt));
  const symbol = cur === "JPY" ? "¥" : cur === "BRL" ? "R$" : "US$";

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(toJpy(Number(amt)), note); }}
      className="mt-4 pt-4 border-t border-foreground/10 flex flex-wrap gap-2 items-center"
    >
      <div className="inline-flex rounded-none border border-foreground/20 overflow-hidden h-8">
        {(["JPY","BRL","USD"] as Currency[]).map(c => (
          <button key={c} type="button" onClick={() => setCur(c)}
            className={`px-2.5 font-mono text-[10px] uppercase tracking-widest ${cur === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
            {c}
          </button>
        ))}
      </div>
      <Input
        type="number" step="0.01" inputMode="decimal"
        placeholder={`valor em ${symbol}`} value={amt} onChange={e => setAmt(e.target.value)}
        className="w-32 rounded-none border-foreground/20 bg-transparent h-8 text-sm tabular" required
      />
      <Input placeholder="descrição (ex.: jantar em Pontocho)" value={note} onChange={e => setNote(e.target.value)}
        className="flex-1 min-w-[180px] rounded-none border-foreground/20 bg-transparent h-8 text-sm" />
      {cur !== "JPY" && preview > 0 && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground tabular">≈ ¥{preview.toLocaleString("ja-JP")}</span>
      )}
      <Button type="submit" size="sm" className="rounded-none bg-foreground text-background h-8 font-mono text-[10px] uppercase tracking-widest">Registrar</Button>
      <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1">×</button>
    </form>
  );
}

function NewCategoryForm({ onAdd }: { onAdd: (name: string, planned: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [planned, setPlanned] = useState("");
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:border-foreground/50 hover:text-foreground transition-colors"
      >
        <Plus className="w-3 h-3" /> Nova categoria
      </button>
    );
  }
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), Number(planned) || 0);
        setName(""); setPlanned(""); setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da categoria"
        className="w-48 rounded-none border-foreground/20 bg-transparent h-8 text-sm" required autoFocus />
      <Input type="number" value={planned} onChange={e => setPlanned(e.target.value)} placeholder="¥ planejado"
        className="w-32 rounded-none border-foreground/20 bg-transparent h-8 text-sm tabular" />
      <Button type="submit" size="sm" className="rounded-none bg-foreground text-background h-8 font-mono text-[10px] uppercase tracking-widest">
        Criar
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1">×</button>
    </form>
  );
}

// ============ REROTEIRIZADOR (IA) ============
function Reroute({ days, tripStart, tripEnd }: { days: TripDay[]; tripStart: Date; tripEnd: Date }) {
  const currentCount = useMemo(() => {
    const uniq: string[] = [];
    for (const d of days) if (uniq[uniq.length - 1] !== d.city) uniq.push(d.city);
    return uniq.length;
  }, [days]);

  const [target, setTarget] = useState<number>(Math.max(4, currentCount));
  const [notes, setNotes] = useState("");
  const [mustInclude, setMustInclude] = useState("Tóquio");
  const [proposed, setProposed] = useState<{ days: ProposedDay[]; cities: ProposedCity[]; rationale: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const qc = useQueryClient();
  const call = useServerFn(regenerateItinerary);

  const startStr = tripStart.toISOString().slice(0, 10);
  const endStr = tripEnd.toISOString().slice(0, 10);

  async function generate() {
    setLoading(true); setErr(null); setProposed(null);
    try {
      const must = mustInclude.split(",").map(s => s.trim()).filter(Boolean);
      const res = await call({ data: { targetCities: target, startDate: startStr, endDate: endStr, mustInclude: must, notes: notes.trim() || undefined } });
      if (res.error) { setErr(res.error); return; }
      if (!res.days.length) { setErr("Resposta vazia da IA."); return; }
      setProposed({ days: res.days, cities: res.cities, rationale: res.rationale });
    } catch (e) {
      setErr(e instanceof Error ? e.message.slice(0, 200) : "Falha ao gerar.");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!proposed) return;
    if (!confirm(`Substituir o roteiro atual por ${proposed.days.length} dias em ${new Set(proposed.days.map(d => d.city)).size} cidades?\n\nAtividades e checklists vinculadas a dias serão apagadas. Esta ação não pode ser desfeita.`)) return;
    setApplying(true);
    try {
      // 1) Apaga dependências (RLS permite a usuários autenticados)
      await supabase.from("day_activities").delete().not("id", "is", null);
      await supabase.from("checklist_items").delete().not("day_id", "is", null);
      // 2) Apaga dias antigos
      const { error: delErr } = await supabase.from("trip_days").delete().not("id", "is", null);
      if (delErr) throw delErr;
      // 3) Insere novos dias
      const rows = proposed.days.map((d, i) => ({
        day_number: d.day_number,
        date: d.date,
        city: d.city,
        phase: d.phase,
        summary: d.summary,
        position: i + 1,
      }));
      const { error: insErr } = await supabase.from("trip_days").insert(rows);
      if (insErr) throw insErr;
      // 4) Upsert city_geo (insere apenas cidades inexistentes)
      if (proposed.cities.length) {
        const { data: existing } = await supabase.from("city_geo").select("city");
        const known = new Set((existing ?? []).map((r: any) => r.city));
        const toInsert = proposed.cities.filter(c => !known.has(c.city));
        if (toInsert.length) {
          await supabase.from("city_geo").insert(toInsert);
        }
      }
      qc.invalidateQueries({ queryKey: ["days"] });
      qc.invalidateQueries({ queryKey: ["acts"] });
      qc.invalidateQueries({ queryKey: ["checklist"] });
      qc.invalidateQueries({ queryKey: ["geo"] });
      toast.success("Roteiro substituído. Atividades e análises serão recalculadas.");
      setProposed(null);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível aplicar o novo roteiro.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-6 flex-wrap border-b border-foreground/15 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-2">
            <Wand2 className="w-3 h-3 text-accent" /> § Reroteirizar com IA
          </div>
          <h2 className="font-serif text-3xl mt-1 leading-none">Refazer a travessia</h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
          Ajuste o número de paradas. A IA propõe uma nova sequência terrestre e, ao aplicar, todas as outras seções (atividades, sanity check, mapa) se adaptam.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Controles */}
        <aside className="border border-foreground/15 p-6 space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Cidades</label>
              <span className="font-serif text-4xl tabular leading-none">{target}</span>
            </div>
            <input type="range" min={3} max={20} value={target}
              onChange={e => setTarget(Number(e.target.value))}
              className="w-full mt-3 accent-accent" />
            <div className="flex justify-between font-mono text-[9px] tabular text-muted-foreground mt-1">
              <span>3 (lento, profundo)</span>
              <span>20 (corrida)</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2">
              Hoje: <span className="text-foreground tabular">{currentCount}</span> cidades em {days.length} dias.
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Obrigatórias</label>
            <Input value={mustInclude} onChange={e => setMustInclude(e.target.value)}
              placeholder="Tóquio, Kyoto"
              className="mt-2 rounded-none border-foreground/20 bg-transparent h-8 text-sm" />
            <div className="font-mono text-[9px] text-muted-foreground mt-1">separe por vírgulas</div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Preferências</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="ex: priorizar onsen, evitar megalópoles, koyo no auge…"
              rows={3}
              className="mt-2 rounded-none border-foreground/20 bg-transparent text-sm resize-none" />
          </div>

          <Button
            type="button"
            onClick={generate}
            disabled={loading}
            className="w-full rounded-none bg-foreground text-background h-10 font-mono text-[10px] uppercase tracking-[0.25em] hover:bg-foreground/90"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Wand2 className="w-3 h-3 mr-2" />}
            {loading ? "Gerando proposta…" : "Gerar proposta"}
          </Button>

          {err && (
            <div className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{err}</div>
          )}
        </aside>

        {/* Preview */}
        <div className="border border-foreground/15 p-6 min-h-[300px]">
          {!proposed && !loading && (
            <div className="text-center text-sm text-muted-foreground py-20">
              <Wand2 className="w-6 h-6 mx-auto mb-3 opacity-40" />
              Configure os parâmetros e clique em <span className="text-foreground">Gerar proposta</span>.
            </div>
          )}
          {loading && (
            <div className="text-center text-sm text-muted-foreground py-20">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
              Desenhando travessia…
            </div>
          )}
          {proposed && (
            <div className="space-y-5">
              <div className="border-l-2 border-accent pl-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent">Lógica da rota</div>
                <p className="text-sm text-foreground/85 mt-1 leading-relaxed">{proposed.rationale || "—"}</p>
              </div>

              {/* Strip de cidades */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Sequência ({new Set(proposed.days.map(d => d.city)).size} cidades · {proposed.days.length} dias)</div>
                <div className="flex flex-wrap gap-1 items-center">
                  {(() => {
                    const seq: { city: string; count: number }[] = [];
                    for (const d of proposed.days) {
                      const last = seq[seq.length - 1];
                      if (last && last.city === d.city) last.count++;
                      else seq.push({ city: d.city, count: 1 });
                    }
                    return seq.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        <span className="px-2 py-1 border border-foreground/20 font-mono text-[10px] tabular">
                          {s.city} <span className="text-muted-foreground">·{s.count}d</span>
                        </span>
                        {i < seq.length - 1 && <Train className="w-3 h-3 text-accent/50" />}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* Lista de dias */}
              <div className="border-t border-foreground/10 pt-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Diário</div>
                <ul className="space-y-1 max-h-[320px] overflow-y-auto pr-2">
                  {proposed.days.map(d => {
                    const p = PHASES[d.phase] ?? PHASES.tokyo;
                    return (
                      <li key={d.day_number} className="grid grid-cols-[40px_80px_120px_1fr] gap-3 items-baseline text-xs py-1 border-b border-foreground/5">
                        <span className="font-mono tabular text-muted-foreground">D{String(d.day_number).padStart(2,"0")}</span>
                        <span className="font-mono tabular text-muted-foreground">{d.date.slice(5)}</span>
                        <span className="font-serif text-sm" style={{ color: p.color }}>{d.city}</span>
                        <span className="text-muted-foreground leading-snug">{d.summary}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-foreground/10">
                <Button type="button" onClick={apply} disabled={applying}
                  className="rounded-none bg-accent text-background h-10 font-mono text-[10px] uppercase tracking-[0.25em] hover:bg-accent/90">
                  {applying ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3 h-3 mr-2" />}
                  {applying ? "Aplicando…" : "Aplicar novo roteiro"}
                </Button>
                <button type="button" onClick={() => setProposed(null)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  Descartar
                </button>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  ⚠ apaga atividades e checklists vinculadas a dias
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlannedAmountEditor({
  plannedJpy,
  rates,
  onSave,
}: {
  plannedJpy: number;
  rates: { jpyBrl: number; jpyUsd: number };
  onSave: (jpy: number) => void;
}) {
  const [cur, setCur] = useState<Currency>("JPY");
  const iof = 1 + IOF_RATE;

  const toDisplay = (jpy: number): string => {
    if (cur === "JPY") return String(Math.round(jpy));
    if (cur === "BRL") return (jpy * (rates.jpyBrl || 0.038) * iof).toFixed(2);
    return (jpy * (rates.jpyUsd || 0.0064) * iof).toFixed(2);
  };

  const toJpy = (raw: number): number => {
    if (!Number.isFinite(raw)) return 0;
    if (cur === "JPY") return Math.round(raw);
    if (cur === "BRL") return Math.round(raw / ((rates.jpyBrl || 0.038) * iof));
    return Math.round(raw / ((rates.jpyUsd || 0.0064) * iof));
  };

  const [value, setValue] = useState<string>(() => toDisplay(plannedJpy));

  // Sync when currency changes or external planned changes.
  const lastKey = useMemo(() => `${cur}:${plannedJpy}`, [cur, plannedJpy]);
  const [seenKey, setSeenKey] = useState(lastKey);
  if (seenKey !== lastKey) {
    setSeenKey(lastKey);
    setValue(toDisplay(plannedJpy));
  }

  const commit = () => {
    const jpy = toJpy(Number(value));
    if (jpy !== plannedJpy) onSave(jpy);
  };

  const symbol = cur === "JPY" ? "¥" : cur === "BRL" ? "R$" : "US$";
  const previewJpy = toJpy(Number(value));

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <div className="inline-flex border border-foreground/15 overflow-hidden h-9">
          {(["JPY","BRL","USD"] as Currency[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCur(c)}
              className={`px-2 font-mono text-[10px] uppercase tracking-widest ${cur === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground pointer-events-none">{symbol}</span>
          <input
            type="number"
            inputMode="decimal"
            step={cur === "JPY" ? "1" : "0.01"}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-32 bg-transparent border border-foreground/15 pl-8 pr-2 py-2 text-right text-sm tabular outline-none focus:border-foreground"
          />
        </div>
      </div>
      {cur !== "JPY" && previewJpy > 0 && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground tabular">
          ≈ ¥{previewJpy.toLocaleString("ja-JP")}
        </span>
      )}
    </div>
  );
}
