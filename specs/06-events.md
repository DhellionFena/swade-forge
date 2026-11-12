> **Nota de nomenclatura:** esta spec trata dos **Eventos/Marcos narrativos** que o mestre registra para organizar cenas e cenários. **Não confundir** com `CampaignEvent` (audit log técnico) da Spec 02, que vive no bounded context `Campaign`. São conceitos diferentes, em bounded contexts diferentes.
>
> **Ponto de atenção (§17.2):** a resposta do autor em Q11 contém uma frase que precisa de interpretação — "é interessante na visão do jogador ele poder escrever e salvar esses registros em algum espaço do sistema". A Q42 responde "Não" sobre o jogador ver eventos do mestre. **Essas duas respostas juntas sugerem que o jogador precisa de um espaço próprio de anotações.** Esta spec entrega apenas os eventos do mestre (confirmado em Q41/Q42/Q43); o "espaço do jogador" fica como **pendência** para aprovação.

# Spec 06 — Eventos e Marcos

## 1. Objetivo

Definir o bounded context de **Story** do Forja Selvagem: como o **mestre** registra **Eventos/Marcos** narrativos (cenas, cenários, sessões, anotações) para organizar sua campanha, com título, descrição rica, datas, imagens, etiquetas e ordenação manual. Tudo é **privado do mestre** e nunca visível aos jogadores.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação, edição, arquivamento e reativação de eventos pelo mestre.
- Campos: título, descrição (com markdown básico), data real, data in-game, imagens (até 10), etiquetas livres, `kind`.
- Ordenação manual (arrastar e soltar) com persistência.
- Busca por título, descrição e etiquetas.
- Filtros por `kind` e por etiquetas.
- Upload e remoção individual de imagens.
- Log de alterações (opcional).
- Soft delete universal.
- **Privacidade total:** nenhum endpoint expõe eventos para jogadores.

### 2.2 Fora do escopo

- **Espaço de anotações do jogador** (pendência — §17.2).
- Compartilhamento de eventos entre campanhas.
- Comentários, curtidas, reações.
- Notificações (e-mail, push).
- Exportação para PDF/JSON.
- Rich text (HTML) livre — apenas markdown sanitizado.
- Versionamento de conteúdo (apenas log de alterações, se aprovado).
- Calendário visual com navegação por mês (pode virar evolução).
- Eventos recorrentes.
- Integração com Progresso de personagens (Spec 03 Q18/Q44 — Progresso é manual).

## 3. Atores e Permissões

### 3.1 Definições

- **Mestre da campanha:** owner da campanha (`campaign.ownerId`).
- **Admin:** superusuário com acesso para moderação.

### 3.2 Matriz

| Ação                      | Mestre (owner) | Admin | Jogador |
| ------------------------- | -------------- | ----- | ------- |
| Criar evento              | ✅             | ✅    | ❌      |
| Listar eventos            | ✅             | ✅    | ❌      |
| Ver evento                | ✅             | ✅    | ❌      |
| Editar evento             | ✅             | ✅    | ❌      |
| Arquivar/reativar evento  | ✅             | ✅    | ❌      |
| Reordenar eventos         | ✅             | ✅    | ❌      |
| Adicionar/remover imagens | ✅             | ✅    | ❌      |
| Ver log de alterações     | ✅             | ✅    | ❌      |

