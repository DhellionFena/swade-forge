# Spec 03 — Fichas de Personagem

## 1. Objetivo

Definir o bounded context de **Character** do Forja Selvagem: como fichas de personagem são criadas dinamicamente com validação das regras do SWADE, como raças, atributos, perícias, complicações, vantagens e progressão interagem, como as características derivadas são calculadas automaticamente, e como fichas se vinculam a campanhas sem perderem sua natureza global.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação de fichas com formulário dinâmico (etapas guiadas).
- Validação de limites: 5 pts de atributo, 12 pts de perícia, 4 pts de complicação, máx d12/d12+1.
- Aplicação automática de bônus raciais (atributos, perícias, vantagens).
- Cálculo automático de **Aparar**, **Resistência**, **Movimentação**, **Tamanho**.
- Seleção de raças, complicações e vantagens a partir de catálogo global.
- Validação de requisitos de Vantagens (Estágio, atributos, perícias, outras Vantagens).
- Progressão (Novato → Experiente → Veterano → Heroico → Lendário) com validação retroativa.
- Edição pós-criação com **log de alterações**.
- Contadores de **Ferimentos**, **Fadiga**, **Benes**, **Convicção** com botões +/−.
- Flag **"Curinga ativo"** para aplicar +2 nas rolagens da rodada.
- Seções de texto livre: **Poderes**, **Equipamento**, **Dinheiro**, **Histórico**.
- Vínculo entre ficha e campanha (N:N), arquivável.
- Ficha global do usuário (não pertence a campanha).
- Soft delete universal.

### 2.2 Fora do escopo

- Cálculo e aplicação de rolagens (Spec 04).
- Combate (aplicação de dano, Ferimentos, Soak).
- Automação de Benes por Curinga (manual).
- Benes por "Sorte" (manual).
- Exportação/importação de ficha.
- GMPC (owner da campanha como jogador) — fora do MVP (pendência herdada da Spec 02).
- Catálogo de Poderes como entidade estruturada — apenas listagem de referência; seleção fica em texto livre.
- Antecedentes Arcanos como entidade estruturada na ficha — apenas informativo.

## 3. Atores e Matriz de Permissões

### 3.1 Definições

- **Dono da ficha:** usuário que criou o personagem (`character.userId`).
- **Mestre da campanha:** owner da campanha vinculada (Spec 02).
- **Membro:** jogador membro da campanha vinculada.
- **Admin:** superusuário.

### 3.2 Matriz

| Ação                          | Dono                      | Mestre (campanha vinculada) | Outro membro | Admin |
| ----------------------------- | ------------------------- | --------------------------- | ------------ | ----- |
| Criar ficha própria           | ✅                        | ✅                          | ✅           | ✅    |
| Ver ficha própria (completa)  | ✅                        | ✅                          | ❌           | ✅    |
| Ver ficha de membro (resumo)  | ✅ (se for o dono)        | ✅                          | ✅           | ✅    |
| Editar ficha própria          | ✅                        | ✅                          | ❌           | ✅    |
| Editar ficha alheia           | ❌                        | ✅                          | ❌           | ✅    |
| Arquivar ficha própria        | ✅                        | ❌                          | ❌           | ✅    |
| Vincular ficha a campanha     | ✅ (com membership ativa) | ✅                          | ✅           | ✅    |
| Desvincular ficha de campanha | ✅                        | ✅ (da própria campanha)    | ❌           | ✅    |
| Ver log de alterações         | ✅                        | ✅                          | ❌           | ✅    |

