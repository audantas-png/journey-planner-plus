import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function extractJson(text: string): any | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  try { return JSON.parse(raw); } catch {}
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch {}
  }
  return null;
}

const SuggestInput = z.object({
  city: z.string().min(1).max(100),
  date: z.string().min(1).max(20),
  existingTitles: z.array(z.string().max(200)).max(50).optional(),
});

const ALLOWED_CATS = new Set([
  "templo","gastronomia","natureza","museu","experiencia","compras","festival","evento","geral",
]);

export type Suggestion = {
  title: string;
  description: string;
  category: string;
  avg_cost_jpy: number;
  duration_minutes: number;
  tip: string;
  date_specific: boolean;
};

export type ItineraryAlert = {
  severity: string;
  day_numbers: number[];
  title: string;
  body: string;
  suggestion: string;
};

export const suggestActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { suggestions: [], error: "Lovable AI indisponível" };
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const dt = new Date(data.date + "T00:00:00Z");
      const dayName = dt.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: `Você é um curador de viagens especializado em Japão. Devolva SOMENTE JSON válido, sem markdown, sem comentários.`,
        prompt: `Cidade: ${data.city}
Data: ${dayName}
Já planejado (não repita): ${(data.existingTitles ?? []).join(" | ") || "nada"}

Gere 4-6 sugestões específicas (evite clichês), incluindo ao menos 1 evento/festival/iluminação sazonal real se existir nesta data.

Responda APENAS com este JSON:
{
  "suggestions": [
    {
      "title": "string",
      "description": "string em português, 1-2 frases",
      "category": "uma de: templo|gastronomia|natureza|museu|experiencia|compras|festival|evento|geral",
      "avg_cost_jpy": número inteiro (0 se gratuito),
      "duration_minutes": número inteiro,
      "tip": "dica curta ou string vazia",
      "date_specific": true|false
    }
  ]
}`,
      });
      const parsed = extractJson(text);
      const rawList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
      const suggestions: Suggestion[] = rawList.map((s: any): Suggestion => ({
        title: String(s?.title ?? "").slice(0, 200),
        description: String(s?.description ?? "").slice(0, 600),
        category: ALLOWED_CATS.has(String(s?.category)) ? String(s.category) : "geral",
        avg_cost_jpy: Number.isFinite(Number(s?.avg_cost_jpy)) ? Math.max(0, Math.round(Number(s.avg_cost_jpy))) : 0,
        duration_minutes: Number.isFinite(Number(s?.duration_minutes)) ? Math.max(0, Math.round(Number(s.duration_minutes))) : 60,
        tip: String(s?.tip ?? "").slice(0, 300),
        date_specific: Boolean(s?.date_specific),
      })).filter((s: Suggestion) => Boolean(s.title));
      if (!suggestions.length) return { suggestions: [], error: "IA retornou resposta vazia. Tente novamente." };
      return { suggestions, error: null };
    } catch (e) {
      console.error("[suggestActivities]", e);
      const msg = e instanceof Error ? e.message : "Falha ao gerar sugestões";
      return { suggestions: [], error: msg.slice(0, 200) };
    }
  });

const AnalyzeInput = z.object({
  days: z
    .array(
      z.object({
        day_number: z.number().int(),
        date: z.string(),
        city: z.string(),
        phase: z.string(),
        summary: z.string().nullable(),
      }),
    )
    .min(1)
    .max(40),
});

const ALLOWED_SEV = new Set(["critical","warning","info"]);

