# Spec 05 — NPCs, Chefes e Inimigos

## 1. Objetivo

Definir o bounded context de **Npc** do Forja Selvagem: como o mestre cria, importa, organiza e rola **NPCs**, **Chefes** e **Inimigos** dentro de uma campanha, sempre privados. A ficha é resumida (atributos, perícias, ataques, habilidades especiais), mas totalmente rolável através do motor de dados da Spec 04. O bestiário do livro é pré-cadastrado como catálogo global, e cada entrada serve de template importável.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação manual de NPC, Chefe ou Inimigo em uma campanha.
- Importação de entrada do **bestiário** (catálogo global) como template.
- Ficha resumida: 5 atributos, perícias selecionadas, ataques, habilidades especiais, notas.
- Marcação **Carta Selvagem** vs. **Extra** (afeta Dado Selvagem, limite de Ferimentos e rolagem).
- Marcação **Resiliente** / **Muito Resiliente** (apenas para Extras).
- Derivação automática de **Aparar** e **Resistência**; sobrescrita manual opcional de **Movimentação** e **Tamanho**.
- Rolagens via Spec 04 (`POST /npcs/:id/rolls`).
- Contadores de runtime: **Ferimentos**, **Fadiga**, **Benes**, **Curinga**.
- Imagem/retrato do NPC.
- Arquivamento lógico (soft delete).
- **Acesso exclusivo do mestre** (inclusive admin, para moderação).
- **Painel rápido de combate** para rolar NPCs durante uma sessão.
- Seed do **bestiário** com todas as 37 criaturas do Capítulo 6.

### 2.2 Fora do escopo

- Compartilhamento de NPC entre campanhas (cada NPC pertence a **uma** campanha).
- Público visível para jogadores (tudo é privado do mestre no MVP).
- Ficha completa como Personagem (NPC não tem Progresso, raças, vantagens estruturadas, complicações estruturadas).
- Combate automatizado (aplicação de dano, iniciativa, ordem de turnos — Specs 04 e 11).
- Iniciativa por cartas para NPCs — **Spec 11**.
- Exportação/importação de NPC.
- Criação de entradas no bestiário pelo mestre (só Admin, e pode ser feita via painel administrativo — Spec 09).

## 3. Atores e Permissões

### 3.1 Definições

- **Mestre da campanha:** owner da campanha à qual o NPC pertence.
- **Admin:** superusuário com acesso total.

### 3.2 Matriz

| Ação                                                 | Mestre (owner) | Admin | Jogador |
| ---------------------------------------------------- | -------------- | ----- | ------- |
| Criar NPC na campanha                                | ✅             | ✅    | ❌      |
| Importar do bestiário                                | ✅             | ✅    | ❌      |
| Ver NPC                                              | ✅             | ✅    | ❌      |
| Editar NPC                                           | ✅             | ✅    | ❌      |
| Arquivar/reativar NPC                                | ✅             | ✅    | ❌      |
| Rolar perícia/atributo/dano                          | ✅             | ✅    | ❌      |
| Ver log de rolagens do NPC                           | ✅             | ✅    | ❌      |
| Ajustar contadores (wounds, fatigue, benes, curinga) | ✅             | ✅    | ❌      |