> **Regra:** eventos **nunca** aparecem em endpoints, WebSocket ou visões de jogador.

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Story`

#### 4.1.1 Agregado: `StoryEvent` (raiz)

**Atributos:**

- `id`: UUID v4
- `campaignId`: UUID (referencia `campaigns.id`)
- `ownerId`: UUID (referencia `users.id`; deve ser igual a `campaign.ownerId`)
- `title`: string (2–120 caracteres)
- `description`: string (markdown, 0–50000 caracteres)
- `kind`: enum (`nota` | `marco` | `cena` | `sessao`) — default `nota`
- `eventDate`: Date | null (data do evento no mundo real ou fictício)
- `inGameDate`: string | null (0–100 caracteres; ex.: "12 de Ventoso, 1452")
- `tags`: string[] (até 10 etiquetas, cada 1–30 caracteres)
- `orderIndex`: integer (0..N-1; reordenável)
- `status`: `'active' | 'archived'`
- `createdAt`, `updatedAt`, `deletedAt`

**Invariantes:**

1. `campaignId` referencia campanha ativa.
2. `ownerId` = `campaign.ownerId`.
3. `title` entre 2 e 120 caracteres, sem caracteres de controle.
4. `description` ≤ 50.000 caracteres.
5. `tags`: máximo 10; cada uma entre 1 e 30 caracteres, sem duplicatas (case-insensitive), sem espaços nas pontas.
6. `orderIndex` único por campanha (entre eventos ativos).
7. `kind` ∈ `{ nota, marco, cena, sessao }`.
8. `inGameDate` ≤ 100 caracteres.
9. Arquivamento é lógico.

**Métodos:**

- `rename(newTitle)`
- `changeDescription(newDescription)`
- `changeKind(newKind)`
- `changeDates(eventDate, inGameDate)`
- `setTags(tags)`
- `reorder(newIndex)`
- `addImage(image)`, `removeImage(imageId)`
- `archive()`, `reactivate()`

**Domain Events:**

- `StoryEventCreated`
- `StoryEventUpdated`
- `StoryEventReordered`
- `StoryEventArchived`
- `StoryEventReactivated`

#### 4.1.2 Entidade: `StoryEventImage`

- `id`: UUID v4
- `eventId`: UUID
- `url`: string (caminho servido pelo endpoint autenticado — Spec 09)
- `caption`: string | null (0–200 caracteres)
- `position`: integer (0..9; ordem de exibição)
- `uploadedAt`: Date
- `deletedAt`: Date | null (soft delete por imagem)

**Invariantes:**

1. Um evento ativo pode ter **até 10 imagens ativas**.
2. `position` único por evento (entre imagens ativas).
3. Formatos aceitos: `.png`, `.jpg`, `.jpeg`, `.webp`. Tamanho máximo: **5 MB** por arquivo.

#### 4.1.3 Entidade: `StoryEventChangeLog` (opcional — ver §17.2)

Append-only.

- `id`, `eventId`, `actorId`, `changeType`, `fieldName`, `oldValue`, `newValue`, `createdAt`

#### 4.1.4 Value Objects

| VO                | Regra                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| `StoryEventTitle` | Trim, 2–120 caracteres.                                                              |
| `StoryEventKind`  | Enum fechado.                                                                        |
| `StoryEventTag`   | Trim, 1–30 caracteres, sem espaços internos consecutivos, lowercase para comparação. |
| `MarkdownContent` | String bruta; sanitizada na apresentação.                                            |

### 4.2 Repositórios

- `IStoryEventRepository`: `findById`, `listByCampaign(paginated, filters)`, `getNextOrderIndex`, `save`, `reorder(orderedIds)`
- `IStoryEventImageRepository`: `listByEvent`, `save`, `findById`, `softDelete`
- `IStoryEventChangeLogRepository`: `create`, `listByEvent`

### 4.3 Serviços de domínio

- **`StoryEventOrderer`**: gerencia a renumeração densa de `orderIndex` quando o mestre reordena.
- **`MarkdownSanitizer`**: garante que o markdown é renderizado com sanitização (sem HTML bruto, sem scripts). Aplicado na camada de apresentação, não no domínio.

### 4.4 Casos de uso (application layer)

| Caso de uso                    | Ator         | Descrição                          |
| ------------------------------ | ------------ | ---------------------------------- |
| `CreateStoryEventUseCase`      | Mestre/Admin | Cria evento no fim da lista.       |
| `ListStoryEventsUseCase`       | Mestre/Admin | Lista com filtros e busca.         |
| `GetStoryEventUseCase`         | Mestre/Admin | Retorna evento completo.           |
| `UpdateStoryEventUseCase`      | Mestre/Admin | Edita campos.                      |
| `ReorderStoryEventsUseCase`    | Mestre/Admin | Recebe lista de IDs na nova ordem. |
| `ArchiveStoryEventUseCase`     | Mestre/Admin | Soft delete.                       |
| `ReactivateStoryEventUseCase`  | Mestre/Admin | Reverte soft delete.               |
| `UploadStoryEventImageUseCase` | Mestre/Admin | Upload e vínculo.                  |
| `RemoveStoryEventImageUseCase` | Mestre/Admin | Soft delete de uma imagem.         |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Criar evento

1. Mestre abre campanha → aba "Eventos" → "Novo evento".
2. Preenche:
   - `title` (obrigatório).
   - `description` (opcional, markdown).
   - `kind` (default `nota`).
   - `eventDate` (opcional).
   - `inGameDate` (opcional).
   - `tags` (opcional, até 10).
   - imagens (opcional, até 10).
3. Sistema calcula `orderIndex = max(orderIndex) + 1` na campanha.
4. Valida e persiste.
5. Emite `StoryEventCreated`.
6. Retorna o evento criado.

### 5.2 Fluxo: Listar eventos

1. Mestre abre aba "Eventos".
2. Sistema retorna eventos ativos da campanha, ordenados por `orderIndex` ascendente.
3. Filtros opcionais: `kind`, `tags` (intersecção), busca textual (título + descrição).
4. Paginação padrão 20 por página, com opção "mostrar tudo" para campanhas pequenas.

### 5.3 Fluxo: Editar evento

1. Mestre abre evento → edita.
2. Validação (título, tamanho, tags).
3. Persiste e emite `StoryEventUpdated`.
4. Grava `StoryEventChangeLog` (se habilitado — §17.2).

### 5.4 Fluxo: Reordenar eventos

1. Mestre abre aba "Eventos" → arrasta e solta um ou mais eventos.
2. Frontend envia `PATCH /campaigns/:id/events/reorder` com `{ orderedIds: [uuid, ...] }`.
3. Backend valida que **todos** os IDs pertencem à campanha e que a lista contém exatamente os eventos ativos da campanha (nenhum faltando, nenhum extra).
4. `StoryEventOrderer` renumera `orderIndex` de 0 a N-1.
5. Persiste em transação.
6. Emite `StoryEventReordered`.
7. Retorna 204.

**Erro:** se a lista não corresponde exatamente aos eventos ativos, retorna `409 ORDER_MISMATCH` com `details.expectedIds[]` (para o frontend recarregar).

### 5.5 Fluxo: Arquivar evento

1. Mestre clica "Arquivar".
2. Sistema define `status = 'archived'`, `deletedAt = now()`.
3. Evento não aparece mais na lista ativa.
4. `orderIndex` pode permanecer como está (não renumeramos automaticamente).
5. Mestre pode reativar via `POST /story-events/:id/reactivate`.
6. Emite `StoryEventArchived`.

### 5.6 Fluxo: Upload de imagem

1. Mestre abre evento → "Adicionar imagem".
2. Frontend faz **upload em duas etapas**:
   - `POST /story-events/:id/images` (multipart) com o arquivo.
   - Backend valida MIME, tamanho e quantidade, salva em volume (Spec 09), retorna `{ id, url }`.
3. Mestre pode adicionar `caption` em seguida via `PATCH /story-events/:id/images/:imageId`.
4. Emite `StoryEventUpdated`.

**Limites:**

- Máximo 10 imagens ativas por evento.
- Máximo 5 MB por arquivo.
- Formatos: `image/png`, `image/jpeg`, `image/webp`.

### 5.7 Fluxo: Remover imagem

1. Mestre abre evento → clica no "X" da imagem.
2. Sistema marca `deletedAt = now()` na imagem (não remove o arquivo físico imediatamente).
3. Job de limpeza (Spec 09) remove arquivos órfãos periodicamente.
4. Emite `StoryEventUpdated`.

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação e autorização (`campaign.ownerId === actor.id` ou `actor.role === 'admin'`). Caso contrário, `403 FORBIDDEN`.

### 6.1 Eventos

#### `POST /campaigns/:campaignId/events`

**Body:**

```json
{
  "title": "string (2-120)",
  "description": "string (markdown, ≤50000)",
  "kind": "nota|marco|cena|sessao",
  "eventDate": "2026-11-11T00:00:00Z|null",
  "inGameDate": "string (≤100)|null",
  "tags": ["string"]
}
```
````

**Resposta 201:** evento completo.
**Erros:** `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 CAMPAIGN_NOT_FOUND`.

#### `GET /campaigns/:campaignId/events`

**Query:** `?kind=&tags=tag1,tag2&search=&page=1&perPage=20&status=active|archived`
**Resposta 200:** `{ data: [...], meta: {...} }` ordenado por `orderIndex` ASC.
**Nota:** `search` faz full-text em título + descrição + tags.

#### `GET /story-events/:id`

**Resposta 200:** evento completo com imagens.
**Erros:** `404 NOT_FOUND`, `403 FORBIDDEN`.

#### `PATCH /story-events/:id`

**Body:** subconjunto do `POST`.
**Resposta 200:** evento atualizado.
**Erros:** `400 VALIDATION_ERROR`, `403`, `404`.

#### `DELETE /story-events/:id`

**Resposta 204** (soft delete).

#### `POST /story-events/:id/reactivate`

**Resposta 200.**

#### `PATCH /campaigns/:campaignId/events/reorder`

**Body:** `{ "orderedIds": ["uuid", "uuid", ...] }`
**Resposta 204.**
**Erros:** `400 VALIDATION_ERROR`, `409 ORDER_MISMATCH` com `details.expectedIds[]`.

### 6.2 Imagens

#### `POST /story-events/:id/images`

**Content-Type:** `multipart/form-data`
**Body:** `file` (obrigatório), `caption` (opcional, ≤200).
**Resposta 201:** `{ id, url, caption, position }`.
**Erros:** `400 INVALID_FILE_TYPE`, `400 FILE_TOO_LARGE` (≤5 MB), `400 TOO_MANY_IMAGES` (≤10), `403`, `404`.

#### `PATCH /story-events/:id/images/:imageId`

**Body:** `{ "caption": "string" }`
**Resposta 200.**

#### `DELETE /story-events/:id/images/:imageId`

**Resposta 204** (soft delete).

### 6.3 Log

#### `GET /story-events/:id/changelog`

**Query:** `?page=1&perPage=20`
**Resposta 200:** lista de `StoryEventChangeLog` (se habilitado — §17.2).

## 7. Regras de Negócio

**RN-EVENT-01** — Eventos são **exclusivos do mestre** e nunca visíveis a jogadores.
**RN-EVENT-02** — `ownerId` do evento = `campaign.ownerId`.
**RN-EVENT-03** — Título entre 2 e 120 caracteres, sem caracteres de controle.
**RN-EVENT-04** — Descrição ≤ 50.000 caracteres, aceita markdown (sanitizado na apresentação).
**RN-EVENT-05** — Máximo 10 etiquetas por evento; cada uma entre 1 e 30 caracteres; sem duplicatas (case-insensitive).
**RN-EVENT-06** — Máximo 10 imagens ativas por evento.
**RN-EVENT-07** — Cada imagem ≤ 5 MB e com MIME ∈ `{ image/png, image/jpeg, image/webp }`.
**RN-EVENT-08** — `orderIndex` é único por campanha entre eventos ativos.
**RN-EVENT-09** — Reordenação renumera `orderIndex` de 0 a N-1 (denso).
**RN-EVENT-10** — Arquivamento é lógico; `orderIndex` não é renumerado automaticamente ao arquivar.
**RN-EVENT-11** — Remoção de imagem é lógica; arquivo físico é removido por job periódico (Spec 09).
**RN-EVENT-12** — `kind` ∈ `{ nota, marco, cena, sessao }` (default `nota`).
**RN-EVENT-13** — Eventos arquivados não aparecem na listagem padrão (`status=active`).
**RN-EVENT-14** — Reordenação exige a lista **exata** de eventos ativos da campanha (nenhum a mais, nenhum a menos).
**RN-EVENT-15** — Full-text search usa índice Postgres em `title`, `description` e `tags`.
**RN-EVENT-16** — Log de alterações é append-only (se habilitado).
**RN-EVENT-17** — Nenhum evento é deletado fisicamente (soft delete universal).

## 8. Segurança

- **Autorização:** guard `StoryEventAccessGuard` verifica `campaign.ownerId === actor.id` ou `actor.role === 'admin'`.
- **Enumeração:** `GET /story-events/:id` retorna `404` se o ator não é o dono da campanha (não diferencia "não existe").
- **Upload:** validação de MIME + assinatura do arquivo + tamanho. Nunca confiar no `Content-Type` do cliente.
- **Sanitização:** markdown é renderizado com sanitizer (sem HTML bruto, sem scripts, sem `javascript:` URLs).
- **CSRF:** mesmas diretrizes da Spec 01.
- **Rate limit:** criação de eventos limitada a **120 por hora por campanha** (evita abuso).
- **Privacidade:** nenhum evento é emitido via WebSocket (não há broadcast).

## 9. UX

### 9.1 Jornadas

- **Mestre — preparação:** abre campanha → aba "Eventos" → cria evento novo, associa imagens, etiqueta.
- **Mestre — consulta em jogo:** abre aba "Eventos" → busca/filtra → lê rápido.
- **Mestre — reorganização:** arrasta eventos na lista para reordenar conforme a ordem da narrativa.

### 9.2 Telas necessárias

- **`/campaigns/:id/events`** — lista/kanban de eventos com:
  - Busca no topo.
  - Filtros: `kind` (chips), tags (multi-select).
  - Lista ordenada por `orderIndex`, com drag-and-drop para reordenar.
  - Cada card mostra: título, `kind` (badge), `eventDate`/`inGameDate`, thumbnail da primeira imagem, até 3 tags.
  - CTA "Novo evento" no topo.
- **`/story-events/:id`** — detalhe do evento:
  - Cabeçalho: título, `kind`, datas, botão editar, botão arquivar.
  - Corpo: descrição em markdown renderizado.
  - Galeria de imagens (grid).
  - Tags como chips.
  - Aba "Log" (se habilitado).
- **`/story-events/:id/edit`** — formulário de edição.
- **`/story-events/new`** — formulário de criação (pode ser modal sobre a lista).

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton na lista/detalhe.
- **Empty:** "Nenhum evento ainda. Registre sua primeira cena."
- **Error:** toast + inline.
- **Success:** toast.
- **Ordenação:** feedback visual ao arrastar (sombra, placeholder).
- **Upload:** dropzone com preview e progresso.
- **Marcadores de `kind`:** cores distintas (nota cinza, marco dourado, cena azul, sessão verde).

### 9.4 Microcopy (via Humanizer)

- "Registre cenas, marcos e sessões para organizar sua campanha."
- "Esses registros são privados. Seus jogadores nunca os verão."
- "Arraste para reordenar conforme a narrativa."
- "Adicione até 10 imagens por evento (mapas, ilustrações, prints)."
- "Use markdown para formatar: **negrito**, _itálico_, ## títulos, - listas."
- "Data do mundo real e data in-game são campos separados — use o que fizer sentido para sua mesa."
- "Ao arquivar um evento, ele some da lista, mas pode ser reativado depois."

## 10. Design System

Componentes novos:

- `<StoryEventCard>` — card compacto com título, `kind` badge, datas, thumbnail e tags.
- `<StoryEventKindBadge>` — badge colorida por `kind`.
- `<StoryEventList>` — lista ordenável com drag-and-drop.
- `<StoryEventForm>` — formulário de criação/edição com preview de markdown.
- `<MarkdownEditor>` — editor com abas "Editar" / "Preview".
- `<MarkdownRenderer>` — renderizador sanitizado.
- `<TagInput>` — input com chips (até 10 tags).
- `<ImageUploader>` — dropzone com preview, progresso e reordenação.
- `<ImageGallery>` — grid de imagens com lightbox e remoção.
- `<ReorderHandle>` — ícone de arrastar.
- `<DatePicker>` — para `eventDate`.
- `<ChangeLogTimeline>` — reutilizado da Spec 03.

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `story_events`

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
campaign_id    UUID NOT NULL REFERENCES campaigns(id),
owner_id       UUID NOT NULL REFERENCES users(id),
title          VARCHAR(120) NOT NULL,
description    TEXT NOT NULL DEFAULT '',
kind           VARCHAR(16) NOT NULL DEFAULT 'nota' CHECK (kind IN ('nota','marco','cena','sessao')),
event_date     TIMESTAMPTZ NULL,
in_game_date   VARCHAR(100) NULL,
tags           TEXT[] NOT NULL DEFAULT '{}',
order_index    INTEGER NOT NULL DEFAULT 0,
status         VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at     TIMESTAMPTZ NULL
```

