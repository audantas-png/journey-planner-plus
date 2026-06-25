import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchDeals, type HotelDeal, type TicketDeal } from "@/lib/planner.functions";
import type { TripDay } from "./queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, Hotel, Ticket, Sparkles, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

const fmtJPY = (v: number) => "¥" + Math.round(v).toLocaleString("ja-JP");

export function Deals({ days }: { days: TripDay[] }) {
  const cities = useMemo(() => {
    const seen = new Set<string>();
    const list: { city: string; checkin?: string; checkout?: string; nights: number }[] = [];
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      if (!d?.city || seen.has(d.city)) continue;
      seen.add(d.city);
      // find consecutive nights in same city starting at i
      let j = i;
      while (j + 1 < days.length && days[j + 1].city === d.city) j++;
      list.push({
        city: d.city,
        checkin: d.date ?? undefined,
        checkout: days[Math.min(j + 1, days.length - 1)]?.date ?? undefined,
        nights: Math.max(1, j - i + 1),
      });
    }
    return list;
  }, [days]);

  const [selected, setSelected] = useState<string>(cities[0]?.city ?? "Tóquio");
  const [customCheckin, setCustomCheckin] = useState("");
  const [customCheckout, setCustomCheckout] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    hotels: HotelDeal[]; tickets: TicketDeal[]; usedFallback: boolean; error: string | null;
  } | null>(null);

  const fn = useServerFn(searchDeals);
  const current = cities.find(c => c.city === selected);

  async function run() {
    setLoading(true);
    try {
      const checkin = customCheckin || current?.checkin;
      const checkout = customCheckout || current?.checkout;
      const nights = current?.nights ?? 2;
      const r = await fn({ data: { city: selected, checkin, checkout, nights } });
      setResult(r);
      if (r.error) toast.warning(r.error);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao buscar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border border-foreground/15 bg-foreground/[0.02] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-2xl">Ofertas & Hospedagem</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Curadoria por IA dos melhores preços de hotéis e ingressos. Se a IA estiver indisponível, exibimos buscas diretas com seus filtros pré-aplicados.
        </p>

        <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3">
          <select
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setResult(null); setCustomCheckin(""); setCustomCheckout(""); }}
            className="h-10 px-3 bg-background border border-foreground/20 text-sm font-mono"
          >
            {cities.map(c => (
              <option key={c.city} value={c.city}>{c.city} · {c.nights} noite(s)</option>
            ))}
          </select>
          <Input
            type="date" value={customCheckin || current?.checkin || ""}
            onChange={(e) => setCustomCheckin(e.target.value)}
            className="h-10 w-[150px]"
          />
          <Input
            type="date" value={customCheckout || current?.checkout || ""}
            onChange={(e) => setCustomCheckout(e.target.value)}
            className="h-10 w-[150px]"
          />
          <Button onClick={run} disabled={loading} className="h-10">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2">{loading ? "Buscando…" : "Buscar ofertas"}</span>
          </Button>
        </div>

        {result?.usedFallback && (
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-500 border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <strong>Modo fallback ativo.</strong> {result.error ?? "Usando buscas diretas em Booking/Klook/GetYourGuide."}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-foreground/15">
              <Hotel className="w-4 h-4" />
              <h3 className="font-serif text-xl">Hotéis em {selected}</h3>
              <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {result.hotels.length} sugestões
              </span>
            </div>
            <div className="space-y-3">
              {result.hotels.map((h, i) => (
                <article key={i} className="border border-foreground/15 p-4 hover:border-foreground/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h4 className="font-medium text-sm leading-snug">{h.name}</h4>
                    {h.approx_jpy_per_night > 0 && (
                      <span className="font-mono text-xs text-accent shrink-0">{fmtJPY(h.approx_jpy_per_night)}/noite</span>
                    )}
                  </div>
                  {h.area && <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{h.area}</div>}
                  {h.why && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{h.why}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <a href={h.booking_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors">
                      Booking <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href={h.google_hotels_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors">
                      Google Hotels <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-foreground/15">
              <Ticket className="w-4 h-4" />
              <h3 className="font-serif text-xl">Ingressos & Tours</h3>
              <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {result.tickets.length} ofertas
              </span>
            </div>
            <div className="space-y-3">
              {result.tickets.map((t, i) => (
                <article key={i} className="border border-foreground/15 p-4 hover:border-foreground/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-medium text-sm leading-snug">{t.name}</h4>
                    {t.approx_jpy > 0 && (
                      <span className="font-mono text-xs text-accent shrink-0">{fmtJPY(t.approx_jpy)}</span>
                    )}
                  </div>
                  {t.why && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t.why}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <a href={t.klook_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors">
                      Klook <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href={t.gyg_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors">
                      GetYourGuide <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center text-sm text-muted-foreground border border-dashed border-foreground/20 p-12">
          Selecione uma cidade do roteiro e clique em <strong>Buscar ofertas</strong> para ver hotéis e ingressos.
        </div>
      )}
    </div>
  );
}