> **Regra:** o jogador **nunca** vê NPCs, chefes, inimigos ou suas rolagens no MVP — nem mesmo o log privado (que é exclusivo do mestre, conforme Spec 04 §3.2).

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Npc`

#### 4.1.1 Agregado: `Npc` (raiz)

**Atributos:**

- `id`: UUID v4
- `campaignId`: UUID (referencia `campaigns.id`; obrigatório)
- `ownerId`: UUID (referencia `users.id`; deve ser igual a `campaign.ownerId`)
- `type`: enum (`npc` | `enemy` | `boss`)
- `name`: string (2–80 caracteres)
- `concept`: string (0–300 caracteres; papel narrativo ou arquétipo)
- `description`: text (0–2000; notas narrativas)
- `imageUrl`: string | null (URL servida pelo endpoint autenticado — Spec 09)
- `isWildCard`: boolean
- `isResilient`: boolean (só válido se `isWildCard = false`)
- `isVeryResilient`: boolean (só válido se `isWildCard = false` e `isResilient = false`)
- `attributes`: JSONB (`{ agilidade, astucia, espirito, forca, vigor }` — cada um é um rank inteiro 1..N)
- `skills`: JSONB (`{ [skillKey]: rank }` — apenas as perícias possuídas)
- `attacks`: JSONB (array de `{ name, skillKey, damageExpression, note }`)
- `specialAbilities`: JSONB (array de `{ name, description }`)
- `armor`: integer (0–20; bônus de Resistência)
- `movementOverride`: integer | null
- `sizeOverride`: integer | null
- `wounds`: integer (0..max)
- `fatigue`: integer (0–3)
- `benes`: integer (padrão 2 se WC; 0 se Extra)
- `curingaActive`: boolean
- `sourceTemplateId`: UUID | null (referencia `bestiary_entries.id`, se importado)
- `status`: `'active' | 'archived'`
- `createdAt`, `updatedAt`, `deletedAt`

**Invariantes:**

1. `campaignId` deve referenciar uma campanha ativa.
2. `ownerId` deve ser igual a `campaign.ownerId`.
3. `isResilient` só é válido quando `isWildCard = false`.
4. `isVeryResilient` só é válido quando `isWildCard = false` **e** `isResilient = false`.
5. `attributes` deve ter exatamente 5 chaves válidas; cada valor entre 1 e 6+ (d4 a d12+2).
6. `skills` deve ter apenas chaves do catálogo global de perícias.
7. `wounds` ≤ limite de ferimentos calculado (ver RN-NPC-03).
8. `fatigue` ≤ 3.
9. Rolagem só é permitida se `status = 'active'`.
10. Arquivamento é lógico.

**Métodos:**

- `setAttributes(attrs)`
- `setSkills(skills)`
- `addAttack(attack)`, `removeAttack(name)`
- `addSpecialAbility(ability)`, `removeSpecialAbility(name)`
- `toggleWildCard()`
- `setResilience(isResilient, isVeryResilient)`
- `incrementWounds()`, `decrementWounds()`
- `incrementFatigue()`, `decrementFatigue()`
- `incrementBenes()`, `decrementBenes()`
- `toggleCuringa()`, `resetCuringa()`
- `archive()`
- `reactivate()`

**Domain Events:**

- `NpcCreated`
- `NpcUpdated`
- `NpcArchived`
- `NpcReactivated`
- `NpcImportedFromBestiary`

#### 4.1.2 Value Objects

| VO               | Regra                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `NpcName`        | Trim, 2–80 caracteres.                                                                           |
| `NpcType`        | Enum fechado (`npc` \| `enemy` \| `boss`).                                                       |
| `AttributeMap`   | JSONB com 5 chaves fixas, valores 1..N.                                                          |
| `SkillMap`       | JSONB com chaves do catálogo, valores 0..N.                                                      |
| `Attack`         | `{ name: string, skillKey: string, damageExpression: DiceExpression (Spec 04), note?: string }`. |
| `SpecialAbility` | `{ name: string (2–60), description: string (0–500) }`.                                          |

#### 4.1.3 Entidade: `BestiaryEntry` (catálogo global)

Template de criatura, populado por seed (Admin). Não pertence a nenhuma campanha.

**Atributos:**

- `id`: UUID v4
- `slug`: string único (ex.: `troll`, `dragao`, `vampiro-anciao`)
- `name`, `description`
- `isWildCard`, `isResilient`, `isVeryResilient`
- `attributes`, `skills`, `attacks`, `specialAbilities`, `armor`
- `movementOverride`, `sizeOverride`
- `suggestedType`: `enemy` | `boss` (padrão de criação para importação)
- `sourcePage`: string | null (ex.: `"pág. 227"` para rastreabilidade)
- `createdAt`, `updatedAt`, `deletedAt`

**Regras:**

- `slug` único entre entradas ativas.
- Um `Npc` importado guarda `sourceTemplateId` mas **não** mantém referência viva (snapshot completo no momento da importação).

#### 4.1.4 Entidade: `NpcChangeLog` (opcional — ver §17.2)

Append-only. Registra criação, edição de atributos/perícias/ataques/habilidades, mudança de `isWildCard`, mudança de resiliência, arquivamento/reativação.

- `id`, `npcId`, `actorId`, `changeType`, `fieldName`, `oldValue`, `newValue`, `createdAt`

### 4.2 Repositórios

- `INpcRepository`: `findById`, `listByCampaign(paginated, filters)`, `save`
- `IBestiaryRepository`: `findBySlug`, `listAll`, `save`
- `INpcChangeLogRepository`: `create`, `listByNpc`

### 4.3 Serviços de domínio

- **`NpcStatsCalculator`**: deriva Aparar, Resistência, Movimentação, Tamanho e limite de Ferimentos.
  - **Aparar** = 2 + metade de Lutar (arred. baixo); se não tiver Lutar → 2.
  - **Resistência** = 2 + metade de Vigor (arred. baixo) + `armor`.
  - **Movimentação** = `movementOverride` ?? 6.
  - **Tamanho** = `sizeOverride` ?? 0.
  - **Limite de Ferimentos**:
    - `isWildCard = true` → **3**.
    - `isVeryResilient = true` → **3**.
    - `isResilient = true` → **2**.
    - Extra comum → **1**.
- **`NpcImporter`**: copia campos de `BestiaryEntry` para `Npc`, aplicando padrões (`suggestedType`, `ownerId`, `campaignId`).
- **`NpcRollAdapter`**: monta o payload esperado pela Spec 04 (atributo/perícia/dano) a partir do NPC.

### 4.4 Casos de uso (application layer)

| Caso de uso                    | Ator         | Descrição                               |
| ------------------------------ | ------------ | --------------------------------------- |
| `CreateNpcUseCase`             | Mestre/Admin | Cria NPC manualmente.                   |
| `ImportNpcFromBestiaryUseCase` | Mestre/Admin | Importa de template.                    |
| `UpdateNpcUseCase`             | Mestre/Admin | Edita campos.                           |
| `ArchiveNpcUseCase`            | Mestre/Admin | Soft delete.                            |
| `ReactivateNpcUseCase`         | Mestre/Admin | Reverte soft delete.                    |
| `AdjustNpcRuntimeUseCase`      | Mestre/Admin | Ajusta wounds/fatigue/benes/curinga.    |
| `ListNpcsUseCase`              | Mestre/Admin | Lista com filtros (type, search).       |
| `GetNpcUseCase`                | Mestre/Admin | Retorna NPC completo + stats derivadas. |
| `ListBestiaryUseCase`          | Mestre/Admin | Lista entradas do bestiário.            |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Criar NPC manualmente

1. Mestre abre campanha → aba "Inimigos" → "Novo".
2. Preenche:
   - `type` (`npc` / `enemy` / `boss`).
   - `name`, `concept`, `description`.
   - `isWildCard` (default: `true` para `boss`, `false` para `npc` e `enemy`).
   - Se Extra, `isResilient` / `isVeryResilient`.
   - 5 atributos (d4 a d12+).
   - Perícias (checkbox list do catálogo + rank).
   - Ataques (nome + skillKey + expressão de dano).
   - Habilidades especiais (nome + descrição).
   - Armadura, Movimentação/Tamanho (opcionais — sobrescrevem default).
   - Imagem (upload).
3. Validação:
   - Nome, atributos completos, expressões de dano válidas (usando o parser da Spec 04).
   - Se `isVeryResilient = true`, `isResilient` deve ser `false`.
4. Persiste e emite `NpcCreated`.

### 5.2 Fluxo: Importar do bestiário

1. Mestre abre aba "Inimigos" → "Importar do bestiário".
2. Sistema exibe lista de `BestiaryEntry` com busca.
3. Mestre escolhe uma entrada (ex.: "Troll") e clica "Importar".
4. `NpcImporter` copia **todos** os campos, aplicando:
   - `campaignId` = campanha atual.
   - `ownerId` = mestre.
   - `type` = `suggestedType` da entrada.
   - `name` = nome da entrada (editável depois).
   - `sourceTemplateId` = `bestiary.id`.
   - `wounds`, `benes`, `fatigue`, `curingaActive` = estados iniciais.
5. Emite `NpcImportedFromBestiary`.
6. Mestre pode editar livremente — o NPC é independente do template a partir daqui.

### 5.3 Fluxo: Editar NPC

1. Mestre abre NPC → edita campos.
2. Validação (mesma do §5.1).
3. Persiste, emite `NpcUpdated`, grava `NpcChangeLog` (se habilitado).
4. Se a mudança afeta stats derivadas (atributos, armadura), recalcula automaticamente.

### 5.4 Fluxo: Rolar perícia/atributo/dano do NPC

Usa a **mesma API** da Spec 04: `POST /npcs/:id/rolls`.

1. Mestre clica na perícia/atributo/ataque.
2. Frontend chama `POST /npcs/:id/rolls` com `rollType`, `targetKey` ou `expression`.
3. Backend aplica:
   - `isWildCard` do NPC (Extra não rola Dado Selvagem).
   - Penalidades por Wounds/Fatigue do NPC.
   - Bônus de Curinga do NPC.
   - Falha Crítica via `CriticalFailureDetector` (com confirmação d6 para Extras).
4. Broadcast WebSocket — apenas para `campaign:${id}:master` e `user:${ownerId}` (mestre/admin).
5. Jogadores **não recebem** nenhum evento (spec 04 §6.5).

### 5.5 Fluxo: Painel rápido de combate

Ferramenta de UX do mestre para rodar uma sessão:

1. Mestre abre `Painel de Combate` na campanha.
2. Vê todos os NPCs/inimigos ativos da campanha, agrupados por `type`.
3. Cada NPC exibe:
   - Nome, badge WC/Extra, contadores (wounds/fatigue).
   - Botões rápidos: **Lutar**, **Atirar**, **Vigor** (Soak), **Espírito** (Medo), **Iniciativa** (rolar d6).
   - Ataques configurados (clique = rolar ataque; segundo clique = rolar dano).
4. Ajuste rápido de wounds/fatigue via +/−.
5. Painel é **desktop-first** (uso do mestre), mas funcional em tablet.

### 5.6 Fluxo: Arquivar

1. Mestre clica "Arquivar".
2. Sistema define `status = 'archived'`, `deletedAt = now()`.
3. NPC não aparece mais nas listagens ativas do painel de combate.
4. Log de rolagens do NPC permanece acessível via histórico.
5. Mestre pode reativar via `POST /npcs/:id/reactivate`.

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação. Todas as rotas exigem que o ator seja **mestre da campanha** ou **admin** — caso contrário, `403 FORBIDDEN`.

### 6.1 NPCs

#### `POST /campaigns/:campaignId/npcs`

**Body:**

```json
{
  "type": "npc|enemy|boss",
  "name": "string",
  "concept": "string",
  "description": "string",
  "imageUrl": "string|null",
  "isWildCard": true,
  "isResilient": false,
  "isVeryResilient": false,
  "attributes": {
    "agilidade": 2,
    "astucia": 1,
    "espirito": 1,
    "forca": 3,
    "vigor": 2
  },
  "skills": { "lutar": 2, "atirar": 1, "perceber": 2 },
  "attacks": [
    {
      "name": "Clava com espinhos",
      "skillKey": "lutar",
      "damageExpression": "@for+d8",
      "note": "Alcance 1"
    }
  ],
  "specialAbilities": [
    {
      "name": "Regeneração Rápida",
      "description": "Cura 1 Ferimento por rodada (exceto por fogo)."
    }
  ],
  "armor": 1,
  "movementOverride": 7,
  "sizeOverride": 1
}
```

**Resposta 201:** NPC completo + `derivedStats`.
**Erros:** `400 VALIDATION_ERROR` com `details.errors[]`, `403 FORBIDDEN`, `404 CAMPAIGN_NOT_FOUND`.

#### `POST /campaigns/:campaignId/npcs/import/:bestiarySlug`

**Body:** `{ "type"?: "npc|enemy|boss" }` (opcional; se omitido, usa `suggestedType`).
**Resposta 201:** NPC completo + `derivedStats`.
**Erros:** `404 BESTIARY_ENTRY_NOT_FOUND`, `403 FORBIDDEN`.

#### `GET /campaigns/:campaignId/npcs`

**Query:** `?type=npc|enemy|boss&status=active|archived&search=&page=1&perPage=20`
**Resposta 200:** `{ data: [...], meta: {...} }`.
Cada item contém: `id`, `name`, `type`, `isWildCard`, `imageUrl`, `derivedStats`, `wounds`, `fatigue`.

#### `GET /npcs/:id`

**Resposta 200:** NPC completo + `derivedStats`.
**Erros:** `404 NOT_FOUND`, `403 FORBIDDEN`.

#### `PATCH /npcs/:id`

**Body:** subconjunto do `POST`.
**Resposta 200:** NPC atualizado + `derivedStats`.
**Erros:** `400 VALIDATION_ERROR`, `403`, `404`.

#### `DELETE /npcs/:id`

**Resposta 204.**

#### `POST /npcs/:id/reactivate`

**Resposta 200:** NPC reativado.

### 6.2 Runtime

#### `PATCH /npcs/:id/runtime`

**Body:**

```json
{
  "wounds": 1,
  "fatigue": 0,
  "benes": 1,
  "curingaActive": false
}
```

Cada campo opcional; apenas os enviados são atualizados.
**Resposta 200:** NPC com runtime atualizado.
**Erros:** `400 INVALID_STATE` (ex.: `wounds` acima do limite), `403`.

### 6.3 Rolagem

Rolagens usam os endpoints definidos na **Spec 04**:

- `POST /npcs/:id/rolls`
- `GET /npcs/:id/rolls`

Nenhuma alteração de contrato nesta spec.

### 6.4 Bestiário

#### `GET /bestiary`

**Query:** `?search=&page=1&perPage=20`
**Resposta 200:** `{ data: [...], meta: {...} }`.
**Autorização:** mestre/admin autenticados (não exposto a jogadores).

#### `GET /bestiary/:slug`

**Resposta 200:** entrada completa.

> **Admin endpoints para criar/editar entradas do bestiário** ficam fora desta spec — cobertos pela Spec 09 (painel administrativo).

## 7. Regras de Negócio

**RN-NPC-01** — Todo NPC pertence a **uma** campanha e é **privado do mestre** (nunca visível a jogadores).
**RN-NPC-02** — `ownerId` do NPC é sempre igual a `campaign.ownerId`.
**RN-NPC-03** — Limite de Ferimentos:

- `isWildCard = true` → **3**.
- `isVeryResilient = true` → **3** (Extras).
- `isResilient = true` → **2** (Extras).
- Extra comum → **1**.
  **RN-NPC-04** — `isResilient` só é permitido quando `isWildCard = false`. Cartas Selvagens não podem ser Resilientes.
  **RN-NPC-05** — `isVeryResilient` só é permitido quando `isWildCard = false` **e** `isResilient = false`.
  **RN-NPC-06** — NPCs Extra **não** rolam Dado Selvagem (Spec 04 §5.4).
  **RN-NPC-07** — Falha Crítica em Extra exige confirmação via d6 (Spec 04 §5.4 e RN-ROLL-05).
  **RN-NPC-08** — **Aparar** = 2 + metade de Lutar (rank inteiro), arred. baixo. Sem Lutar = 2.
  **RN-NPC-09** — **Resistência** = 2 + metade de Vigor (arred. baixo) + `armor`.
  **RN-NPC-10** — **Movimentação** = `movementOverride ?? 6`.
  **RN-NPC-11** — **Tamanho** = `sizeOverride ?? 0`.
  **RN-NPC-12** — Ataques usam expressões do parser da Spec 04; podem referenciar `@atributo` do próprio NPC.
  **RN-NPC-13** — Ao importar do bestiário, `sourceTemplateId` guarda a origem, mas o NPC é totalmente independente após a importação.
  **RN-NPC-14** — Rolagem de NPC usa os Wounds/Fatigue/Curinga do **próprio NPC**, não do mestre.
  **RN-NPC-15** — NPC arquivado **não pode** ser rolado (`409 NPC_ARCHIVED`).
  **RN-NPC-16** — NPCs são criados pelo mestre e vivem apenas em sua campanha; não há compartilhamento entre campanhas do mesmo mestre no MVP.
  **RN-NPC-17** — O log de rolagens do NPC segue a visibilidade da Spec 04 (sempre `private` para jogadores; visível ao mestre e admin).
  **RN-NPC-18** — Arquivamento é lógico (`status`, `deletedAt`); nunca físico.
  **RN-NPC-19** — O painel rápido de combate **não** cria estado adicional — apenas expõe ações em cima dos NPCs existentes.
  **RN-NPC-20** — Bestiário é **catálogo global** gerenciado por Admin; mestre só importa.

## 8. Segurança

- **Autorização:** guard `NpcAccessGuard` verifica que o ator é `campaign.ownerId` ou `admin`.
- **Enumeração:** `GET /npcs/:id` retorna `404` se o ator não for o mestre da campanha (não diferencia de "não existe").
- **Visibilidade em WebSocket:** eventos de rolagem de NPC vão apenas para `campaign:${id}:master` + `user:${ownerId}`.
- **Upload de imagem:** endpoint autenticado, salvamento em volume (Spec 09), máx 5 MB por arquivo, extensões permitidas (`.png`, `.jpg`, `.jpeg`, `.webp`).
- **Sanitização:** `name`, `concept`, `description`, `note` de ataques e `specialAbilities.description` são renderizados como texto puro no MVP.
- **CSRF:** mesmas diretrizes da Spec 01.
- **Rate limit:** criação de NPC limitada a **60 por hora** por campanha (evita criação acidental em massa).

## 9. UX

### 9.1 Jornadas

- **Mestre — preparação:** abre campanha → aba "Inimigos" (sub-aba "Chefes" ou "NPCs") → cria manualmente **ou** importa do bestiário → ajusta stats → salva.
- **Mestre — durante o jogo:** abre **Painel de Combate** → vê todos os NPCs ativos → clica em "Lutar" → vê resultado no log lateral → ajusta wounds/fatigue.
- **Mestre — consulta:** busca por nome no painel de combate ou aba "Inimigos".

### 9.2 Telas necessárias

- **`/campaigns/:id/npcs`** — lista com filtro por `type` (`npc` / `enemy` / `boss`), busca, filtro ativo/arquivado.
- **`/campaigns/:id/npcs/new`** — formulário manual.
- **`/campaigns/:id/npcs/import`** — modal de importação do bestiário com busca.
- **`/npcs/:id`** — ficha do NPC com abas:
  - **Resumo** (stats + contadores + ataques + habilidades).
  - **Rolagens** (últimas rolagens do NPC — filtro do log da Spec 04).
  - **Notas** (descrição longa).
- **`/campaigns/:id/combat-panel`** — painel rápido de combate (desktop-first).

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton.
- **Empty:** "Nenhum inimigo ainda. Importe do bestiário para começar rápido."
- **Error:** toast + validação inline.
- **Success:** toast.
- **WC vs. Extra:** badge visual claro (`⭐ Carta Selvagem` vs. `Extra`).
- **Wounds:** barra colorida (verde → amarelo → laranja → vermelho).
- **Bestiário:** indicador visual de "importado de" com `sourcePage`.

### 9.4 Microcopy (via Humanizer)

- "Crie um NPC, inimigo ou chefe para esta campanha."
- "Importar do bestiário — traz todas as estatísticas prontas para editar."
- "Carta Selvagem: rola Dado Selvagem e suporta 3 Ferimentos."
- "Extra: sem Dado Selvagem, cai com 1 Ferimento (ou mais com Resiliente)."
- "Este NPC foi importado do bestiário (pág. 227). Edite à vontade — a cópia é sua."
- "Painel de combate: role ataques e dano sem abrir a ficha."
- "NPCs são sempre privados do mestre. Jogadores nunca os veem."

## 10. Design System

Componentes novos:

- `<NpcCard>` — card compacto com nome, tipo, WC/Extra, imagem, contadores.
- `<NpcTypeBadge>` — badge colorido (`npc` dourado suave, `enemy` vermelho, `boss` vermelho intenso).
- `<WildCardBadge>` — `⭐ Carta Selvagem` / `Extra`.
- `<AttributesEditor>` — edição simplificada (5 selects de dado).
- `<SkillsEditor>` — lista de checkboxes com select de rank.
- `<AttacksEditor>` — tabela com nome, skill, expressão de dano, nota, preview.
- `<SpecialAbilitiesEditor>` — lista de pares nome/descrição.
- `<BestiaryImportModal>` — busca + lista + preview + botão importar.
- `<CombatQuickPanel>` — grid/lista de NPCs com botões rápidos de rolagem.
- `<WoundsTracker>` — barra colorida de ferimentos.
- `<NpcDerivedStats>` — bloco com Aparar, Resistência, Movimentação, Tamanho.

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `npcs`

```sql
id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
campaign_id            UUID NOT NULL REFERENCES campaigns(id),
owner_id               UUID NOT NULL REFERENCES users(id),
type                   VARCHAR(16) NOT NULL CHECK (type IN ('npc','enemy','boss')),
name                   VARCHAR(80) NOT NULL,
concept                VARCHAR(300) NOT NULL DEFAULT '',
description            TEXT NOT NULL DEFAULT '',
image_url              VARCHAR(500) NULL,
is_wild_card           BOOLEAN NOT NULL DEFAULT false,
is_resilient           BOOLEAN NOT NULL DEFAULT false,
is_very_resilient      BOOLEAN NOT NULL DEFAULT false,
attributes             JSONB NOT NULL,
skills                 JSONB NOT NULL DEFAULT '{}'::jsonb,
attacks                JSONB NOT NULL DEFAULT '[]'::jsonb,
special_abilities      JSONB NOT NULL DEFAULT '[]'::jsonb,
armor                  INTEGER NOT NULL DEFAULT 0,
movement_override      INTEGER NULL,
size_override          INTEGER NULL,
wounds                 INTEGER NOT NULL DEFAULT 0,
fatigue                INTEGER NOT NULL DEFAULT 0,
benes                  INTEGER NOT NULL DEFAULT 0,
curinga_active         BOOLEAN NOT NULL DEFAULT false,
source_template_id     UUID NULL REFERENCES bestiary_entries(id),
status                 VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at             TIMESTAMPTZ NULL
```

**Índices:**

- `INDEX (campaign_id, type, status) WHERE deleted_at IS NULL`
- `INDEX (campaign_id, name) WHERE deleted_at IS NULL`
- `INDEX (owner_id)`

**Constraints:**

- `CHECK (NOT (is_resilient AND is_wild_card))`
- `CHECK (NOT (is_very_resilient AND is_wild_card))`
- `CHECK (NOT (is_very_resilient AND is_resilient))`

### 11.2 Tabela `bestiary_entries`

```sql
id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
slug                   VARCHAR(80) NOT NULL,
name                   VARCHAR(80) NOT NULL,
description            TEXT NOT NULL DEFAULT '',
suggested_type         VARCHAR(16) NOT NULL DEFAULT 'enemy' CHECK (suggested_type IN ('enemy','boss')),
is_wild_card           BOOLEAN NOT NULL DEFAULT false,
is_resilient           BOOLEAN NOT NULL DEFAULT false,
is_very_resilient      BOOLEAN NOT NULL DEFAULT false,
attributes             JSONB NOT NULL,
skills                 JSONB NOT NULL DEFAULT '{}'::jsonb,
attacks                JSONB NOT NULL DEFAULT '[]'::jsonb,
special_abilities      JSONB NOT NULL DEFAULT '[]'::jsonb,
armor                  INTEGER NOT NULL DEFAULT 0,
movement_override      INTEGER NULL,
size_override          INTEGER NULL,
source_page            VARCHAR(32) NULL,
created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at             TIMESTAMPTZ NULL
```

**Índices:**

- `UNIQUE (slug) WHERE deleted_at IS NULL`
- `INDEX (name) WHERE deleted_at IS NULL`

### 11.3 Tabela `npc_change_log` (opcional — ver §17.2)

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
npc_id             UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
actor_id           UUID NOT NULL REFERENCES users(id),
change_type        VARCHAR(32) NOT NULL,
field_name         VARCHAR(64) NULL,
old_value          JSONB NULL,
new_value          JSONB NULL,
created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
```

