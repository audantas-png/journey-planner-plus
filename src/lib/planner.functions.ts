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
      const suggestions = rawList.map((s: any) => ({
        title: String(s?.title ?? "").slice(0, 200),
        description: String(s?.description ?? "").slice(0, 600),
        category: ALLOWED_CATS.has(String(s?.category)) ? String(s.category) : "geral",
        avg_cost_jpy: Number.isFinite(Number(s?.avg_cost_jpy)) ? Math.max(0, Math.round(Number(s.avg_cost_jpy))) : 0,
        duration_minutes: Number.isFinite(Number(s?.duration_minutes)) ? Math.max(0, Math.round(Number(s.duration_minutes))) : 60,
        tip: String(s?.tip ?? "").slice(0, 300),
        date_specific: Boolean(s?.date_specific),
      })).filter((s: any) => s.title);
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
      const alerts = rawAlerts.map((a: any) => ({
        severity: ALLOWED_SEV.has(String(a?.severity)) ? String(a.severity) : "info",
        day_numbers: Array.isArray(a?.day_numbers) ? a.day_numbers.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [],
        title: String(a?.title ?? "").slice(0, 200),
        body: String(a?.body ?? "").slice(0, 800),
        suggestion: String(a?.suggestion ?? "").slice(0, 400),
      })).filter((a: any) => a.title);
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