> **Regra-chave:** o mestre só pode ver/editar fichas de personagens **vinculados a campanhas que ele possui**. Fora desse escopo, não vê.

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Character`

#### 4.1.1 Agregado: `Character` (raiz)

**Atributos:**

- `id`: UUID v4
- `userId`: UUID (dono)
- `name`: string (2–60 caracteres)
- `concept`: string (0–500 caracteres, texto livre)
- `raceId`: UUID | null (referencia `races.id`)
- `rank`: enum (`novato`, `experiente`, `veterano`, `heroico`, `lendario`)
- `advancesCount`: integer (0–∞; número de Progressos aplicados)
- `status`: `'active' | 'archived'`
- `wounds`: integer (0–3+; runtime)
- `fatigue`: integer (0–3; runtime)
- `benes`: integer (padrão 3; runtime)
- `conviction`: integer (padrão 0; runtime)
- `curingaActive`: boolean (padrão false; runtime, resetado a cada rodada)
- `powerNotes`: text (livre)
- `equipmentNotes`: text (livre)
- `moneyNotes`: text (livre)
- `backgroundNotes`: text (livre)
- `createdAt`, `updatedAt`, `deletedAt`

**Invariantes:**

1. `name` não pode ser vazio nem exceder 60 caracteres.
2. `raceId`, quando presente, deve referenciar uma raça ativa.
3. `rank` deve estar coerente com `advancesCount` (novato: 0–3, experiente: 4–7, veterano: 8–11, heroico: 12–15, lendário: 16+).
4. `wounds ≥ 0`, `fatigue ∈ [0,3]`, `benes ≥ 0`, `conviction ≥ 0`.
5. Nenhuma ficha pode ficar **inválida** persistida — o sistema bloqueia save se as regras não fecharem.
6. Arquivamento é lógico.

**Métodos:**

- `setRace(raceId)`
- `setRank(rank)` — com validação de coerência com `advancesCount`
- `incrementWounds()`, `decrementWounds()`
- `incrementFatigue()`, `decrementFatigue()`
- `incrementBenes()`, `decrementBenes()`
- `incrementConviction()`, `decrementConviction()`
- `toggleCuringa()`, `resetCuringa()`
- `archive()`
- `reactivate()`

**Domain Events:**

- `CharacterCreated`
- `CharacterUpdated`
- `CharacterRankChanged`
- `CharacterArchived`
- `CharacterLinkedToCampaign`
- `CharacterUnlinkedFromCampaign`

#### 4.1.2 Entidade: `CharacterAttribute`

Cada ficha tem exatamente 5 entradas (Agilidade, Astúcia, Espírito, Força, Vigor).

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `key`: enum (`agilidade`, `astucia`, `espirito`, `forca`, `vigor`)
- `baseRank`: integer (1 = d4; até 5 = d12; 6+ = d12+N)
- `raceRankBonus`: integer (0 ou mais; definido pela raça)
- `advanceRankBonus`: integer (0 ou mais; definido por Progressos)

**Regras:**

- `currentRank = baseRank + raceRankBonus + advanceRankBonus`
- `maxRank` = 5, **exceto** se a raça conceder esse atributo com valor inicial ≥ d6 → `maxRank = 6+` (d12+1, d12+2…)
- Ao criar: `baseRank = 1` (d4) para todos; `raceRankBonus` aplicado após seleção de raça; `advanceRankBonus = 0`.

**Métodos:**

- `increase()`, `decrease()` (com validação de cap)
- `currentDieType()` (retorna a string "d4", "d6", "d12+1" etc.)
- `currentRank()`

#### 4.1.3 Entidade: `CharacterSkill`

Cada ficha tem uma entrada por perícia possuída.

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `skillId`: UUID (referencia `skills.id`)
- `baseRank`: integer (0 = não possui; 1 = d4; até 5 = d12; 6+ = d12+N)
- `raceRankBonus`: integer (0 ou mais)
- `advanceRankBonus`: integer (0 ou mais)

**Regras:**

- Perícias Básicas começam com `baseRank = 1` gratuitamente (pág. 10).
- Perícias Não-Básicas começam com `baseRank = 0` (não possuídas).
- Custo de compra em criação:
  - 1 ponto por rank **se** `currentRank ≤ attributeRank`
  - 2 pontos por rank **se** `currentRank > attributeRank`
- Max: 5 (d12) **exceto** se a raça conceder essa perícia com valor inicial ≥ d6 → `maxRank = 6+`.

#### 4.1.4 Entidade: `CharacterComplication`

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `complicationId`: UUID (referencia `complications.id`)
- `note`: text | null (detalhamento livre)

**Regras:**

- Total de pontos de complicação ≤ 4.
- Complicações Maiores valem 2, Menores valem 1.
- Não pode ter duas instâncias da mesma complicação a menos que o catálogo permita (a maioria não permite).

#### 4.1.5 Entidade: `CharacterAdvantage`

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `advantageId`: UUID (referencia `advantages.id`)
- `acquiredAt`: enum (`creation`, `advance`)
- `note`: text | null

**Regras:**

- Cada Vantagem só pode ser adquirida uma vez, a menos que o catálogo permita múltiplas.
- Requisitos validados no momento da adição (Estágio, atributos, perícias, outras Vantagens).

#### 4.1.6 Entidade: `CharacterAdvance` (log de Progressos)

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `index`: integer (1, 2, 3…; ordem cronológica)
- `type`: enum (`attribute_increase`, `skill_increase_single`, `skill_increase_double`, `new_advantage`, `remove_complication`, `reduce_complication`)
- `payload`: JSONB (detalhes: qual atributo, qual skill, qual vantagem)
- `createdAt`

**Regras:**

- A soma de `CharacterAdvance` deve ser igual a `advancesCount`.
- Nenhum Progresso pode violar caps.

#### 4.1.7 Entidade: `CharacterChangeLog`

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `actorId`: UUID
- `changeType`: enum (`created`, `race_changed`, `attribute_changed`, `skill_changed`, `complication_added`, `complication_removed`, `advantage_added`, `advantage_removed`, `rank_changed`, `advance_applied`, `advance_removed`, `field_changed`, `archived`, `reactivated`)
- `fieldName`: string | null (para `field_changed`)
- `oldValue`: JSONB | null
- `newValue`: JSONB | null
- `metadata`: JSONB (opcional)
- `createdAt`

> **Nota:** o log é imutável (append-only). Edição de ficha gera uma entrada por mudança.

#### 4.1.8 Entidade: `CharacterCampaignLink`

Vínculo N:N entre ficha e campanha (referenciado pela Spec 02).

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID
- `campaignId`: UUID
- `linkedAt`: Date
- `unlinkedAt`: Date | null (soft delete)
- `createdAt`, `updatedAt`

**Regras:**

- Um par (character, campaign) só pode ter **um** link ativo.
- Ao desvincular (sair da campanha ou remover membro — Spec 02), `unlinkedAt = now()`.
- O dono da ficha deve ser membro ativo (ou owner) da campanha no momento do vínculo.

### 4.2 Value Objects

| VO              | Regra                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `CharacterName` | Trim, 2–60 caracteres.                                                                                          |
| `DieType`       | Encapsula "d4", "d6", …, "d12", "d12+1". Converte para int rank e vice-versa.                                   |
| `Rank`          | Enum fechado. Define budgets: Novato (0–3), Experiente (4–7), Veterano (8–11), Heroico (12–15), Lendário (16+). |

### 4.3 Repositórios

- `ICharacterRepository`: `findById`, `findByUser`, `listByUser`, `listActive`, `save`
- `ICharacterAttributeRepository`, `ICharacterSkillRepository`, `ICharacterComplicationRepository`, `ICharacterAdvantageRepository`, `ICharacterAdvanceRepository`, `ICharacterChangeLogRepository`, `ICharacterCampaignLinkRepository`
- `IRaceRepository`, `ISkillRepository`, `IComplicationRepository`, `IAdvantageRepository` — **catálogos globais** (lidos, não escritos aqui; escritos pelo Admin via spec separada — ver §13).

### 4.4 Serviços de domínio

- **`CharacterBuilder`**: orquestra validação e persistência da ficha durante a criação.
- **`CharacterValidator`**: valida se a ficha atende a todas as regras (orçamentos, caps, requisitos).
- **`DerivedStatsCalculator`**: calcula Aparar, Resistência, Movimentação, Tamanho.
- **`RankCalculator`**: mapeia `advancesCount` → `rank`.

### 4.5 Casos de uso (application layer)

| Caso de uso                          | Ator              | Descrição                                                     |
| ------------------------------------ | ----------------- | ------------------------------------------------------------- |
| `CreateCharacterDraftUseCase`        | Dono              | Cria ficha em estado "rascunho" (não persistida até validar). |
| `ValidateCharacterUseCase`           | Dono              | Valida todos os orçamentos e retorna lista de erros.          |
| `SaveCharacterUseCase`               | Dono              | Persiste ficha validada.                                      |
| `GetCharacterUseCase`                | Dono/Mestre/Admin | Retorna ficha completa ou resumo conforme papel.              |
| `ListCharactersUseCase`              | Dono              | Lista fichas próprias.                                        |
| `UpdateCharacterUseCase`             | Dono/Mestre       | Edita campos e registra log.                                  |
| `SetRankUseCase`                     | Dono              | Altera `advancesCount`/`rank`, valida tudo retroativamente.   |
| `ApplyAdvanceUseCase`                | Dono              | Adiciona um Progresso da lista permitida.                     |
| `RemoveAdvanceUseCase`               | Dono              | Remove um Progresso.                                          |
| `ManageRuntimeCountersUseCase`       | Dono/Mestre       | Ajusta wounds/fatigue/benes/conviction/curinga.               |
| `ArchiveCharacterUseCase`            | Dono              | Arquiva ficha.                                                |
| `LinkCharacterToCampaignUseCase`     | Dono              | Cria vínculo.                                                 |
| `UnlinkCharacterFromCampaignUseCase` | Dono/Mestre       | Arquiva vínculo.                                              |
| `ListCharacterChangeLogUseCase`      | Dono/Mestre/Admin | Lista log.                                                    |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Criar ficha (formulário dinâmico)

A criação é **guiada em etapas**, mas o usuário pode voltar a etapas anteriores a qualquer momento. O sistema mantém um rascunho em memória (ou em estado persistido) e só salva quando todos os orçamentos fecham.

**Etapas:**

1. **Conceito** — `name`, `concept`.
2. **Raça** — selecionar raça do catálogo (ou "sem raça" / humano padrão implícito). Ao selecionar:
   - Atributos com bônus racial ficam pré-definidos (ex.: Anão → Vigor d6, cap d12+1).
   - Perícias com bônus racial ficam pré-definidas (ex.: Celestiais → Fé d6, cap d12+1).
   - Vantagens raciais são anotadas automaticamente (ex.: Adaptável dos Humanos → "escolha 1 Vantagem Novato grátis").
3. **Atributos** — distribuir **5 pontos** entre os 5 atributos, respeitando cap.
4. **Perícias** — distribuir **12 pontos** entre as perícias, com custo 1 ou 2 por rank.
5. **Complicações** — escolher até **4 pontos**.
6. **Gastar pontos de complicação** — cada 2 pts → +1 atributo **ou** 1 Vantagem; cada 1 pt → +1 ponto de perícia **ou** dobrar dinheiro inicial (anotado em `moneyNotes`).
7. **Vantagens** — escolher do catálogo. Requisitos validados.
8. **Notas livres** — Poderes, Equipamento, Dinheiro, Histórico.
9. **Revisão e validação** — sistema exibe sumário com orçamentos restantes. Só permite "Salvar" se todos fecharem.

**Validação de cada etapa:** o botão "Próximo" só avança se a etapa estiver válida. Mensagens de erro explicam **por que** algo está inválido (exigência do autor — Humanizer).

### 5.2 Fluxo: Validação completa

O sistema valida, em ordem:

1. **Raça** selecionada existe e está ativa.
2. **Atributos:**
   - 5 valores, todos ≥ d4.
   - Soma de pontos gastos ≤ 5 (base) + pontos extras de complicação alocados em atributos.
   - Cada atributo ≤ cap (d12 ou d12+1+).
3. **Perícias:**
   - Soma de pontos gastos ≤ 12 + pontos extras de complicação alocados em perícias.
   - Cada perícia ≤ cap associado.
   - Perícias Básicas têm rank ≥ 1 (não podem ser "desaprendidas").
4. **Complicações:**
   - Total de pontos ≤ 4.
   - Cada instância respeita a regra do catálogo (única ou múltipla).
5. **Vantagens:**
   - Cada uma atende a todos os requisitos (Estágio, atributos, perícias, outras Vantagens).
   - Cada uma foi comprada com pontos válidos (complicação, avanço ou racial).
6. **Progressão:**
   - `advancesCount` coerente com `rank`.
   - Cada `CharacterAdvance` é válido para o estágio em que foi aplicado.
   - Nenhuma Vantagem adquirida por avanço viola o Estágio daquele momento.

**Em caso de erro:** retorna `400 CHARACTER_INVALID` com `details.errors: [{ code, message, field, hint }]`. Cada `message` e `hint` passa por **Humanizer**.

### 5.3 Fluxo: Aplicar Progresso

1. Dono abre a ficha e clica "Aplicar Progresso".
2. Sistema exibe as opções disponíveis (algumas bloqueadas por limites do estágio):
   - Aumentar 1 atributo (+1 rank) — **uma vez por Estágio**.
   - Aumentar 2 perícias abaixo do atributo (+1 rank cada).
   - Aumentar 1 perícia igual/acima do atributo (+1 rank).
   - Adquirir 1 Vantagem (requisitos validados).
   - Remover 1 Complicação Menor **ou** reduzir 1 Complicação Maior para Menor.
3. Dono escolhe uma opção.
4. Sistema valida e adiciona `CharacterAdvance` com `index = advancesCount + 1`.
5. Atualiza `advancesCount` e recalcula `rank`.
6. Registra log.

> **Regra de Estágio para aumentos de atributo:** só pode haver **um** `CharacterAdvance` do tipo `attribute_increase` por Estágio. Estágios: Novato (0–3), Experiente (4–7), Veterano (8–11), Heroico (12–15), Lendário (16+). No Estágio Lendário, o livro permite aumentar atributo a cada 2 Progressos.

### 5.4 Fluxo: Alterar nível de progressão manualmente

O autor permitiu que o jogador altere o nível de progressão ao editar a ficha. Interpretação adotada:

1. Dono abre ficha → clica "Ajustar Progressão".
2. Sistema mostra slider de `advancesCount` (0 a N).
3. Dono escolhe novo `advancesCount` **menor ou igual** ao total já aplicado (não pode "aumentar de graça" — deve usar "Aplicar Progresso" para ganhar).
4. Sistema **valida toda a ficha** assumindo `advancesCount` no novo valor.
5. Se algum Progresso ficar "órfão" (ex.: Vantagem ficou acima do Estágio), o sistema **remove os Progressos excedentes** (do mais recente para o mais antigo) até a ficha ficar válida.
6. Registra log e recalcula `rank`.

> **Alternativa (mais conservadora):** se o autor preferir que o jogador **não** possa baixar `advancesCount` manualmente, o fluxo fica restrito a "Aplicar Progresso" apenas. **Pendência — confirmar** (ver §17.2).

### 5.5 Fluxo: Editar ficha após criação

1. Dono (ou Mestre, se a ficha estiver vinculada a campanha dele) abre ficha → edita.
2. Sistema valida toda a ficha com os mesmos passos do §5.2.
3. Se válido: persiste e registra entradas em `CharacterChangeLog` (uma por campo alterado, agrupadas por `transactionId` — a definir na implementação).
4. Se inválido: retorna erros, não persiste.

### 5.6 Fluxo: Vincular a campanha

1. Dono abre a ficha → "Vincular a campanha".
2. Sistema lista campanhas em que o dono é membro ativo (ou owner).
3. Dono escolhe.
4. Sistema cria `CharacterCampaignLink` com `linkedAt = now()`.
5. Registra log e emite `CharacterLinkedToCampaign`.

**Regras:**

- Só é possível vincular se o dono for **membro ativo** da campanha (ou owner — mas owner não pode ser membro no MVP, então exclui).
- **Pendência:** confirmar se mestre pode vincular a própria ficha a campanha alheia (improvável, mas registrar).

### 5.7 Fluxo: Desvincular de campanha

1. Dono abre a ficha → "Desvincular" ao lado da campanha.
2. Sistema valida que o dono é dono da ficha ou o mestre da campanha.
3. Define `unlinkedAt = now()`.
4. Registra log e emite `CharacterUnlinkedFromCampaign`.

**Automático (Spec 02):** quando o usuário sai da campanha ou é removido, todos os vínculos dele àquela campanha são arquivados automaticamente.

### 5.8 Fluxo: Contadores de combate (wounds, fatigue, benes, conviction, curinga)

1. Dono ou Mestre abre ficha → clica +/− nos contadores.
2. Sistema atualiza e persiste.
3. `curingaActive` só pode ser ativado pelo **mestre** ou **dono** (definir política — recomendação: **apenas mestre**, para evitar abuso). **Pendência — confirmar.**
4. Quando um novo round começa (Spec 11), `curingaActive = false` para todos os personagens da campanha.

### 5.9 Fluxo: Arquivar ficha

1. Dono clica "Arquivar".
2. Sistema confirma e arquiva (`status = 'archived'`, `deletedAt = now()`).
3. Todos os `CharacterCampaignLink` ativos recebem `unlinkedAt = now()`.
4. Ficha não aparece mais em listagens ativas.
5. Dono pode reativar em "Arquivadas".

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação.

### 6.1 Fichas

#### `POST /characters`

**Body:**

```json
{
  "name": "string",
  "concept": "string",
  "raceId": "uuid|null",
  "attributes": {
    "agilidade": 1,
    "astucia": 1,
    "espirito": 1,
    "forca": 1,
    "vigor": 1
  },
  "skills": [{ "skillId": "uuid", "rank": 1 }],
  "complications": [{ "complicationId": "uuid", "note": "string|null" }],
  "complicationSpending": {
    "attributeBoosts": {
      "agilidade": 0,
      "astucia": 0,
      "espirito": 0,
      "forca": 0,
      "vigor": 0
    },
    "skillPointBoosts": 0,
    "moneyDoubled": false,
    "advantages": ["uuid"]
  },
  "advantages": [{ "advantageId": "uuid", "note": "string|null" }],
  "powerNotes": "string",
  "equipmentNotes": "string",
  "moneyNotes": "string",
  "backgroundNotes": "string"
}
```

**Resposta 201:** ficha completa + `derivedStats` calculadas.
**Erros:** `400 CHARACTER_INVALID` com `details.errors[]`, `404 RACE_NOT_FOUND`, `403 FORBIDDEN`.

#### `GET /characters`

**Query:** `?status=active|archived&page&perPage&search=`
**Resposta 200:** `{ data: [...], meta: {...} }`.

#### `GET /characters/:id`

**Resposta 200:** ficha completa + `derivedStats`.
**Comportamento por papel:**

- Dono/Admin: completa.
- Mestre (com vínculo ativo em campanha dele): completa.
- Outro membro da campanha: **resumo** (`name`, `concept`, `race.name`, `derivedStats` básicas).
  **Erros:** `404 NOT_FOUND`, `403 FORBIDDEN`.

#### `PATCH /characters/:id`

**Body:** subconjunto do `POST`.
**Resposta 200:** ficha atualizada.
**Erros:** `400 CHARACTER_INVALID`, `403 FORBIDDEN`.

#### `DELETE /characters/:id`

**Resposta 204** (soft delete).

#### `POST /characters/:id/reactivate`

**Resposta 200.**

### 6.2 Progressão

#### `POST /characters/:id/advances`

**Body:**

```json
{
  "type": "attribute_increase|skill_increase_single|skill_increase_double|new_advantage|remove_complication|reduce_complication",
  "payload": {}
}
```

Exemplos de payload:

- `attribute_increase`: `{ "attribute": "forca" }`
- `skill_increase_single`: `{ "skillId": "uuid" }`
- `skill_increase_double`: `{ "skillIds": ["uuid", "uuid"] }`
- `new_advantage`: `{ "advantageId": "uuid" }`
- `remove_complication`: `{ "complicationId": "uuid" }`
- `reduce_complication`: `{ "complicationId": "uuid" }`

**Resposta 200:** ficha atualizada + `derivedStats`.
**Erros:** `400 INVALID_ADVANCE`, `409 STAGE_LIMIT_REACHED`.

#### `DELETE /characters/:id/advances/:advanceId`

Remove o Progresso mais recente (ou um específico, se ainda for válido). **Resposta 200.**
**Erros:** `409 ADVANCE_CANNOT_BE_REMOVED`.

#### `PATCH /characters/:id/rank`

**Body:** `{ "advancesCount": 5 }`
**Resposta 200:** ficha com `rank` recalculado.
**Erros:** `400 INVALID_RANK_TRANSITION`, `409 CHARACTER_INVALID` (se a remoção de progressos deixar a ficha inválida).

### 6.3 Contadores de runtime

#### `PATCH /characters/:id/runtime`

**Body:**

```json
{
  "wounds": 1,
  "fatigue": 0,
  "benes": 2,
  "conviction": 1,
  "curingaActive": true
}
```

Cada campo é opcional; apenas os enviados são atualizados.
**Resposta 200.**
**Erros:** `400 INVALID_STATE`, `403 FORBIDDEN` (se mestre de campanha alheia).

### 6.4 Vínculos

#### `POST /characters/:id/campaigns/:campaignId`

**Resposta 201** com o link.
**Erros:** `403 NOT_A_MEMBER`, `409 ALREADY_LINKED`, `404`.

#### `DELETE /characters/:id/campaigns/:campaignId`

**Resposta 204** (arquiva o link).

#### `GET /characters/:id/campaigns`

**Resposta 200:** campanhas vinculadas ativas.

### 6.5 Log

#### `GET /characters/:id/changelog`

**Query:** `?page&perPage`
**Resposta 200:** lista de `CharacterChangeLog`.
**Erros:** `403 FORBIDDEN`.

## 7. Regras de Negócio

**RN-CHAR-01** — Ficha é **global** e pertence a um usuário. Vínculo com campanha é N:N e arquivável.
**RN-CHAR-02** — Todo personagem de jogador é **Carta Selvagem** (Dado Selvagem, 3 Ferimentos). Sem exceção.
**RN-CHAR-03** — Atributos na criação: 5 pontos, começam em d4, máximo d12 (ou d12+1+ com bônus racial).
**RN-CHAR-04** — Perícias na criação: 12 pontos; Básicas começam em d4 grátis; custo 1 (≤ atributo) ou 2 (> atributo); máximo d12 (ou d12+1+ com bônus racial).
**RN-CHAR-05** — Complicações: até **4 pontos** (Maior=2, Menor=1).
**RN-CHAR-06** — Gastar pontos de complicação: 2 pts → +1 atributo **ou** 1 Vantagem; 1 pt → +1 ponto de perícia **ou** dobrar dinheiro inicial.
**RN-CHAR-07** — **Aparar** = 2 + metade do rank atual de Lutar (arred. baixo). Sem Lutar = 2.
**RN-CHAR-08** — **Resistência** = 2 + metade do rank atual de Vigor (arred. baixo) + Armadura. Sem campo de armadura no MVP → Resistência = 2 + ½ Vigor.
**RN-CHAR-09** — **Movimentação** = 6 (padrão), alterada por raça, vantagens ou complicações conforme catálogo.
**RN-CHAR-10** — **Tamanho** = 0 (padrão), alterado por raça, vantagens ou complicações conforme catálogo.
**RN-CHAR-11** — Bônus racial de **atributo** eleva tanto o valor inicial quanto o cap (ex.: Anão Vigor d6 → cap d12+1).
**RN-CHAR-12** — Bônus racial de **perícia** eleva tanto o valor inicial quanto o cap (ex.: Celestiais Fé d6 → cap d12+1).
**RN-CHAR-13** — Vantagens só podem ser adquiridas se **todos os requisitos** forem cumpridos no momento da aquisição.
**RN-CHAR-14** — Requisitos de Vantagem verificados: **Estágio**, **atributos**, **perícias**, **outras Vantagens**, **Complicações** (raras).
**RN-CHAR-15** — Progressos disponíveis dependem do Estágio:

- Novato (0–3 advances): progressão normal.
- Experiente (4–7): progressão normal.
- Veterano (8–11): progressão normal.
- Heroico (12–15): progressão normal.
- Lendário (16+): pode aumentar atributos a cada 2 Progressos.
  **RN-CHAR-16** — **Aumento de atributo** só pode ocorrer **uma vez por Estágio** (exceto Lendário, que permite a cada 2 Progressos).
  **RN-CHAR-17** — Remover Progresso deve ser feito **do mais recente para o mais antigo**, garantindo que a ficha continue válida.
  **RN-CHAR-18** — `advancesCount` pode ser **reduzido** pelo dono, mas o sistema valida toda a ficha após a redução.
  **RN-CHAR-19** — Todo `CharacterAdvance` gera entrada em `CharacterChangeLog`.
  **RN-CHAR-20** — Contadores de runtime (wounds, fatigue, benes, conviction, curinga) **não** afetam a validação da ficha.
  **RN-CHAR-21** — `curingaActive` só pode ser alterado pelo **mestre** da campanha vinculada (ou pelo **admin**). **Pendência** — confirmar.
  **RN-CHAR-22** — Ao arquivar ficha, todos os vínculos ativos são arquivados.
  **RN-CHAR-23** — Ao sair de campanha (Spec 02), todos os vínculos do usuário àquela campanha são arquivados.
  **RN-CHAR-24** — A ficha nunca expõe `userId` de outros usuários em listagens; apenas em `GET /characters/:id` para mestre/admin.
  **RN-CHAR-25** — Nenhuma operação sobre a ficha é física; sempre soft delete.
  **RN-CHAR-26** — Log de alterações é append-only e imutável.
  **RN-CHAR-27** — Erros de validação trazem `message` e `hint` explicando o porquê (Humanizer aplicado).

## 8. Segurança

- **Autorização:** guard `CharacterAccessGuard` verifica dono, mestre (com vínculo ativo em campanha dele) ou admin.
- **Log de alteração:** todas as operações de escrita geram entrada em `CharacterChangeLog` com `actorId`, `changeType`, `fieldName`, `oldValue`, `newValue`.
- **Sanitização:** campos de texto livre (`concept`, `powerNotes`, `equipmentNotes`, `moneyNotes`, `backgroundNotes`, `note` em complicações/vantagens) são renderizados como texto puro no MVP.
- **CSRF:** mesmas diretrizes da Spec 01.
- **Rate limit:** criação de ficha limitada a **10 por hora** por usuário (evita abuso acidental).
- **Validação server-side obrigatória:** o frontend nunca é fonte da verdade.

## 9. UX

### 9.1 Jornadas

- **Jogador:** dashboard → "Minhas fichas" → criar nova (formulário multi-etapa) → validar → salvar → vincular a campanha(s) → usar em jogo (rolagens, contadores).
- **Mestre:** campanha → aba "Fichas" → clicar em ficha de membro → ver/editar.

### 9.2 Telas necessárias

- **`/characters`** — lista de fichas próprias com busca, filtro (ativas/arquivadas), CTA "Nova ficha".
- **`/characters/new`** — formulário multi-etapa (9 etapas do §5.1), com barra de progresso, validação em tempo real, sumário lateral com orçamentos restantes.
- **`/characters/:id`** — ficha completa em abas:
  - **Resumo** (nome, raça, conceito, derivadas, contadores).
  - **Atributos & Perícias** (grid clicável para rolar — Spec 04).
  - **Complicações**.
  - **Vantagens**.
  - **Progressos** (lista de `CharacterAdvance` + botão "Aplicar Progresso").
  - **Notas** (Poderes, Equipamento, Dinheiro, Histórico).
  - **Campanhas** (vínculos ativos + botão "Vincular").
  - **Log** (change log).
- **`/characters/:id/edit`** — reutiliza o formulário multi-etapa.
- **`/campaigns/:id/characters`** (mestre) — lista de fichas vinculadas por membro.

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton.
- **Empty:** "Nenhuma ficha ainda" com CTA.
- **Error:** erros de validação inline com `message` + `hint`.
- **Success:** toast.
- **Validação:** barra de orçamento por etapa (atributos 3/5, perícias 8/12, complicações 2/4) com cor de alerta quando fora do limite.
- **Curinga ativo:** badge dourado pulsante no card da ficha.

### 9.4 Microcopy (via Humanizer)

- "Você usou 3 de 5 pontos de atributo."
- "A perícia Lutar não pode passar de d12 sem um bônus racial."
- "A Vantagem Focado exige Estágio Experiente. Você está no Novato."
- "Remover este Progresso vai desfazer o aumento de Força. A ficha precisa continuar válida — os Progressos mais recentes serão removidos primeiro, se necessário."
- "Ao arquivar esta ficha, os vínculos com campanhas serão desfeitos. Você pode reativar depois."

## 10. Design System (referência à Spec 07)

Componentes novos:

- `<CharacterWizard>` — container multi-etapa com barra de progresso e sumário lateral.
- `<BudgetBar>` — barra de orçamento (usado, total, cor).
- `<DieTypeSelect>` — seletor de dado (d4, d6, d8, d10, d12, d12+1).
- `<AttributeGrid>` — grid de 5 atributos com valor atual, cap e botão de ajuste.
- `<SkillList>` — lista de perícias com custo dinâmico (1 ou 2) e cap.
- `<ComplicationPicker>` — modal com busca e filtros (Menor/Maior).
- `<AdvantagePicker>` — modal com busca, filtros (categoria, estágio) e indicação de requisitos cumpridos/não cumpridos.
- `<RankBadge>` — badge colorido por rank (Novato cinza, Experiente azul, Veterano roxo, Heroico dourado, Lendário vermelho).
- `<RuntimeCounter>` — contador +/− com label e cor.
- `<CuringaToggle>` — botão com estado visual pulsante.
- `<DerivedStatCard>` — card com Aparar, Resistência, Movimento, Tamanho.
- `<CharacterSummaryCard>` — versão resumida para listagens e campanha.
- `<ChangeLogTimeline>` — timeline do log.

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `characters`

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id             UUID NOT NULL REFERENCES users(id),
name                VARCHAR(60) NOT NULL,
concept             TEXT NOT NULL DEFAULT '',
race_id             UUID NULL REFERENCES races(id),
rank                VARCHAR(16) NOT NULL DEFAULT 'novato'
                    CHECK (rank IN ('novato','experiente','veterano','heroico','lendario')),
advances_count      INTEGER NOT NULL DEFAULT 0,
status              VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
wounds              INTEGER NOT NULL DEFAULT 0,
fatigue             INTEGER NOT NULL DEFAULT 0,
benes               INTEGER NOT NULL DEFAULT 3,
conviction          INTEGER NOT NULL DEFAULT 0,
curinga_active      BOOLEAN NOT NULL DEFAULT false,
power_notes         TEXT NOT NULL DEFAULT '',
equipment_notes     TEXT NOT NULL DEFAULT '',
money_notes         TEXT NOT NULL DEFAULT '',
background_notes    TEXT NOT NULL DEFAULT '',
created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at          TIMESTAMPTZ NULL
```

