# Spec 02 — Campanhas

## 1. Objetivo

Definir o bounded context de **Campaign** do Forja Selvagem: como mestres criam campanhas, como jogadores descobrem e entram nelas, como o acesso é controlado por senha opcional, como o mestre gerencia jogadores vinculados, e como as seções privadas (NPCs, Chefes/Inimigos, Eventos/Marcos) são organizadas dentro da campanha.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação, edição, listagem e arquivamento lógico de campanhas por mestres.
- Senha opcional por campanha (definida pelo mestre, resetável pelo admin).
- Listagem pública de campanhas (com informações de descoberta).
- Fluxo de entrada (com verificação de senha quando aplicável).
- Fluxo de saída do jogador (a qualquer momento).
- Remoção de jogador pelo mestre.
- Estrutura de sub-recursos da campanha: NPCs, Chefes/Inimigos, Eventos/Marcos, Log de Rolagens.
- Vínculo entre personagens (Spec 03) e campanhas.
- Controle de visibilidade em três níveis: **descoberta pública**, **membros**, **mestre**.

### 2.2 Fora do escopo (para outras specs)

- Detalhes do log de rolagens — **Spec 04**.
- Detalhes de NPCs e Chefes/Inimigos — **Spec 05**.
- Detalhes dos Eventos/Marcos — **Spec 06**.
- Criação de personagens — **Spec 03**.
- Iniciativa por cartas — **Spec 11**.

## 3. Atores e Matriz de Permissões

### 3.1 Definições contextuais

- **Mestre da campanha:** usuário cujo `id` é igual ao `Campaign.ownerId`. Tem privilégios de mestre **apenas dentro dessa campanha**.
- **Membro:** usuário com `CampaignMembership` ativa (`leftAt = null`). Membro não-owner é um **jogador**.
- **Não-membro:** usuário logado sem `CampaignMembership` ativa. Vê apenas informações de descoberta.

### 3.2 Matriz

| Ação                                  | Admin             | Mestre da campanha                      | Jogador membro    | Usuário logado (não-membro) |
| ------------------------------------- | ----------------- | --------------------------------------- | ----------------- | --------------------------- |
| Criar campanha                        | ✅                | ✅                                      | ❌                | ❌                          |
| Listar campanhas (descoberta pública) | ✅                | ✅                                      | ✅                | ✅                          |
| Ver detalhes públicos da campanha     | ✅                | ✅                                      | ✅                | ✅                          |
| Ver detalhes de membro                | ✅                | ✅                                      | ✅                | ❌                          |
| Entrar (se não-membro)                | ✅ (como jogador) | N/A                                     | N/A               | ✅                          |
| Sair                                  | ✅                | ❌ (master não sai da própria campanha) | ✅                | N/A                         |
| Editar campanha                       | ✅                | ✅                                      | ❌                | ❌                          |
| Resetar senha da campanha             | ✅                | ✅                                      | ❌                | ❌                          |
| Listar membros                        | ✅                | ✅                                      | ✅                | ❌                          |
| Remover membro                        | ✅                | ✅                                      | ❌                | ❌                          |
| Ver/editar fichas de membros          | ✅                | ✅                                      | ❌ (só a própria) | ❌                          |
| Acessar NPCs                          | ✅                | ✅                                      | ❌                | ❌                          |
| Acessar Chefes/Inimigos               | ✅                | ✅                                      | ❌                | ❌                          |
| Acessar Eventos/Marcos                | ✅                | ✅                                      | ❌                | ❌                          |
| Arquivar campanha (soft delete)       | ✅                | ✅                                      | ❌                | ❌                          |