export const analyzeItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { alerts: [], summary: "", score: 0, error: "Lovable AI indisponível" };
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const list = data.days
        .map(
          (d) =>
            `D${String(d.day_number).padStart(2, "0")} ${d.date} · ${d.city} [${d.phase}] — ${d.summary ?? ""}`,
        )
        .join("\n");

      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: `Você é um logista de viagens pelo Japão. Devolva SOMENTE JSON válido, sem markdown, sem comentários.`,
        prompt: `Analise a sequência de cidades buscando ineficiências reais (zigue-zague, trechos >5h, tempo insuficiente, ordenação inversa, conflitos sazonais como Ghibli fechado às terças). Não invente problemas; se estiver bom, alerts=[] e score alto.

Itinerário (100% terrestre, JR Pass 21d, voo GRU↔HND):
${list}

Responda APENAS com este JSON:
{
  "score": número inteiro 0-100,
  "summary": "resumo curto em português",
  "alerts": [
    {
      "severity": "critical|warning|info",
      "day_numbers": [números dos dias afetados],
      "title": "string",
      "body": "explicação técnica em português",
      "suggestion": "sugestão prática ou string vazia"
    }
  ]
}`,
      });
      const parsed = extractJson(text);
      const rawAlerts = Array.isArray(parsed?.alerts) ? parsed.alerts : [];
      const alerts: ItineraryAlert[] = rawAlerts.map((a: any): ItineraryAlert => ({
        severity: ALLOWED_SEV.has(String(a?.severity)) ? String(a.severity) : "info",
        day_numbers: Array.isArray(a?.day_numbers) ? a.day_numbers.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [],
        title: String(a?.title ?? "").slice(0, 200),
        body: String(a?.body ?? "").slice(0, 800),
        suggestion: String(a?.suggestion ?? "").slice(0, 400),
      })).filter((a: ItineraryAlert) => Boolean(a.title));
      const score = Number.isFinite(Number(parsed?.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : 0;
      const summary = String(parsed?.summary ?? "").slice(0, 600);
      if (!parsed) return { alerts: [], summary: "", score: 0, error: "IA retornou resposta inválida. Tente novamente." };
      return { alerts, summary, score, error: null };
    } catch (e) {
      console.error("[analyzeItinerary]", e);
      const msg = e instanceof Error ? e.message : "Falha na análise";
      return { alerts: [], summary: "", score: 0, error: msg.slice(0, 200) };
    }
  });

// ============================================================
// REROTEIRIZADOR — gera nova sequência de cidades via IA
// ============================================================

const ALLOWED_PHASES = new Set([
  "arrival","tokyo","onsen","transit","kyoto","ghibli","kansai",
  "osaka","hiroshima","kyushu","hokkaido","departure",
]);

const RegenInput = z.object({
  targetCities: z.number().int().min(3).max(25),
  startDate: z.string().min(8).max(20),
  endDate: z.string().min(8).max(20),
  mustInclude: z.array(z.string().max(80)).max(20).optional(),
  notes: z.string().max(800).optional(),
});

export type ProposedDay = {
  day_number: number;
  date: string; // YYYY-MM-DD
  city: string;
  phase: string;
  summary: string;
};

export type ProposedCity = {
  city: string;
  lat: number;
  lng: number;
  region: string;
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((db - da) / 86400000) + 1);
}

