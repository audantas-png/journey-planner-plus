ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'day'
  CHECK (kind IN ('day','pack','buy'));

INSERT INTO public.checklist_items (text, kind, position) VALUES
  ('Passaporte (validade > 6 meses)', 'pack', 0),
  ('JR Pass voucher impresso', 'pack', 1),
  ('Cartão Wise / cartão internacional', 'pack', 2),
  ('Adaptador tomada tipo A', 'pack', 3),
  ('Power bank (até 100Wh, na bagagem de mão)', 'pack', 4),
  ('Roupas térmicas / leves (camadas para outono)', 'pack', 5),
  ('Capa de chuva compacta', 'pack', 6),
  ('Tênis confortável para 15km/dia', 'pack', 7),
  ('Meias extras (chinelos em ryokan)', 'pack', 8),
  ('Remédios pessoais + receita em inglês', 'pack', 9),
  ('Seguro viagem (apólice impressa)', 'pack', 10),
  ('Mochila pequena para day trips', 'pack', 11),
  ('eSIM Japan / Pocket Wi-Fi confirmado', 'pack', 12),
  ('Suica/Pasmo no celular (Apple/Google Wallet)', 'pack', 13),
  ('Cópias digitais de documentos (Google Drive)', 'pack', 14),
  ('Pochete antifurto', 'pack', 15)
ON CONFLICT DO NOTHING;

INSERT INTO public.checklist_items (text, kind, position) VALUES
  ('Iene em espécie (¥30.000 inicial)', 'buy', 0),
  ('SIM/eSIM Sakura Mobile ou Ubigi', 'buy', 1),
  ('Passes regionais extras (se aplicável)', 'buy', 2),
  ('Ingresso Ghibli Park (loteria mensal)', 'buy', 3),
  ('Ingresso teamLab Planets / Borderless', 'buy', 4),
  ('Reserva Shinkansen Nozomi (não coberto pelo JR Pass)', 'buy', 5),
  ('Omiyage (lembrancinhas) no Don Quijote', 'buy', 6),
  ('Skincare japonês (Hada Labo, Senka)', 'buy', 7),
  ('Kit-Kat sabores regionais', 'buy', 8),
  ('Stationery em Itoya / Loft', 'buy', 9),
  ('Cerâmica em Kyoto / Arita', 'buy', 10),
  ('Whisky japonês duty-free (volta)', 'buy', 11)
ON CONFLICT DO NOTHING;