# Spec 12 — Player Notes

## 1. Objetivo

Definir o bounded context de **PlayerNote** do Forja Selvagem: o espaço **exclusivo do jogador** para anotar memórias, diário de sessão, objetivos pessoais e lembretes, sempre vinculado ao par **personagem × campanha** (`CharacterCampaignLink`). As anotações são **privadas do jogador** (nem o mestre nem o admin as veem) e **não vazam entre campanhas** — se o mesmo personagem for usado em outra campanha, as anotações da campanha anterior não se aplicam.

Essa spec fecha o pacote de regras do MVP e formaliza a decisão registrada na Spec 07 §20.3.

## 2. Escopo

### 2.1 Dentro do escopo

- CRUD de anotações de jogador vinculadas a `CharacterCampaignLink`.
- Campos: título, corpo (markdown sanitizado), tags, fixar no topo (pin).
- Busca por título, corpo e tags.
- Filtro por tag e por "fixadas".
- Ordenação: fixadas primeiro, depois por data de atualização (mais recentes primeiro).
- Múltiplas anotações por par (character, campaign).
- **Isolamento total:** notas de uma campanha nunca aparecem em outra.
- **Privacidade total:** apenas o dono do personagem vê suas notas. Nem mestre, nem admin.
- Soft delete universal.
- **Localização na UI:** aba "Anotações" na **visão da ficha dentro da campanha** (`/campaigns/:id/characters/:characterId`).

### 2.2 Fora do escopo

- Compartilhamento de notas com outros jogadores.
- Comentários ou reações.
- Notas globais ao personagem (sem campanha) — se o personagem não estiver vinculado a uma campanha, não há espaço de notas (as notas vivem **no vínculo**).
- Notas colaborativas entre jogadores.
- Rich text (HTML) — apenas markdown sanitizado.
- Anexos ou imagens em notas.
- Notificações ou lembretes.
- Exportação (PDF, JSON).
- Criptografia ponta a ponta (notas ficam em claro no banco, como o restante dos dados).
- Acesso do mestre ou admin (por design — **nem o admin** vê as notas).
- Versionamento completo (apenas `updatedAt`).

## 3. Atores e Permissões

### 3.1 Definições

- **Dono do personagem:** usuário que criou o personagem (`character.userId`).
- **Mestre da campanha:** owner da campanha (`campaign.ownerId`) — **NÃO** tem acesso às notas.
- **Admin:** superusuário — **NÃO** tem acesso às notas.
- **Outro jogador:** qualquer outro usuário — **NÃO** tem acesso.

### 3.2 Matriz

| Ação            | Dono do personagem | Mestre | Admin | Outro jogador |
| --------------- | ------------------ | ------ | ----- | ------------- |
| Criar nota      | ✅                 | ❌     | ❌    | ❌            |
| Listar notas    | ✅                 | ❌     | ❌    | ❌            |
| Ver nota        | ✅                 | ❌     | ❌    | ❌            |
| Editar nota     | ✅                 | ❌     | ❌    | ❌            |
| Arquivar nota   | ✅                 | ❌     | ❌    | ❌            |
| Reativar nota   | ✅                 | ❌     | ❌    | ❌            |
| Fixar/desafixar | ✅                 | ❌     | ❌    | ❌            |

> **Regra dura:** o **único** usuário que acessa as notas é o dono do personagem. Nem o mestre da campanha, nem o admin do sistema têm acesso. Isso é uma escolha explícita de privacidade (ver §17.1).

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `PlayerNote`

#### 4.1.1 Agregado: `PlayerNote` (raiz)

**Atributos:**

- `id`: UUID v4
- `characterId`: UUID (referencia `characters.id`)
- `campaignId`: UUID (referencia `campaigns.id`)
- `characterCampaignLinkId`: UUID (referencia `character_campaign_links.id`; garante integridade com o vínculo)
- `userId`: UUID (dono da nota; deve ser igual a `character.userId`)
- `title`: string (2–120 caracteres)
- `body`: string (markdown, 0–50000 caracteres)
- `tags`: string[] (até 10 etiquetas, cada 1–30 caracteres)
- `pinned`: boolean (padrão `false`)
- `status`: `'active' | 'archived'`
- `createdAt`, `updatedAt`, `deletedAt`