function dateAtOffset(start: string, offset: number): string {
  const d = new Date(start + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const regenerateItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegenInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { days: [], cities: [], rationale: "", error: "Lovable AI indisponível" } as {
        days: ProposedDay[]; cities: ProposedCity[]; rationale: string; error: string | null;
      };
    }
    const totalDays = daysBetween(data.startDate, data.endDate);
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: `Você é um planejador especialista em viagens 100% terrestres pelo Japão (JR Pass 21d, voo internacional GRU↔HND). Devolva SOMENTE JSON válido, sem markdown, sem comentários.`,
        prompt: `Gere um novo roteiro otimizado para ${totalDays} dias entre ${data.startDate} e ${data.endDate}, visitando EXATAMENTE ${data.targetCities} cidades distintas (paradas únicas — não conte retornos a uma cidade já visitada como nova cidade).

Regras:
- Cubra TODOS os ${totalDays} dias do início ao fim, um registro por dia.
- Dia 1 começa em ${data.startDate}, dia ${totalDays} termina em ${data.endDate}.
- Sem voos domésticos. Conexões por Shinkansen, expressos e ônibus regionais.
- Minimize zigue-zague geográfico. Pense em fluxo lógico (ex.: Tóquio → Hakone → Kyoto → Osaka → Hiroshima → Kyushu, ou Tóquio → Tohoku → Hokkaido).
- Distribua noites de forma realista (mínimo 1 noite por cidade, ideal 2-4 em hubs).
- Use UMA das fases: arrival, tokyo, onsen, transit, kyoto, ghibli, kansai, osaka, hiroshima, kyushu, hokkaido, departure.
- Dia 1 = "arrival", último dia = "departure".
${data.mustInclude?.length ? `- DEVE incluir estas cidades: ${data.mustInclude.join(", ")}` : ""}
${data.notes ? `- Preferências do viajante: ${data.notes}` : ""}

Responda APENAS com este JSON:
{
  "rationale": "explicação curta em português da lógica da rota (2-3 frases)",
  "cities": [
    { "city": "Nome em PT/EN (ex: Tóquio, Kyoto, Osaka)", "lat": número, "lng": número, "region": "Kanto|Kansai|Chubu|Tohoku|Hokkaido|Chugoku|Shikoku|Kyushu|Okinawa" }
  ],
  "days": [
    { "day_number": 1, "date": "YYYY-MM-DD", "city": "Nome", "phase": "arrival", "summary": "resumo curto do dia em pt-BR" }
  ]
}`,
      });
      const parsed = extractJson(text);
      if (!parsed) {
        return { days: [], cities: [], rationale: "", error: "IA retornou resposta inválida. Tente novamente." };
      }

      const rawDays = Array.isArray(parsed?.days) ? parsed.days : [];
      let days: ProposedDay[] = rawDays
        .map((d: any, i: number): ProposedDay => ({
          day_number: Number.isFinite(Number(d?.day_number)) ? Math.round(Number(d.day_number)) : i + 1,
          date: String(d?.date ?? dateAtOffset(data.startDate, i)).slice(0, 10),
          city: String(d?.city ?? "").slice(0, 80).trim(),
          phase: ALLOWED_PHASES.has(String(d?.phase)) ? String(d.phase) : "transit",
          summary: String(d?.summary ?? "").slice(0, 400),
        }))
        .filter((d: ProposedDay) => Boolean(d.city));

      // Normaliza: ordena por day_number e força preencher todos os dias
      days.sort((a, b) => a.day_number - b.day_number);
      if (days.length !== totalDays) {
        // Tenta preencher / truncar para encaixar
        const fill: ProposedDay[] = [];
        for (let i = 0; i < totalDays; i++) {
          const src = days[i] ?? days[days.length - 1];
          fill.push({
            day_number: i + 1,
            date: dateAtOffset(data.startDate, i),
            city: src?.city ?? "Tóquio",
            phase: i === 0 ? "arrival" : i === totalDays - 1 ? "departure" : src?.phase ?? "transit",
            summary: src?.summary ?? "",
          });
        }
        days = fill;
      } else {
        days = days.map((d, i) => ({ ...d, day_number: i + 1, date: dateAtOffset(data.startDate, i) }));
        days[0].phase = "arrival";
        days[days.length - 1].phase = "departure";
      }

      const rawCities = Array.isArray(parsed?.cities) ? parsed.cities : [];
      const cities: ProposedCity[] = rawCities
        .map((c: any): ProposedCity => ({
          city: String(c?.city ?? "").slice(0, 80).trim(),
          lat: Number(c?.lat),
          lng: Number(c?.lng),
          region: String(c?.region ?? "").slice(0, 40),
        }))
        .filter((c: ProposedCity) =>
          Boolean(c.city) &&
          Number.isFinite(c.lat) && c.lat >= 24 && c.lat <= 46 &&
          Number.isFinite(c.lng) && c.lng >= 122 && c.lng <= 146,
        );

      const rationale = String(parsed?.rationale ?? "").slice(0, 600);
      return { days, cities, rationale, error: null };
    } catch (e) {
      console.error("[regenerateItinerary]", e);
      const msg = e instanceof Error ? e.message : "Falha na regeneração";
      return { days: [], cities: [], rationale: "", error: msg.slice(0, 200) };
    }
  });

