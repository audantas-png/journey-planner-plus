import { supabase } from "@/integrations/supabase/client";

export type TripDay = {
  id: string; day_number: number; date: string; city: string;
  phase: string; summary: string | null; notes: string | null; position: number;
};
export type DayActivity = {
  id: string; day_id: string; title: string; description: string | null;
  time_label: string | null; cost_jpy: number | null; link: string | null;
  done: boolean; position: number;
};
export type CatalogItem = {
  id: string; city: string; title: string; description: string | null;
  category: string; duration_minutes: number | null; avg_cost_jpy: number | null;
  gmaps_url: string | null; tip: string | null;
};
export type BudgetCategory = {
  id: string; name: string; planned_jpy: number; icon: string | null; position: number;
};
export type Expense = {
  id: string; category_id: string | null; date: string; amount_jpy: number; note: string | null;
};
export type ChecklistItem = {
  id: string; day_id: string | null; text: string; done: boolean; position: number;
};
export type CityGeo = { city: string; lat: number; lng: number; region: string | null };

export const fetchDays = async () => {
  const { data, error } = await supabase.from("trip_days").select("*").order("position");
  if (error) throw error; return data as TripDay[];
};
export const fetchActivities = async () => {
  const { data, error } = await supabase.from("day_activities").select("*").order("position");
  if (error) throw error; return data as DayActivity[];
};
export const fetchCatalog = async () => {
  const { data, error } = await supabase.from("activity_catalog").select("*").order("city");
  if (error) throw error; return data as CatalogItem[];
};
export const fetchBudget = async () => {
  const { data, error } = await supabase.from("budget_categories").select("*").order("position");
  if (error) throw error; return data as BudgetCategory[];
};
export const fetchExpenses = async () => {
  const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
  if (error) throw error; return data as Expense[];
};
export const fetchChecklist = async () => {
  const { data, error } = await supabase.from("checklist_items").select("*").order("position");
  if (error) throw error; return data as ChecklistItem[];
};
export const fetchGeo = async () => {
  const { data, error } = await supabase.from("city_geo").select("*");
  if (error) throw error; return data as CityGeo[];
};

/** IOF fixo sobre operações internacionais com cartão (Brasil). */
export const IOF_RATE = 0.0638;

const FX_KEY = "jpy_brl_spot";
const FX_FALLBACK_SPOT = 0.038;

/** Cotação spot JPY→BRL (sem IOF). */
export async function fetchFxRate(): Promise<number> {
  try {
    const cached = typeof localStorage !== "undefined" ? localStorage.getItem(FX_KEY) : null;
    if (cached) {
      const { rate, ts } = JSON.parse(cached);
      if (Date.now() - ts < 3600_000) return rate;
    }
    const r = await fetch("https://api.frankfurter.app/latest?from=JPY&to=BRL");
    const j = await r.json();
    const rate = j.rates?.BRL ?? FX_FALLBACK_SPOT;
    if (typeof localStorage !== "undefined")
      localStorage.setItem(FX_KEY, JSON.stringify({ rate, ts: Date.now() }));
    return rate;
  } catch {
    return FX_FALLBACK_SPOT;
  }
}

/** Taxa efetiva para converter gastos da viagem: spot + IOF. */
export function fxRateWithIof(spotRate: number): number {
  return spotRate * (1 + IOF_RATE);
}

export function jpyToBrl(jpy: number, fxRate: number): number {
  return jpy * fxRate;
}

export const PHASES: Record<string, { label: string; color: string }> = {
  arrival:   { label: "Chegada",  color: "oklch(0.6 0.04 60)" },
  tokyo:     { label: "Tóquio",   color: "oklch(0.45 0.12 250)" },
  onsen:     { label: "Onsen",    color: "oklch(0.5 0.1 30)" },
  transit:   { label: "Trânsito", color: "oklch(0.55 0.1 70)" },
  kyoto:     { label: "Kyoto",    color: "oklch(0.45 0.12 300)" },
  ghibli:    { label: "Ghibli",   color: "oklch(0.5 0.13 140)" },
  kansai:    { label: "Kansai",   color: "oklch(0.5 0.1 90)" },
  osaka:     { label: "Osaka",    color: "oklch(0.45 0.14 27)" },
  hiroshima: { label: "Hiroshima", color: "oklch(0.4 0.05 60)" },
  kyushu:    { label: "Kyushu",   color: "oklch(0.5 0.12 50)" },
  hokkaido:  { label: "Hokkaido", color: "oklch(0.5 0.1 220)" },
  departure: { label: "Partida",  color: "oklch(0.55 0.02 60)" },
};