## 12. i18n

Namespace `npcs.*` e `bestiary.*`. Chaves principais:

```
npcs.list.title
npcs.list.empty
npcs.list.empty.cta
npcs.list.search.placeholder
npcs.list.filter.all
npcs.list.filter.npc
npcs.list.filter.enemy
npcs.list.filter.boss
npcs.list.filter.active
npcs.list.filter.archived
npcs.list.import_cta

npcs.form.title.create
npcs.form.title.edit
npcs.form.type.label
npcs.form.type.npc
npcs.form.type.enemy
npcs.form.type.boss
npcs.form.name.label
npcs.form.concept.label
npcs.form.description.label
npcs.form.image.label
npcs.form.wildcard.label
npcs.form.wildcard.helper
npcs.form.resilient.label
npcs.form.very_resilient.label
npcs.form.attributes.title
npcs.form.skills.title
npcs.form.attacks.title
npcs.form.attacks.add
npcs.form.attacks.name
npcs.form.attacks.skill
npcs.form.attacks.damage
npcs.form.special_abilities.title
npcs.form.special_abilities.add
npcs.form.armor.label
npcs.form.movement.label
npcs.form.movement.helper
npcs.form.size.label
npcs.form.size.helper
npcs.form.submit
npcs.form.error.required
npcs.form.error.invalid_damage
npcs.form.error.resilient_conflict

npcs.detail.tabs.summary
npcs.detail.tabs.rolls
npcs.detail.tabs.notes
npcs.detail.derived.aparar
npcs.detail.derived.resistencia
npcs.detail.derived.movimentacao
npcs.detail.derived.tamanho
npcs.detail.runtime.wounds
npcs.detail.runtime.fatigue
npcs.detail.runtime.benes
npcs.detail.runtime.curinga
npcs.detail.archive.confirm
npcs.detail.archive.success

npcs.import.title
npcs.import.search.placeholder
npcs.import.empty
npcs.import.import_button
npcs.import.success
npcs.import.source_page

npcs.combat_panel.title
npcs.combat_panel.empty
npcs.combat_panel.roll_attack
npcs.combat_panel.roll_damage
npcs.combat_panel.roll_vigor
npcs.combat_panel.roll_spirit
npcs.combat_panel.add_wound
npcs.combat_panel.remove_wound
npcs.combat_panel.add_fatigue
npcs.combat_panel.remove_fatigue

bestiary.list.title
bestiary.list.search.placeholder
bestiary.list.suggested_type
bestiary.list.source_page
bestiary.list.import
```

