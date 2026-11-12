# Spec 04 — Rolagens e Log em Tempo Real

## 1. Objetivo

Definir o bounded context de **Roll** do Forja Selvagem: como rolagens de perícias, atributos e dano são executadas, como as regras do SWADE são aplicadas automaticamente (Dado Selvagem, Ases, Falha Crítica, penalidades por Ferimento/Fadiga, bônus de Curinga, teste sem perícia), como o resultado é exibido ao jogador com transparência total, e como o log é propagado em tempo real via WebSocket para todos os membros autorizados da campanha.

## 2. Escopo

### 2.1 Dentro do escopo

- Rolagens de **perícia** (Lutar, Atirar, Atletismo, etc.).
- Rolagens de **atributo** (Agilidade, Astúcia, Espírito, Força, Vigor).
- Rolagens de **dano** (expressão de dados livre, incluindo referência a atributos do personagem).
- **Dado Selvagem** para Cartas Selvagens (PJ + NPCs/Chefes marcados como WC).
- **Ases** (explosão de dados) em todas as rolagens de Característica e dano.
- **Falha Crítica** detectada e destacada.
- **Teste sem perícia** (d4−2) automático quando o personagem não possui a perícia.
- Aplicação automática de **penalidades por Ferimento** e **Fadiga**.
- Aplicação do bônus **+2 de Curinga** (via flag da ficha).
- **Modificador manual** digitado pelo jogador.
- **Log persistente** de rolagens com histórico, paginação e filtros.
- **Propagação em tempo real** via WebSocket com controle de visibilidade (público/privado).
- **Rolagens solo** (sem campanha vinculada).
- **Rolagens de NPC/Chefe** pelo mestre.
- Controle de visibilidade por rolagem (jogador sempre público; mestre escolhe, padrão privado).

### 2.2 Fora do escopo

- Aplicação de consequências de combate (dano vs. Resistência, Ferimentos, Soak) — **responsabilidade do mestre**.
- Iniciativa por cartas — **Spec 11**.
- Gerenciamento de Benes e Convicção — **Spec 03** (botões +/−).
- Rolagem automática de Soak — o jogador rola Vigor manualmente se quiser absorver.
- Rolagem automática de Medo — o jogador rola Espírito manualmente.
- Notação de dados avançada (vantagem/desvantagem, reroll automático, keep/drop).
- Rolagem de múltiplos ataques de uma vez (cada clique = uma rolagem).

## 3. Atores e Matriz de Permissões

### 3.1 Definições

- **Dono da ficha:** usuário com `character.userId`.
- **Mestre da campanha:** owner da campanha vinculada.
- **Membro:** jogador com membership ativa.
- **Admin:** superusuário.

### 3.2 Matriz