> **Nota sobre o Admin:** o Admin tem acesso a todas as campanhas como superusuário (para moderação e reset de senha). Esse acesso é registrado em `campaign_events` para auditoria.

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Campaign`

#### 4.1.1 Agregado: `Campaign` (raiz)

**Atributos:**

- `id`: UUID v4
- `name`: string (2–80 caracteres)
- `description`: string (0–2000 caracteres, opcional)
- `ownerId`: UUID (referencia `users.id`, deve ter `role IN ('mestre','admin')`)
- `passwordHash`: `PasswordHash | null` (Argon2id se definida)
- `status`: `'active' | 'archived'`
- `createdAt`, `updatedAt`, `deletedAt`

**Invariantes:**

1. `name` não pode ser vazio nem exceder 80 caracteres.
2. `ownerId` deve ser um usuário ativo com papel `mestre` ou `admin`.
3. `status` só assume `'active'` ou `'archived'`.
4. Senha, quando presente, é sempre hash Argon2id (nunca texto plano).
5. Arquivamento é lógico (`status = 'archived'`, `deletedAt = now()`), nunca físico.

**Métodos:**

- `rename(newName)`
- `changeDescription(newDescription)`
- `setPassword(newPasswordHash: PasswordHash)`
- `clearPassword()`
- `archive()`
- `reactivate()`
- `hasPassword(): boolean`
- `verifyPassword(plain: string, hasher): boolean`

**Domain Events:**

- `CampaignCreated`
- `CampaignUpdated`
- `CampaignPasswordChanged`
- `CampaignPasswordCleared`
- `CampaignArchived`
- `CampaignReactivated`

#### 4.1.2 Entidade: `CampaignMembership`

**Atributos:**

- `id`: UUID v4
- `campaignId`: UUID
- `userId`: UUID (referencia `users.id`, nunca pode ser igual a `campaign.ownerId`)
- `joinedAt`: Date
- `leftAt`: Date | null (soft delete — saída/remoção)
- `removedByOwner`: boolean (true se foi removido, false se saiu por conta própria)
- `createdAt`, `updatedAt`

**Invariantes:**

1. Um usuário não pode ter duas memberships ativas (`leftAt = null`) na mesma campanha.
2. `userId` não pode ser igual a `ownerId` da campanha.
3. Se `leftAt` está definido, `removedByOwner` registra a origem.

**Métodos:**

- `leave()`
- `remove(byOwnerId: UUID)`

**Domain Events:**

- `CampaignMemberJoined`
- `CampaignMemberLeft`
- `CampaignMemberRemoved`

#### 4.1.3 Entidade: `CampaignEvent` (auditoria de campanha)

- `id`: UUID v4
- `campaignId`: UUID
- `actorId`: UUID
- `eventType`: enum (`created`, `updated`, `password_changed`, `password_cleared`, `password_reset_by_admin`, `archived`, `reactivated`, `member_joined`, `member_left`, `member_removed`, `admin_accessed`)
- `metadata`: JSONB (opcional)
- `createdAt`: Date

> **Nota:** não confundir `CampaignEvent` (auditoria técnica) com **Eventos/Marcos** (anotações de narrativa do mestre — Spec 06).

### 4.2 Value Objects

| VO                     | Regra                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| `CampaignName`         | Trim, 2–80 caracteres, sem caracteres de controle.                      |
| `CampaignDescription`  | Trim, 0–2000 caracteres, permite quebras de linha, sanitização de HTML. |
| `CampaignPasswordHash` | Argon2id, mesma configuração da senha de usuário.                       |

### 4.3 Repositórios

- `ICampaignRepository`: `findById`, `findActiveByOwner`, `listActive(paginated, filters)`, `save`
- `ICampaignMembershipRepository`: `findActiveByCampaign`, `findActiveByUserAndCampaign`, `listByCampaign(paginated)`, `save`, `existsActive`
- `ICampaignEventRepository`: `create`, `listByCampaign`

### 4.4 Serviços de domínio

- `CampaignPasswordPolicy`: valida senha (mín. 8 caracteres, máx. 64). Mais simples que a de usuário.
- `CampaignAccessGuard`: verifica permissões de acesso a uma campanha (owner, member, non-member, admin).

### 4.5 Casos de uso (application layer)

| Caso de uso                           | Ator               | Descrição                                                                |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `CreateCampaignUseCase`               | Mestre/Admin       | Cria campanha, associa owner, registra evento.                           |
| `ListCampaignsUseCase`                | Autenticado        | Lista campanhas ativas com paginação, busca e filtro "minhas/descobrir". |
| `GetCampaignUseCase`                  | Autenticado        | Retorna detalhes conforme nível de visibilidade.                         |
| `UpdateCampaignUseCase`               | Owner/Admin        | Altera nome/descrição.                                                   |
| `SetCampaignPasswordUseCase`          | Owner/Admin        | Define/atualiza a senha.                                                 |
| `ClearCampaignPasswordUseCase`        | Owner/Admin        | Remove a senha (campanha passa a ser aberta).                            |
| `ResetCampaignPasswordByAdminUseCase` | Admin              | Reset de senha como última instância.                                    |
| `JoinCampaignUseCase`                 | Autenticado        | Entra na campanha (verificando senha, se houver).                        |
| `LeaveCampaignUseCase`                | Membro             | Sai da campanha.                                                         |
| `RemoveMemberUseCase`                 | Owner/Admin        | Remove um membro.                                                        |
| `ListMembersUseCase`                  | Membro/Owner/Admin | Lista membros ativos.                                                    |
| `ArchiveCampaignUseCase`              | Owner/Admin        | Soft delete da campanha.                                                 |
| `ReactivateCampaignUseCase`           | Owner/Admin        | Reverte arquivamento.                                                    |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Criar campanha

1. Mestre envia `POST /campaigns` com `{ name, description?, password? }`.
2. Sistema valida `name` e `description`.
3. Se `password` fornecida, valida contra `CampaignPasswordPolicy` e faz hash Argon2id.
4. Persiste `Campaign` com `ownerId = usuário logado`, `status = 'active'`.
5. Emite `CampaignCreated`, grava `CampaignEvent (created)`.
6. Retorna a campanha criada.

### 5.2 Fluxo: Listar campanhas (descoberta)

1. Usuário envia `GET /campaigns?view=all|mine|owned&page&perPage&search`.
2. `view=all` (padrão): retorna todas as campanhas ativas com **informações de descoberta**.
3. `view=mine`: retorna campanhas onde o usuário é membro **ou** owner.
4. `view=owned`: retorna campanhas onde o usuário é owner.
5. **Informações de descoberta** incluem: `id`, `name`, `description`, `hasPassword`, `memberCount`, `owner.displayName`, `isMember`, `isOwner`.
6. Informações completas (membros, fichas, seções) exigem `GET /campaigns/:id` com nível de acesso adequado.

### 5.3 Fluxo: Entrar na campanha

1. Usuário envia `POST /campaigns/:id/join` com `{ password? }`.
2. Sistema verifica se a campanha existe, está `active` e o usuário não é membro ativo.
3. Se a campanha tem senha: verifica `password` com Argon2.
   - Senha errada → `403 INVALID_CAMPAIGN_PASSWORD`.
   - Senha ausente → `400 PASSWORD_REQUIRED`.
4. Cria `CampaignMembership`.
5. Emite `CampaignMemberJoined`, grava `CampaignEvent (member_joined)`.
6. Retorna os detalhes da campanha (nível membro).

### 5.4 Fluxo: Sair da campanha

1. Membro envia `DELETE /campaigns/:id/leave`.
2. Sistema valida que o usuário é membro ativo.
3. Define `leftAt = now()`, `removedByOwner = false`.
4. Emite `CampaignMemberLeft`, grava `CampaignEvent (member_left)`.
5. Retorna 204.

> **Efeito colateral (Spec 03):** os vínculos de personagens do usuário àquela campanha são arquivados (soft delete) automaticamente. As fichas em si **não** são afetadas — são globais.

### 5.5 Fluxo: Mestre remove membro

1. Owner envia `DELETE /campaigns/:id/members/:userId`.
2. Sistema valida que é owner (ou admin) e que `userId` é membro ativo e ≠ `ownerId`.
3. Define `leftAt = now()`, `removedByOwner = true`.
4. Emite `CampaignMemberRemoved`, grava `CampaignEvent (member_removed)`.
5. Retorna 204.

### 5.6 Fluxo: Editar campanha

1. Owner envia `PATCH /campaigns/:id` com `{ name?, description? }`.
2. Sistema valida campos fornecidos.
3. Atualiza e emite `CampaignUpdated`, grava `CampaignEvent (updated)`.
4. Retorna campanha atualizada.

### 5.7 Fluxo: Definir / alterar senha da campanha

1. Owner envia `PUT /campaigns/:id/password` com `{ password }`.
2. Valida contra `CampaignPasswordPolicy` (8–64 caracteres).
3. Faz hash Argon2id e persiste.
4. Emite `CampaignPasswordChanged`, grava `CampaignEvent (password_changed)`.
5. **Todas as sessões não são afetadas** — o password da campanha não é o password do usuário.
6. Retorna 204.

### 5.8 Fluxo: Remover senha da campanha

1. Owner envia `DELETE /campaigns/:id/password`.
2. Define `passwordHash = null`.
3. Emite `CampaignPasswordCleared`, grava `CampaignEvent (password_cleared)`.
4. Retorna 204.

### 5.9 Fluxo: Admin reseta senha (última instância)

1. Admin envia `POST /admin/campaigns/:id/reset-password` com `{ newPassword? }`.
2. Se `newPassword` fornecida, valida e aplica. Se nula, remove a senha.
3. Grava `CampaignEvent (password_reset_by_admin)` com `actorId = adminId`.
4. Retorna 204.

### 5.10 Fluxo: Arquivar campanha

1. Owner envia `DELETE /campaigns/:id`.
2. Sistema arquiva a campanha (`status = 'archived'`, `deletedAt = now()`).
3. Todas as `CampaignMembership` ativas recebem `leftAt = now()`.
4. A campanha **não** aparece mais na listagem pública.
5. Owner pode reativar via `POST /campaigns/:id/reactivate`.
6. Retorna 204.

## 6. Contratos de API

Base URL: `/api/v1`. Todas as rotas exigem autenticação (Spec 01), exceto quando explicitamente indicado.

### 6.1 Campanhas

#### `POST /campaigns`

**Body:** `{ name, description?, password? }`
**Resposta 201:** campanha criada (detalhes completos).
**Erros:** `400 VALIDATION_ERROR`, `403 NOT_A_MASTER`.

#### `GET /campaigns`

**Query:** `?view=all|mine|owned&page=1&perPage=20&search=`
**Resposta 200:** `{ data: [...], meta: { page, perPage, total, totalPages } }`
**Nota:** cada item contém apenas informações de descoberta.

#### `GET /campaigns/:id`

**Resposta 200:** detalhes conforme nível de acesso:

- Não-membro: descoberta + contagem de membros.
- Membro: detalhes + lista de membros + fichas vinculadas (resumo).
- Owner/Admin: tudo acima + seções privadas (NPCs, Chefes, Eventos) como links para endpoints específicos.
  **Erros:** `404 CAMPAIGN_NOT_FOUND`, `403 NOT_A_MEMBER`.

#### `PATCH /campaigns/:id`

**Body:** `{ name?, description? }`
**Resposta 200:** campanha atualizada.
**Erros:** `403 NOT_THE_OWNER`, `404`.

#### `DELETE /campaigns/:id`

**Resposta 204.**
**Erros:** `403 NOT_THE_OWNER`, `404`.

#### `POST /campaigns/:id/reactivate`

**Resposta 200:** campanha reativada.
**Erros:** `403`, `404`.

### 6.2 Senha da campanha

#### `PUT /campaigns/:id/password`

**Body:** `{ password }`
**Resposta 204.**
**Erros:** `400 WEAK_PASSWORD`, `403`.

#### `DELETE /campaigns/:id/password`

**Resposta 204.**
**Erros:** `403`, `404`.

#### `POST /admin/campaigns/:id/reset-password`

**Body:** `{ newPassword? }`
**Resposta 204.**
**Erros:** `403 NOT_AN_ADMIN`, `404`.

### 6.3 Membros

#### `POST /campaigns/:id/join`

**Body:** `{ password? }`
**Resposta 200:** campanha com nível de membro.
**Erros:** `400 PASSWORD_REQUIRED`, `403 INVALID_CAMPAIGN_PASSWORD`, `409 ALREADY_A_MEMBER`, `404`.

#### `DELETE /campaigns/:id/leave`

**Resposta 204.**
**Erros:** `409 NOT_A_MEMBER`, `404`.

#### `GET /campaigns/:id/members`

**Query:** `?page=1&perPage=20&search=`
**Resposta 200:** `{ data: [...], meta: {...} }`
**Nota:** disponível apenas para membros, owner e admin.

#### `DELETE /campaigns/:id/members/:userId`

**Resposta 204.**
**Erros:** `403 NOT_THE_OWNER`, `404 MEMBER_NOT_FOUND`, `409 CANNOT_REMOVE_OWNER`.

### 6.4 Eventos de auditoria da campanha

#### `GET /campaigns/:id/events`

**Query:** `?page=1&perPage=20&eventType=`
**Resposta 200:** lista de `CampaignEvent`.
**Nota:** disponível apenas para owner e admin.

## 7. Regras de Negócio

**RN-CAMP-01** — Apenas usuários com papel global `mestre` ou `admin` podem criar campanhas.
**RN-CAMP-02** — O `ownerId` de uma campanha é imutável após a criação (não há transferência de posse no MVP).
**RN-CAMP-03** — Um usuário não pode ter duas memberships ativas na mesma campanha.
**RN-CAMP-04** — O `ownerId` nunca pode ser membro (`CampaignMembership`).
**RN-CAMP-05** — Nome da campanha é único entre campanhas ativas do mesmo `ownerId` (evita duplicatas acidentais), mas pode repetir entre campanhas de owners diferentes.
**RN-CAMP-06** — Senha da campanha, quando definida, tem entre 8 e 64 caracteres. Não exige complexidade mínima (é uma senha de acesso, não de conta).
**RN-CAMP-07** — Senha nunca é armazenada em texto plano; sempre Argon2id.
**RN-CAMP-08** — Arquivamento é lógico (`status = 'archived'`, `deletedAt = now()`); nunca físico.
**RN-CAMP-09** — Ao arquivar, todas as memberships ativas recebem `leftAt = now()` automaticamente.
**RN-CAMP-10** — Ao sair ou ser removido, o vínculo do usuário com a campanha é encerrado, mas os personagens vinculados (Spec 03) são arquivados, não deletados.
**RN-CAMP-11** — O `ownerId` não pode sair da própria campanha (não tem botão "sair"). Para encerrar, o owner arquiva.
**RN-CAMP-12** — Admin pode acessar qualquer campanha, mas o acesso é registrado em `CampaignEvent (admin_accessed)` com `actorId = adminId`.
**RN-CAMP-13** — A listagem pública de campanhas nunca expõe `passwordHash`, membros, fichas ou seções privadas.
**RN-CAMP-14** — Campanhas arquivadas não aparecem na listagem pública nem em `view=all`.
**RN-CAMP-15** — Campanhas arquivadas continuam acessíveis ao owner via `view=owned`.
**RN-CAMP-16** — Verificação de senha de campanha usa comparação constant-time (Argon2 `verify`).
**RN-CAMP-17** — Um usuário que é owner de uma campanha **não** pode se juntar como membro dela.
**RN-CAMP-18** — Se um usuário é removido (`removedByOwner = true`), ele pode reentrar na campanha se ainda souber a senha (não há banimento no MVP).

## 8. Segurança

- **Autorização:** guard `CampaignAccessGuard` verifica `ownerId`, membership ativa, ou `role = 'admin'` dependendo do endpoint.
- **Senha da campanha:** verificada via Argon2 `verify` (constant-time). Nunca logada, nunca retornada em DTO.
- **Enumeração:** `GET /campaigns/:id` retorna `404` para campanhas arquivadas ou inexistentes, mesmo para membros (protege contra enumeração pós-arquivamento).
- **Rate limit no join:** **5 tentativas por 10 minutos** por `userId + campaignId` para verificação de senha de campanha. Bloqueio de 10 min após exceder.
- **Auditoria:** todas as operações sensíveis (criação, edição, senha, arquivamento, remoção de membro, acesso do admin) gravam `CampaignEvent`.
- **Sanitização:** `description` é renderizada no frontend como texto puro (sem HTML) no MVP. Sanitização de HTML rich fica para versão futura.
- **CSRF:** mesmas diretrizes da Spec 01.

## 9. UX

### 9.1 Jornadas

- **Mestre:** dashboard → "Minhas campanhas" → criar nova → configurar senha (opcional) → compartilhar (via link ou dizer a senha) → gerenciar membros → acessar seções privadas.
- **Jogador:** "Descobrir campanhas" → filtrar/buscar → ver detalhes públicos → entrar (com senha, se necessário) → ver campanha → vincular personagem (Spec 03) → ver log de rolagens (Spec 04).

### 9.2 Telas necessárias

- **`/campaigns`** (descoberta): grid de cards de campanha com busca, filtro (todas / minhas / que mestro) e indicador de senha.
- **`/campaigns/new`**: formulário com nome, descrição, senha opcional (com toggle "exigir senha").
- **`/campaigns/:id`**: página da campanha, com abas:
  - **Visão geral** (nome, descrição, dono, contagem de membros).
  - **Membros** (lista com avatar, nome, data de entrada; owner vê botão "remover").
  - **Fichas** (resumo dos personagens vinculados por membro; owner pode clicar para editar).
  - **Rolagens** (log — Spec 04).
  - **NPCs** (owner only — Spec 05).
  - **Chefes/Inimigos** (owner only — Spec 05).
  - **Eventos/Marcos** (owner only — Spec 06).
- **`/campaigns/:id/settings`** (owner): editar nome/descrição, gerenciar senha, arquivar campanha.

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton nos cards, spinner no botão de submit.
- **Empty:** "Nenhuma campanha encontrada" com CTA contextual ("Criar campanha" para mestre, "Limpar filtros" para jogador).
- **Error:** toast + mensagem inline.
- **Success:** toast de confirmação.
- **Senha:** campo de senha com toggle de visibilidade, mensagem de erro clara ("Senha incorreta").

### 9.4 Microcopy (via Humanizer)

- "Crie sua campanha e convide seus jogadores."
- "Esta campanha exige senha para entrar."
- "Você já faz parte desta campanha."
- "Ao sair da campanha, os personagens que você vinculou a ela serão arquivados. Suas fichas continuam intactas."
- "Arquivar a campanha a esconde da listagem, mas mantém tudo salvo. Você pode reativá-la depois."

## 10. Design System (referência à Spec 07)

Componentes reutilizados e novos:

- `<CampaignCard>` — card com nome, descrição curta, dono, badge de senha, badge "membro" ou "dono".
- `<CampaignTabNav>` — navegação por abas acessível.
- `<MemberList>` — lista com avatar e ações.
- `<PasswordField>` — campo com toggle.
- `<ConfirmDialog>` — para "Arquivar campanha" e "Remover membro".
- `<EmptyState>` — ilustração + mensagem + CTA.
- `<LockBadge>` — indicador de campanha com senha.

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `campaigns`

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name           VARCHAR(80) NOT NULL,
description    TEXT NOT NULL DEFAULT '',
owner_id       UUID NOT NULL REFERENCES users(id),
password_hash  TEXT NULL,
status         VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at     TIMESTAMPTZ NULL
```