**Índices:**

- `UNIQUE (campaign_id, order_index) WHERE deleted_at IS NULL`
- `INDEX (campaign_id, status) WHERE deleted_at IS NULL`
- `INDEX (campaign_id, kind) WHERE deleted_at IS NULL`
- `INDEX (campaign_id, event_date) WHERE deleted_at IS NULL`
- `GIN (tags)`
- `GIN (to_tsvector('portuguese', title || ' ' || description))` (full-text)

### 11.2 Tabela `story_event_images`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
event_id     UUID NOT NULL REFERENCES story_events(id) ON DELETE CASCADE,
url          VARCHAR(500) NOT NULL,
caption      VARCHAR(200) NULL,
position     INTEGER NOT NULL DEFAULT 0,
uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at   TIMESTAMPTZ NULL
```

**Índices:**

- `UNIQUE (event_id, position) WHERE deleted_at IS NULL`
- `INDEX (event_id) WHERE deleted_at IS NULL`

### 11.3 Tabela `story_event_change_log` (opcional — §17.2)

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
event_id     UUID NOT NULL REFERENCES story_events(id) ON DELETE CASCADE,
actor_id     UUID NOT NULL REFERENCES users(id),
change_type  VARCHAR(32) NOT NULL,
field_name   VARCHAR(64) NULL,
old_value    JSONB NULL,
new_value    JSONB NULL,
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

## 12. i18n

Namespace `events.*`. Chaves principais:

```
events.list.title
events.list.search.placeholder
events.list.filter.kind.all
events.list.filter.kind.nota
events.list.filter.kind.marco
events.list.filter.kind.cena
events.list.filter.kind.sessao
events.list.filter.tags.label
events.list.empty
events.list.empty.cta
events.list.new_cta
events.list.reorder_hint