**Invariantes:**

1. `userId` deve ser igual a `character.userId` (só o dono cria/edita).
2. `characterCampaignLinkId` deve referenciar um vínculo **ativo** (`unlinkedAt IS NULL`).
3. `characterId` e `campaignId` devem corresponder ao vínculo referenciado (consistência).
4. `title` entre 2 e 120 caracteres, sem caracteres de controle.
5. `body` ≤ 50.000 caracteres, aceita markdown.
6. `tags`: máximo 10; cada uma 1–30 caracteres, sem duplicatas (case-insensitive).
7. **Nenhuma nota é visível fora do dono** — não há método de leitura pública.
8. Arquivamento é lógico.

**Métodos:**

- `rename(newTitle)`
- `changeBody(newBody)`
- `setTags(tags)`
- `pin()`, `unpin()`
- `archive()`
- `reactivate()`

**Domain Events:**

- `PlayerNoteCreated`
- `PlayerNoteUpdated`
- `PlayerNoteArchived`
- `PlayerNoteReactivated`

#### 4.1.2 Value Objects

| VO                | Regra                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| `PlayerNoteTitle` | Trim, 2–120 caracteres.                                                |
| `PlayerNoteTag`   | Trim, 1–30 caracteres, lowercase para comparação.                      |
| `MarkdownContent` | String bruta; sanitizada na apresentação (mesmo sanitizer da Spec 06). |

### 4.2 Repositórios

- `IPlayerNoteRepository`: `findById`, `listByCharacterCampaignLink(paginated, filters)`, `save`

**Isolamento obrigatório:** toda query inclui `userId = actor.id` **e** `status = 'active'` por padrão. Não há método `findAll` sem filtro de usuário.

### 4.3 Serviços de domínio

- **`PlayerNoteOwnershipGuard`**: garante que o ator é o dono do personagem e que o `characterCampaignLink` está ativo.
- **`MarkdownSanitizer`**: reutilizado da Spec 06 (nenhum código duplicado).

### 4.4 Casos de uso (application layer)

| Caso de uso                   | Ator               | Descrição                               |
| ----------------------------- | ------------------ | --------------------------------------- |
| `CreatePlayerNoteUseCase`     | Dono do personagem | Cria nota vinculada a um vínculo ativo. |
| `ListPlayerNotesUseCase`      | Dono do personagem | Lista com filtros e busca.              |
| `GetPlayerNoteUseCase`        | Dono do personagem | Retorna nota específica.                |
| `UpdatePlayerNoteUseCase`     | Dono do personagem | Edita título, corpo, tags.              |
| `PinPlayerNoteUseCase`        | Dono do personagem | Fixa/desafixa.                          |
| `ArchivePlayerNoteUseCase`    | Dono do personagem | Soft delete.                            |
| `ReactivatePlayerNoteUseCase` | Dono do personagem | Reverte soft delete.                    |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Criar nota

1. Jogador abre `/campaigns/:id/characters/:characterId` (ficha na visão da campanha) → aba "Anotações" → "Nova anotação".
2. Preenche:
   - `title` (obrigatório).
   - `body` (opcional, markdown).
   - `tags` (opcional, até 10).
   - `pinned` (opcional, default `false`).
3. Backend:
   - Verifica que o ator é o dono do personagem.
   - Verifica que existe `characterCampaignLink` **ativo** entre `characterId` e `campaignId`.
   - Se não existe vínculo ativo → `400 NOT_LINKED_TO_CAMPAIGN`.
4. Valida e persiste.
5. Emite `PlayerNoteCreated`.
6. Retorna a nota criada.

### 5.2 Fluxo: Listar notas

1. Jogador abre aba "Anotações".
2. Backend:
   - Busca notas do ator **para aquele vínculo** (`characterCampaignLinkId`).
   - Ordena: `pinned DESC`, depois `updatedAt DESC`.
   - Filtros opcionais: `pinned`, `tags` (intersecção), `search` (título + corpo + tags).
   - Paginação padrão 20 por página.
3. Retorna.

### 5.3 Fluxo: Editar nota