| Ação                                                              | Dono | Mestre (campanha) | Membro | Admin |
| ----------------------------------------------------------------- | ---- | ----------------- | ------ | ----- |
| Rolar perícia/atributo/dano da própria ficha                      | ✅   | ✅                | ✅     | ✅    |
| Rolar perícia/atributo/dano de ficha de membro (na campanha dele) | ❌   | ✅                | ❌     | ✅    |
| Rolar NPC/Chefe                                                   | ❌   | ✅                | ❌     | ✅    |
| Ver log público da campanha                                       | ✅   | ✅                | ✅     | ✅    |
| Ver log privado próprio                                           | ✅   | ✅                | ✅     | ✅    |
| Ver log privado do mestre                                         | ❌   | ✅                | ❌     | ✅    |
| Escolher visibilidade (public/private) na própria rolagem         | ✅   | ✅                | ❌     | ✅    |
| Filtrar log por personagem/NPC/tipo                               | ✅   | ✅                | ✅     | ✅    |
| Deletar rolagem                                                   | ❌   | ❌                | ❌     | ❌    |

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Roll`

#### 4.1.1 Agregado: `Roll` (raiz)

**Atributos:**

- `id`: UUID v4
- `campaignId`: UUID | null (null = rolagem solo)
- `actorId`: UUID (usuário que clicou)
- `sourceType`: enum (`character`, `npc`)
- `sourceId`: UUID (id do character ou npc)
- `sourceName`: string (nome no momento da rolagem — snapshot)
- `rollType`: enum (`skill`, `attribute`, `damage`)
- `label`: string (ex.: "Lutar", "Força", "Dano: @for+d8")
- `targetKey`: string | null (skillKey ou attributeKey; null para damage)
- `visibility`: enum (`public`, `private`)
- `isWildCard`: boolean
- `isUntrained`: boolean
- `isCuringa`: boolean
- `isCriticalFailure`: boolean
- `modifierBreakdown`: `ModifierBreakdown` (Value Object)
- `dicePool`: `DicePool` (Value Object — estrutura detalhada)
- `fixedModifier`: integer (para damage)
- `chosenDieId`: string | null (para skill/attribute: qual dado "ganhou" — characteristic ou wild)
- `subtotal`: integer (antes do modificador)
- `finalTotal`: integer (depois do modificador)
- `metadata`: JSONB (opcional: contexto extra do cliente, ex.: arma usada)
- `createdAt`

**Invariantes:**

1. `finalTotal = subtotal + modifierBreakdown.total`.
2. Para `rollType = 'damage'`, `isWildCard` **deve ser false** (dano não usa Dado Selvagem) e `chosenDieId = null`.
3. Para `rollType = 'damage'`, `modifierBreakdown.curingaBonus` pode ser +2 (Curinga afeta dano).
4. `isUntrained` só pode ser `true` quando `rollType = 'skill'`.
5. `isCriticalFailure = true` **apenas** quando `isWildCard = true` e tanto o dado de Característica quanto o Dado Selvagem rolaram 1 no primeiro lançamento (ou quando Extra rola 1 e a confirmação d6 = 1).
6. `visibility = 'private'` só pode ser escolhido pelo **mestre** ou **admin** (jogadores só podem criar rolagens públicas).
7. Rolagens são **imutáveis** após criação — não há update, não há delete físico.

**Métodos:**

- `isDamage(): boolean`
- `wasAce(): boolean` (true se algum dado explodiu)
- `summary(): string` (resumo textual para log — Humanizer aplicado)

**Domain Events:**

- `RollCreated`

#### 4.1.2 Value Objects

##### `ModifierBreakdown`

```typescript
{
  manual: number; // digitado pelo jogador
  woundPenalty: number; // ≤ 0, derivado de wounds
  fatiguePenalty: number; // ≤ 0, derivado de fatigue
  curingaBonus: number; // 0 ou +2
  untrainedPenalty: number; // 0 ou −2 (apenas em skill untrained)
  other: number; // reservado
  total: number; // soma de todos
}
```

##### `DicePool`

Array ordenado de `DieResult`:

```typescript
DieResult {
  id: string;              // "characteristic" | "wild" | "damage-0", "damage-1"...
  label: string;           // "Lutar (d10)", "Dado Selvagem (d6)", "Força (d8)"
  dieType: string;         // "d4", "d6", ..., "d12", "d12+1"
  initialRoll: number;     // primeiro lançamento (1..N)
  aces: number[];          // lançamentos subsequentes em decorrência de Ás
  total: number;           // initialRoll + soma(aces)
}
```

**Regras do `DicePool`:**

- Para `skill`/`attribute` com Wild Card: exatamente 2 entradas (`characteristic`, `wild`).
- Para `skill`/`attribute` Extra: exatamente 1 entrada (`characteristic`).
- Para `damage`: N entradas (uma por dado na expressão), sem `wild`.
- `total` de cada dado considera o Ás individual.
- `chosenDieId` aponta para o dado de maior `total` (ou `characteristic` em empate — regra do livro: o jogador escolhe, mas o sistema escolhe o maior por padrão).

##### `DieType`

```typescript
type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | `d12+${number}`;
```

`d12+N` é representado internamente como `d12 + N` fixo (o +N entra em `fixedModifier` ou em `modifierBreakdown.other`).

#### 4.1.3 Entidade: `DiceExpression` (parser)

**Atributos:**

- `raw`: string (ex.: `"@for+d8+2"`)
- `terms`: array de `{ kind: 'dice' | 'modifier' | 'attributeRef', value }`
- `resolved`: `{ dice: DieType[], fixedModifier: number }`

**Regras do parser (gramática):**

- `expression := term ('+' term)*`
- `term := dice | modifier | attributeRef`
- `dice := [count]? 'd' sides` onde `sides ∈ {4,6,8,10,12,20}`, `count ∈ {1..20}` (default 1)
- `modifier := ('+' | '-') integer`
- `attributeRef := '@' ('for'|'agi'|'ast'|'esp'|'vig')`

**Exemplos:**

- `"@for+d8"` → resolve para `{ dice: [d10, d8], fixed: 0 }` (se Força for d10)
- `"2d6"` → `{ dice: [d6, d6], fixed: 0 }`
- `"@for+d8+2"` → `{ dice: [d10, d8], fixed: 2 }`
- `"3d8-1"` → `{ dice: [d8, d8, d8], fixed: -1 }`

**Limites de segurança:**

- Máx 20 dados por expressão.
- Máx ±50 de modificador fixo.
- Máx 10 termos.

### 4.2 Repositórios

- `IRollRepository`: `create`, `findById`, `listByCampaign(paginated, filters)`, `listBySource`, `listByActor`

### 4.3 Serviços de domínio

- **`DiceRoller`** (interface): `roll(dieType: DieType): DieRollResult` onde `DieRollResult = { initialRoll, aces[], total }`.
  - Implementação real usa `crypto.randomInt` (CSPRNG).
  - Implementação de teste usa seed determinística (injeção de dependência).
- **`DiceExpressionParser`**: valida e resolve `DiceExpression`.
- **`ModifierCalculator`**: calcula `ModifierBreakdown` a partir do estado do personagem, tipo de rolagem, input do jogador e Curinga.
- **`CriticalFailureDetector`**: identifica Falha Crítica com base no `DicePool` e no tipo de personagem (WC vs. Extra).
- **`RollComposer`**: orquestra a criação do agregado `Roll` (aplica modificadores, compõe resultado).

### 4.4 Casos de uso (application layer)

| Caso de uso                     | Ator                | Descrição                    |
| ------------------------------- | ------------------- | ---------------------------- |
| `RollCharacterSkillUseCase`     | Dono/Mestre/Admin   | Rola perícia de personagem.  |
| `RollCharacterAttributeUseCase` | Dono/Mestre/Admin   | Rola atributo de personagem. |
| `RollCharacterDamageUseCase`    | Dono/Mestre/Admin   | Rola dano de personagem.     |
| `RollNpcSkillUseCase`           | Mestre/Admin        | Rola perícia de NPC/Chefe.   |
| `RollNpcAttributeUseCase`       | Mestre/Admin        | Rola atributo de NPC/Chefe.  |
| `RollNpcDamageUseCase`          | Mestre/Admin        | Rola dano de NPC/Chefe.      |
| `ListRollsUseCase`              | Membro/Mestre/Admin | Lista o log com filtros.     |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Rolar perícia de personagem

**Entrada do cliente:**

```json
POST /characters/:id/rolls
{
  "campaignId": "uuid|null",
  "rollType": "skill",
  "targetKey": "lutar",
  "manualModifier": 0,
  "visibility": "public"
}
```

**Passos no servidor:**

1. **Autorização:** verifica dono/mestre/admin.
2. **Carregamento:** carrega `Character` com atributos, perícias, raça, `wounds`, `fatigue`, `curingaActive`.
3. **Determinação do dado:**
   - Busca a perícia no personagem.
   - **Se existe:** `die = dieType(skill.currentRank)`.
   - **Se não existe:** `die = 'd4'`, `isUntrained = true`, `untrainedPenalty = -2`.
4. **Determinação de Wild Card:** PJs são **sempre** WC (`isWildCard = true`).
5. **Cálculo do `ModifierBreakdown`:**
   - `manual = input.manualModifier`.
   - `woundPenalty = -(min(wounds, 3))` (regra: máx −3).
   - `fatiguePenalty = -fatigue` (Fatigado = 1, Exausto = 2, máx −2 nesta etapa; Incapacitado não rola).
   - `curingaBonus = character.curingaActive ? +2 : 0`.
   - `untrainedPenalty = -2` (se aplicável) **ou** 0.
   - `total = soma`.
6. **Execução dos dados** via `DiceRoller`:
   - Rola o dado de Característica (com Ases).
   - Rola o Dado Selvagem (d6, com Ases).
7. **Detecção de Falha Crítica:**
   - WC: `characteristic.initialRoll === 1 && wild.initialRoll === 1`.
8. **Escolha do dado:**
   - `chosen = max(characteristic.total, wild.total)`.
   - Empate → escolhe `characteristic`.
   - **Exceção:** se Falha Crítica, `chosenDieId = 'characteristic'` e `finalTotal = subtotal + modifierBreakdown.total` (o total é o resultado da soma, mesmo que negativa).
9. **Cálculo final:**
   - `subtotal = chosenDie.total`.
   - `finalTotal = subtotal + modifierBreakdown.total`.
10. **Composição do `DicePool`** com as 2 entradas.
11. **Persistência** do `Roll`.
12. **Broadcast WebSocket** (ver §6.5).
13. **Resposta:** roll completo.

### 5.2 Fluxo: Rolar atributo

Idêntico ao §5.1, mas:

- `rollType = 'attribute'`, `targetKey ∈ { agilidade, astucia, espirito, forca, vigor }`.
- `isUntrained = false` (atributos são inerentes; todo personagem tem d4 mínimo).
- `untrainedPenalty = 0`.

### 5.3 Fluxo: Rolar dano

**Entrada do cliente:**

```json
POST /characters/:id/rolls
{
  "campaignId": "uuid|null",
  "rollType": "damage",
  "expression": "@for+d8+2",
  "manualModifier": 0,
  "visibility": "public"
}
```

**Passos no servidor:**

1. **Autorização.**
2. **Carregamento do personagem.**
3. **Parse da expressão** via `DiceExpressionParser`:
   - Resolve `@for` para `dieType(forca.currentRank)`.
   - Valida limites (máx 20 dados, máx ±50 fixo).
4. **Determinação de Wild Card:** **`isWildCard = false`** (dano não rola Wild Die — pág. 108).
5. **Cálculo do `ModifierBreakdown`:**
   - `manual = input.manualModifier`.
   - `woundPenalty = 0` (Ferimentos não afetam dano diretamente — afetam ataques, mas não o dano rolado).
   - `fatiguePenalty = 0`.
   - `curingaBonus = character.curingaActive ? +2 : 0`.
   - `total = soma`.
6. **Execução dos dados:** rola cada dado da expressão (com Ases).
7. **Fixed modifier:** soma `expression.fixedModifier` ao `modifierBreakdown.total` (via `other`).
8. **Cálculo final:**
   - `subtotal = soma de todos os dados`.
   - `finalTotal = subtotal + modifierBreakdown.total`.
9. **Persistência.**
10. **Broadcast WebSocket.**
11. **Resposta.**

### 5.4 Fluxo: Rolar perícia de NPC

Idêntico ao §5.1, mas:

- `sourceType = 'npc'`, `sourceId = npc.id`.
- `isWildCard = npc.isWildCard` (definido pelo mestre na Spec 05).
- `isUntrained`: depende se o NPC tem a perícia.
- Se NPC é Extra: `isWildCard = false` → sem Wild Die → **Falha Crítica via teste de confirmação**:
  - Rola d6 de confirmação após 1 no dado de Característica.
  - Se confirmação = 1 → Falha Crítica. Se ≠ 1 → apenas falha.
- Mestre escolhe `visibility` (padrão: `private`).

### 5.5 Fluxo: Rolagem solo (sem campanha)

- `campaignId = null`.
- A rolagem é persistida e visível **apenas ao ator**.
- Sem broadcast WebSocket.
- Log solo acessível via `GET /me/rolls`.

### 5.6 Fluxo: Rolar dano de NPC

Idêntico ao §5.3, mas `sourceType = 'npc'`.

## 6. Contratos de API

Base URL: `/api/v1`. Autenticação obrigatória.

### 6.1 Personagens

#### `POST /characters/:id/rolls`

**Body:**

```json
{
  "campaignId": "uuid|null",
  "rollType": "skill|attribute|damage",
  "targetKey": "string|null",
  "expression": "string|null",
  "manualModifier": 0,
  "visibility": "public|private"
}
```

**Regras de body por tipo:**

- `skill`/`attribute`: `targetKey` obrigatório, `expression` proibido.
- `damage`: `expression` obrigatório, `targetKey` proibido.

**Resposta 201:**

```json
{
  "roll": {
    "id": "uuid",
    "createdAt": "2026-11-11T00:00:00Z",
    "campaignId": "uuid|null",
    "actorId": "uuid",
    "actorName": "Emília",
    "sourceType": "character",
    "sourceId": "uuid",
    "sourceName": "Red",
    "rollType": "skill",
    "label": "Lutar",
    "targetKey": "lutar",
    "visibility": "public",
    "isWildCard": true,
    "isUntrained": false,
    "isCuringa": false,
    "isCriticalFailure": false,
    "modifierBreakdown": {
      "manual": 0,
      "woundPenalty": -1,
      "fatiguePenalty": 0,
      "curingaBonus": 0,
      "untrainedPenalty": 0,
      "other": 0,
      "total": -1
    },
    "dicePool": [
      {
        "id": "characteristic",
        "label": "Lutar (d10)",
        "dieType": "d10",
        "initialRoll": 10,
        "aces": [3],
        "total": 13
      },
      {
        "id": "wild",
        "label": "Dado Selvagem (d6)",
        "dieType": "d6",
        "initialRoll": 4,
        "aces": [],
        "total": 4
      }
    ],
    "chosenDieId": "characteristic",
    "subtotal": 13,
    "finalTotal": 12
  }
}
```

**Erros:**

- `400 INVALID_ROLL_TYPE`
- `400 INVALID_TARGET` (skill/attribute inexistente)
- `400 INVALID_EXPRESSION` (damage mal formado) com `details.errors[]`
- `400 DAMAGE_EXPRESSION_TOO_LARGE` (mais de 20 dados)
- `403 FORBIDDEN` (tentativa de rolar ficha alheia sem permissão)
- `403 PRIVATE_ROLL_FORBIDDEN` (jogador tentando criar rolagem privada)
- `404 CHARACTER_NOT_FOUND`

#### `GET /characters/:id/rolls`

**Query:** `?page=1&perPage=20&rollType=&from=&to=`
**Resposta 200:** `{ data: [...], meta: {...} }` (só rolagens que o ator tem permissão para ver).

### 6.2 NPCs

#### `POST /npcs/:id/rolls`

**Body:** mesmo esquema do §6.1.
**Resposta 201:** mesmo esquema, com `sourceType = 'npc'`.
**Erros:** análogos + `403 NOT_THE_CAMPAIGN_OWNER`.

#### `GET /npcs/:id/rolls`

Idêntico a `GET /characters/:id/rolls`.

### 6.3 Log da campanha

#### `GET /campaigns/:id/rolls`

**Query:** `?page=1&perPage=20&visibility=all|public|private&rollType=&sourceType=&sourceId=&from=&to=`
**Autorização:**

- **Membro:** só vê `public` + próprias `private` (não vê `private` do mestre).
- **Mestre da campanha:** vê tudo.
- **Admin:** vê tudo.
  **Resposta 200:** `{ data: [...], meta: {...} }`.

#### `GET /me/rolls`

**Query:** `?page=1&perPage=20`
**Resposta 200:** todas as rolagens do ator (incluindo solo).

### 6.4 Recursos auxiliares

#### `POST /dice-expressions/validate`

**Body:** `{ "expression": "@for+d8+2", "characterId": "uuid" }`
**Resposta 200:** `{ "valid": true, "resolved": { "dice": ["d10","d8"], "fixedModifier": 2 } }` ou `{ "valid": false, "errors": [...] }`
**Uso:** validação no frontend antes de enviar a rolagem (feedback imediato).

### 6.5 WebSocket

**Biblioteca:** Socket.IO (recomendação — ver §17.2).

**Namespace:** `/realtime`.

**Autenticação:** JWT de acesso no handshake (`auth.token`).

**Rooms por usuário:**

- Todo usuário autenticado entra em `user:${userId}`.
- Membros de uma campanha entram em `campaign:${campaignId}:public`.
- Mestre da campanha e admins entram em `campaign:${campaignId}:master`.

**Entrada em rooms:** via evento `join:campaign` (payload `{ campaignId }`) — servidor valida autorização e confirma com `joined:campaign`.

**Eventos emitidos pelo servidor:**

| Evento         | Room                    | Payload                              |
| -------------- | ----------------------- | ------------------------------------ |
| `roll:created` | `campaign:${id}:public` | objeto `Roll` (public)               |
| `roll:created` | `campaign:${id}:master` | objeto `Roll` (private)              |
| `roll:created` | `user:${actorId}`       | objeto `Roll` (sempre, para o autor) |

**Eventos emitidos pelo cliente:**

| Evento           | Payload          |
| ---------------- | ---------------- |
| `join:campaign`  | `{ campaignId }` |
| `leave:campaign` | `{ campaignId }` |

**Reconexão:** cliente reconecta automaticamente (Socket.IO) e reentra nas rooms via `join:campaign`. Servidor mantém histórico recente em buffer de 50 eventos por room para replay em caso de reconexão (`?since=lastEventId`).

**Rollback:** se o WebSocket falhar, o frontend faz polling em `GET /campaigns/:id/rolls?since=...` para recuperar eventos perdidos.

## 7. Regras de Negócio

**RN-ROLL-01** — Toda rolagem de PJ é Carta Selvagem (`isWildCard = true`).
**RN-ROLL-02** — Rolagem de dano **nunca** usa Dado Selvagem (`isWildCard = false`).
**RN-ROLL-03** — Ases aplicam a qualquer dado, em qualquer rolagem de Característica ou dano (pág. 102).
**RN-ROLL-04** — Falha Crítica em Carta Selvagem = 1 no dado de Característica **e** 1 no Dado Selvagem, ambos no **primeiro lançamento**.
**RN-ROLL-05** — Falha Crítica em Extra = 1 no dado de Característica **e** 1 no d6 de confirmação (rolado apenas quando ocorre o 1 inicial).
**RN-ROLL-06** — Penalidade por Ferimento: −1 por Ferimento, máximo −3 (pág. 110).
**RN-ROLL-07** — Penalidade por Fadiga: −1 (Fatigado) ou −2 (Exausto) (pág. 122).
**RN-ROLL-08** — Bônus de Curinga: +2 em **todas** as rolagens de Característica **e** dano (pág. 106).
**RN-ROLL-09** — Teste sem perícia: d4−2 (penalidade após Ases), com Wild Die se WC (pág. 103).
**RN-ROLL-10** — Escolha do dado em skill/attribute: maior total entre característico e selvagem; empate → característico.
**RN-ROLL-11** — Falha Crítica força `chosenDieId = 'characteristic'` (o Wild Die não "salva" a falha).
**RN-ROLL-12** — Expressões de dano não podem exceder **20 dados** nem **±50 de modificador fixo**.
**RN-ROLL-13** — Referências `@for`, `@agi`, `@ast`, `@esp`, `@vig` resolvem para o rank atual do personagem na hora da rolagem.
**RN-ROLL-14** — Modificador manual é somado ao `modifierBreakdown.total` e pode ser positivo ou negativo.
**RN-ROLL-15** — Jogadores **não podem** criar rolagens privadas; apenas o mestre/admin pode.
**RN-ROLL-16** — Rolagens são **imutáveis** (sem update, sem delete físico, sem edit).
**RN-ROLL-17** — Rolagem solo (`campaignId = null`) não é propagada via WebSocket.
**RN-ROLL-18** — Rolagem solo é visível apenas ao autor.
**RN-ROLL-19** — No broadcast WebSocket, rolagens `private` só vão para `campaign:${id}:master` + `user:${actorId}`.
**RN-ROLL-20** — RNG usa **CSPRNG** (`crypto.randomInt`), nunca `Math.random`.
**RN-ROLL-21** — Todo `Roll` deve ser persistido antes do broadcast (consistência).
**RN-ROLL-22** — O `Roll` é um snapshot: se a ficha mudar depois, a rolagem antiga permanece com os valores daquele momento.
**RN-ROLL-23** — Rolagens de ficha arquivada não são permitidas; rolagens antigas continuam acessíveis.
**RN-ROLL-24** — Um ataque (Lutar/Atirar) e seu dano são **rolagens separadas** (o jogador clica duas vezes).
**RN-ROLL-25** — Rerrolagens (gastando Bene) são rolagens independentes — o sistema não liga as duas; o log mostra ambas.

## 8. Segurança

- **Autorização:** guard `RollAccessGuard` verifica dono/mestre/admin.
- **RNG:** CSPRNG obrigatório; teste com RNG injetado.
- **Rate limit:** **30 rolagens por minuto por usuário** (evita spam acidental). Erro `429 TOO_MANY_ROLLS`.
- **WebSocket:** handshake autenticado por JWT; rooms verificadas no `join:campaign`.
- **Payload size:** máximo 4 KB por evento de rolagem.
- **Sanitização:** `sourceName` é renderizado como texto puro.
- **Logs:** nunca logar payloads completos de rolagem em produção; apenas IDs e totais.
- **CSRF:** mesmas diretrizes da Spec 01 (POST de rolagem exige verificação de Origin).
- **Enumeração:** `GET /campaigns/:id/rolls` retorna 403 se o ator não for membro.

## 9. UX

### 9.1 Jornadas

- **Jogador:** abre ficha → clica em "Lutar (d10)" → sistema rola e mostra animação → log atualiza em tempo real → vê resultado na ficha e no log da campanha.
- **Jogador (dano):** clica em "Rolar dano" → digita `@for+d8` → confirma → vê resultado.
- **Mestre:** abre campanha → aba "Rolagens" → vê log em tempo real → escolhe visibilidade de suas rolagens (toggle padrão `private`).
- **Mestre (NPC):** abre NPC → clica em "Atacar (Lutar d8)" → rola em nome do NPC.

### 9.2 Telas necessárias

- **Ficha do personagem** (Spec 03) — grid de atributos e perícias clicáveis, botão "Rolar Dano".
- **Modal de rolagem de dano** — campo de expressão + validação em tempo real + preview de dados resolvidos.
- **Log de rolagens** — timeline com:
  - Cabeçalho: ator, personagem, tipo, timestamp.
  - Corpo: breakdown dos dados (com Ases destacados), modificadores aplicados, total.
  - Falha Crítica: badge vermelho pulsante.
  - Curinga: badge dourado.
  - Filtros: por personagem, tipo, visibilidade.
- **Painel lateral** (na ficha): últimas rolagens do personagem (5 mais recentes), atualizadas em tempo real.

### 9.3 Estados visuais

- **Loading:** spinner no botão "Rolar", skeleton no log em recarregamento.
- **Animação:** resultado aparece com efeito de "dado girando" (~500ms), depois revela.
- **Empty:** "Nenhuma rolagem ainda. Clique em uma perícia na ficha para começar."
- **Error:** toast para erro de rede; inline para erro de expressão.
- **Critical failure:** fundo vermelho suave + ícone de caveira + texto em vermelho.
- **Ace:** dado que explodiu recebe badge dourado "+Ás".
- **Wild Die:** borda azul ou ícone "🐉" ao lado do dado.

### 9.4 Microcopy (via Humanizer)

- "Rolar Lutar"
- "Rolar dano"
- "Dado Selvagem"
- "Ás! Rolando novamente…"
- "Falha Crítica!"
- "Modificador manual (ex.: +2 para Mirar)"
- "Expressão de dano (ex.: @for+d8, 2d6, 3d8-1)"
- "Dano rolado — aplique a Resistência do alvo manualmente."
- "Esta rolagem ficou privada. Apenas você e o mestre a verão."
- "Log de rolagens da campanha"
- "Filtrar por personagem…"

## 10. Design System

Componentes novos:

- `<DiceRollButton>` — botão com label, dado, e ícone.
- `<DiceRollResult>` — card de resultado com breakdown visual.
- `<DieChip>` — chip pequeno representando um dado com valor.
- `<AceBadge>` — badge dourado "+Ás".
- `<CriticalFailureBadge>` — badge vermelho com ícone.
- `<WildDieIndicator>` — ícone ao lado do dado selvagem.
- `<ModifierBreakdown>` — tabela compacta de modificadores.
- `<RollTimeline>` — lista cronológica de rolagens.
- `<RollTimelineItem>` — item individual com todos os dados.
- `<DamageRollModal>` — modal com expressão e preview.
- `<RollFilters>` — filtros compactos do log.
- `<VisibilityToggle>` — toggle público/privado (apenas para mestre).
- `<CharacterQuickRollPanel>` — painel lateral com últimas rolagens.

Todos os componentes devem suportar tema claro/escuro e estados de erro/sucesso.

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `rolls`

```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
campaign_id           UUID NULL REFERENCES campaigns(id),
actor_id              UUID NOT NULL REFERENCES users(id),
source_type           VARCHAR(16) NOT NULL CHECK (source_type IN ('character','npc')),
source_id             UUID NOT NULL,
source_name           VARCHAR(60) NOT NULL,
roll_type             VARCHAR(16) NOT NULL CHECK (roll_type IN ('skill','attribute','damage')),
label                 VARCHAR(80) NOT NULL,
target_key            VARCHAR(32) NULL,
visibility            VARCHAR(16) NOT NULL CHECK (visibility IN ('public','private')),
is_wild_card          BOOLEAN NOT NULL,
is_untrained          BOOLEAN NOT NULL DEFAULT false,
is_curinga            BOOLEAN NOT NULL DEFAULT false,
is_critical_failure   BOOLEAN NOT NULL DEFAULT false,
modifier_breakdown    JSONB NOT NULL,
dice_pool             JSONB NOT NULL,
fixed_modifier        INTEGER NOT NULL DEFAULT 0,
chosen_die_id         VARCHAR(32) NULL,
subtotal              INTEGER NOT NULL,
final_total           INTEGER NOT NULL,
metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**

