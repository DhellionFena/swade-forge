# Spec 11 — Iniciativa por Cartas

## 1. Objetivo

Definir o bounded context de **Initiative** do Forja Selvagem: como o mestre gerencia a **iniciativa por cartas** durante o combate, sorteando Cartas de Ação para cada participante, exibindo a ordem de ação em tempo real, tratando o **Curinga** (marcando `curingaActive` automaticamente e avisando sobre Benes em texto) e encerrando a rodada com reset de `curingaActive`.

A iniciativa é um recurso **exclusivo do mestre** (Spec 08, decisão 54). Jogadores apenas assistem à ordem.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação de uma **sessão de combate** por campanha (uma ativa por vez).
- Seleção de participantes: PJs da campanha + NPCs ativos da campanha.
- Sorteio de **Cartas de Ação** para cada participante (baralho padrão 52 + 2 curingas).
- Ordenação conforme regras do livro (pág. 106): **Curingas primeiro, depois Ás → 2; empates ♠ > ♥ > ♦ > ♣**.
- Exibição em tempo real via WebSocket para todos os membros da campanha.
- **Curinga sacado:** `curingaActive = true` automaticamente no personagem/NPC + **aviso em texto** que jogadores ganham 1 Bene (Bene é **manual** — Spec 08 §17.1).
- Marcação de "já agiu" por participante.
- **Encerrar rodada:** sorteia novas cartas e reseta `curingaActive = false` em todos.
- **Encerrar combate:** libera o estado em memória; opcionalmente registra log histórico.
- **Re-sorteio** de carta individual (com motivo), para Vantagens como Rápido, Focado, Hesitante.
- **Adicionar/remover participante** mid-combat.
- Baralho reseta (re-embaralha) quando esgota.
- Estado em **memória do backend** (não persistido em banco — ver §17.2).

### 2.2 Fora do escopo

- Persistência da sessão de combate no banco (estado em memória).
- Histórico de combates anteriores (log é descartado ao encerrar).
- Automação de Benes (sempre manual).
- Automação de "Rápido"/"Focado"/"Hesitante" (Vantagens são informativas — Spec 08 §17.2).
- Rolagem automática de iniciativa via dados (a ordem vem das cartas).
- Integração com "Fase 5 — Rolagens" para ordenar automaticamente rolagens (o log de rolagens continua cronológico).
- Cartas de aventura ou baralhos temáticos (apenas baralho padrão).
- Múltiplas sessões simultâneas por campanha (uma por vez).

## 3. Atores e Permissões

### 3.1 Definições

- **Mestre da campanha:** owner da campanha (`campaign.ownerId`). Único que **modifica** a iniciativa.
- **Membro:** jogador com membership ativa. Apenas **observa**.
- **Admin:** superusuário (para moderação).

### 3.2 Matriz

| Ação                            | Mestre | Jogador | Admin |
| ------------------------------- | ------ | ------- | ----- |
| Criar sessão de combate         | ✅     | ❌      | ✅    |
| Selecionar participantes        | ✅     | ❌      | ✅    |
| Sortear cartas (rodada)         | ✅     | ❌      | ✅    |
| Re-sortear carta individual     | ✅     | ❌      | ✅    |
| Marcar "já agiu"                | ✅     | ❌      | ✅    |
| Adicionar/remover participante  | ✅     | ❌      | ✅    |
| Encerrar rodada                 | ✅     | ❌      | ✅    |
| Encerrar combate                | ✅     | ❌      | ✅    |
| Ver a ordem (tempo real)        | ✅     | ✅      | ✅    |
| Ver o histórico da sessão ativa | ✅     | ✅      | ✅    |