Todos os textos passam pela skill **Humanizer** antes de virarem `pt-BR.json`.

## 13. Seed (Bestiário)

A seed popula `bestiary_entries` com **todas as 37 criaturas do Capítulo 6** do livro, na ordem em que aparecem:

| #   | Slug               | Nome               | Página |
| --- | ------------------ | ------------------ | ------ |
| 1   | `aranha-gigante`   | Aranha Gigante     | 218    |
| 2   | `aves-de-rapina`   | Aves de Rapina     | 218    |
| 3   | `bando`            | Bando              | 219    |
| 4   | `cao-lobo`         | Cão/Lobo           | 219    |
| 5   | `cavalo`           | Cavalo             | 219    |
| 6   | `cavalo-de-guerra` | Cavalo de Guerra   | 219    |
| 7   | `draco`            | Draco              | 220    |
| 8   | `dragao`           | Dragão             | 220    |
| 9   | `elemental-agua`   | Elemental da Água  | 221    |
| 10  | `elemental-ar`     | Elemental do Ar    | 221    |
| 11  | `elemental-fogo`   | Elemental do Fogo  | 222    |
| 12  | `elemental-terra`  | Elemental da Terra | 222    |
| 13  | `esqueleto`        | Esqueleto          | 222    |
| 14  | `fantasma`         | Fantasma           | 222    |
| 15  | `gato-pequeno`     | Gato Pequeno       | 223    |
| 16  | `goblin`           | Goblin             | 223    |
| 17  | `jacare-crocodilo` | Jacaré/Crocodilo   | 223    |
| 18  | `leao`             | Leão               | 223    |
| 19  | `lobo-atroz`       | Lobo Atroz         | 224    |
| 20  | `lobisomem`        | Lobisomem          | 224    |
| 21  | `liche`            | Liche              | 224    |
| 22  | `mecha`            | Mecha              | 225    |
| 23  | `minotauro`        | Minotauro          | 225    |
| 24  | `mula`             | Mula               | 226    |
| 25  | `ogro`             | Ogro               | 226    |
| 26  | `orc`              | Orc                | 226    |
| 27  | `orc-lider-tribal` | Orc, Líder Tribal  | 226    |
| 28  | `soldado`          | Soldado            | 227    |
| 29  | `touro`            | Touro              | 227    |
| 30  | `troll`            | Troll              | 227    |
| 31  | `tubarao`          | Tubarão            | 228    |
| 32  | `tubarao-branco`   | Tubarão Branco     | 228    |
| 33  | `urso`             | Urso               | 228    |
| 34  | `vampiro`          | Vampiro            | 229    |
| 35  | `vampiro-anciao`   | Vampiro Ancião     | 229    |
| 36  | `verme-gigante`    | Verme Gigante      | 230    |
| 37  | `zumbi`            | Zumbi              | 231    |