- `INDEX (campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL`
- `INDEX (actor_id, created_at DESC)`
- `INDEX (source_type, source_id, created_at DESC)`
- `INDEX (campaign_id, visibility, created_at DESC) WHERE campaign_id IS NOT NULL`

**Sem soft delete.** Rolagens são imutáveis e permanentes.

### 11.2 Sem tabela auxiliar

`dicePool` e `modifierBreakdown` são JSONB, não tabelas. Isso é intencional: rolagens são consultadas como aggregate completo, não como registros relacionais.

### 11.3 Eventos WebSocket

Não persistem. O buffer de replay (`?since=lastEventId`) vive em memória do servidor (ring buffer de 50 eventos por room). Após reinício, o cliente recarrega o log via REST.

## 12. i18n

Namespace `rolls.*`. Chaves principais:

```
rolls.button.roll
rolls.button.roll_damage
rolls.button.roll_untrained
rolls.button.rolling
rolls.button.result

rolls.modal.damage.title
rolls.modal.damage.expression
rolls.modal.damage.expression_hint
rolls.modal.damage.manual_modifier
rolls.modal.damage.manual_modifier_hint
rolls.modal.damage.preview
rolls.modal.damage.submit

rolls.log.title
rolls.log.empty
rolls.log.empty_cta
rolls.log.filter.all
rolls.log.filter.by_character
rolls.log.filter.by_type
rolls.log.filter.by_visibility

rolls.result.total
rolls.result.subtotal
rolls.result.modifier_breakdown
rolls.result.ace
rolls.result.critical_failure
rolls.result.wild_die
rolls.result.untrained
rolls.result.curinga

rolls.modifier.wound
rolls.modifier.fatigue
rolls.modifier.untrained
rolls.modifier.manual
rolls.modifier.curinga

rolls.visibility.public
rolls.visibility.private
rolls.visibility.private_notice

rolls.error.invalid_expression
rolls.error.too_many_dice
rolls.error.too_many_terms
rolls.error.invalid_die_type
rolls.error.unknown_attribute
rolls.error.private_forbidden
rolls.error.rate_limited
rolls.error.character_archived
rolls.error.forbidden

rolls.type.skill
rolls.type.attribute
rolls.type.damage
```