// ============================================================
// BUSCA DE OFERTAS — hotéis + ingressos com fallback resiliente
// ============================================================

const DealsInput = z.object({
  city: z.string().min(1).max(80),
  checkin: z.string().min(8).max(20).optional(),
  checkout: z.string().min(8).max(20).optional(),
  nights: z.number().int().min(1).max(30).optional(),
});

export type HotelDeal = {
  name: string;
  area: string;
  approx_jpy_per_night: number;
  why: string;
  booking_url: string;
  google_hotels_url: string;
};

export type TicketDeal = {
  name: string;
  approx_jpy: number;
  why: string;
  klook_url: string;
  gyg_url: string;
};

const enc = (s: string) => encodeURIComponent(s);

function buildBookingUrl(city: string, area: string | undefined, checkin?: string, checkout?: string) {
  const ss = area ? `${area}, ${city}, Japan` : `${city}, Japan`;
  const params = new URLSearchParams({ ss, order: "price", group_adults: "2", no_rooms: "1" });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function buildGoogleHotelsUrl(city: string, area: string | undefined, checkin?: string, checkout?: string) {
  const q = area ? `hotels in ${area}, ${city}, Japan` : `hotels in ${city}, Japan`;
  let url = `https://www.google.com/travel/hotels?q=${enc(q)}`;
  if (checkin && checkout) url += `&checkin=${checkin}&checkout=${checkout}`;
  return url;
}

function buildKlookUrl(query: string) {
  return `https://www.klook.com/search/result/?keyword=${enc(query)}`;
}

function buildGygUrl(query: string) {
  return `https://www.getyourguide.com/s/?q=${enc(query)}`;
}

function fallbackDeals(city: string, checkin?: string, checkout?: string) {
  const hotels: HotelDeal[] = [
    {
      name: `Hotéis econômicos perto da estação central de ${city}`,
      area: `Estação Central / Downtown`,
      approx_jpy_per_night: 0,
      why: "Busca direta ordenada por preço — ideal próximo à JR para mobilidade.",
      booking_url: buildBookingUrl(city, "Station", checkin, checkout),
      google_hotels_url: buildGoogleHotelsUrl(city, "Station", checkin, checkout),
    },
    {
      name: `Cápsula / business hotel em ${city}`,
      area: "Centro",
      approx_jpy_per_night: 0,
      why: "Categorias mais baratas no Japão: cápsula (¥3-6k) e business (¥7-12k).",
      booking_url: buildBookingUrl(city, undefined, checkin, checkout) + "&nflt=ht_id%3D204%3Bht_id%3D203",
      google_hotels_url: buildGoogleHotelsUrl(city, undefined, checkin, checkout),
    },
    {
      name: `Ryokan tradicional em ${city}`,
      area: "Bairros históricos",
      approx_jpy_per_night: 0,
      why: "Hospedagem cultural com tatami, futon e (em onsen towns) banhos termais.",
      booking_url: buildBookingUrl(city, "Ryokan", checkin, checkout),
      google_hotels_url: buildGoogleHotelsUrl(city, "Ryokan", checkin, checkout),
    },
  ];
  const tickets: TicketDeal[] = [
    {
      name: `Principais atrações de ${city}`,
      approx_jpy: 0,
      why: "Catálogo completo de tours, ingressos e experiências locais.",
      klook_url: buildKlookUrl(`${city} Japan`),
      gyg_url: buildGygUrl(`${city} Japan`),
    },
    {
      name: `Day tours saindo de ${city}`,
      approx_jpy: 0,
      why: "Bate-volta guiados — útil para regiões sem trem direto.",
      klook_url: buildKlookUrl(`${city} day tour`),
      gyg_url: buildGygUrl(`${city} day trip`),
    },
  ];
  return { hotels, tickets };
}

export const searchDeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DealsInput.parse(input))
  .handler(async ({ data }) => {
    const fb = fallbackDeals(data.city, data.checkin, data.checkout);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { hotels: fb.hotels, tickets: fb.tickets, usedFallback: true, error: "IA indisponível — exibindo buscas diretas." };
    }
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const nights = data.nights ?? 2;
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: `Você é um curador de viagens no Japão. Devolva SOMENTE JSON válido, sem markdown.`,
        prompt: `Cidade: ${data.city}
Check-in: ${data.checkin ?? "flexível"} · Check-out: ${data.checkout ?? "flexível"} · Noites: ${nights}

Sugira:
- 4 hotéis reais e BARATOS (cápsula, business, ryokan econômico, hostel boutique) em bairros estratégicos perto de estações JR/metrô.
- 4 ingressos/experiências reais (templos, parques, museus, day tours) com preço aproximado.

Para cada item, retorne preço médio em JPY (por noite para hotel, por pessoa para ingresso). Use conhecimento real — não invente nomes.

JSON:
{
  "hotels": [
    { "name": "string", "area": "bairro/estação", "approx_jpy_per_night": número, "why": "1 frase em pt-BR" }
  ],
  "tickets": [
    { "name": "string", "approx_jpy": número, "why": "1 frase em pt-BR" }
  ]
}`,
      });
      const parsed = extractJson(text);
      const rawHotels = Array.isArray(parsed?.hotels) ? parsed.hotels : [];
      const rawTickets = Array.isArray(parsed?.tickets) ? parsed.tickets : [];

      const hotels: HotelDeal[] = rawHotels.map((h: any): HotelDeal => {
        const name = String(h?.name ?? "").slice(0, 160).trim();
        const area = String(h?.area ?? "").slice(0, 80).trim();
        return {
          name,
          area,
          approx_jpy_per_night: Number.isFinite(Number(h?.approx_jpy_per_night)) ? Math.max(0, Math.round(Number(h.approx_jpy_per_night))) : 0,
          why: String(h?.why ?? "").slice(0, 240),
          booking_url: buildBookingUrl(data.city, area || name, data.checkin, data.checkout),
          google_hotels_url: buildGoogleHotelsUrl(data.city, name || area, data.checkin, data.checkout),
        };
      }).filter((h: HotelDeal) => Boolean(h.name));

      const tickets: TicketDeal[] = rawTickets.map((t: any): TicketDeal => {
        const name = String(t?.name ?? "").slice(0, 160).trim();
        return {
          name,
          approx_jpy: Number.isFinite(Number(t?.approx_jpy)) ? Math.max(0, Math.round(Number(t.approx_jpy))) : 0,
          why: String(t?.why ?? "").slice(0, 240),
          klook_url: buildKlookUrl(`${name} ${data.city}`),
          gyg_url: buildGygUrl(`${name} ${data.city}`),
        };
      }).filter((t: TicketDeal) => Boolean(t.name));

      if (!hotels.length && !tickets.length) {
        return { hotels: fb.hotels, tickets: fb.tickets, usedFallback: true, error: "IA retornou vazio — usando buscas diretas." };
      }
      return { hotels, tickets, usedFallback: false, error: null as string | null };
    } catch (e) {
      console.error("[searchDeals]", e);
      const msg = e instanceof Error ? e.message : "Falha na busca";
      const credit = /402|credit|quota|rate/i.test(msg);
      return {
        hotels: fb.hotels,
        tickets: fb.tickets,
        usedFallback: true,
        error: credit ? "Créditos de IA esgotados — exibindo buscas diretas." : "IA indisponível — exibindo buscas diretas.",
      };
    }
  });