**Índices:** `INDEX (user_id) WHERE deleted_at IS NULL`, `INDEX (status) WHERE deleted_at IS NULL`.

### 11.2 Tabela `character_attributes`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
key                VARCHAR(16) NOT NULL CHECK (key IN ('agilidade','astucia','espirito','forca','vigor')),
base_rank          INTEGER NOT NULL DEFAULT 1,
race_rank_bonus    INTEGER NOT NULL DEFAULT 0,
advance_rank_bonus INTEGER NOT NULL DEFAULT 0,
UNIQUE (character_id, key)
```

### 11.3 Tabela `character_skills`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
skill_id           UUID NOT NULL REFERENCES skills(id),
base_rank          INTEGER NOT NULL DEFAULT 0,
race_rank_bonus    INTEGER NOT NULL DEFAULT 0,
advance_rank_bonus INTEGER NOT NULL DEFAULT 0,
UNIQUE (character_id, skill_id)
```

### 11.4 Tabela `character_complications`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
complication_id    UUID NOT NULL REFERENCES complications(id),
note               TEXT NULL,
UNIQUE (character_id, complication_id)
```

(Unicidade global; catálogo pode permitir múltiplas — nesse caso, dropar o UNIQUE.)

### 11.5 Tabela `character_advantages`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
advantage_id       UUID NOT NULL REFERENCES advantages(id),
acquired_at        VARCHAR(16) NOT NULL CHECK (acquired_at IN ('creation','advance')),
note               TEXT NULL
```

