
# Planejador Interativo — Japão Nov 2026

App pessoal para você e Hameceli planejarem, executarem e ajustarem a terceira viagem ao Japão. Foco em **menos tempo em Tóquio** (só entrada/saída), **Kyoto + Osaka como núcleo**, **1 dia em Hakone**, mantendo flexibilidade para encaixar Hokkaido/Kumamoto/Hiroshima/Nara conforme você decide na ferramenta.

## Roteiro base (proposta inicial — editável no app)

22 dias no chão (chegada HND 01/nov 14:35, saída HND 20/nov 17:10).

```
01/11 Dom  Tóquio       Chegada HND, check-in Nishikasai
02/11 Seg  Hakone       Romancecar + onsen ryokan (pernoite)
03/11 Ter  Hakone→Kyoto Owakudani manhã, Shinkansen tarde
04/11 Qua  Kyoto        Fushimi Inari ao amanhecer + Gion
05/11 Qui  Kyoto        Arashiyama + Kinkaku-ji
06/11 Sex  Kyoto        Philosopher's Path + Nanzen-ji (koyo)
07/11 Sáb  Nagoya       Ghibli Park (day trip ou pernoite)
08/11 Dom  Nara→Osaka   Tōdai-ji, transfer Umeda
09/11 Seg  Osaka        Dotonbori + Kuromon + Shinsekai
10/11 Ter  Hiroshima    Peace Park + Miyajima (day trip ou pernoite)
11/11 Qua  Osaka→Kumamoto Shinkansen Sanyo/Kyushu (~3h30)
12/11 Qui  Kumamoto/Aso Castelo + Mt. Aso
13/11 Sex  Fukuoka      Ramen + Canal City (opcional)
14/11 Sáb  Voo→Sapporo  ANA/JAL ~2h (JR Pass NÃO cobre)
15/11 Dom  Sapporo      Odori + Susukino + cervejaria
16/11 Seg  Otaru/Furano Day trip neve/canal
17/11 Ter  Voo→Tóquio   Retorno, check-in
18/11 Qua  Tóquio       Bairros afetivos (Koenji/Daikanyama)
19/11 Qui  Tóquio       Compras finais, Golden Gai
20/11 Sex  Partida      HND 17:10
```

Tudo isso aparece como **rascunho editável** — você arrasta, remove, duplica dias na própria UI.

## Funcionalidades

### 1. Visão Geral (Dashboard)
- Contador regressivo, métricas-chave (duração, cidades, atividades, orçamento)
- Alertas críticos: Ghibli reserva, koyo, JR Pass (com aviso explícito de que JR Pass NÃO cobre voos domésticos para Hokkaido)
- Câmbio JPY↔BRL atualizado (API pública gratuita, cached)

### 2. Mapa Visual da Rota
- Mapa do Japão (Leaflet + OpenStreetMap, sem custo) com pinos para cada cidade
- Linhas conectando na ordem do roteiro, colorindo por tipo de transporte (shinkansen / voo doméstico / regional)
- Tempo e custo estimado de cada trecho ao clicar
- Aviso visual para trechos não cobertos por JR Pass

### 3. Roteiro Editável (Itinerary)
- Lista de dias expansíveis (como o protótipo atual, mas com drag-to-reorder)
- Por dia: atividades editáveis, notas livres, anexo de links (Google Maps, reservas), upload de fotos
- Marcar atividade como feita / pular / mover para outro dia
- Botão "adicionar dia" / "remover dia" com revalidação da rota

### 4. Banco de Atividades por Cidade
- Catálogo curado por cidade (Tóquio, Kyoto, Osaka, Hakone, Nara, Hiroshima, Nagoya, Kumamoto, Sapporo, Fukuoka)
- Cada atividade: foto, descrição curta, tempo estimado, custo médio, link Google Maps, dica pessoal
- Botão "adicionar ao Dia X"
- Filtros: tipo (templo / comida / compras / natureza / pop), duração, custo

### 5. Orçamento com Câmbio
- Categorias editáveis (JR Pass, hospedagem, comida, etc.)
- Toggle JPY ↔ BRL com câmbio ao vivo
- Registro de gastos com data, categoria, valor original (JPY) e conversão
- Gráfico de evolução: planejado vs gasto por categoria
- Alerta quando categoria passa de 90%