> **Regra:** jogadores têm acesso **somente leitura**. Nenhum endpoint de modificação é exposto a jogadores.

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Initiative`

#### 4.1.1 Agregado: `CombatSession` (raiz, em memória)

**Atributos:**

- `id`: UUID v4
- `campaignId`: UUID
- `ownerId`: UUID (mestre)
- `status`: `'active' | 'ended'`
- `round`: integer (1, 2, 3…)
- `participants`: `CombatParticipant[]` (ordenados por iniciativa)
- `deck`: `DeckState` (baralho remanescente, em memória)
- `startedAt`: Date
- `endedAt`: Date | null

**Invariantes:**

1. Só pode haver **uma** `CombatSession` ativa por campanha.
2. `ownerId` = `campaign.ownerId`.
3. `participants` contém **apenas** PJs da campanha + NPCs ativos da campanha.
4. Cada participante tem exatamente **uma** carta por rodada.
5. Curingas (Jokers) **sempre** vêm antes de todas as outras cartas.
6. Empates entre não-Curingas: ♠ > ♥ > ♦ > ♣.
7. Quando o baralho esgota, é re-embaralhado (cartas voltam ao deck).

**Métodos:**

- `addParticipant(sourceType, sourceId)`
- `removeParticipant(participantId)`
- `drawCardsForRound()` — sorteia para todos os participantes.
- `redrawParticipantCard(participantId, reason)` — descarta e sorteia novamente.
- `markActed(participantId)`
- `endRound()` — incrementa `round`, reseta `curingaActive`, sorteia novas cartas.
- `endCombat()`
- `getOrderedParticipants()`

**Domain Events:**

- `CombatStarted`
- `CombatParticipantAdded`
- `CombatParticipantRemoved`
- `CombatRoundStarted`
- `CombatCardRedrawn`
- `CombatCuringaDrawn`
- `CombatRoundEnded`
- `CombatEnded`

#### 4.1.2 Entidade: `CombatParticipant` (dentro do agregado)

**Atributos:**

- `id`: UUID v4
- `combatSessionId`: UUID
- `sourceType`: `'character' | 'npc'`
- `sourceId`: UUID (character.id ou npc.id)
- `sourceName`: string (snapshot)
- `isWildCard`: boolean
- `isPlayerControlled`: boolean (`true` para PJ, `false` para NPC)
- `card`: `ActionCard | null` (null até o primeiro sorteio)
- `hasActed`: boolean
- `previousCard`: `ActionCard | null` (para log de re-sorteio)

**Invariantes:**

1. `sourceName` é snapshot no momento da adição — mudanças posteriores no personagem/NPC não afetam a sessão.
2. `isWildCard` é snapshot.

#### 4.1.3 Value Objects

##### `ActionCard`

```typescript
type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "JOKER";
type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "joker";