### 11.6 Tabela `character_advances`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
advance_index      INTEGER NOT NULL,
type               VARCHAR(32) NOT NULL,
payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE (character_id, advance_index)
```

### 11.7 Tabela `character_change_log`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id),
actor_id           UUID NOT NULL REFERENCES users(id),
change_type        VARCHAR(32) NOT NULL,
field_name         VARCHAR(64) NULL,
old_value          JSONB NULL,
new_value          JSONB NULL,
metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:** `INDEX (character_id, created_at DESC)`.

### 11.8 Tabela `character_campaign_links`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
campaign_id        UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
linked_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
unlinked_at        TIMESTAMPTZ NULL
```

**Índice:** `UNIQUE (character_id, campaign_id) WHERE unlinked_at IS NULL`.

## 12. i18n

Namespace `characters.*`. Chaves principais (lista não exaustiva):

```
characters.list.title
characters.list.search.placeholder
characters.list.empty
characters.list.empty.cta
characters.list.filter.active
characters.list.filter.archived
characters.list.create_cta

characters.wizard.step.concept
characters.wizard.step.race
characters.wizard.step.attributes
characters.wizard.step.skills
characters.wizard.step.complications
characters.wizard.step.complication_spending
characters.wizard.step.advantages
characters.wizard.step.notes
characters.wizard.step.review
characters.wizard.next
characters.wizard.previous
characters.wizard.save
characters.wizard.budget.attributes
characters.wizard.budget.skills
characters.wizard.budget.complications
characters.wizard.error.cap_exceeded
characters.wizard.error.budget_exceeded
characters.wizard.error.requirement_not_met
characters.wizard.error.race_required

characters.detail.tabs.summary
characters.detail.tabs.attributes_skills
characters.detail.tabs.complications
characters.detail.tabs.advantages
characters.detail.tabs.advances
characters.detail.tabs.notes
characters.detail.tabs.campaigns
characters.detail.tabs.changelog

characters.detail.derived.aparar
characters.detail.derived.resistencia
characters.detail.derived.movimentacao
characters.detail.derived.tamanho
characters.detail.runtime.wounds
characters.detail.runtime.fatigue
characters.detail.runtime.benes
characters.detail.runtime.conviction
characters.detail.runtime.curinga

characters.advance.apply
characters.advance.type.attribute
characters.advance.type.skill_single
characters.advance.type.skill_double
characters.advance.type.advantage
characters.advance.type.remove_complication
characters.advance.type.reduce_complication
characters.advance.error.stage_limit
characters.advance.error.invalid_target

characters.rank.novato
characters.rank.experiente
characters.rank.veterano
characters.rank.heroico
characters.rank.lendario

characters.link.add
characters.link.remove
characters.link.empty
characters.link.error.not_a_member
characters.link.error.already_linked

characters.archive.confirm
characters.archive.success
characters.archive.warning
characters.reactivate.success

characters.error.name_required
characters.error.invalid_state
characters.error.forbidden
```