1. Jogador abre nota → edita.
2. Backend valida (título, tamanho, tags).
3. Persiste e emite `PlayerNoteUpdated`.

### 5.4 Fluxo: Fixar/desafixar

1. Jogador clica no ícone de pin.
2. Backend alterna `pinned`.
3. Emite `PlayerNoteUpdated`.

### 5.5 Fluxo: Arquivar nota

1. Jogador clica "Arquivar".
2. Backend marca `status = 'archived'`, `deletedAt = now()`.
3. Emite `PlayerNoteArchived`.
4. Nota some da lista ativa; acessível em "Arquivadas".

### 5.6 Fluxo: Isolamento entre campanhas

**Regra de negócio crítica.** Quando o jogador acessa a ficha vinculada a outra campanha:

1. `characterCampaignLink` é diferente (campanha B).
2. Backend lista apenas notas do `characterCampaignLinkId` da campanha B.
3. Notas da campanha A **não aparecem**.

**Exemplo concreto:**

- Red (personagem de Emília) está vinculada à Campanha A e à Campanha B.
- Emília escreveu 5 notas na Campanha A sobre eventos da campanha A.
- Ao abrir a ficha de Red na Campanha B, a aba "Anotações" mostra **apenas** notas da Campanha B (inicialmente vazia).
- As 5 notas da Campanha A continuam preservadas e acessíveis quando ela voltar à Campanha A.

### 5.7 Fluxo: Privacidade do mestre

**Regra dura.** O mestre da campanha:

- Não tem endpoint para listar notas de jogadores.
- Não vê a aba "Anotações" na ficha do jogador (a aba só aparece na visão do próprio jogador).
- Se tentar acessar `GET /campaigns/:id/characters/:characterId/notes` de um personagem que não é dele → `403 FORBIDDEN`.
- Admin também não tem acesso (mesma regra).

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação.

**Autorização:** guard `PlayerNoteOwnershipGuard` verifica:

1. `character.userId === actor.id`
2. `characterCampaignLink` ativo entre `characterId` e `campaignId`

Caso contrário, `403 FORBIDDEN` (com `details.reason` explicando: `NOT_THE_OWNER` ou `NOT_LINKED_TO_CAMPAIGN`).

### 6.1 Anotações

#### `POST /campaigns/:campaignId/characters/:characterId/notes`

**Body:**

```json
{
  "title": "string (2-120)",
  "body": "string (markdown, ≤50000)",
  "tags": ["string"],
  "pinned": false
}
```

**Resposta 201:** nota criada.
**Erros:** `400 VALIDATION_ERROR`, `400 NOT_LINKED_TO_CAMPAIGN`, `403 FORBIDDEN`, `404 CHARACTER_NOT_FOUND`, `404 CAMPAIGN_NOT_FOUND`.

#### `GET /campaigns/:campaignId/characters/:characterId/notes`

**Query:** `?pinned=true|false&tags=tag1,tag2&search=&status=active|archived&page=1&perPage=20`
**Resposta 200:** `{ data: [...], meta: {...} }` ordenado por `pinned DESC, updatedAt DESC`.
**Erros:** `403 FORBIDDEN`, `404`.

#### `GET /player-notes/:id`

**Resposta 200:** nota completa.
**Erros:** `404 NOT_FOUND`, `403 FORBIDDEN` (não é o dono).

#### `PATCH /player-notes/:id`

**Body:** subconjunto do `POST`.
**Resposta 200:** nota atualizada.
**Erros:** `400 VALIDATION_ERROR`, `403`, `404`.

#### `POST /player-notes/:id/pin`

**Resposta 200:** nota com `pinned = true`.

#### `POST /player-notes/:id/unpin`

**Resposta 200:** nota com `pinned = false`.

#### `DELETE /player-notes/:id`

**Resposta 204** (soft delete).

#### `POST /player-notes/:id/reactivate`

**Resposta 200.**

### 6.2 Importante sobre a API

- **Não existe** endpoint público ou endpoint para mestre/admin.
- **Não existe** endpoint para "ver todas as notas de um personagem" fora do par (character, campaign).
- Todos os endpoints filtram por `userId = actor.id` **no repositório**, como defesa em profundidade além do guard.