Cada entrada preenche **todos** os campos de `bestiary_entries` conforme transcrito do livro. Entradas com `W` no livro (Dragão, Liche, Vampiro, Vampiro Ancião) são marcadas `isWildCard = true` e `suggestedType = 'boss'`. Demais são `isWildCard = false` e `suggestedType = 'enemy'`.

**Idempotência:** a seed usa `ON CONFLICT (slug) DO NOTHING` para permitir reexecução sem duplicar.

> **Nota de qualidade:** os dados do bestiário (atributos, perícias, ataques, habilidades especiais) devem ser transcritos **literalmente** do livro. Recomendação: manter um arquivo `seed/data/bestiary.json` versionado no repositório, com testes que validam cada entrada contra o livro (checksum dos valores esperados).

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `NpcStatsCalculator.parry` com Lutar rank 3 → 2 + 1 = 3.
- `NpcStatsCalculator.toughness` com Vigor rank 3 e armor 2 → 2 + 1 + 2 = 5.
- `NpcStatsCalculator.woundLimit`:
  - WC → 3.
  - Extra comum → 1.
  - Resiliente → 2.
  - Muito Resiliente → 3.
- `NpcStatsCalculator.movement` com override 7 → 7.
- `NpcStatsCalculator.size` com override 1 → 1.
- `Npc.setResilience` rejeita `isResilient=true` quando `isWildCard=true`.
- `Npc.setResilience` rejeita `isVeryResilient=true` quando `isResilient=true`.
- `Npc.incrementWounds` bloqueia quando atinge o limite.
- `NpcImporter` copia todos os campos de `BestiaryEntry` e define `sourceTemplateId`.