Todos os textos passam pela skill **Humanizer** antes de virarem o arquivo `pt-BR.json`.

## 13. Seed (catálogos globais)

A seed de **conteúdo de referência** deve popular:

### 13.1 `attributes` — 5 entradas

`agilidade`, `astucia`, `espirito`, `forca`, `vigor`.

### 13.2 `skills` — 28 entradas (todas do livro)

Cada entrada com `key`, `name`, `attribute` (associação), `is_basic` (boolean).

### 13.3 `races` — 12 entradas

Anões, Androide, Aquariano, Aviano, Elfos, Meio-Elfos, Humanos, Pequeninos, Rakashanos, Sáurios, Celestiais, Guardiões.

Cada raça com **`racial_traits: JSONB`** contendo:

- `attribute_bonuses`: `{ "vigor": { "initialRank": 2, "capRank": 6 } }` (exemplo Anão)
- `skill_bonuses`: `{ "skillId": { "initialRank": 2, "capRank": 6 } }`
- `advantage_grants`: `[{ "advantageId": "uuid", "note": "Vantagem Novato grátis" }]`
- `special_abilities`: array de objetos `{ name, description }` (habilidades raciais textuais, sem efeito mecânico automatizado no MVP)
- `complications_imposed`: array de `complicationId` (complicações obrigatórias da raça)