## 7. Regras de Negócio

**RN-NOTE-01** — Notas vivem no par (**character, campaign**) via `characterCampaignLinkId`. Não existem notas "globais" ao personagem.
**RN-NOTE-02** — Somente o **dono do personagem** cria/lê/edita/arquiva notas.
**RN-NOTE-03** — O **mestre** e o **admin** não têm acesso às notas, nem por endpoint direto, nem via UI.
**RN-NOTE-04** — Notas de uma campanha **nunca** aparecem em outra campanha, mesmo que o personagem seja o mesmo.
**RN-NOTE-05** — Criar nota exige `characterCampaignLink` **ativo** entre o personagem e a campanha.
**RN-NOTE-06** — Se o vínculo for arquivado (jogador sai da campanha, é removido, ou o personagem é desvinculado), as notas permanecem no banco mas ficam **inacessíveis** (não aparecem em listagens). Se o vínculo for reativado, as notas voltam a aparecer.
**RN-NOTE-07** — Título entre 2 e 120 caracteres.
**RN-NOTE-08** — Corpo ≤ 50.000 caracteres, aceita markdown.
**RN-NOTE-09** — Máximo 10 tags por nota; cada uma 1–30 caracteres; sem duplicatas (case-insensitive).
**RN-NOTE-10** — Toda query de leitura filtra por `userId = actor.id` no repositório (defesa em profundidade).
**RN-NOTE-11** — Soft delete universal.
**RN-NOTE-12** — Ordenação: `pinned DESC`, depois `updatedAt DESC`.
**RN-NOTE-13** — Arquivamento não remove notas; podem ser reativadas.
**RN-NOTE-14** — Markdown é sanitizado na renderização (mesmo sanitizer da Spec 06).
**RN-NOTE-15** — Nenhuma nota é enviada via WebSocket (não há broadcast).
**RN-NOTE-16** — Nenhuma nota é indexada para busca global (`Ctrl/Cmd+K`). Busca ocorre apenas dentro da aba de anotações do vínculo.

## 8. Segurança

- **Autorização:** guard `PlayerNoteOwnershipGuard` + filtro obrigatório por `userId` no repositório.
- **Enumeração:** `GET /player-notes/:id` retorna `404` se o ator não for o dono (não diferencia "não existe" de "não é seu").
- **Isolamento:** toda query inclui `userId = actor.id` **e** `characterCampaignLinkId` específico. Impossível listar notas de outro usuário.
- **Admin sem acesso:** o guard `PlayerNoteOwnershipGuard` **não** aceita `role = 'admin'` como bypass (regra dura).
- **Sanitização:** markdown sanitizado (mesmo `MarkdownSanitizer` da Spec 06).
- **CSRF:** mesmas diretrizes da Spec 01.
- **Rate limit:** criação de nota limitada a **120 por hora por usuário** (evita abuso).
- **Logs:** nunca logar o corpo das notas (podem conter informações pessoais do jogador).

## 9. UX

### 9.1 Jornadas

- **Jogador — durante a sessão:** abre a ficha dentro da campanha → aba "Anotações" → registra o que aconteceu.
- **Jogador — entre sessões:** relê notas, busca por tag, revisa objetivos.
- **Jogador — volta à campanha após tempo:** reencontra todas as notas anteriores daquela campanha.

### 9.2 Localização na UI

**Importante:** a aba "Anotações" aparece **apenas na ficha vista dentro do contexto da campanha** — rota `/campaigns/:id/characters/:characterId`. Ela **não** aparece na ficha global (`/characters/:id`), porque as notas são do par (personagem, campanha).

**Comportamento visual:**

- Ficha global (`/characters/:id`): sem aba "Anotações".
- Ficha dentro de campanha (`/campaigns/:id/characters/:characterId`, visão do dono): aba "Anotações" presente.
- Ficha dentro de campanha vista pelo **mestre**: aba "Anotações" **ausente** (o mestre não tem acesso).

### 9.3 Telas necessárias

**Aba "Anotações"** dentro de `/campaigns/:id/characters/:characterId`:

- Header da aba:
  - Busca no topo.
  - Filtro: "Todas" / "Fixadas" / "Arquivadas".
  - Filtro por tag (multi-select de chips).
  - Botão "Nova anotação".
- Lista:
  - Cards de nota, ordenados por `pinned DESC, updatedAt DESC`.
  - Cada card mostra: título, primeiro trecho do corpo (2 linhas), até 3 tags, indicador de pin, data de atualização.
  - Pin visual no topo da lista.
- Ações por nota:
  - Clicar → abre o detalhe.
  - Ícone de pin (fixar/desafixar).
  - Menu (⋮): editar, arquivar.

**Detalhe da nota** (`/campaigns/:id/characters/:characterId/notes/:noteId`):

- Header: título, tags, pin, data de criação/atualização, botão "Editar".
- Corpo: markdown renderizado.
- Voltar para a lista.

**Modal de criar/editar nota:**

- Título, corpo (markdown editor com preview), tags, pin.
- Botão "Salvar".

### 9.4 Estados visuais obrigatórios

- **Loading:** skeleton.
- **Empty (nenhuma nota):** "Nenhuma anotação ainda. Comece a registrar suas memórias desta campanha." + CTA "Nova anotação".
- **Empty (sem resultado de busca):** "Nenhuma anotação encontrada."
- **Error:** toast + validação inline.
- **Success:** toast.
- **Pin:** badge dourado no card.
- **Arquivada:** badge cinza; nota não aparece na lista ativa.

### 9.5 Microcopy (via Humanizer)

- "Minhas anotações"
- "Anotações privadas. Só você vê este espaço."
- "Nova anotação"
- "Registre o que aconteceu na sessão, objetivos pessoais do seu personagem ou qualquer coisa que queira lembrar."
- "Essas anotações ficam vinculadas apenas a esta campanha. Se você usar este personagem em outra, as anotações não aparecem lá."
- "Fixar no topo"
- "Arquivar anotação" — "Ela sai da lista ativa, mas pode ser recuperada depois."
- "Nenhuma anotação ainda."
- "Buscar anotações…"

## 10. Design System

Componentes novos:

- `<PlayerNoteCard>` — card compacto com título, trecho, tags, pin, data.
- `<PlayerNoteList>` — lista ordenável com filtros.
- `<PlayerNoteForm>` — modal de criar/editar (reutiliza `MarkdownEditor` e `TagInput` da Spec 06/07).
- `<PlayerNoteDetail>` — detalhe com markdown renderizado.
- `<PinButton>` — botão de fixar/desafixar.

Componentes reutilizados:

- `MarkdownEditor` (Spec 07).
- `MarkdownRenderer` (Spec 07).
- `TagInput` (Spec 07).
- `SearchBox` (Spec 07).
- `EmptyState` (Spec 07).
- `Toast` (Spec 07).

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `player_notes`

```sql
id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
character_id                 UUID NOT NULL REFERENCES characters(id),
campaign_id                  UUID NOT NULL REFERENCES campaigns(id),
character_campaign_link_id   UUID NOT NULL REFERENCES character_campaign_links(id),
user_id                      UUID NOT NULL REFERENCES users(id),
title                        VARCHAR(120) NOT NULL,
body                         TEXT NOT NULL DEFAULT '',
tags                         TEXT[] NOT NULL DEFAULT '{}',
pinned                       BOOLEAN NOT NULL DEFAULT false,
status                       VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at                   TIMESTAMPTZ NULL
```

**Índices:**

- `INDEX (user_id, character_campaign_link_id, status, pinned, updated_at DESC)` — principal.
- `GIN (tags)`.
- `GIN (to_tsvector('portuguese', title || ' ' || body))` — full-text.
- `INDEX (character_campaign_link_id) WHERE deleted_at IS NULL`.

**Constraints:**

- `CHECK (title <> '' AND char_length(title) BETWEEN 2 AND 120)`.

**Nota sobre segurança em profundidade:** nenhuma view ou stored procedure é usada. O filtro `user_id = actor.id` é aplicado em **toda** query no repositório TypeORM.

## 12. i18n

Namespace `player_notes.*`. Chaves principais:

```
player_notes.tab.title
player_notes.tab.empty
player_notes.tab.empty.cta
player_notes.tab.privacy_notice

player_notes.list.search.placeholder
player_notes.list.filter.all
player_notes.list.filter.pinned
player_notes.list.filter.archived
player_notes.list.filter.tags
player_notes.list.new_cta
player_notes.list.empty_search

player_notes.card.pinned
player_notes.card.updated_at
player_notes.card.tags_count

player_notes.detail.back
player_notes.detail.edit
player_notes.detail.archive
player_notes.detail.archive.confirm
player_notes.detail.archive.success
player_notes.detail.reactivate
player_notes.detail.pin
player_notes.detail.unpin

player_notes.form.title.create
player_notes.form.title.edit
player_notes.form.title.label
player_notes.form.title.placeholder
player_notes.form.body.label
player_notes.form.body.helper
player_notes.form.tags.label
player_notes.form.tags.helper
player_notes.form.pinned.label
player_notes.form.submit
player_notes.form.error.title_required

player_notes.error.forbidden
player_notes.error.not_linked_to_campaign
player_notes.error.character_not_found
player_notes.error.campaign_not_found
```

Todos os textos passam pela skill **Humanizer** antes de virarem `pt-BR.json`.

## 13. Seed

Não aplicável. Notas são conteúdo do usuário.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `PlayerNote.create` valida título (2–120), tags ≤ 10, sem duplicatas.
- `PlayerNote.setTags` rejeita tags > 30 caracteres.
- `PlayerNote.archive` define `status` e `deletedAt`.
- `PlayerNote.pin`/`unpin` alterna corretamente.
- `PlayerNoteOwnershipGuard`:
  - Rejeita se `actor.id !== character.userId`.
  - Rejeita se `characterCampaignLink` não existe ou está inativo.
  - Aceita se todas as condições OK.
- `MarkdownSanitizer` (reutilizado): remove `<script>`, `javascript:` URLs.

### 14.2 Integration tests (application + infra)

- `CreatePlayerNoteUseCase` persiste nota vinculada ao `characterCampaignLink`.
- `CreatePlayerNoteUseCase` rejeita quando vínculo não existe (`400 NOT_LINKED_TO_CAMPAIGN`).
- `CreatePlayerNoteUseCase` rejeita quando ator não é dono (`403`).
- `ListPlayerNotesUseCase` retorna apenas notas do ator para aquele vínculo.
- `ListPlayerNotesUseCase` **não** retorna notas de outra campanha (mesmo personagem).
- `ListPlayerNotesUseCase` ordena por `pinned DESC, updatedAt DESC`.
- `GetPlayerNoteUseCase` retorna `404` para nota de outro usuário (evita enumeração).
- **Mestre** tenta acessar nota de jogador → `403 FORBIDDEN` (regra dura).
- **Admin** tenta acessar nota de jogador → `403 FORBIDDEN` (regra dura).
- `UpdatePlayerNoteUseCase` gera atualização de `updatedAt`.
- `ArchivePlayerNoteUseCase` marca como arquivada.
- `ReactivatePlayerNoteUseCase` restaura.
- **Isolamento:** criar 3 notas na campanha A → vincular personagem a campanha B → listar notas da campanha B → retorna vazio.
- **Reativação:** desvincular personagem → notas ficam inacessíveis → revincular → notas voltam.
- Rate limit bloqueia após 120 notas em 1h.

### 14.3 E2E tests (HTTP)

- Fluxo completo: jogador cria 3 notas → fixa 1 → arquiva 1 → reativa → busca por tag.
- Fluxo de isolamento: jogador com personagem em 2 campanhas → notas não vazam.
- Fluxo de privacidade: mestre tenta acessar `GET /campaigns/:id/characters/:characterId/notes` de jogador → 403.
- Fluxo de vínculo inativo: jogador sai da campanha → tenta criar nota → `400 NOT_LINKED_TO_CAMPAIGN`.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 95% (privacidade é crítica).
- **Infra/HTTP:** ≥ 90%.

## 15. Conventional Commits esperados

