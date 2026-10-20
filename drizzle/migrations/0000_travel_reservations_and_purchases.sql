CREATE TABLE public.hotel_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 hotel_name text NOT NULL,
 city text NOT NULL,
 checkin date NOT NULL,
 checkout date NOT NULL,
 guests integer NOT NULL DEFAULT 2,
 room_description text,
 amount_brl numeric(12,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
 payment_status text NOT NULL DEFAULT 'unconfirmed' CHECK (payment_status IN ('unconfirmed','paid','pending')),
 breakfast_status text NOT NULL DEFAULT 'unconfirmed' CHECK (breakfast_status IN ('unconfirmed','included','not_included')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (checkout > checkin)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_reservations TO authenticated;
GRANT ALL ON public.hotel_reservations TO service_role;
ALTER TABLE public.hotel_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Travelers manage reservations" ON public.hotel_reservations FOR ALL TO authenticated USING (lower(auth.jwt()->>'email') IN ('au.dantas@gmail.com','hameceli.martins@gmail.com')) WITH CHECK (lower(auth.jwt()->>'email') IN ('au.dantas@gmail.com','hameceli.martins@gmail.com'));
ALTER TABLE public.checklist_items ADD COLUMN purchased boolean NOT NULL DEFAULT false;