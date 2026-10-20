import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hotel, AlertTriangle, Trash2, Coffee, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchReservations, type TripDay, type HotelReservation } from "./queries";
import { reservationNights, reservationConflicts } from "./reservation-rules";

const money = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR");

export function Reservations({ days, preparations = false }: { days: TripDay[]; preparations?: boolean }) {
  const query = useQuery({ queryKey: ["reservations"], queryFn: fetchReservations });
  const qc = useQueryClient();
  const reservations = query.data ?? [];
  const confirmed = reservations.filter(r => r.status === "confirmed");
  const conflicts = reservationConflicts(confirmed, days);

  async function updateBreakfast(id: string, value: HotelReservation["breakfast_status"]) {
    const { error } = await supabase.from("hotel_reservations").update({ breakfast_status: value }).eq("id", id);
    if (error) { toast.error("Não foi possível atualizar a reserva."); return; }
    await qc.invalidateQueries({ queryKey: ["reservations"] });
  }
  async function remove(id: string) {
    if (!window.confirm("Remover esta reserva do planejador? A reserva no hotel não será cancelada.")) return;
    const { error } = await supabase.from("hotel_reservations").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover a reserva."); return; }
    await qc.invalidateQueries({ queryKey: ["reservations"] });
  }

  return <section className="space-y-5 border-b border-border pb-8">
    <header className="flex items-center gap-3"><Hotel className="size-5 text-accent" /><div>
      <p className="text-xs font-mono uppercase text-muted-foreground">Confirmado até agora</p>
      <h2 className="font-serif text-3xl">Suas reservas</h2>
    </div></header>
    {query.isPending && <p className="text-sm text-muted-foreground">Carregando reservas…</p>}
    {query.isError && <div className="flex items-center gap-3"><p className="text-sm text-destructive">Não foi possível carregar suas reservas.</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div>}
    {query.isSuccess && !reservations.length && <p className="text-sm text-muted-foreground">Nenhuma reserva de hotel registrada.</p>}
    {reservations.map(r => <article key={r.id} className="border border-border rounded-md bg-card p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="min-w-0"><p className="text-xs text-success mb-2">{r.status === "confirmed" ? "Reserva confirmada" : "Reserva cancelada"}</p>
          <h3 className="font-serif text-2xl break-words">{r.hotel_name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{r.city} · {date(r.checkin)} — {date(r.checkout)} · {reservationNights(r)} noites · {r.guests} hóspedes</p>
        </div>
        <div className="flex items-start gap-3"><div className="text-right"><p className="font-mono text-lg">{money(Number(r.amount_brl))}</p><p className="text-xs text-muted-foreground">Valor da reserva · BRL</p></div>
          <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Remover reserva" title="Remover do planejador"><Trash2 /></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{r.room_description}</p>
      <div className="flex flex-wrap items-center gap-4 text-sm border-t border-border pt-4">
        <span>Pagamento: {r.payment_status === "paid" ? "confirmado" : r.payment_status === "pending" ? "pendente" : "não informado"}</span>
        <label className="flex flex-wrap items-center gap-2"><Coffee className="size-4 text-muted-foreground" />Café da manhã
          <select aria-label="Café da manhã da reserva" value={r.breakfast_status} onChange={e => updateBreakfast(r.id, e.target.value as HotelReservation["breakfast_status"])} className="bg-background border border-border rounded-md p-2 text-sm">
            <option value="unconfirmed">A confirmar</option><option value="included">Incluído</option><option value="not_included">Não incluído</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Reserva não é pagamento: este valor não foi lançado como gasto. O orçamento de hospedagem continua sendo uma estimativa separada.</p>
    </article>)}
    {conflicts.length > 0 && <div className="flex items-start gap-3 border-l-2 border-accent bg-accent/5 p-4">
      <AlertTriangle className="size-5 shrink-0 text-accent" /><div className="space-y-2"><h3 className="font-medium">Hospedagem e roteiro precisam de revisão</h3>
      <p className="text-sm text-muted-foreground">Há {conflicts.length} dias planejados fora de Tóquio durante a reserva. Confirme quais são bate-voltas e quais exigem pernoite em outra cidade antes de alterar ou reservar hotéis.</p>
      <p className="text-xs text-muted-foreground">Cidades a revisar: {Array.from(new Set(conflicts.map(d => d.city))).join(" · ")}. Seu roteiro foi preservado.</p>
    </div></div>}
    {preparations && <div className="flex items-start gap-3 text-sm"><ShoppingBag className="size-5 text-success shrink-0" /><div><p>Higiene para o voo: compra parcial informada</p><p className="text-muted-foreground mt-1">Os itens específicos e os valores ainda não foram informados. Falta conferir o restante e colocar na bagagem.</p></div></div>}
  </section>;
}