Todos os textos passam pela skill **Humanizer** antes de virarem `pt-BR.json`.

## 13. Seed

Não aplicável. Rolagens são conteúdo gerado pelo usuário.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `DieType` converte rank (int) ↔ die type e vice-versa.
- `DiceExpressionParser`:
  - Parse `"2d6"` → `{ dice: [d6, d6], fixed: 0 }`.
  - Parse `"@for+d8"` com Força d10 → `{ dice: [d10, d8], fixed: 0 }`.
  - Parse `"@for+d8+2"` → fixed = 2.
  - Rejeita `"21d6"` com `TOO_MANY_DICE`.
  - Rejeita `"2x6"` com `INVALID_EXPRESSION`.
  - Rejeita `"@xxx"` com `UNKNOWN_ATTRIBUTE`.
  - Rejeita `"+"` vazio.
- `DiceRoller` (com RNG seedado):
  - Rola d6 e retorna 4.
  - Rola d6 e retorna 6, depois 3 → `{ initialRoll: 6, aces: [3], total: 9 }`.
  - Rola d6 e retorna 6, depois 6, depois 2 → `{ initialRoll: 6, aces: [6, 2], total: 14 }`.
- `CriticalFailureDetector`:
  - WC: característico 1 + wild 1 → `true`.
  - WC: característico 1 + wild 4 → `false`.
  - Extra: característico 1 + d6=1 → `true`.
  - Extra: característico 1 + d6=3 → `false`.