events.card.kind.nota
events.card.kind.marco
events.card.kind.cena
events.card.kind.sessao
events.card.tags_count

events.form.title.create
events.form.title.edit
events.form.title.label
events.form.title.placeholder
events.form.description.label
events.form.description.helper
events.form.kind.label
events.form.event_date.label
events.form.event_date.helper
events.form.in_game_date.label
events.form.in_game_date.helper
events.form.in_game_date.placeholder
events.form.tags.label
events.form.tags.helper
events.form.tags.add
events.form.images.label
events.form.images.helper
events.form.submit
events.form.error.title_required

events.detail.actions.edit
events.detail.actions.archive
events.detail.actions.reactivate
events.detail.actions.delete_image
events.detail.archive.confirm
events.detail.archive.success
events.detail.gallery.title
events.detail.tags.title

events.upload.dropzone
events.upload.progress
events.upload.error.file_too_large
events.upload.error.too_many_images
events.upload.error.invalid_type
events.upload.success

events.reorder.error.mismatch
events.reorder.success
```

Todos os textos passam pela skill **Humanizer** antes de virarem `pt-BR.json`.

## 13. Seed

Não aplicável. Eventos são conteúdo do usuário.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `StoryEvent.create` valida título (2–120), kind válido, tags ≤ 10.
- `StoryEvent.setTags` rejeita duplicatas e tags > 30 caracteres.
- `StoryEvent.addImage` bloqueia quando já existem 10 imagens.
- `StoryEvent.reorder` recalcula `orderIndex` denso.
- `StoryEvent.archive` define `status` e `deletedAt`.
- `StoryEventOrderer` renumera 0..N-1 em qualquer ordem de entrada.
- `MarkdownSanitizer` remove `<script>`, `javascript:` URLs e HTML bruto.

### 14.2 Integration tests (application + infra)

- `CreateStoryEventUseCase` persiste com `orderIndex` correto (nextIndex).
- `UpdateStoryEventUseCase` valida e persiste.
- `ReorderStoryEventsUseCase` persiste nova ordem; rejeita lista incompleta com `409 ORDER_MISMATCH`.
- `ArchiveStoryEventUseCase` marca como arquivado e some da listagem ativa.
- `ReactivateStoryEventUseCase` restaura.
- `UploadStoryEventImageUseCase` valida MIME e tamanho; salva em volume.
- `RemoveStoryEventImageUseCase` faz soft delete.
- Listagem com `search` retorna por full-text em título + descrição + tags.
- Jogador tenta acessar → `403`.
- Admin acessa qualquer campanha → sucesso.

### 14.3 E2E tests (HTTP)

- Fluxo completo: mestre cria 3 eventos → reordena → arquiva um → reativa.
- Fluxo de upload: cria evento, envia 2 imagens, remove 1, verifica galeria.
- Fluxo de busca: cria eventos com tags distintas, busca por tag → filtra corretamente.

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 85%.

## 15. Conventional Commits esperados

```
chore(story): bootstrap story bounded context structure
feat(story): add StoryEvent aggregate with kind, dates and tags
feat(story): add StoryEventImage entity
feat(story): implement StoryEventOrderer with dense reindexing
feat(story): implement CreateStoryEventUseCase
feat(story): implement ListStoryEventsUseCase with full-text search
feat(story): implement UpdateStoryEventUseCase
feat(story): implement ReorderStoryEventsUseCase
feat(story): implement ArchiveStoryEventUseCase
feat(story): implement UploadStoryEventImageUseCase
feat(story): implement RemoveStoryEventImageUseCase
feat(story): add HTTP controllers and StoryEventAccessGuard
feat(web): add story events list with drag-and-drop
feat(web): add story event form with markdown editor
feat(web): add markdown renderer with sanitization
feat(web): add image uploader and gallery
feat(web): add story event detail page
test(story): add unit tests for reorder logic
test(story): add integration tests for image upload validation
test(story): add e2e tests for full story event lifecycle
docs(story): document story event rules and markdown policy
```

## 16. Critérios de Aceite

- [ ] Mestre cria evento com título, descrição markdown, kind, datas, tags e imagens.
- [ ] Eventos são **invisíveis** para jogadores em qualquer endpoint ou visão.
- [ ] Reordenação funciona via drag-and-drop e persiste em `orderIndex` denso.
- [ ] Arquivamento some da lista ativa; reativação restaura.
- [ ] Tags são limitadas a 10 por evento, cada uma ≤ 30 caracteres, sem duplicatas.
- [ ] Imagens: até 10 por evento, 5 MB cada, formatos PNG/JPEG/WebP.
- [ ] Markdown é renderizado com sanitização (sem scripts).
- [ ] Full-text search funciona em título, descrição e tags.
- [ ] Filtro por `kind` funciona.
- [ ] Log de alterações (se habilitado) é append-only.
- [ ] Todas as operações são soft delete.
- [ ] Todas as strings de UI passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.
- [ ] Cobertura mínima da seção 14.4 atingida.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Eventos são **privados do mestre** (Q41, Q42).
- Ordenação é **livre** e manual (drag-and-drop), persistida em `orderIndex` denso (Q43).
- Sem aplicação de Progresso via eventos — é só anotação (Q44).
- Sem "Session" como entidade separada. Sessões são eventos com `kind = 'sessao'`.
- Markdown básico com sanitização (compromisso entre rich text e texto puro).
- `eventDate` (data do mundo real) e `inGameDate` (texto livre) coexistem.
- Imagens múltiplas (até 10) por evento.
- `tags` livres para organização flexível.
- `kind` como enum fixo (`nota`, `marco`, `cena`, `sessao`) para filtros rápidos.

### 17.2 Pendências para o autor aprovar antes da implementação

- **Espaço de anotações do jogador:** em Q11, o autor escreveu "é interessante na visão do jogador ele poder escrever e salvar esses registros em algum espaço do sistema". Em Q42, respondeu que o jogador **não** vê eventos do mestre. Isso sugere que o jogador precisa de **um espaço próprio** de anotações (diário de personagem, notas de sessão, etc.). **Recomendação:** criar uma entidade `PlayerNote` (anotações privadas do jogador, opcionalmente vinculadas a personagem e/ou campanha) em **spec separada (12-player-notes.md)** ou no roadmap futuro. **Aguardando decisão.**
- **Log de alterações de eventos:** o autor não mencionou. **Recomendação:** opcional; habilitar por padrão (consistente com fichas e NPCs). **Aguardando aprovação.**
- **Múltiplas imagens por evento (até 10):** o autor disse "anexo de imagens" (plural). **Recomendação:** 10 por evento. **Aguardando confirmação.**
- **Markdown sanitizado vs. texto puro:** o autor não especificou formato. **Recomendação:** markdown com sanitizer (mais útil para notas). **Aguardando aprovação.**
- **`kind` (nota/marco/cena/sessao):** o autor não pediu categorização, mas a menção a "cenas e cenários" sugere. **Recomendação:** incluir `kind` com 4 valores; default `nota`. **Aguardando aprovação.**
- **`eventDate` vs. `inGameDate`:** o autor perguntou "data (no mundo real ou no mundo do jogo?)" mas não respondeu. **Recomendação:** ambos os campos, opcionais. **Aguardando confirmação.**
- **Calendário visual:** o autor não pediu. **Recomendação:** fora do MVP; lista ordenada é suficiente. **Aguardando confirmação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket, rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: unificação de `Npc` com `type` (aprovado), painel de combate (aprovado), imagem do NPC (aprovado), histórico de NPC (aprovado), visibilidade do bestiário (aprovado), transcrição literal do bestiário (aprovado), overrides de movimento/tamanho (aprovado).
- **Nova:** ver §17.2 sobre "espaço de anotações do jogador".