### 6. Checklist por dia
- Independente das atividades — coisas como "trocar dinheiro", "ativar JR Pass", "Suica recarregada"
- Notas livres em markdown leve

### 7. Login + Sincronização (Lovable Cloud)
- Email/senha + Google
- Você e Hameceli logam, veem o mesmo planejamento, edições sincronizam
- Sem perfil pesado — só `auth.users` + tabelas de dados ligadas ao trip

## Estilo visual — "profissional"

Direção: **editorial sóbrio japonês**, inspirado em Monocle / Wallpaper Japan Edition. Sem o vermelho saturado atual.

- **Paleta:** off-white (#FAFAF7), sumi black (#1A1A1A), accent vermelho contido (#9B2C2C) só para alertas, verde musgo (#4A6741) para concluído, cinza Kyoto (#7A7670)
- **Tipografia:** "Instrument Serif" para títulos grandes (sensação editorial), "Inter" para corpo, "JetBrains Mono" para números/datas
- **Layout:** muita respiração, grid de 12 colunas, divisores finos, sem cards inflados — mais próximo de jornal/livro do que de SaaS
- **Sem ícones decorativos** desnecessários; iconografia tabler discreta apenas funcional

## Arquitetura técnica

- **Stack:** TanStack Start (já configurado), Tailwind, shadcn, Lovable Cloud (Supabase)
- **Mapa:** `react-leaflet` + OpenStreetMap tiles (sem API key)
- **Câmbio:** `https://api.frankfurter.app/latest?from=JPY&to=BRL` (gratuito, sem key), cache 1h
- **Rotas:**
  - `/` landing/login
  - `/_authenticated/overview` dashboard
  - `/_authenticated/map` mapa
  - `/_authenticated/itinerary` roteiro
  - `/_authenticated/itinerary/$dayId` detalhe do dia
  - `/_authenticated/activities` banco de atividades
  - `/_authenticated/budget` orçamento
- **Tabelas:**
  - `trips` (1 trip por enquanto, mas extensível)
  - `trip_days` (n, date, city, phase, notes)
  - `activities` (day_id, title, done, time, cost_jpy, link, notes)
  - `activity_catalog` (city, title, desc, type, duration, avg_cost, gmaps_url) — seed inicial
  - `budget_categories` (trip_id, name, planned_jpy)
  - `expenses` (trip_id, category_id, date, amount_jpy, note)
  - `checklist_items` (day_id ou trip_id, text, done)
- **RLS:** owner_id = auth.uid() em cada tabela; viagem compartilhada via tabela `trip_collaborators(trip_id, user_id)`
- **Persistência:** TanStack Query + server functions com `requireSupabaseAuth`

## Ordem de implementação

1. Habilitar Lovable Cloud + auth (email/senha + Google)
2. Schema + seeds (dias base + catálogo de atividades das 10 cidades)
3. Layout editorial + tema + rotas autenticadas
4. Overview dashboard + câmbio
5. Itinerary com edição
6. Banco de atividades + adicionar ao dia
7. Mapa interativo
8. Orçamento + registro de gastos
9. Checklist + notas
10. Polimento, alertas contextuais, responsivo mobile

## Detalhes técnicos importantes

- **Profiles:** não precisa de tabela profiles separada — só `display_name` opcional em `trip_collaborators`
- **Hokkaido caveat:** mostrar alerta no Overview de que voo doméstico HND↔CTS custa ~¥15-25k/pessoa e não está no JR Pass. Estimar +R$ 3.000 no orçamento.
- **Kumamoto caveat:** shinkansen Sanyo+Kyushu (Shin-Osaka→Kumamoto) é coberto pelo JR Pass Nacional, mas ~6h de viagem. Avisar.
- **Datas:** trip start `2026-11-01`, "hoje" calculado de verdade (não hardcoded como no protótipo)

## Riscos e mitigações

- Roteiro com Hokkaido + Kumamoto + Honshu central é **agressivo** para 20 dias. O app deixa isso explícito com um indicador "intensidade de deslocamento" por trecho, e você ajusta visualmente.
- Mapa pode pesar — lazy-load do Leaflet, só carrega na aba mapa.
- Câmbio offline: cache local fallback para último valor conhecido.