### 13.4 `complications` — todas do livro

Cada entrada com `name`, `description`, `level` (`minor`|`major`), `category`, `allows_multiple` (boolean).

### 13.5 `advantages` — todas do livro

Cada entrada com `name`, `description`, `category`, `stage` (`novato`|`experiente`|`veterano`|`heroico`|`lendario`), `requirements` (JSONB estruturado), `allows_multiple`.

**Requisitos em JSONB:**

```json
{
  "attributes": { "agilidade": 2 },
  "skills": [{ "skillId": "uuid", "minRank": 2 }],
  "advantages": ["uuid"],
  "complications": ["uuid"],
  "note": "texto livre se não estruturado"
}
```

### 13.6 `arcane_backgrounds` — 5 entradas

Ciência Estranha, Dom, Magia, Milagres, Psionicos. Cada uma com a Vantagem `Antecedente Arcano` associada.

### 13.7 `powers` — todas do Capítulo 5

Apenas **catálogo de referência**. Não é vinculado à ficha (ficha usa `power_notes` em texto livre).

### 13.8 `bestiary` — todas as criaturas do Capítulo 6

Para uso dos NPCs/Chefes (Spec 05).

**Idempotência:** a seed usa `ON CONFLICT DO NOTHING` ou verificação por `name`/`slug` para evitar duplicatas em reexecuções.