### 14.2 Integration tests (application + infra)

- `CreateNpcUseCase` persiste e retorna `derivedStats` corretas.
- `CreateNpcUseCase` rejeita atributos incompletos.
- `ImportNpcFromBestiaryUseCase` importa Troll corretamente, mantendo `sourceTemplateId`.
- `UpdateNpcUseCase` recalcula stats derivadas quando atributos mudam.
- `AdjustNpcRuntimeUseCase` bloqueia `wounds > limit`.
- `ArchiveNpcUseCase` marca `deletedAt`.
- `RollNpcSkillUseCase` com NPC Extra **não** rola Wild Die.
- `RollNpcSkillUseCase` com NPC WC **rola** Wild Die.
- NPC arquivado bloqueia rolagem (`409 NPC_ARCHIVED`).
- Jogador tenta acessar NPC → `403`.
- `RollNpcSkillUseCase` emite WebSocket apenas para mestre/admin.
- Seed popula 37 entradas com `slug` únicos.

### 14.3 E2E tests (HTTP + WebSocket)

- Fluxo completo: mestre cria NPC → rola Lutar → ajusta wound → arquiva → reativa.
- Fluxo de importação: mestre importa Troll → edita nome → rola dano → log mostra.
- Fluxo de combate rápido: mestre abre painel → vê 3 NPCs → rola Lutar de cada → cada rolagem aparece no log lateral.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 85%.
- **Seed:** 100% (teste verifica que todas as 37 entradas existem e têm campos obrigatórios).

