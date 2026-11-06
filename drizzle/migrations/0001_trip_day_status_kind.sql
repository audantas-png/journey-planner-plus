ALTER TABLE public.trip_days ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned';
ALTER TABLE public.trip_days ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'base';