interface ActionCard {
  rank: Rank;
  suit: Suit;
  isJoker: boolean;
}
```

**Regras de ordenação (`compareActionCards`):**

| Prioridade | Regra                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| 1º         | Curingas (rank `'JOKER'`) vêm antes de qualquer outra carta                   |
| 2º         | Entre não-Curingas: `A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2`      |
| 3º         | Empate entre mesma rank: `♠ > ♥ > ♦ > ♣`                                      |
| 4º         | Empate entre dois Curingas: ordem de sorteio (primeiro sorteado age primeiro) |

##### `DeckState`

- `remaining`: `ActionCard[]` (cartas ainda no baralho).
- `discarded`: `ActionCard[]` (cartas já sorteadas nesta rodada).
- `jokersInDeck`: boolean (para saber se ainda há Curinga disponível).

**Regras:**

- Deck inicial: 54 cartas (52 padrão + 2 Curingas — um vermelho, um preto).
- Quando `remaining.length === 0` e ainda há participantes para sortear: move todas as `discarded` para `remaining` e re-embaralha.

### 4.2 Serviços de domínio

- **`DeckService`**: gerencia o baralho (criar, embaralhar, sacar, resetar). RNG com CSPRNG (mesmo requisito da Spec 04).
- **`InitiativeOrderer`**: ordena participantes conforme `compareActionCards` e ordem de sorteio em empate de Curingas.
- **`CuringaHandler`**: dispara side effects quando um Curinga é sacado:
  1. Marca `curingaActive = true` no personagem (via `ICharacterRuntimePort`) ou NPC (via `INpcRuntimePort`).
  2. Emite `CombatCuringaDrawn` com metadata (`whoDrew`, `isPlayerControlled`).
  3. **Não** incrementa Benes — apenas o handler de apresentação exibirá o aviso.

### 4.3 Repositórios (em memória)

Como a sessão é **em memória**, não há `IRepository` tradicional. Em vez disso:

- **`CombatSessionStore`** (singleton in-memory): `getActiveByCampaign(campaignId)`, `save(session)`, `delete(campaignId)`.
- **`ICharacterRuntimePort`**: adaptador para marcar `curingaActive` em personagens (via Spec 03).
- **`INpcRuntimePort`**: adaptador para marcar `curingaActive` em NPCs (via Spec 05).

> **Nota de design:** o `CombatSessionStore` é um `Map<campaignId, CombatSession>` protegido por lock (para evitar race conditions em rodadas simultâneas). Em deploy single-instance (free tier), funciona nativamente. HA fica fora do MVP.

### 4.4 Casos de uso (application layer)

| Caso de uso                    | Ator                | Descrição                                                     |
| ------------------------------ | ------------------- | ------------------------------------------------------------- |
| `StartCombatUseCase`           | Mestre/Admin        | Cria a sessão com participantes selecionados.                 |
| `AddParticipantUseCase`        | Mestre/Admin        | Adiciona PJ ou NPC à sessão ativa.                            |
| `RemoveParticipantUseCase`     | Mestre/Admin        | Remove participante da sessão ativa.                          |
| `DrawInitialCardsUseCase`      | Mestre/Admin        | Sorteia cartas da rodada 1.                                   |
| `RedrawParticipantCardUseCase` | Mestre/Admin        | Re-sorteia a carta de um participante (com motivo).           |
| `MarkParticipantActedUseCase`  | Mestre/Admin        | Marca participante como "já agiu".                            |
| `EndRoundUseCase`              | Mestre/Admin        | Encerra rodada, sorteia novas cartas, reseta `curingaActive`. |
| `EndCombatUseCase`             | Mestre/Admin        | Encerra a sessão.                                             |
| `GetActiveCombatUseCase`       | Membro/Mestre/Admin | Consulta o estado atual da sessão ativa.                      |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Iniciar combate

1. Mestre abre campanha → aba "Combate" → "Iniciar combate".
2. Sistema exibe:
   - Lista de PJs da campanha (todos selecionados por padrão).
   - Lista de NPCs ativos da campanha (nenhum selecionado por padrão).
3. Mestre escolhe participantes e clica "Iniciar".
4. Backend:
   - Valida que não existe sessão ativa na campanha (`409 COMBAT_ALREADY_ACTIVE`).
   - Cria `CombatSession` em memória com `round = 1`, `deck` inicial (54 cartas embaralhadas).
   - Para cada participante, sorteia uma carta.
   - Aplica regras de Curinga (ver §5.3).
   - Emite `CombatStarted` e `CombatRoundStarted` (round 1).
   - Broadcast WebSocket para `campaign:${id}:public` + `campaign:${id}:master`.
5. Retorna o estado da sessão.

### 5.2 Fluxo: Encerrar rodada (avançar para a próxima)

1. Mestre clica "Encerrar rodada".
2. Backend:
   - Para cada participante, move a carta atual para `discarded` e marca `hasActed = false`.
   - **Reseta `curingaActive = false`** em todos os participantes (via ports).
   - Incrementa `round`.
   - Sorteia nova carta para cada participante (respeitando re-embaralhamento se o deck esgotar).
   - Aplica regras de Curinga (ver §5.3).
   - Emite `CombatRoundEnded` + `CombatRoundStarted`.
   - Broadcast WebSocket.
3. Retorna o estado atualizado.

**Quando o baralho esgota:** antes de sortear, se `remaining.length === 0`, move `discarded` para `remaining`, embaralha e prossegue.

### 5.3 Fluxo: Curinga sacado

Quando um Curinga é sorteado:

1. `CuringaHandler` marca `curingaActive = true` no personagem/NPC correspondente:
   - PJ: `ICharacterRuntimePort.setCuringaActive(characterId, true)`.
   - NPC: `INpcRuntimePort.setCuringaActive(npcId, true)`.
2. Emite `CombatCuringaDrawn` com `{ participantId, sourceName, isPlayerControlled }`.
3. Broadcast WebSocket.
4. **Frontend** exibe um **aviso destacado** na tela do mestre e dos jogadores:
   - Se `isPlayerControlled = true`: _"Curinga sacado por [Nome]! Todos os jogadores ganham 1 Bene."_
   - Se `isPlayerControlled = false`: _"Curinga sacado por [Nome do NPC]! O mestre ganha 1 Bene (+1 por Carta Selvagem inimiga)."_
5. O sistema **não incrementa Benes automaticamente** (Spec 08 §17.1) — o mestre/jogadores ajustam manualmente na ficha.

> **Múltiplos Curingas:** se dois Curingas forem sacados na mesma rodada, ambos ativam a regra. Os avisos são empilhados. O reset de `curingaActive` ao fim da rodada cobre ambos.

### 5.4 Fluxo: Re-sorteio de carta individual

1. Mestre clica em "Re-sortear" ao lado de um participante.
2. Sistema pede o **motivo** (dropdown: "Rápido", "Focado", "Hesitante", "Outro").
3. Backend:
   - Descarta a carta atual.
   - Sorteia uma nova.
   - Se a nova for Curinga e a anterior não era: aplica regra de Curinga.
   - Se a anterior era Curinga e a nova não é: **não** remove `curingaActive` (regra explícita: a flag dura até o fim da rodada, mesmo com re-sorteio).
   - Reordena participantes.
   - Emite `CombatCardRedrawn`.
   - Broadcast WebSocket.
4. Frontend atualiza a ordem.

### 5.5 Fluxo: Adicionar participante mid-combat

1. Mestre clica "Adicionar participante".
2. Escolhe PJ ou NPC da campanha (que ainda não está na sessão).
3. Backend:
   - Sorteia uma carta para o novo participante.
   - Insere na ordem correta.
   - Aplica regra de Curinga se aplicável.
   - Emite `CombatParticipantAdded`.
   - Broadcast WebSocket.

### 5.6 Fluxo: Remover participante mid-combat

1. Mestre clica no "X" do participante.
2. Backend:
   - Remove da sessão.
   - **Não** devolve a carta ao deck (descarta).
   - Emite `CombatParticipantRemoved`.
   - Broadcast WebSocket.

### 5.7 Fluxo: Marcar "já agiu"

1. Mestre clica em "Já agiu" no participante.
2. Backend marca `hasActed = true`.
3. Broadcast WebSocket.
4. Frontend exibe o participante com estilo "apagado".

### 5.8 Fluxo: Encerrar combate

1. Mestre clica "Encerrar combate".
2. Backend:
   - Reseta `curingaActive = false` em todos os participantes (por segurança).
   - Emite `CombatEnded`.
   - Remove a sessão do `CombatSessionStore`.
   - Broadcast WebSocket.
3. Frontend limpa o painel e mostra toast de confirmação.

### 5.9 Fluxo: Consultar estado (reconexão)

1. Cliente (re)conecta ou abre a página de combate.
2. Chama `GET /campaigns/:id/combat`.
3. Backend:
   - Se existe sessão ativa na memória: retorna estado completo.
   - Se não existe: retorna `404 COMBAT_NOT_ACTIVE`.
4. Frontend exibe o painel ou uma tela vazia com CTA "Iniciar combate" (se for mestre).

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação.

### 6.1 Consulta (membros + mestre + admin)

#### `GET /campaigns/:campaignId/combat`

**Resposta 200:**

```json
{
  "combat": {
    "id": "uuid",
    "campaignId": "uuid",
    "ownerId": "uuid",
    "round": 2,
    "startedAt": "2026-11-11T20:00:00Z",
    "status": "active",
    "participants": [
      {
        "id": "uuid",
        "sourceType": "character",
        "sourceId": "uuid",
        "sourceName": "Red",
        "isWildCard": true,
        "isPlayerControlled": true,
        "card": { "rank": "A", "suit": "spades", "isJoker": false },
        "hasActed": false
      },
      {
        "id": "uuid",
        "sourceType": "npc",
        "sourceId": "uuid",
        "sourceName": "Troll",
        "isWildCard": true,
        "isPlayerControlled": false,
        "card": { "rank": "JOKER", "suit": "joker", "isJoker": true },
        "hasActed": true
      }
    ],
    "deck": { "remaining": 45, "jokersRemaining": 1 }
  }
}
```

**Erros:** `404 COMBAT_NOT_ACTIVE`, `403 FORBIDDEN` (não é membro).

### 6.2 Mestre

Todos exigem `campaign.ownerId === actor.id` ou `actor.role === 'admin'`. Caso contrário, `403 FORBIDDEN`.

#### `POST /campaigns/:campaignId/combat`

**Body:**

```json
{
  "participants": [
    { "sourceType": "character", "sourceId": "uuid" },
    { "sourceType": "npc", "sourceId": "uuid" }
  ]
}
```

**Resposta 201:** estado completo da sessão.
**Erros:** `409 COMBAT_ALREADY_ACTIVE`, `400 INVALID_PARTICIPANT`, `403`.

#### `POST /combat/:id/rounds/end`

**Resposta 200:** estado atualizado.
**Erros:** `404 COMBAT_NOT_FOUND`, `409 COMBAT_NOT_ACTIVE`, `403`.

#### `POST /combat/:id/participants`

**Body:** `{ "sourceType": "character|npc", "sourceId": "uuid" }`
**Resposta 200:** estado atualizado.

#### `DELETE /combat/:id/participants/:participantId`

**Resposta 200:** estado atualizado.

#### `POST /combat/:id/participants/:participantId/redraw`

**Body:** `{ "reason": "rapido|focado|hesitante|outro" }`
**Resposta 200:** estado atualizado.

#### `POST /combat/:id/participants/:participantId/mark-acted`

**Resposta 200:** estado atualizado.

#### `POST /combat/:id/end`

**Resposta 204.**
**Erros:** `404`, `403`.

### 6.3 WebSocket

**Namespace:** `/realtime` (mesmo da Spec 04).

**Rooms:** `campaign:${id}:public` (membros + mestre + admin) e `campaign:${id}:master` (mestre + admin). Eventos de combate vão para `campaign:${id}:public` (todos veem a ordem).

**Eventos emitidos pelo servidor:**

| Evento                       | Payload                                             |
| ---------------------------- | --------------------------------------------------- |
| `combat:started`             | estado completo                                     |
| `combat:round-started`       | `{ round, participants }`                           |
| `combat:round-ended`         | `{ round }`                                         |
| `combat:participant-added`   | `{ participant }`                                   |
| `combat:participant-removed` | `{ participantId }`                                 |
| `combat:participant-acted`   | `{ participantId }`                                 |
| `combat:card-redrawn`        | `{ participantId, previousCard, newCard, reason }`  |
| `combat:curinga-drawn`       | `{ participantId, sourceName, isPlayerControlled }` |
| `combat:ended`               | `{ combatId }`                                      |

**Reconexão:** mesmo padrão da Spec 04. Buffer de 20 eventos por campanha (ring buffer em memória).

## 7. Regras de Negócio

**RN-INIT-01** — Só pode haver **uma** sessão de combate ativa por campanha.
**RN-INIT-02** — Apenas o mestre da campanha (ou admin) pode criar, modificar ou encerrar a sessão.
**RN-INIT-03** — Jogadores apenas **observam**; não interagem.
**RN-INIT-04** — Participantes são apenas PJs da campanha + NPCs ativos da campanha.
**RN-INIT-05** — Cada participante recebe exatamente **uma** carta por rodada.
**RN-INIT-06** — Baralho inicial: **54 cartas** (52 padrão + 2 Curingas).
**RN-INIT-07** — Quando o baralho esgota, ele é re-embaralhado (cartas descartadas voltam).
**RN-INIT-08** — Ordenação de cartas:

- Curingas **sempre** primeiro.
- Não-Curingas: `A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2`.
- Empates: `♠ > ♥ > ♦ > ♣`.
- Empate entre Curingas: ordem de sorteio.
  **RN-INIT-09** — **Curinga sacado por PJ:**
- `curingaActive = true` automaticamente.
- Emite aviso: "Todos os jogadores ganham 1 Bene."
- **Não** incrementa Benes automaticamente.
  **RN-INIT-10** — **Curinga sacado por NPC:**
- `curingaActive = true` automaticamente no NPC.
- Emite aviso: "O mestre ganha 1 Bene (+1 por Carta Selvagem inimiga)."
- **Não** incrementa Benes automaticamente.
  **RN-INIT-11** — **Encerrar rodada:**
- Reseta `curingaActive = false` em todos os participantes.
- Incrementa `round`.
- Sorteia novas cartas.
  **RN-INIT-12** — **Re-sorteio individual:**
- Descarta a carta atual, sorteia nova.
- Re-ordena.
- Se a nova carta for Curinga: aplica regra de Curinga.
- Se a anterior era Curinga e a nova não é: `curingaActive` **permanece true** até o fim da rodada (regra: a flag dura a rodada toda).
  **RN-INIT-13** — **Adicionar participante mid-combat:** recebe carta imediatamente, insere na ordem.
  **RN-INIT-14** — **Remover participante:** a carta é descartada (não volta ao deck nesta rodada).
  **RN-INIT-15** — **Encerrar combate:** reseta `curingaActive = false` em todos (por segurança) e limpa a sessão da memória.
  **RN-INIT-16** — Estado é **em memória** (não persistido). Se o backend reiniciar, a sessão ativa é perdida. O mestre pode reiniciar o combate.
  **RN-INIT-17** — Snapshot de `sourceName` e `isWildCard` no momento da adição (mudanças posteriores não afetam a sessão).
  **RN-INIT-18** — RNG do baralho usa **CSPRNG** (`crypto.randomInt`), nunca `Math.random`.
  **RN-INIT-19** — Nenhum evento de combate é emitido para jogadores fora da campanha.
  **RN-INIT-20** — Avisos de Curinga são **apenas textuais** no frontend; o sistema não interage com Benes.

## 8. Segurança

- **Autorização:** guard `CombatAccessGuard` verifica `campaign.ownerId` (para modificação) ou membership ativa (para leitura).
- **RNG:** CSPRNG obrigatório (mesma exigência da Spec 04).
- **WebSocket:** eventos de combate emitidos apenas para `campaign:${id}:public` (todos os membros) e, quando o payload contém detalhes que só o mestre deve ver (nenhum caso no MVP), para `campaign:${id}:master`.
- **Rate limit:** nenhuma ação específica no MVP (ações são raras e controladas pelo mestre). Recomendação: limitar `POST /combat` a 1 por minuto por campanha (evita reinícios acidentais em loop).
- **Estado em memória:** protegido por lock para evitar race conditions. Uso de fila de operações por campanha.
- **Reinício do backend:** sessão ativa é perdida. Documentar em `docs/operations/runbook.md`.

## 9. UX

### 9.1 Jornadas

- **Mestre — iniciar:** abre campanha → aba "Combate" → "Iniciar combate" → seleciona PJs + NPCs → "Iniciar".
- **Mestre — durante:** vê a ordem, marca "já agiu", re-sorteia quando necessário, encerra a rodada.
- **Mestre — encerrar:** botão "Encerrar combate" com confirmação.
- **Jogador — durante:** vê o painel em tempo real, com destaque para "é a sua vez" quando é o próximo.

### 9.2 Telas necessárias

- **`/campaigns/:id/combat`** (nova aba "Combate" na campanha):
  - **Painel principal:** lista de participantes ordenados por iniciativa, cada um com:
    - Card visual (rank + suit ou Curinga).
    - Nome (avatar do personagem/NPC).
    - Badge WC/Extra.
    - Checkbox "já agiu".
    - Botões (mestre): "Re-sortear", "Remover".
  - **Header:** rodada atual + botão "Encerrar rodada" (mestre).
  - **Footer:** botão "Adicionar participante" (mestre) + botão "Encerrar combate" (mestre).
  - **Banner de Curinga:** toast destacado no topo quando Curinga é sacado.
- **Modal de iniciar combate:**
  - Lista de PJs (checkbox, todos marcados por padrão).
  - Lista de NPCs ativos (checkbox, nenhum marcado por padrão).
  - Botão "Iniciar".
- **Modal de re-sorteio:** dropdown de motivo + confirmação.

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton.
- **Empty (sem combate ativo):** "Nenhum combate ativo. Inicie um para sortear as cartas." + CTA "Iniciar combate" (mestre).
- **Empty (sem participantes):** "Adicione participantes para começar."
- **Error:** toast.
- **Success:** toast.
- **Curinga sacado:** banner de destaque no topo (dourado, pulsante) por 5s.
- **"Já agiu":** participante com opacidade reduzida + checkmark.
- **Participante atual (próximo na ordem):** borda dourada + ícone de "estrela".

### 9.4 Microcopy (via Humanizer)

- "Iniciar combate"
- "Selecione quem vai participar desta rodada."
- "Encerrar rodada" — "Todos os Curingas ativos serão resetados e novas cartas serão sorteadas."
- "Encerrar combate" — "A sessão será descartada. Você pode iniciar um novo combate a qualquer momento."
- "Curinga sacado por Red! Todos os jogadores ganham 1 Bene." (manual)
- "Curinga sacado por Troll! O mestre ganha 1 Bene (+1 por Carta Selvagem inimiga)." (manual)
- "Re-sortear carta de Red. Motivo: Focado."
- "Já agiu"
- "Adicionar participante"
- "É a sua vez!" (destaque para o próximo participante PJ)

## 10. Design System

Componentes novos:

- `<InitiativePanel>` — painel principal do combate.
- `<InitiativeCard>` — card visual de uma carta (rank + suit ou Curinga).
- `<InitiativeParticipantCard>` — linha de participante com nome, carta, check "já agiu".
- `<CuringaBanner>` — banner dourado pulsante para aviso de Curinga.
- `<CombatStartModal>` — seleção de participantes.
- `<RedrawCardModal>` — motivo do re-sorteio.
- `<RoundBadge>` — indicador de rodada (ex.: "Rodada 3").
- `<CurrentTurnIndicator>` — destaque para o próximo participante.
- `<DeckStatus>` — mostra cartas restantes + curingas restantes (debug/pro).

Todos suportam tema claro/escuro.

## 11. Modelo de Dados (Postgres)

**Não há persistência.** O estado da sessão vive em memória no backend.

Nenhuma tabela nova. Nenhuma migration necessária.

> **Nota para o implementador:** se no futuro a persistência for requisitada (ver §17.2), uma tabela `combat_sessions` com `state JSONB` pode ser adicionada sem quebrar a API atual (apenas o repositório muda).

## 12. i18n

Namespace `initiative.*`. Chaves principais:

```
initiative.panel.title
initiative.panel.empty
initiative.panel.empty.cta
initiative.panel.round
initiative.panel.deck_remaining
initiative.panel.jokers_remaining