> **Nota:** os JSONB de `racial_traits` e `requirements` são a parte mais delicada da seed. A implementação deve ter testes verificando que cada raça/vantagem do livro está corretamente transcrita. Sugestão: um arquivo `seed/data/races.json`, `advantages.json`, etc., versionado no repositório.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `DieType` converte rank ↔ die type corretamente (1→d4, 5→d12, 6→d12+1, 7→d12+2…).
- `Rank` mapeia `advancesCount` para rank correto.
- `CharacterAttribute.increase` respeita cap.
- `CharacterSkill.increase` respeita cap.
- `DerivedStatsCalculator`:
  - Aparar = 2 + ½ Lutar.
  - Resistência = 2 + ½ Vigor.
  - Movimentação = 6 + bônus raciais.
  - Tamanho = 0 + bônus raciais.
- `CharacterValidator`:
  - Rejeita 6 pontos de atributo.
  - Rejeita perícia acima do cap.
  - Rejeita complicação de 5 pontos.
  - Rejeita Vantagem sem requisitos.
  - Rejeita avanço de atributo duas vezes no mesmo estágio.
- `CharacterAdvance` valida payload por tipo.

### 14.2 Integration tests (application + infra)

- `CreateCharacterDraftUseCase` retorna rascunho com erros.
- `SaveCharacterUseCase` persiste e gera log.
- `SaveCharacterUseCase` rejeita ficha inválida com `details.errors[]`.
- `ApplyAdvanceUseCase` respeita estágio.
- `ApplyAdvanceUseCase` atualiza `advancesCount` e recalcula `rank`.
- `RemoveAdvanceUseCase` remove o mais recente e valida ficha.
- `SetRankUseCase` rejeita transição que deixa ficha inválida.
- `UpdateCharacterUseCase` gera entradas de log por campo.
- `LinkCharacterToCampaignUseCase` bloqueia se não é membro.
- `ArchiveCharacterUseCase` arquiva vínculos ativos.
- Race bonuses são aplicados corretamente (Anão → Vigor d6, cap d12+1).
- Vantagem com requisito de Estágio é bloqueada para Novato.
- Ficha com complicação de 4 pts pode gastar 2 pts em atributo, 1 em perícia, 1 em dinheiro.

