# Платформа столов — зафиксированные решения

## Контент

- Канон сценариев живёт **в git**: `src/projects/<id>/`.
- **Graph** (`graph.ts`): локации, выходы, осмотры, NPC — source of truth для runtime.
- **Мастерская (P3):** node canvas + JSON; черновик в sessionStorage; **Export graph.ts / JSON** → commit в git.

## Раунд

- Без таймера: раунд, когда все сдали intent (включая «ничего не делать»).
- 1 действие / игрок / раунд.
- Share, способности и talk тратят действие.
- Share: хаб видит; корзина улик — только same location.

## Хост

- ПК = хаб (`/table/$code`). Телефон = игра (`/play/$code`).

## Фазы

- P0 — хаб, registry
- P1 — turn engine
- P2 — GraphDocument + Cherwood graph
- **P3** — Studio canvas, bridge, export for git
