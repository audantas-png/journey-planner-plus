import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SuggestInput = z.object({
  city: z.string().min(1).max(100),
  date: z.string().min(1).max(20), // YYYY-MM-DD
  existingTitles: z.array(z.string().max(200)).max(50).optional(),
});

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
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      });
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        output: Output.object({
          schema: z.object({
            suggestions: z.array(z.object({
              title: z.string(),
              description: z.string(),
              category: z.enum(["templo", "gastronomia", "natureza", "museu", "experiência", "compras", "festival", "evento", "geral"]),
              avg_cost_jpy: z.number().int().nullable(),
              duration_minutes: z.number().int().nullable(),
              tip: z.string().nullable(),
              date_specific: z.boolean(),
            })).min(3).max(6),
          }),
        }),
        system: `Você é um curador de viagens especializado em Japão. Sugira atividades específicas, evitando clichês turísticos óbvios. Considere SEMPRE eventos sazonais reais que acontecem na data fornecida (festivais, koyo, iluminações, exposições temporárias, partidas esportivas, jogos de baseball/sumo se em temporada). Se houver evento real conhecido naquela data, marque date_specific=true. Custos em ienes (¥). Categorias permitidas: templo, gastronomia, natureza, museu, experiência, compras, festival, evento, geral.`,
        prompt: `Cidade: ${data.city}
Data: ${dayName}
Já planejado neste dia (não repita): ${(data.existingTitles ?? []).join(" | ") || "nada"}

Devolva 4-6 sugestões. Inclua ao menos 1 evento/festival/iluminação sazonal real para esta data se existir em ${data.city}. Descrições em português, concisas (1-2 frases). Dicas práticas (horário, transporte, reserva).`,
      });
      return { suggestions: output.suggestions, error: null };
    } catch (e) {
      console.error("[suggestActivities]", e);
      const msg = e instanceof Error ? e.message : "Falha ao gerar sugestões";
      return { suggestions: [], error: msg.slice(0, 200) };
    }
  });

const AnalyzeInput = z.object({
  days: z.array(z.object({
    day_number: z.number().int(),
    date: z.string(),
    city: z.string(),
    phase: z.string(),
    summary: z.string().nullable(),
  })).min(1).max(40),
});

export const analyzeItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { alerts: [], summary: "", error: "Lovable AI indisponível" };
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const list = data.days
        .map(d => `D${String(d.day_number).padStart(2,"0")} ${d.date} · ${d.city} [${d.phase}] — ${d.summary ?? ""}`)
        .join("\n");

      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        output: Output.object({
          schema: z.object({
            score: z.number().int().min(0).max(100),
            summary: z.string(),
            alerts: z.array(z.object({
              severity: z.enum(["critical", "warning", "info"]),
              day_numbers: z.array(z.number().int()),
              title: z.string(),
              body: z.string(),
              suggestion: z.string().nullable(),
            })).max(12),
          }),
        }),
        system: `Você é um logista de viagens pelo Japão. Analise a sequência de cidades em busca de ineficiências reais de trajeto via Shinkansen/JR (a viagem é 100% terrestre, sem voos domésticos). Considere:
- Zigue-zague geográfico (ex: Tóquio→Osaka→Tóquio→Kyoto, ou ir e voltar sem necessidade)
- Trechos longos demais num único dia (>5h de trem) sem motivo
- Pouco tempo numa cidade que demanda mais (Kyoto <2 dias, Tóquio <3 dias)
- Tempo demais sem mudança em cidade pequena
- Ordenação inversa lógica (ex: visitar Kyushu antes de Kansai vindo de Tóquio é ineficiente — passa duas vezes por Osaka)
- Conflito com horários sazonais (koyo, festivais, manutenção do Ghibli Park às terças, etc.)
- Saída/retorno desalinhados (ex: voo de retorno em Tóquio mas último dia em Kyushu sem buffer)

NÃO inventem problemas inexistentes. Se a sequência for boa, devolva alerts vazio e score alto. Severity: critical (perde dinheiro/tempo grande), warning (subótimo), info (sugestão).`,
        prompt: `Itinerário:\n${list}\n\nSaída/retorno: voo internacional GRU↔HND (Tóquio Haneda). Pass: JR Pass 21 dias.\n\nGere análise técnica e específica em português. Cite números de dias afetados.`,
      });
      return { alerts: output.alerts, summary: output.summary, score: output.score, error: null };
    } catch (e) {
      console.error("[analyzeItinerary]", e);
      const msg = e instanceof Error ? e.message : "Falha na análise";
      return { alerts: [], summary: "", score: 0, error: msg.slice(0, 200) };
    }
  });
