import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { suggestActivities } from "@/lib/planner.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Search, Sparkles, ExternalLink, Calendar, Wallet, Map as MapIcon, Check, Trash2, Wand2, Loader2, CalendarCheck } from "lucide-react";
import type { CatalogItem, TripDay, DayActivity, BudgetCategory, CityGeo } from "./queries";

const fmtJPY = (v: number) => "¥" + Math.round(v).toLocaleString("ja-JP");
const fmtBRL = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const WD = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

type Props = {
  catalog: CatalogItem[];
  days: TripDay[];
  acts: DayActivity[];
  budget: BudgetCategory[];
  geo: CityGeo[];
  fxRate: number;
};

export function Activities({ catalog, days, acts, budget, geo, fxRate }: Props) {
  const qc = useQueryClient();
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [aiOpenDay, setAiOpenDay] = useState<string | null>(null);

  const cities = useMemo(() => Array.from(new Set(catalog.map(c => c.city))).sort(), [catalog]);
  const cats = useMemo(() => Array.from(new Set(catalog.map(c => c.category))).sort(), [catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(c =>
      (filterCity === "all" || c.city === filterCity) &&
      (filterCat === "all" || c.category === filterCat) &&
      (!q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q) || c.city.toLowerCase().includes(q))
    );
  }, [catalog, filterCity, filterCat, query]);

  const actsByDay = useMemo(() => {
    const m = new Map<string, DayActivity[]>();
    for (const a of acts) {
      const arr = m.get(a.day_id) ?? [];
      arr.push(a); m.set(a.day_id, arr);
    }
    return m;
  }, [acts]);

  async function addCatalogToDay(item: CatalogItem, dayId: string) {
    const { error } = await supabase.from("day_activities").insert({
      day_id: dayId, title: item.title, description: item.description,
      cost_jpy: item.avg_cost_jpy, link: item.gmaps_url,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["acts"] });
    const day = days.find(d => d.id === dayId);
    toast.success(`"${item.title}" → Dia ${day?.day_number} · ${day?.city}`);
  }

  async function removeAct(id: string) {
    const { error } = await supabase.from("day_activities").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["acts"] });
    toast.success("Atividade removida do roteiro");
  }

  async function removeCatalog(id: string) {
    const { error } = await supabase.from("activity_catalog").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["catalog"] });
    toast.success("Card removido do acervo");
  }

  return (
    <div className="space-y-10">
      {/* ====== AI SUGGESTION PANEL ====== */}
      {aiOpenDay && (() => {
        const d = days.find(x => x.id === aiOpenDay);
        if (!d) return null;
        return (
          <AiSuggestPanel
            day={d}
            existingTitles={(actsByDay.get(d.id) ?? []).map(a => a.title)}
            budget={budget}
            fxRate={fxRate}
            onClose={() => setAiOpenDay(null)}
          />
        );
      })()}

      {/* ====== INTERACTIVE TIMELINE ====== */}
      <section>
        <div className="flex items-end justify-between gap-6 flex-wrap border-b border-foreground/15 pb-3 mb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">§ Linha do tempo</div>
            <h2 className="font-serif text-3xl mt-1 leading-none">20 dias, vista geral</h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            Cada coluna é um dia. Clique no ícone <Wand2 className="w-3 h-3 inline -mt-0.5 text-accent" /> para receber sugestões de IA com eventos reais da data.
          </p>
        </div>

        <div className="border border-foreground/15 bg-foreground/[0.015] overflow-x-auto">
          <div className="flex min-w-max">
            {days.map(d => {
              const dayActs = actsByDay.get(d.id) ?? [];
              const date = new Date(d.date + "T00:00:00");
              const isHover = hoverDay === d.id;
              return (
                <div
                  key={d.id}
                  onMouseEnter={() => setHoverDay(d.id)}
                  onMouseLeave={() => setHoverDay(null)}
                  className={`w-[150px] shrink-0 border-r border-foreground/10 last:border-r-0 p-3 flex flex-col gap-2 transition-colors ${isHover ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-mono text-[10px] tabular text-muted-foreground">
                      D{String(d.day_number).padStart(2, "0")}
                    </div>
                    <div className="font-mono text-[10px] tabular text-muted-foreground">
                      {WD[date.getUTCDay()]} {String(date.getUTCDate()).padStart(2, "0")}/{String(date.getUTCMonth()+1).padStart(2,"0")}
                    </div>
                  </div>
                  <div className="font-serif text-sm leading-tight truncate" title={d.city}>{d.city}</div>
                  <div className="h-px bg-foreground/10" />
                  <div className="flex flex-col gap-1 min-h-[80px]">
                    {dayActs.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/50 italic font-mono">— vazio</div>
                    )}
                    {dayActs.map(a => (
                      <div key={a.id} className="group flex items-start gap-1 text-[11px] leading-snug border-l-2 border-accent/40 pl-1.5">
                        <span className={`flex-1 ${a.done ? "line-through text-muted-foreground/60" : ""}`}>{a.title}</span>
                        <button
                          type="button"
                          onClick={() => removeAct(a.id)}
                          aria-label="Remover atividade"
                          className="opacity-0 group-hover:opacity-100 shrink-0 inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground pt-1">
                    <span>{dayActs.length} ítem{dayActs.length !== 1 ? "s" : ""}</span>
                    <button
                      type="button"
                      onClick={() => setAiOpenDay(d.id)}
                      aria-label="Sugestões de IA para este dia"
                      title="Sugestões de IA"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-accent hover:bg-accent/10 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>IA</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== CATALOG ====== */}
      <section>
        <div className="flex items-end justify-between gap-6 flex-wrap border-b border-foreground/15 pb-3 mb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">§ Acervo curado</div>
            <h2 className="font-serif text-3xl mt-1 leading-none">Banco de atividades</h2>
          </div>
          <CreateActivityDialog days={days} budget={budget} geo={geo} fxRate={fxRate} />
        </div>

        {/* Search + filters */}
        <div className="border border-foreground/15 mb-5">
          <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por título, descrição ou cidade…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground tabular">
              {filtered.length}/{catalog.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 p-3">
            <Chip active={filterCity === "all"} onClick={() => setFilterCity("all")}>todas cidades</Chip>
            {cities.map(c => <Chip key={c} active={filterCity === c} onClick={() => setFilterCity(c)}>{c}</Chip>)}
            <span className="w-px h-5 bg-foreground/15 mx-1.5 self-center" />
            <Chip active={filterCat === "all"} onClick={() => setFilterCat("all")}>todas categorias</Chip>
            {cats.map(c => <Chip key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>{c}</Chip>)}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="border border-foreground/15 border-dashed py-16 text-center">
            <p className="font-serif text-xl text-muted-foreground">Nada por aqui.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Tente outro filtro ou crie uma atividade nova.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/15 border border-foreground/15">
          {filtered.map(item => (
            <CatalogCard key={item.id} item={item} days={days} fxRate={fxRate} onAdd={addCatalogToDay} onDelete={removeCatalog} />
          ))}
        </div>
      </section>
    </div>
  );
}

// =============== CATALOG CARD ===============
function CatalogCard({ item, days, fxRate, onAdd, onDelete }: {
  item: CatalogItem;
  days: TripDay[];
  fxRate: number;
  onAdd: (item: CatalogItem, dayId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  // Suggest days that match this city
  const suggested = days.filter(d => d.city.toLowerCase() === item.city.toLowerCase());
  const others = days.filter(d => d.city.toLowerCase() !== item.city.toLowerCase());

  return (
    <article className="bg-background p-5 flex flex-col gap-3 hover:bg-foreground/[0.015] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          {item.city} <span className="text-muted-foreground/60 mx-1">·</span> {item.category}
        </div>
        <div className="flex items-center gap-1">
          {item.gmaps_url && (
            <a href={item.gmaps_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent p-1" title="Abrir no Google Maps">
              <MapPin className="w-4 h-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Remover do acervo"
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <h3 className="font-serif text-xl leading-tight">{item.title}</h3>
      {item.description && <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.description}</p>}
      {item.tip && (
        <p className="text-xs italic text-foreground/70 border-l-2 border-accent/40 pl-3">
          <span className="font-mono not-italic text-[9px] uppercase tracking-widest text-accent mr-2">dica</span>
          {item.tip}
        </p>
      )}
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground tabular pt-2 border-t border-foreground/10">
        {item.duration_minutes && <span>{Math.round(item.duration_minutes/60*10)/10}h</span>}
        {item.avg_cost_jpy
          ? <span className="text-foreground">{fmtJPY(item.avg_cost_jpy)} <span className="text-muted-foreground">· {fmtBRL(item.avg_cost_jpy * fxRate)}</span></span>
          : <span>gratuito</span>}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full text-xs bg-foreground text-background px-3 py-2.5 hover:bg-foreground/85 font-mono uppercase tracking-wider inline-flex items-center justify-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Adicionar ao roteiro
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0 max-h-80 overflow-y-auto">
          {suggested.length > 0 && (
            <div>
              <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-accent border-b border-foreground/10 bg-foreground/[0.02]">
                Sugerido — mesma cidade
              </div>
              {suggested.map(d => (
                <DayPickerRow key={d.id} day={d} onClick={async () => { await onAdd(item, d.id); setOpen(false); }} />
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-t border-foreground/10 bg-foreground/[0.02]">
                Outros dias
              </div>
              {others.map(d => (
                <DayPickerRow key={d.id} day={d} onClick={async () => { await onAdd(item, d.id); setOpen(false); }} />
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </article>
  );
}

function DayPickerRow({ day, onClick }: { day: TripDay; onClick: () => void }) {
  const date = new Date(day.date + "T00:00:00");
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/8 transition-colors text-sm border-b border-foreground/5 last:border-b-0">
      <span className="font-mono text-[10px] tabular text-muted-foreground w-10">D{String(day.day_number).padStart(2,"0")}</span>
      <span className="font-serif flex-1 truncate">{day.city}</span>
      <span className="font-mono text-[10px] tabular text-muted-foreground">
        {WD[date.getUTCDay()]} {String(date.getUTCDate()).padStart(2,"0")}/{String(date.getUTCMonth()+1).padStart(2,"0")}
      </span>
    </button>
  );
}

// =============== CHIP ===============
function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 transition-colors border ${
        active
          ? "bg-foreground text-background border-foreground"
          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-foreground/5"
      }`}>
      {children}
    </button>
  );
}

// =============== CREATE DIALOG ===============
function CreateActivityDialog({ days, budget, geo, fxRate }: {
  days: TripDay[]; budget: BudgetCategory[]; geo: CityGeo[]; fxRate: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("geral");
  const [duration, setDuration] = useState<string>("");
  const [costJpy, setCostJpy] = useState<string>("");
  const [gmapsUrl, setGmapsUrl] = useState("");
  const [tip, setTip] = useState("");
  const [dayId, setDayId] = useState<string>("");
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [addExpense, setAddExpense] = useState(false);
  const [budgetCat, setBudgetCat] = useState<string>(budget[0]?.id ?? "");
  const [addToMap, setAddToMap] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const knownCities = useMemo(
    () => Array.from(new Set([...geo.map(g => g.city), ...days.map(d => d.city)])).sort(),
    [geo, days]
  );
  const cityKnown = knownCities.some(c => c.toLowerCase() === city.trim().toLowerCase());

  function reset() {
    setTitle(""); setCity(""); setDescription(""); setCategory("geral");
    setDuration(""); setCostJpy(""); setGmapsUrl(""); setTip("");
    setDayId(""); setSaveToCatalog(true); setAddExpense(false);
    setBudgetCat(budget[0]?.id ?? ""); setAddToMap(false); setLat(""); setLng("");
  }

  async function submit() {
    if (!title.trim() || !city.trim()) {
      toast.error("Título e cidade são obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const costNum = costJpy ? Number(costJpy) : null;
      const durNum = duration ? Number(duration) : null;

      // 1. Add to a day in itinerary (optional — only if a day is chosen)
      if (dayId) {
        const { error } = await supabase.from("day_activities").insert({
          day_id: dayId,
          title: title.trim(),
          description: description.trim() || null,
          cost_jpy: costNum,
          link: gmapsUrl.trim() || null,
        });
        if (error) throw error;
      }

      // 2. Save to catalog for reuse
      if (saveToCatalog) {
        const { error } = await supabase.from("activity_catalog").insert({
          city: city.trim(),
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || "geral",
          duration_minutes: durNum,
          avg_cost_jpy: costNum,
          gmaps_url: gmapsUrl.trim() || null,
          tip: tip.trim() || null,
        });
        if (error) throw error;
      }

      // 3. Add expense to budget
      if (addExpense && costNum && budgetCat) {
        const { error } = await supabase.from("expenses").insert({
          category_id: budgetCat,
          amount_jpy: costNum,
          note: `Atividade: ${title.trim()}`,
        });
        if (error) throw error;
      }

      // 4. Add pin to map (city_geo)
      if (addToMap && lat && lng && !cityKnown) {
        const { error } = await supabase.from("city_geo").insert({
          city: city.trim(),
          lat: Number(lat),
          lng: Number(lng),
          region: null,
        });
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ["acts"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["geo"] });
      toast.success("Atividade criada com sucesso");
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao criar atividade");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-foreground/85">
          <Sparkles className="w-3.5 h-3.5" /> Criar atividade
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Nova atividade</DialogTitle>
          <DialogDescription className="text-xs">
            Crie uma experiência que se conecta ao roteiro, ao orçamento e ao mapa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Basic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Título *">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Café no Blue Bottle Aoyama" />
            </Field>
            <Field label="Cidade *">
              <Input list="city-suggestions" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Kyoto" />
              <datalist id="city-suggestions">
                {knownCities.map(c => <option key={c} value={c} />)}
              </datalist>
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Uma frase sobre o que é, o que torna especial…" />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Categoria">
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="templo, comida…" />
            </Field>
            <Field label="Duração (min)">
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="90" />
            </Field>
            <Field label="Custo (¥)">
              <Input type="number" value={costJpy} onChange={e => setCostJpy(e.target.value)} placeholder="2000" />
              {costJpy && Number(costJpy) > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono tabular">≈ {fmtBRL(Number(costJpy) * fxRate)}</p>
              )}
            </Field>
            <Field label="Google Maps URL">
              <Input value={gmapsUrl} onChange={e => setGmapsUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>

          <Field label="Dica pessoal (opcional)">
            <Input value={tip} onChange={e => setTip(e.target.value)} placeholder="Ex: ir antes das 9h para evitar fila" />
          </Field>

          {/* Integrations */}
          <div className="border-t border-foreground/15 pt-5 space-y-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Integrações</div>

            {/* Add to itinerary day */}
            <div className="border border-foreground/15 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="font-serif text-base">Adicionar ao roteiro</span>
              </div>
              <select
                value={dayId}
                onChange={e => setDayId(e.target.value)}
                className="w-full text-sm bg-transparent border border-foreground/20 px-3 py-2 font-mono"
              >
                <option value="">— não adicionar a um dia agora —</option>
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    Dia {d.day_number} · {d.city} · {new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>

            {/* Save to catalog */}
            <label className="flex items-start gap-3 border border-foreground/15 p-4 cursor-pointer hover:bg-foreground/[0.02]">
              <input type="checkbox" checked={saveToCatalog} onChange={e => setSaveToCatalog(e.target.checked)} className="mt-1 accent-accent" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="font-serif text-base">Salvar no acervo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fica disponível no banco de atividades para reusar em outros dias.
                </p>
              </div>
            </label>

            {/* Add as expense */}
            <label className={`flex items-start gap-3 border p-4 cursor-pointer hover:bg-foreground/[0.02] ${costJpy ? "border-foreground/15" : "border-foreground/15 opacity-50"}`}>
              <input
                type="checkbox"
                checked={addExpense}
                onChange={e => setAddExpense(e.target.checked)}
                disabled={!costJpy}
                className="mt-1 accent-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span className="font-serif text-base">Registrar como gasto no orçamento</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {costJpy ? "Lança o valor abaixo na categoria escolhida." : "Preencha o custo (¥) acima para habilitar."}
                </p>
                {addExpense && costJpy && (
                  <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)} className="mt-3 w-full text-xs bg-transparent border border-foreground/20 px-3 py-2 font-mono">
                    {budget.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>
            </label>

            {/* Map pin (only if city is new) */}
            <label className={`flex items-start gap-3 border p-4 cursor-pointer hover:bg-foreground/[0.02] ${cityKnown || !city ? "border-foreground/15 opacity-50" : "border-foreground/15"}`}>
              <input
                type="checkbox"
                checked={addToMap}
                onChange={e => setAddToMap(e.target.checked)}
                disabled={cityKnown || !city}
                className="mt-1 accent-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-accent" />
                  <span className="font-serif text-base">Fixar cidade no mapa</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {!city
                    ? "Informe uma cidade acima."
                    : cityKnown
                      ? `“${city}” já está no mapa.`
                      : `“${city}” é uma cidade nova — informe coordenadas para criar o pino.`}
                </p>
                {addToMap && !cityKnown && city && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude (ex: 35.0116)" />
                    <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude (ex: 135.7681)" />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting} className="bg-foreground text-background hover:bg-foreground/85">
            {submitting ? "Salvando…" : <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> Criar atividade</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}