## 15. Conventional Commits esperados

```
chore(npc): bootstrap npc bounded context structure
feat(npc): add Npc aggregate with type, wildcard and resilience rules
feat(npc): add BestiaryEntry template entity
feat(npc): implement NpcStatsCalculator
feat(npc): implement NpcImporter from bestiary
feat(npc): implement CreateNpcUseCase
feat(npc): implement ImportNpcFromBestiaryUseCase
feat(npc): implement UpdateNpcUseCase
feat(npc): implement ArchiveNpcUseCase
feat(npc): implement AdjustNpcRuntimeUseCase
feat(npc): implement ListNpcsUseCase with type filters
feat(npc): add HTTP controllers and NpcAccessGuard
feat(npc): integrate with roll engine from spec 04
feat(bestiary): add seed with 37 creatures
feat(web): add npc list with type tabs
feat(web): add npc form with attributes, skills and attacks editor
feat(web): add bestiary import modal
feat(web): add combat quick panel
feat(web): add npc detail page with tabs
test(npc): add unit tests for NpcStatsCalculator
test(npc): add integration tests for bestiary import
test(npc): add e2e tests for full npc lifecycle
docs(npc): document npc rules and bestiary seed
```

## 16. Critérios de Aceite

- [ ] Mestre cria NPC manualmente com tipo (`npc` / `enemy` / `boss`).
- [ ] Mestre importa NPC do bestiário com um clique.
- [ ] NPC importado é totalmente editável e independente do template.
- [ ] Marcação WC vs. Extra altera limite de Ferimentos e rolagem.
- [ ] Marcação Resiliente/Muito Resiliente só é permitida em Extras.
- [ ] Aparar, Resistência, Movimentação, Tamanho calculados automaticamente (com override opcional).
- [ ] Rolagem de NPC usa o motor da Spec 04 sem alterações.
- [ ] NPC Extra não rola Dado Selvagem.
- [ ] NPC arquivado não pode ser rolado.
- [ ] Jogadores **nunca** veem NPCs, nem rolagens de NPC.
- [ ] WebSocket emite rolagem de NPC apenas para mestre/admin.
- [ ] Painel de combate exibe todos os NPCs ativos com botões rápidos de rolagem.
- [ ] Contadores de wounds/fatigue/benes/curinga funcionam com +/−.
- [ ] Upload de imagem do NPC salva no volume do backend (Spec 09).
- [ ] Seed popula **todas as 37 criaturas** do Capítulo 6 com slugs únicos.
- [ ] Seed é idempotente.
- [ ] Todas as operações de NPC são soft delete.
- [ ] Todas as strings de UI passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.
- [ ] Cobertura mínima da seção 14.4 atingida.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- **Unificação de entidades:** NPC, Chefe e Inimigo vivem no **mesmo agregado `Npc`** com campo `type: 'npc' | 'enemy' | 'boss'`. A separação pedida pelo autor é atendida pela **UI (abas/filtros)**, não por schema. Ver §17.2 para aprovação.
- NPCs são **privados do mestre** por padrão (nunca visíveis a jogadores).
- NPC **nunca** pertence a mais de uma campanha.
- Atributos e perícias do NPC são **snapshot** — não evoluem, não têm Progresso.
- Bestiário é **catálogo global** gerenciado por Admin e importado por cópia (snapshot).
- NPC não tem raça, complicações ou vantagens estruturadas — apenas habilidades especiais em texto livre.
- Rolagem usa o motor da Spec 04 sem duplicação de código.
- Painel de combate é **feature de UX**, não novo agregado.
- Upload de imagem usa o storage da Spec 09 (volume de 1 GB).
- Seed do bestiário é **obrigatória** e testada.