````

**Índices:**

- `INDEX (owner_id) WHERE deleted_at IS NULL`
- `INDEX (status) WHERE deleted_at IS NULL`
- `INDEX (name) WHERE deleted_at IS NULL`
- `UNIQUE (owner_id, LOWER(name)) WHERE deleted_at IS NULL`

### 11.2 Tabela `campaign_memberships`

```sql
id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
campaign_id        UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
user_id            UUID NOT NULL REFERENCES users(id),
joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
left_at            TIMESTAMPTZ NULL,
removed_by_owner   BOOLEAN NOT NULL DEFAULT false,
created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**

- `UNIQUE (campaign_id, user_id) WHERE left_at IS NULL` — uma membership ativa por par.
- `INDEX (user_id) WHERE left_at IS NULL`
- `INDEX (campaign_id) WHERE left_at IS NULL`

### 11.3 Tabela `campaign_events`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
actor_id     UUID NOT NULL REFERENCES users(id),
event_type   VARCHAR(32) NOT NULL,
metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:** `INDEX (campaign_id, created_at DESC)`, `INDEX (event_type)`.

## 12. i18n

Namespace `campaigns.*`. Chaves principais:

```
campaigns.list.title
campaigns.list.search.placeholder
campaigns.list.filter.all
campaigns.list.filter.mine
campaigns.list.filter.owned
campaigns.list.empty
campaigns.list.empty.cta
campaigns.card.password_protected
campaigns.card.member
campaigns.card.owner
campaigns.card.members_count
campaigns.card.join
campaigns.card.view