### 14.3 E2E tests (HTTP)

- Fluxo completo: criar ficha → aplicar 3 progressos → rank vira Experiente → aplicar vantagem Experiente → editar → log registra.
- Fluxo de vínculo: criar ficha → vincular a campanha → mestre vê → mestre edita → log registra.
- Fluxo de desvínculo: sair da campanha → link arquivado → ficha intacta.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 80%.

## 15. Conventional Commits esperados

```
chore(character): bootstrap character bounded context structure
feat(character): add Character aggregate and value objects (DieType, Rank)
feat(character): add CharacterAttribute and CharacterSkill entities
feat(character): add CharacterComplication and CharacterAdvantage entities
feat(character): add CharacterAdvance and CharacterChangeLog entities
feat(character): add CharacterCampaignLink entity
feat(character): implement DerivedStatsCalculator
feat(character): implement CharacterValidator with budget validation
feat(character): implement CreateCharacterDraftUseCase
feat(character): implement SaveCharacterUseCase with transaction log
feat(character): implement ApplyAdvanceUseCase with stage rules
feat(character): implement RemoveAdvanceUseCase
feat(character): implement SetRankUseCase
feat(character): implement UpdateCharacterUseCase with change log
feat(character): implement LinkCharacterToCampaignUseCase
feat(character): implement ArchiveCharacterUseCase
feat(character): add HTTP controllers and CharacterAccessGuard
feat(reference): add seed for attributes and skills
feat(reference): add seed for races with racial traits
feat(reference): add seed for complications and advantages
feat(reference): add seed for arcane backgrounds and powers
feat(web): add character wizard multi-step form
feat(web): add character detail page with tabs
feat(web): add runtime counters and curinga toggle
feat(web): add advance management UI
test(character): add unit tests for DerivedStatsCalculator
test(character): add integration tests for validation pipeline
test(character): add e2e tests for full character lifecycle
docs(character): document character rules and validation
```

## 16. Critérios de Aceite

- [ ] Jogador cria ficha com 5 etapas de validação e consegue salvar apenas quando tudo fecha.
- [ ] Raça altera atributos e perícias corretamente, incluindo caps.
- [ ] Atributos começam em d4, custam 1 ponto cada, respeitam cap d12 (ou d12+1+ com raça).
- [ ] Perícias Básicas começam em d4 grátis; custo 1 ou 2 por rank; respeitam cap.
- [ ] Complicações até 4 pontos; gasto em atributo/perícia/dinheiro/vantagem funciona.
- [ ] Vantagens respeitam todos os requisitos (Estágio, atributos, perícias, outras Vantagens).
- [ ] Aparar, Resistência, Movimentação e Tamanho são calculados automaticamente.
- [ ] Aplicar Progresso respeita limite de estágio (um aumento de atributo por estágio).
- [ ] Jogador pode alterar `advancesCount` e sistema valida toda a ficha.
- [ ] Edição pós-criação gera entradas em `CharacterChangeLog`.
- [ ] Contadores de wounds/fatigue/benes/conviction funcionam com +/−.
- [ ] `curingaActive` pode ser alternado por mestre/dono (política definida).
- [ ] Ficha é global; vincula-se a múltiplas campanhas.
- [ ] Sair da campanha arquiva vínculo, não deleta a ficha.
- [ ] Arquivar ficha arquiva todos os vínculos ativos.
- [ ] Nenhuma operação é física (soft delete universal).
- [ ] Erros de validação trazem `message` e `hint` explicativos (Humanizer).
- [ ] Cobertura mínima da seção 14.4 atingida.
- [ ] Seed popula 5 atributos, 28 perícias, 12 raças, todas as complicações, todas as vantagens, 5 antecedentes, todos os poderes, todo o bestiário.
- [ ] Todas as strings de UI passam por i18n.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Formulário multi-etapa com validação incremental e bloqueio de save.
- Ficha é global; vínculo N:N com campanhas; soft delete universal.
- Rank é derivado de `advancesCount` (0–3 Novato, 4–7 Experiente, 8–11 Veterano, 12–15 Heroico, 16+ Lendário).
- Atributos e perícias calculam "rank" internamente (1=d4, 5=d12, 6=d12+1) para validar cap e custo.
- Bônus racial eleva inicial **e** cap.
- Progressão limitada a **1 aumento de atributo por estágio** (exceto Lendário, que permite a cada 2 Progressos).
- Poderes, equipamento, dinheiro e histórico são **texto livre**.
- Antecedentes Arcanos são informativos; o catálogo de poderes é apenas referência.
- Contadores de combate (wounds, fatigue, benes, conviction, curinga) são **runtime** e não afetam validação.
- Log de alterações é append-only.
- Seed cobre todos os catálogos do livro.

### 17.2 Pendências para o autor aprovar antes da implementação

- **`curingaActive`:** quem pode alternar? **Recomendação:** apenas o mestre da campanha (para evitar abuso). Alternativa: dono e mestre. **Aguardando aprovação.**
- **GMPC (Game Master Player Character):** mestre da campanha pode ter personagem na própria campanha? **Recomendação:** fora do MVP (mantém RN-CAMP-04). **Aguardando aprovação.**
- **Baixar `advancesCount` manualmente:** o autor confirmou que o jogador pode alterar. O sistema deve **remover progressos órfãos automaticamente** ou **bloquear** a transição que deixar a ficha inválida? **Recomendação:** remover os mais recentes automaticamente (fluxo §5.4). **Aguardando aprovação.**
- **Vínculo pelo mestre:** mestre pode vincular **a própria ficha** a uma campanha de outro mestre? **Recomendação:** sim (se ele for membro ativo da campanha alheia, o vínculo funciona normalmente). **Aguardando confirmação.**
- **Descrição de raça:** o autor quer que cada raça tenha **história/narrativa** na seed (texto longo) ou só as habilidades mecânicas? **Recomendação:** incluir um campo `description` curto (2–3 parágrafos), mas o autor pode preferir manter apenas mecânica. **Aguardando aprovação.**
- **Cap para Estágio Lendário:** o livro permite `d12+2`, `d12+3` etc. com Vantagens Lendárias como "Profissional". O sistema deve aplicar o cap **dinâmico** dessas Vantagens ou tratar como cap fixo d12+1? **Recomendação:** aplicar dinamicamente, buscando o cap na Vantagem "Profissional" (d12+2) e "Especialista" (d12+3). **Aguardando aprovação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