- `ModifierCalculator`:
  - Wounds 2 → woundPenalty = −2.
  - Wounds 5 → woundPenalty = −3 (cap).
  - Fatigue 2 → fatiguePenalty = −2.
  - Untrained → untrainedPenalty = −2.
  - Curinga ativo → +2.
  - Manual +3 → total soma tudo.
- `RollComposer`:
  - Skill roll WC com curinga, wounds 1: total = chosen + (−1) + 2.
  - Damage roll WC: `isWildCard = false`, sem wild die.

### 14.2 Integration tests (application + infra)

- `RollCharacterSkillUseCase` cria `Roll` no banco com todos os campos corretos.
- `RollCharacterSkillUseCase` com perícia inexistente → `isUntrained = true`.
- `RollCharacterAttributeUseCase` nunca é untrained.
- `RollCharacterDamageUseCase` de `"2d6"` retorna pool com 2 dados.
- `RollCharacterDamageUseCase` de `"@for+d8"` resolve Força corretamente.
- `RollCharacterDamageUseCase` com curinga ativo aplica +2.
- `RollNpcSkillUseCase` com NPC Extra não rola Wild Die.
- `RollNpcSkillUseCase` com NPC Extra e característico 1 confirma falha crítica via d6.
- Rolagem em ficha arquivada é bloqueada.
- Mestre rola ficha de membro com sucesso.
- Jogador tenta rolar ficha de outro → 403.
- Log filtra corretamente por visibilidade (membro não vê private alheias).
- WebSocket emite `roll:created` para room correta.
- WebSocket emite rolagem privada **apenas** para `campaign:${id}:master` e `user:${actorId}`.
- Rate limit bloqueia após 30 rolagens em 1 min.