campaigns.detail.tabs.overview
campaigns.detail.tabs.members
campaigns.detail.tabs.characters
campaigns.detail.tabs.rolls
campaigns.detail.tabs.npcs
campaigns.detail.tabs.enemies
campaigns.detail.tabs.events

campaigns.create.title
campaigns.create.name.label
campaigns.create.name.placeholder
campaigns.create.description.label
campaigns.create.password.toggle
campaigns.create.password.label
campaigns.create.password.helper
campaigns.create.submit

campaigns.join.title
campaigns.join.password.label
campaigns.join.submit
campaigns.join.error.invalid_password
campaigns.join.error.already_member
campaigns.join.success

campaigns.leave.confirm
campaigns.leave.success
campaigns.leave.warning_characters_archived

campaigns.remove_member.confirm
campaigns.remove_member.success

campaigns.archive.confirm
campaigns.archive.success
campaigns.archive.warning

campaigns.password.set.success
campaigns.password.clear.confirm
campaigns.password.clear.success
campaigns.password.error.weak
```

Todos os textos passam pela skill **Humanizer** antes de virarem o arquivo `pt-BR.json`.

## 13. Seed

Campanhas **não são seedadas** por padrão (são conteúdo do usuário). Apenas a estrutura do banco é criada. Nenhum dado fictício de campanha deve entrar em produção.

> **Ambiente de desenvolvimento:** a spec 09 pode definir seeds opcionais de campanhas demonstrativas, mas isso é decisão da infraestrutura, não desta spec.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `Campaign.create` valida nome, descrição, owner.
- `Campaign.setPassword` valida política de senha (8–64 caracteres).
- `Campaign.verifyPassword` retorna `true`/`false` corretamente.
- `Campaign.archive` define `status` e `deletedAt`.
- `CampaignMembership.leave` define `leftAt`.
- `CampaignMembership.remove` define `leftAt` e `removedByOwner = true`.
- `CampaignAccessGuard` identifica corretamente owner, member, non-member e admin.

### 14.2 Integration tests (application + infra)

- `CreateCampaignUseCase` persiste campanha e grava `CampaignEvent`.
- `JoinCampaignUseCase` bloqueia entrada sem senha quando exigida.
- `JoinCampaignUseCase` bloqueia senha errada com `403 INVALID_CAMPAIGN_PASSWORD`.
- `JoinCampaignUseCase` bloqueia duplicata com `409 ALREADY_A_MEMBER`.
- `LeaveCampaignUseCase` arquiva vínculos de personagem (mock do serviço da Spec 03).
- `RemoveMemberUseCase` bloqueia remoção do owner.
- `ArchiveCampaignUseCase` encerra todas as memberships ativas.
- `SetCampaignPasswordUseCase` grava hash, nunca texto plano.
- `ResetCampaignPasswordByAdminUseCase` grava `CampaignEvent` com `actorId`.
- Listagem não expõe `passwordHash` em DTO.
- Rate limit do join bloqueia após 5 tentativas em 10 min.

### 14.3 E2E tests (HTTP)

- Fluxo completo: mestre cria campanha → jogador entra → mestre remove jogador → jogador tenta reentrar com senha → consegue.
- Fluxo de arquivamento: mestre arquiva → campanha some da listagem → reativa → reaparece.
- Verificação de permissões em todos os endpoints (matriz da seção 3.2).

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 80%.

## 15. Conventional Commits esperados

```
chore(campaign): bootstrap campaign bounded context structure
feat(campaign): add Campaign aggregate and value objects
feat(campaign): add CampaignMembership entity
feat(campaign): add CampaignEvent entity for audit
feat(campaign): implement CreateCampaignUseCase
feat(campaign): implement ListCampaignsUseCase with discovery DTOs
feat(campaign): implement JoinCampaignUseCase with password verification
feat(campaign): implement LeaveCampaignUseCase
feat(campaign): implement RemoveMemberUseCase
feat(campaign): implement campaign password management
feat(campaign): implement admin password reset
feat(campaign): implement ArchiveCampaignUseCase
feat(campaign): add HTTP controllers and CampaignAccessGuard
feat(campaign): add rate limit to join endpoint
feat(web): add campaign discovery page
feat(web): add campaign detail page with tabs
feat(web): add campaign create/edit pages
feat(web): add campaign member management
test(campaign): add integration tests for password verification
test(campaign): add e2e tests for full campaign lifecycle
docs(campaign): document campaign endpoints and visibility rules
```

## 16. Critérios de Aceite

- [ ] Mestre cria campanha com e sem senha.
- [ ] Campanha com senha exige a senha correta no join.
- [ ] Campanha sem senha permite join direto.
- [ ] Usuário não pode entrar duas vezes na mesma campanha.
- [ ] Owner não pode entrar na própria campanha como membro.
- [ ] Owner pode remover membro; membro removido pode reentrar (com senha, se houver).
- [ ] Owner pode arquivar campanha; campanha some da listagem pública.
- [ ] Owner pode reativar campanha arquivada.
- [ ] `passwordHash` nunca aparece em resposta de API.
- [ ] Senha da campanha usa Argon2id.
- [ ] Admin pode resetar senha de qualquer campanha como última instância.
- [ ] Todas as operações sensíveis gravam `CampaignEvent`.
- [ ] Listagem não expõe membros, fichas ou seções privadas.
- [ ] Saída da campanha arquiva vínculos de personagem (integração com Spec 03).
- [ ] Rate limit do join funciona após 5 tentativas em 10 min.
- [ ] Matriz de permissões da seção 3.2 é respeitada em todos os endpoints.
- [ ] Todos os endpoints têm testes unitários e de integração correspondentes.
- [ ] Cobertura mínima da seção 14.4 atingida.
- [ ] Todas as strings de UI passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Campanhas **não têm visibilidade privada** no MVP — todas aparecem na listagem pública, mas senha opcional controla a entrada.
- Owner é **imutável** após criação (sem transferência de posse no MVP).
- Admin tem acesso a todas as campanhas para moderação (registrado em auditoria).
- Senha da campanha não exige complexidade (só tamanho 8–64).
- Ao sair ou ser removido, vínculos de personagem são arquivados (soft delete).
- Owner não pode sair da própria campanha — só arquivar.
- Rate limit de join: 5 tentativas por 10 min por `userId + campaignId`.
- `description` é texto puro no MVP (sem HTML rich).
- Master não tem "GMPC" no MVP (owner não pode ser membro da própria campanha).

### 17.2 Pendências para o autor aprovar antes da implementação

- **GMPC (Game Master Player Character):** o MVP **não** permite que o owner tenha um personagem na própria campanha. Se o autor quiser esse caso de uso (comum em mesas reais), precisamos adicionar suporte na Spec 03 e ajustar a invariante RN-CAMP-04. **Recomendação:** confirmar se fica fora do MVP.
- **Campanha com visibilidade privada (invisível na listagem, só por convite direto):** mencionado como possível no futuro, mas não solicitado explicitamente. **Recomendação:** confirmar se fica fora do MVP.
- **Transferência de posse da campanha:** não solicitado, mas pode ser útil em caso de saída do mestre. **Recomendação:** confirmar se fica fora do MVP.
- **Banimento de membro removido:** o membro removido pode reentrar se souber a senha. Se o autor quiser impedir reentrada, precisamos de uma entidade `CampaignBan`. **Recomendação:** confirmar se fica fora do MVP.

### 17.3 Pendências herdadas da Spec 01 (ainda abertas para o implementador)

- Algoritmo JWT (recomendação: HS256).
- Estratégia CSRF (recomendação: verificação de Origin).
- Armazenamento de rate limit (recomendação: in-memory no MVP).
- Biblioteca JWT e compatibilidade com Node 24.
````