```
chore(player-notes): bootstrap player note bounded context structure
feat(player-notes): add PlayerNote aggregate with character-campaign link
feat(player-notes): add PlayerNoteOwnershipGuard
feat(player-notes): implement CreatePlayerNoteUseCase
feat(player-notes): implement ListPlayerNotesUseCase with isolation
feat(player-notes): implement UpdatePlayerNoteUseCase
feat(player-notes): implement PinPlayerNoteUseCase
feat(player-notes): implement ArchivePlayerNoteUseCase
feat(player-notes): implement ReactivatePlayerNoteUseCase
feat(player-notes): add HTTP controllers with strict ownership guard
feat(web): add player notes tab inside campaign character view
feat(web): add player note form with markdown editor
feat(web): add player note list with pin and tags
feat(web): add player note detail page
test(player-notes): add unit tests for ownership guard
test(player-notes): add integration tests for isolation between campaigns
test(player-notes): add e2e tests for master privacy enforcement
docs(player-notes): document player notes isolation and privacy rules
```

## 16. Critérios de Aceite

- [ ] Jogador cria nota vinculada a um par (character, campaign).
- [ ] Nota é **privada do jogador** — mestre e admin não acessam (nem por endpoint, nem por UI).
- [ ] Notas **não vazam** entre campanhas, mesmo com o mesmo personagem.
- [ ] Aba "Anotações" aparece **apenas** na ficha vista dentro da campanha, e **apenas** para o dono.
- [ ] Criar nota exige vínculo ativo; erro claro quando não há.
- [ ] Título 2–120, corpo ≤ 50.000, tags ≤ 10 (cada 1–30).
- [ ] Busca por título + corpo + tags.
- [ ] Ordenação: fixadas primeiro, depois mais recentes.
- [ ] Arquivamento e reativação funcionam.
- [ ] Notas de vínculo arquivado ficam inacessíveis; voltam se vínculo for reativado.
- [ ] Markdown sanitizado.
- [ ] Soft delete universal.
- [ ] Cobertura mínima da §14.4 atingida.
- [ ] Todas as strings passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Notas vivem no par **(character, campaign)** via `characterCampaignLinkId`.
- **Nem mestre, nem admin** têm acesso às notas (privacidade dura).
- Aba "Anotações" aparece **apenas** para o dono, **apenas** na visão da ficha dentro da campanha.
- Notas **não** aparecem na ficha global (`/characters/:id`).
- Markdown sanitizado (mesmo sanitizer da Spec 06).
- Sem WebSocket, sem broadcast, sem indexação em busca global.
- Soft delete universal.
- Sem anexos, sem imagens, sem exportação (fora do MVP).

### 17.2 Pendências para o autor aprovar antes da implementação

- **Notas de vínculo inativo:** quando o jogador sai da campanha (vínculo arquivado), as notas ficam inacessíveis mas permanecem no banco. Se o jogador reentrar, as notas voltam. Confirma? **Recomendação:** sim. **Aguardando confirmação.**
- **Busca global:** notas **não** entram na Command Palette (`Ctrl/Cmd+K`)? **Recomendação:** não entram (privacidade + evitar confusão de contexto). **Aguardando confirmação.**
- **Acesso do admin em caso de suporte:** em situação extrema (ex.: jogador reporta bug), o admin precisa acessar? **Recomendação:** **não** no MVP. Se for necessário no futuro, criar procedimento especial auditado. **Aguardando confirmação.**
- **Tags livres ou pré-definidas:** o autor prefere que as tags sejam livres (como em Eventos) ou sugere um catálogo pré-cadastrado (ex.: "Sessão", "NPC", "Objetivo")? **Recomendação:** tags livres. **Aguardando confirmação.**
- **Ordenação fixa vs. customizável:** `pinned DESC, updatedAt DESC` (fixo) ou o jogador pode reordenar manualmente? **Recomendação:** fixo (simples e previsível). **Aguardando confirmação.**
- **Notas em fichas não vinculadas:** se o personagem não está vinculado a nenhuma campanha, não há espaço de notas. Confirma? **Recomendação:** sim (notas vivem no vínculo). **Aguardando confirmação.**

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
- Spec 11: aprovado integralmente (persistência em memória, descartar cartas em re-sorteio, DeckStatus só para mestre, empilhar banners de Curinga).
