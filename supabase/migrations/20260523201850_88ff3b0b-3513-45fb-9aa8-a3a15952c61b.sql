
-- Single-trip planner with shared access for authenticated users

CREATE TABLE public.trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INT NOT NULL UNIQUE,
  date DATE NOT NULL,
  city TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'tokyo',
  summary TEXT,
  notes TEXT,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.day_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_label TEXT,
  cost_jpy INT,
  link TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  duration_minutes INT,
  avg_cost_jpy INT,
  gmaps_url TEXT,
  tip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  planned_jpy BIGINT NOT NULL DEFAULT 0,
  icon TEXT,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_jpy BIGINT NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.trip_days(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- City coordinates for map (read-only catalog)
CREATE TABLE public.city_geo (
  city TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT
);

-- Enable RLS — shared workspace: any authenticated user can read/write
ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_geo ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['trip_days','day_activities','activity_catalog','budget_categories','expenses','checklist_items','city_geo']) LOOP
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "auth insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (true);', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trip_days_updated BEFORE UPDATE ON public.trip_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