### 14.3 E2E tests (HTTP + WebSocket)

- Fluxo completo: jogador clica em "Lutar" → rolagem é criada → resposta 201 → WebSocket emite para o mestre e outros membros → log mostra.
- Fluxo de falha crítica: forçar 1+1 via RNG injetado → resposta contém `isCriticalFailure = true`.
- Fluxo de dano: expressão `@for+d8+2` com Força d10 → pool correto.
- Fluxo de erro: expressão inválida → 400 com `details`.
- Fluxo de reconnect: cliente desconecta, reconecta e recupera eventos recentes.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 95% (crítico para regras do SWADE).
- **Infra/HTTP:** ≥ 85%.
- **WebSocket:** ≥ 80%.

## 15. Conventional Commits esperados

```
chore(roll): bootstrap roll bounded context structure
feat(roll): add DieType and DicePool value objects
feat(roll): add ModifierBreakdown value object
feat(roll): implement DiceExpressionParser with full grammar
feat(roll): implement DiceRoller with crypto RNG abstraction
feat(roll): implement CriticalFailureDetector
feat(roll): implement ModifierCalculator
feat(roll): implement RollComposer orchestrator
feat(roll): add Roll aggregate and repository
feat(roll): implement RollCharacterSkillUseCase
feat(roll): implement RollCharacterAttributeUseCase
feat(roll): implement RollCharacterDamageUseCase
feat(roll): implement RollNpcSkillUseCase with Extra critical failure
feat(roll): implement RollNpcAttributeUseCase
feat(roll): implement RollNpcDamageUseCase
feat(roll): implement ListRollsUseCase with visibility filters
feat(roll): add HTTP controllers and RollAccessGuard
feat(roll): add dice expression validation endpoint
feat(roll): add rate limit
feat(realtime): bootstrap WebSocket module with Socket.IO
feat(realtime): add JWT handshake authentication
feat(realtime): add campaign rooms with visibility split
feat(realtime): add roll broadcast and replay buffer
feat(web): add dice roll button and result component
feat(web): add damage roll modal with live validation
feat(web): add roll timeline and filters
feat(web): add real-time subscription in campaign and character sheets
test(roll): add unit tests for dice roller with deterministic RNG
test(roll): add integration tests for modifier application
test(roll): add e2e tests for full roll flow with WebSocket
docs(roll): document dice expression grammar and critical failure rules
```

