
-- Remove Hokkaido segment, replace with Kyushu extension + Shinkansen return (no flights)
UPDATE trip_days SET city='Fukuoka', phase='kyushu',
  summary='Hakata ramen no almoço, Canal City, yatai (barracas) à noite em Nakasu'
  WHERE day_number=13;

UPDATE trip_days SET city='Nagasaki', phase='kyushu',
  summary='Day trip via Kyushu Shinkansen (~1h20). Dejima, Glover Garden, bonde histórico, champon no jantar'
  WHERE day_number=14;

UPDATE trip_days SET city='Beppu', phase='kyushu',
  summary='Onsens icônicos e os ''Jigoku Meguri'' (sete infernos vulcânicos). Pernoite em ryokan termal'
  WHERE day_number=15;

UPDATE trip_days SET city='Kokura → Tóquio', phase='transit',
  summary='Shinkansen panorâmico Sanyo + Tokaido (~6h), vista do Fuji à direita após Shin-Osaka. Chegada Shinagawa'
  WHERE day_number=16;

UPDATE trip_days SET city='Tóquio', phase='tokyo',
  summary='Shimokitazawa — vintage e cafés. Daikanyama T-Site, Nakameguro (canal em pico de koyo)'
  WHERE day_number=17;

UPDATE trip_days SET city='Tóquio', phase='tokyo',
  summary='Koenji para vinil, Harajuku, Omotesando. Jantar izakaya em Ebisu'
  WHERE day_number=18;

UPDATE trip_days SET city='Tóquio', phase='tokyo',
  summary='Compras finais — Don Quijote, Yodobashi, Tokyu Hands. Golden Gai à noite em Shinjuku'
  WHERE day_number=19;

-- Remove atividades dos dias Hokkaido antigos (não fazem sentido em Kyushu)
DELETE FROM day_activities
  WHERE day_id IN (SELECT id FROM trip_days WHERE day_number IN (13,14,15,16,17));

-- Limpa geo de Hokkaido e adiciona Kyushu extra
DELETE FROM city_geo WHERE city IN ('Sapporo','Otaru');
INSERT INTO city_geo (city, region, lat, lng) VALUES
  ('Nagasaki', 'Kyushu', 32.7503, 129.8777),
  ('Beppu', 'Kyushu', 33.2846, 131.4912),
  ('Kokura → Tóquio', 'Honshu', 35.6585, 139.7454)
ON CONFLICT (city) DO NOTHING;