initiative.start_modal.title
initiative.start_modal.characters_section
initiative.start_modal.npcs_section
initiative.start_modal.submit
initiative.start_modal.error.already_active
initiative.start_modal.error.no_participants

initiative.participant.acted
initiative.participant.current_turn
initiative.participant.wildcard
initiative.participant.extra
initiative.participant.redraw
initiative.participant.remove
initiative.participant.remove.confirm

initiative.redraw_modal.title
initiative.redraw_modal.reason
initiative.redraw_modal.reason.rapido
initiative.redraw_modal.reason.focado
initiative.redraw_modal.reason.hesitante
initiative.redraw_modal.reason.outro
initiative.redraw_modal.submit

initiative.end_round.confirm
initiative.end_round.success
initiative.end_combat.confirm
initiative.end_combat.success

initiative.curinga_banner.player
initiative.curinga_banner.npc
initiative.curinga_banner.dismiss

initiative.error.forbidden
initiative.error.combat_not_active
initiative.error.combat_already_active
initiative.error.invalid_participant
```

Todos os textos passam pela skill **Humanizer** antes de virarem `pt-BR.json`.

## 13. Seed

Não aplicável. Iniciativa é estado em memória gerado pelo mestre em jogo.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `ActionCard` — ordenação:
  - Curinga > Ás.
  - Ás > Rei.
  - Dois Ases: ♠ > ♥.
  - Dois Curingas: ordem de sorteio.
- `DeckService`:
  - Cria 54 cartas.
  - Embaralha sem perder nenhuma.
  - Sacar remove da `remaining` e adiciona em `discarded`.
  - Quando `remaining` vazia, re-embaralha `discarded`.
- `InitiativeOrderer` ordena corretamente por rank + suit.
- `CuringaHandler`:
  - Marca `curingaActive = true` em PJ.
  - Marca `curingaActive = true` em NPC.
  - **Não** incrementa Benes (verificar ausência de chamada).
- `CombatSession.endRound`:
  - Reseta `curingaActive = false` em todos.
  - Incrementa `round`.
  - Sorteia novas cartas.
- `CombatSession.redrawParticipantCard`:
  - Descarta carta atual.
  - Sorteia nova.
  - Se nova for Curinga: dispara handler.
  - Se anterior era Curinga: `curingaActive` permanece `true`.
- `CombatSession.addParticipant` insere na ordem correta.
- `CombatSession.removeParticipant` descarta carta.

### 14.2 Integration tests (application + infra)

- `StartCombatUseCase` cria sessão com participantes e cartas.
- `StartCombatUseCase` rejeita se já existe combate ativo (`409`).
- `EndRoundUseCase` reseta curingas e sorteia novas cartas.
- `RedrawParticipantCardUseCase` respeita regra de Curinga.
- `EndCombatUseCase` limpa sessão e reseta curingas.
- `GetActiveCombatUseCase` retorna estado correto para membros.
- Jogador tenta modificar → `403`.
- Adicionar participante de outra campanha → `400 INVALID_PARTICIPANT`.

### 14.3 E2E tests (HTTP + WebSocket)

- Fluxo completo: criar combate → ver ordem → encerrar rodada → ver novas cartas → encerrar combate.
- Curinga sacado (via RNG seedado) → verificar `curingaActive = true` no personagem + banner emitido.
- Re-sorteio individual: verificar nova ordem.
- Adicionar participante mid-combat: verificar inserção na ordem.
- Reconexão: cliente reconecta, consulta `GET /combat` e recupera estado.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 85%.
- **WebSocket:** ≥ 80%.

## 15. Conventional Commits esperados

```
chore(initiative): bootstrap initiative bounded context structure
feat(initiative): add ActionCard value object with ordering rules
feat(initiative): add DeckService with CSPRNG shuffle
feat(initiative): add CombatSession aggregate in-memory
feat(initiative): add CombatParticipant entity
feat(initiative): implement InitiativeOrderer
feat(initiative): implement CuringaHandler with runtime ports
feat(initiative): implement StartCombatUseCase
feat(initiative): implement EndRoundUseCase with curinga reset
feat(initiative): implement RedrawParticipantCardUseCase
feat(initiative): implement AddParticipantUseCase
feat(initiative): implement RemoveParticipantUseCase
feat(initiative): implement MarkParticipantActedUseCase
feat(initiative): implement EndCombatUseCase
feat(initiative): add HTTP controllers and CombatAccessGuard
feat(realtime): add combat events to WebSocket gateway
feat(web): add initiative panel with participants ordered by card
feat(web): add combat start modal
feat(web): add curinga banner with manual bene warning
feat(web): add redraw card modal
test(initiative): add unit tests for card ordering
test(initiative): add integration tests for round lifecycle
test(initiative): add e2e tests for full combat flow
docs(initiative): document initiative rules and in-memory limitations
```

## 16. Critérios de Aceite

- [ ] Mestre cria combate com PJs + NPCs selecionados.
- [ ] Cada participante recebe uma carta por rodada.
- [ ] Ordem exibida corretamente (Curingas primeiro, A→2, ♠>♥>♦>♣).
- [ ] Múltiplas rodadas funcionam (nova rodada = novas cartas).
- [ ] Baralho re-embaralha quando esgota.
- [ ] Curinga sacado por PJ: `curingaActive = true` no personagem + banner de aviso (sem incrementar Bene).
- [ ] Curinga sacado por NPC: `curingaActive = true` no NPC + banner de aviso (sem incrementar Bene).
- [ ] Encerrar rodada reseta `curingaActive = false` em todos.
- [ ] Re-sorteio individual funciona e re-ordena.
- [ ] Adicionar participante mid-combat insere na ordem.
- [ ] Remover participante descarta a carta.
- [ ] Marcar "já agiu" funciona.
- [ ] Encerrar combate limpa a sessão.
- [ ] Reconexão recupera estado via `GET /combat`.
- [ ] WebSocket propaga todos os eventos para `campaign:${id}:public`.
- [ ] Jogadores não podem modificar (403).
- [ ] RNG usa `crypto.randomInt`.
- [ ] Cobertura mínima da §14.4 atingida.
- [ ] Todas as strings passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- **Estado em memória** (não persistido em banco). Sessão perdida em restart do backend.
- **Uma sessão ativa por campanha**.
- **Jogadores apenas observam**.
- **Curinga marca `curingaActive = true` automaticamente** (integração com Specs 03 e 05).
- **Curinga dispara aviso textual de Bene**, mas **não incrementa Benes** (manual — Spec 08 §17.1).
- **Reset de `curingaActive` ao encerrar a rodada**.
- **Re-sorteio individual** com motivo (Rápido, Focado, Hesitante, Outro).
- **Adicionar/remover participantes mid-combat** suportado.
- **Baralho 54 cartas** com re-embaralhamento ao esgotar.
- **WebSocket** com eventos para `campaign:${id}:public` (todos veem).
- **RNG CSPRNG**.

### 17.2 Pendências para o autor aprovar

- **Persistência da sessão:** em memória (recomendado no MVP) ou persistir em banco (JSONB) para sobreviver a restart? **Recomendação:** em memória, com nota de limitação. Se o master usar ativamente e o backend reiniciar com frequência (free tier Render), pode ser frustrante. **Alternativa:** persistir em `combat_sessions` (campaignId, state JSONB) — resolve o problema com pouco esforço. **Aguardando decisão.**
- **Restaurar carta em re-sorteio:** quando o mestre re-sorteia, a carta antiga volta ao deck ou é descartada? **Recomendação:** descartada (não volta nesta rodada; volta no re-embaralhamento). **Aguardando confirmação.**
- **Múltiplos Curingas na mesma rodada:** ativar `curingaActive` em todos os que sacaram (correto) e exibir múltiplos banners? **Recomendação:** sim, empilhados. **Aguardando confirmação.**
- **Re-sorteio com Curinga anterior:** a flag `curingaActive` permanece `true` até o fim da rodada (não remove ao re-sortear). **Recomendação:** manter (consistente com o livro). **Aguardando confirmação.**
- **Histórico de combate:** guardar log de combates encerrados? **Recomendação:** fora do MVP. **Aguardando confirmação.**
- **`DeckStatus` visível para jogadores:** mostrar cartas restantes + curingas restantes? **Recomendação:** mostrar apenas para o mestre (evita metagaming). **Aguardando confirmação.**
- **Notificação sonora de Curinga:** tocar som quando Curinga é sacado? **Recomendação:** fora do MVP. **Aguardando confirmação.**
- **Persistência de "quem já agiu" entre reconexões:** o estado `hasActed` é em memória; se o backend reinicia, perde. **Recomendação:** aceitável no MVP (coberto pela decisão de persistência acima). **Aguardando confirmação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT (HS256 recomendado), CSRF (Origin recomendado), rate limit (in-memory), biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket (Socket.IO recomendado), rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: aprovado integralmente.
- Spec 06: log de alterações de eventos (pendente), múltiplas imagens por evento (pendente), markdown sanitizado (pendente), `kind` de eventos (pendente), `eventDate` vs. `inGameDate` (pendente), calendário visual (pendente).
- Spec 07: aprovado integralmente (regressão visual como pendência menor).
- Spec 08: aprovado com cláusula sobre "Curinga ganha Bene manual" e "textos informativos".
- Spec 09: aprovado integralmente.
- Spec 10: aprovado integralmente.