## 16. Critérios de Aceite

- [ ] Rolar perícia treinada aplica Wild Die, penalidades por Ferimento/Fadiga, e Curinga corretamente.
- [ ] Rolar perícia não treinada aplica `d4−2` (após Ases) e marca `isUntrained`.
- [ ] Rolar atributo nunca marca `isUntrained`.
- [ ] Rolar dano **nunca** usa Wild Die, mas aplica Ases e Curinga.
- [ ] Expressão de dano suporta `@for`, `@agi`, `@ast`, `@esp`, `@vig`, `NdX` e modificadores fixos.
- [ ] Parse rejeita expressões inválidas com `details.errors[]`.
- [ ] Áses são exibidos no log com badge, e o total soma corretamente.
- [ ] Falha Crítica (1+1) é detectada e destacada em vermelho.
- [ ] Extra com 1 no dado rola d6 de confirmação; se 1, marca Falha Crítica.
- [ ] Log é propagado em tempo real via WebSocket para todos os membros autorizados.
- [ ] Rolagem privada do mestre **não** aparece para jogadores.
- [ ] Jogador tenta criar rolagem privada → 403.
- [ ] Rolagem solo (`campaignId = null`) não é propagada via WebSocket.
- [ ] Todo `Roll` é imutável (sem update, sem delete).
- [ ] RNG usa `crypto.randomInt`.
- [ ] Rolar ficha arquivada → bloqueado.
- [ ] Rate limit bloqueia após 30 rolagens em 1 min.
- [ ] WebSocket reentra em rooms após reconexão.
- [ ] Replay de eventos recentes funciona via `?since=lastEventId`.
- [ ] Cobertura mínima da seção 14.4 atingida.
- [ ] Todas as strings de UI passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Rolagem gera **snapshot** — valores do personagem no momento da rolagem ficam gravados no `Roll`.
- Dano **não** usa Wild Die; Curinga **afeta** dano.
- Teste sem perícia aplica `d4−2` após Ases (conforme regra do livro).
- Falha Crítica força `chosenDieId = 'characteristic'` (Wild Die não "salva").
- Empate entre característico e wild → escolhe característico.
- Modificador manual é sempre permitido (com validação de range ±50).
- Expressões de dano usam notação `@atributo` + `NdX` + `±N`.
- Log é imutável.
- RNG: `crypto.randomInt`.
- Rate limit: 30 rolagens/min por usuário.
- WebSocket: Socket.IO com rooms por usuário e por campanha (split public/master).
- Rolagens solo não são propagadas.
- Mestre escolhe visibilidade na hora da rolagem (padrão `private`).
- Sem endpoint de reroll automático (Bene gasto manualmente).