### 17.2 Pendências para o autor aprovar antes da implementação

- **Unificação `Npc` com `type` (npc/enemy/boss):** a Spec 00 §3.2 registra "Chefe/Inimigo como entidade separada de NPC". Estou propondo unificar em um agregado com `type` para reduzir duplicação. **Recomendação: unificar.** Se aprovado, atualizo a Spec 00 §3.2 e §11.1. **Aguardando aprovação.**
- **Painel de combate:** o autor confirmou interesse em "gerenciador de iniciativa por cartas" (Spec 11), mas o **Painel de Combate** é diferente — é uma tela para rolar NPCs rapidamente. **Recomendação: incluir no MVP** (é só UX em cima do motor de dados). **Aguardando confirmação.**
- **Imagem do NPC:** o autor mencionou que o sistema permite anexo de imagens, mas não especificou onde. **Recomendação: permitir 1 imagem (retrato) por NPC**, salva em volume. **Aguardando confirmação.**
- **Histórico de alterações do NPC:** o autor pediu log para fichas de personagem, mas não mencionou para NPCs. **Recomendação: incluir `NpcChangeLog` como opcional** (fácil de adicionar depois; manter no MVP só se você quiser). **Aguardando confirmação.**
- **Visibilidade do bestiário:** o autor não especificou se jogadores podem navegar o bestiário. **Recomendação: apenas mestre/admin veem o bestiário.** **Aguardando confirmação.**
- **Transcrição literal das 37 criaturas:** a seed deve transcrever atributos, perícias, ataques e habilidades **literalmente** do livro. **Recomendação: versionar `seed/data/bestiary.json` e cobrir com testes.** **Aguardando confirmação.**
- **Overrides de `movement` e `size`:** o autor não especificou se o mestre pode sobrescrever Movimentação/Tamanho. **Recomendação: sim, com override opcional** (defaults para 6 e 0). **Aguardando confirmação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket, rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
