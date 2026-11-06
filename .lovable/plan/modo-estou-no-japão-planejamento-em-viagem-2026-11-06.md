# Modo "Estou no Japão" — planejamento em viagem

## Objetivo
Uma nova aba "Hoje" que mostra o que já aconteceu, o que é hoje e ajuda a montar os próximos dias, sem apagar o histórico nem alterar a reserva do KOKO HOTEL (1–20/11).

## O que você vai ver
1. **Diário dos dias já vividos (1–5/11)**
   - Registro real: D1 descanso (Tóquio), D2 Yokohama, D3 Asakusa, D4 Tokyo Disneyland, D5 compras em Tóquio.
   - Cada dia marcado como "vivido", com espaço para notas e gastos reais.
2. **Painel "Hoje" (data atual automática, horário de Tóquio)**
   - Dia da viagem, cidade, atividades do dia e botão rápido "registrar gasto".
3. **Planejador dos próximos dias**
   - Amanhã (6/11): Nikko já pré-preenchido como bate-volta saindo de Tóquio.
   - Para cada dia futuro: escolher "bate-volta de Tóquio" ou "pernoite em outra cidade" (Kyoto, Osaka, Hakone…).
   - Botão "Planejar com IA os dias restantes": a IA sugere apenas os dias de amanhã em diante, respeitando o que já foi feito, a base em Tóquio até 20/11, transporte terrestre e o voo de volta. Você revisa antes de aplicar.
   - Sugestões de atividades por dia continuam funcionando (eventos da data).
4. **Alertas práticos**
   - Pernoite fora de Tóquio durante a reserva = aviso de diária dupla (não reescreve nada).
   - Dica de JR Pass vs. bilhetes avulsos conforme os bate-voltas escolhidos.

## Detalhes técnicos
- Adicionar ao dia do roteiro: status (`lived` / `today` / `planned`) e tipo (`base` / `day_trip` / `overnight`), via migração; atualizar D1–D6 com os dados acima.
- Novo componente `Today.tsx` + aba no `Planner.tsx`, otimizado para celular (viewport ~374px).
- Nova server function `replanRemainingDays` (Lovable AI): recebe dias vividos + reservas, devolve só dias futuros; aplicar substitui somente dias com data > hoje, preservando atividades/gastos dos dias passados.
- Reaproveitar `reservation-rules.ts` para conflitos; teste novo: "aplicar replanejamento nunca altera dias passados".