### 17.2 Pendências para o autor aprovar

- **Biblioteca WebSocket:** Socket.IO (maturidade, rooms, reconexão automática) vs. `ws` nativo (leveza) vs. SSE (simples, one-way). **Recomendação:** Socket.IO. **Aguardando aprovação.**
- **Rolagem solo:** o autor quer permitir? **Recomendação:** sim, mas sem propagação. **Aguardando confirmação.**
- **Buffers de replay WebSocket:** 50 eventos por room em memória. Após restart, cliente recarrega via REST. **Recomendação:** aceitar perda de buffer no restart. **Aguardando confirmação.**
- **Retenção do log:** manter para sempre (até arquivamento da campanha) vs. paginação/expurgo após N meses. **Recomendação:** manter para sempre (dados são pequenos). **Aguardando confirmação.**
- **Aplicação de modificadores situacionais pré-configurados** (ex.: botão "+2 Mirar", "−2 Distância"): o autor pediu apenas campo manual. **Recomendação:** manter manual no MVP, com botões rápidos como evolução. **Aguardando confirmação.**
- **Rolagem combinada de ataque + dano** (botão único "Atacar com espada"): o autor confirmou que ataque e dano são separados. **Recomendação:** manter separados, com atalho visual "Rolar dano" ao lado do resultado do ataque. **Aguardando confirmação.**
- **Retenção de rolagens ao desvincular personagem de campanha:** se o jogador sai da campanha, as rolagens antigas dele permanecem no log (histórico). **Recomendação:** sim, permanecem (são parte do histórico da campanha). **Aguardando confirmação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
