# Spec 01 — Autenticação e Gestão de Usuários

## 1. Objetivo

Definir o bounded context de **Auth** do Forja Selvagem: como usuários são criados, autenticados, autorizados, atualizados de papel, têm senha resetada e encerram sessão. Não há autocadastro — o Admin é o único ator que cria contas.

## 2. Escopo

### 2.1 Dentro do escopo

- Criação de usuários pelo Admin (com senha auto-gerada).
- Login por e-mail e senha.
- Logout (revogação de sessão).
- Renovação de sessão (refresh token rotation).
- Troca de senha pelo próprio usuário autenticado.
- Reset de senha pelo Admin (senha auto-gerada).
- Alteração de papel global pelo Admin (`admin` ↔ `mestre` ↔ `jogador`).
- Desativação/reativação lógica de usuário (soft delete).
- Listagem e busca de usuários para o Admin.
- Registro de eventos sensíveis em `auth_events`.
- Autenticação de WebSocket (handshake).

### 2.2 Fora do escopo

- Autocadastro público.
- Login social (OAuth).
- 2FA.
- Verificação de e-mail.
- Recuperação de senha por e-mail.
- Alteração de e-mail pelo usuário (só o Admin pode).
- Política de senha complexa para senhas geradas pelo sistema (a política se aplica apenas à troca pelo usuário).
- Auditoria completa de todas as ações.

## 3. Atores e Matriz de Permissões

### 3.1 Papéis globais

Cada usuário possui **um único papel global**, definido no cadastro e alterável apenas pelo Admin:

| Papel     | Descrição                                                                                                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`   | Administra o sistema. Cria/gerencia usuários e conteúdo de referência global (raças, vantagens, complicações, poderes, antecedentes, bestiário). Não participa de campanhas como personagem. |
| `mestre`  | Pode criar e gerenciar campanhas próprias. Em campanhas que não lhe pertencem, atua como jogador.                                                                                            |
| `jogador` | Pode criar fichas de personagem e participar de campanhas como jogador. Não cria campanhas.                                                                                                  |

> **Nota de contexto:** o papel `mestre` é global, mas o exercício do mestrado é **contextual** (depende de ser dono da campanha). Isso será detalhado na Spec 02.

### 3.2 Matriz de permissões do contexto Auth

| Ação                            | Admin | Mestre | Jogador |
| ------------------------------- | ----- | ------ | ------- |
| Criar usuário                   | ✅    | ❌     | ❌      |
| Listar usuários                 | ✅    | ❌     | ❌      |
| Alterar papel de usuário        | ✅    | ❌     | ❌      |
| Resetar senha de usuário        | ✅    | ❌     | ❌      |
| Desativar/reativar usuário      | ✅    | ❌     | ❌      |
| Login                           | ✅    | ✅     | ✅      |
| Logout                          | ✅    | ✅     | ✅      |
| Trocar própria senha            | ✅    | ✅     | ✅      |
| Ver próprio perfil (`/auth/me`) | ✅    | ✅     | ✅      |

## 4. Modelo de Domínio (DDD)

### 4.1 Bounded context: `Auth`

#### 4.1.1 Agregado: `User` (raiz)

**Atributos:**

- `id`: UUID v4
- `email`: `Email` (Value Object) — único por usuário ativo
- `passwordHash`: `PasswordHash` (Value Object)
- `displayName`: string (2–60 caracteres)
- `role`: `UserRole` (Value Object enum: `admin`, `mestre`, `jogador`)
- `status`: `'active' | 'inactive'` (soft delete via `inactive`)
- `lastLoginAt`: `Date | null`
- `createdAt`: `Date`
- `updatedAt`: `Date`
- `deletedAt`: `Date | null`

**Invariantes:**

1. `email` deve ser válido (formato RFC 5322 simplificado) e único entre usuários ativos.
2. `displayName` não pode ser vazio nem exceder 60 caracteres.
3. `role` deve ser um dos três valores do enum.
4. Um usuário com `status = 'inactive'` não pode autenticar.
5. O sistema deve sempre ter **ao menos um usuário ativo com papel `admin`**.

**Métodos do agregado:**

- `changeRole(newRole: UserRole)` — só permitido se resultar em ao menos 1 admin ativo no sistema.
- `changePassword(newPasswordHash: PasswordHash)`
- `deactivate()`
- `reactivate()`
- `registerLogin(now: Date)`

**Domain Events emitidos:**

- `UserCreated`
- `UserRoleChanged`
- `UserPasswordChanged`
- `UserPasswordReset` (quando resetado pelo Admin)
- `UserDeactivated`
- `UserReactivated`
- `UserLoggedIn`

#### 4.1.2 Entidade: `RefreshToken`

- `id`: UUID v4
- `userId`: UUID
- `tokenHash`: string (SHA-256 do token bruto)
- `expiresAt`: `Date`
- `revokedAt`: `Date | null`
- `createdAt`: `Date`
- `ipAddress`: string | null
- `userAgent`: string | null

**Regras:**

- Um refresh token só pode ser usado uma vez (rotação: cada uso gera um novo e revoga o anterior).
- Revogação em cascata quando o usuário troca senha, é desativado, ou faz logout.

#### 4.1.3 Entidade: `AuthEvent` (auditoria mínima)

- `id`: UUID v4
- `userId`: UUID
- `eventType`: enum (`user_created`, `role_changed`, `password_reset`, `password_changed`, `deactivated`, `reactivated`, `logged_in`, `login_failed`)
- `actorId`: UUID | null (quem executou; `null` se foi o próprio usuário no login)
- `metadata`: JSONB (opcional: IP, user-agent, motivos)
- `createdAt`: `Date`

### 4.2 Value Objects

| VO             | Regra                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| `Email`        | Trim, lowercase, validação regex, tamanho máx 254.                        |
| `PasswordHash` | Argon2id. Contém `hash`, `algorithm`, `salt` (se aplicável ao algoritmo). |
| `UserRole`     | Enum fechado.                                                             |

### 4.3 Repositórios (interfaces no domínio)

- `IUserRepository`: `findById`, `findByEmail`, `save`, `existsByEmail`, `countActiveAdmins`, `list(paginated, filters)`
- `IRefreshTokenRepository`: `create`, `findByHash`, `revokeById`, `revokeAllForUser`
- `IAuthEventRepository`: `create`, `listByUser`

### 4.4 Serviços de domínio

- `PasswordPolicy` (VO/serviço): valida senha em troca pelo usuário.
- `PasswordGenerator` (serviço): gera senha de 16 caracteres criptograficamente segura.
- `PasswordHasher` (interface): `hash(plain): PasswordHash`, `verify(plain, hash): boolean`.
- `TokenGenerator` (interface): `generateAccessToken(payload)`, `generateRefreshToken()`, `verifyAccessToken(token)`.

### 4.5 Casos de uso (application layer)

| Caso de uso                | Ator                     | Descrição                                                 |
| -------------------------- | ------------------------ | --------------------------------------------------------- |
| `CreateUserUseCase`        | Admin                    | Cria usuário + gera senha + registra evento.              |
| `ListUsersUseCase`         | Admin                    | Lista com paginação e busca por e-mail/nome/papel.        |
| `ChangeUserRoleUseCase`    | Admin                    | Altera papel, protegendo contra "último admin".           |
| `ResetUserPasswordUseCase` | Admin                    | Gera nova senha, revoga todas as sessões do usuário.      |
| `DeactivateUserUseCase`    | Admin                    | Soft delete + revoga sessões.                             |
| `ReactivateUserUseCase`    | Admin                    | Reverte soft delete.                                      |
| `LoginUseCase`             | Público                  | Valida credenciais, emite tokens, registra `lastLoginAt`. |
| `LogoutUseCase`            | Autenticado              | Revoga o refresh token corrente.                          |
| `RefreshTokenUseCase`      | Autenticado (via cookie) | Rotaciona o refresh token.                                |
| `ChangeOwnPasswordUseCase` | Autenticado              | Troca a própria senha; revoga outras sessões.             |
| `GetMeUseCase`             | Autenticado              | Retorna o perfil do usuário logado.                       |

## 5. Fluxos de Negócio

### 5.1 Fluxo: Admin cria usuário

1. Admin envia `POST /admin/users` com `{ email, displayName, role }`.
2. Sistema valida e-mail único (entre ativos) e papel válido.
3. Sistema gera senha com `PasswordGenerator` (16 caracteres).
4. Sistema faz hash da senha (Argon2id).
5. Persiste `User` com `status = 'active'`.
6. Emite `UserCreated` e grava `AuthEvent (user_created)`.
7. Retorna `{ id, email, displayName, role, generatedPassword }` **uma única vez**.
8. A senha em texto plano **nunca é persistida**.

### 5.2 Fluxo: Login

1. Usuário envia `POST /auth/login` com `{ email, password }`.
2. Sistema aplica rate limit por `IP + email`.
3. Sistema busca `User` ativo por e-mail.
4. Se não existe ou senha inválida: retorna **401 com mensagem genérica** ("Credenciais inválidas"), sem revelar qual campo errou. Registra `AuthEvent (login_failed)`.
5. Se `status = 'inactive'`: retorna 401 com a **mesma mensagem genérica** (evita enumeração). Registra `AuthEvent (login_failed, reason='inactive')`.
6. Se sucesso: atualiza `lastLoginAt`, emite `UserLoggedIn`, grava `AuthEvent (logged_in)`.
7. Emite access token (JWT, 15 min) e refresh token (opaco, 7 dias, armazenado como hash).
8. Define ambos como cookies `httpOnly` `Secure` `SameSite=None` (produção) ou `SameSite=Lax` (dev).
9. Retorna `{ user: { id, email, displayName, role } }` (sem tokens no body).

### 5.3 Fluxo: Refresh

1. Cliente chama `POST /auth/refresh` (sem body; cookie é enviado automaticamente).
2. Sistema lê o refresh token do cookie, valida hash, validade e se não foi revogado.
3. Se inválido/expirado: 401 e limpa o cookie.
4. Se válido: **rotaciona** — revoga o refresh antigo, emite um novo, e emite novo access token.
5. Retorna 200 sem body (ou `{ ok: true }`).

### 5.4 Fluxo: Logout

1. Cliente chama `POST /auth/logout`.
2. Sistema revoga o refresh token corrente.
3. Limpa os cookies.
4. Retorna 204.

### 5.5 Fluxo: Admin reseta senha

1. Admin envia `POST /admin/users/:id/reset-password`.
2. Sistema gera nova senha, faz hash, atualiza `User`.
3. Revoga **todos** os refresh tokens do usuário.
4. Emite `UserPasswordReset`, grava `AuthEvent (password_reset, actorId=adminId)`.
5. Retorna `{ generatedPassword }` uma única vez.

### 5.6 Fluxo: Usuário troca a própria senha

1. Usuário envia `PATCH /auth/me/password` com `{ currentPassword, newPassword }`.
2. Sistema verifica `currentPassword`.
3. Sistema valida `newPassword` contra a política (mín. 12 caracteres, ao menos 3 dos 4 grupos: maiúscula, minúscula, número, símbolo).
4. Atualiza o hash, revoga **todos** os refresh tokens exceto o corrente (renova a sessão atual).
5. Emite `UserPasswordChanged`, grava `AuthEvent (password_changed)`.
6. Retorna 204.

### 5.7 Fluxo: Admin altera papel

1. Admin envia `PATCH /admin/users/:id/role` com `{ role }`.
2. Sistema valida que não está removendo o último `admin` ativo.
3. Atualiza o papel.
4. Emite `UserRoleChanged`, grava `AuthEvent (role_changed, metadata={from, to})`.
5. Retorna o usuário atualizado.

### 5.8 Fluxo: Desativação / reativação

1. Admin envia `DELETE /admin/users/:id` (desativar) ou `POST /admin/users/:id/reactivate` (reativar).
2. Desativação: `status = 'inactive'`, `deletedAt = now()`, revoga todos os refresh tokens, grava `AuthEvent (deactivated)`.
3. Reativação: `status = 'active'`, `deletedAt = null`, grava `AuthEvent (reactivated)`.
4. Sistema impede desativar o último admin ativo.

## 6. Contratos de API

Base URL: `/api/v1`. Formato: JSON. Erros: `{ error: { code, message, details? } }` com mensagens vindas do dicionário i18n no backend e traduzidas no frontend via `next-intl` (ou equivalente definido na Spec 09).

### 6.1 Endpoints públicos

#### `POST /auth/login`

**Body:** `{ email: string, password: string }`
**Resposta 200:** `{ user: { id, email, displayName, role } }` + cookies de sessão
**Erros:**

- `401 INVALID_CREDENTIALS` — mesmo código para e-mail inexistente, senha errada, conta inativa.
- `429 TOO_MANY_ATTEMPTS` — rate limit.

#### `POST /auth/refresh`

**Sem body.** Requer cookie válido.
**Resposta 200:** `{ user: {...} }` + novos cookies
**Erros:** `401 REFRESH_INVALID`

#### `POST /auth/logout`

**Sem body.** Revoga o refresh corrente e limpa cookies.
**Resposta 204.**

### 6.2 Endpoints autenticados

#### `GET /auth/me`

**Resposta 200:** `{ id, email, displayName, role, createdAt, lastLoginAt }`

#### `PATCH /auth/me/password`

**Body:** `{ currentPassword: string, newPassword: string }`
**Resposta 204.**
**Erros:**

- `400 WEAK_PASSWORD` com `details: { reasons: [...] }` (mensagens explicando o porquê — exigência do autor).
- `401 INVALID_CURRENT_PASSWORD`.

### 6.3 Endpoints de Admin

Todos exigem `role = 'admin'` (guard de autorização).

#### `POST /admin/users`

**Body:** `{ email, displayName, role }`
**Resposta 201:** `{ user: { id, email, displayName, role }, generatedPassword: string }`
**Erros:** `409 EMAIL_ALREADY_EXISTS`, `400 VALIDATION_ERROR`.

#### `GET /admin/users`

**Query:** `?page=1&perPage=20&search=&role=&status=`
**Resposta 200:** `{ data: [...], meta: { page, perPage, total, totalPages } }`

#### `PATCH /admin/users/:id/role`

**Body:** `{ role }`
**Resposta 200:** usuário atualizado.
**Erros:** `409 LAST_ADMIN`, `404 USER_NOT_FOUND`.

#### `POST /admin/users/:id/reset-password`

**Resposta 200:** `{ generatedPassword: string }`
**Erros:** `404 USER_NOT_FOUND`.

#### `DELETE /admin/users/:id`

Soft delete. **Resposta 204.**
**Erros:** `409 LAST_ADMIN`.

#### `POST /admin/users/:id/reactivate`

**Resposta 200:** usuário reativado.

#### `GET /admin/users/:id/auth-events`

**Query:** `?page&perPage`
**Resposta 200:** lista de eventos.

## 7. Regras de Negócio (Numeradas e Testáveis)

**RN-AUTH-01** — E-mail deve ser único entre usuários **ativos**. Usuários inativos liberam o e-mail.
**RN-AUTH-02** — Senha auto-gerada tem 16 caracteres, com ao menos uma maiúscula, uma minúscula, um número e um símbolo.
**RN-AUTH-03** — Senha em texto plano nunca é persistida nem logada.
**RN-AUTH-04** — Hash de senha usa Argon2id com parâmetros padrão (`memoryCost=19456`, `timeCost=2`, `parallelism=1`, salt aleatório).
**RN-AUTH-05** — Login inválido retorna 401 com a mesma mensagem para e-mail inexistente, senha errada e conta inativa.
**RN-AUTH-06** — Access token é JWT (HS256 ou RS256 — a definir na implementação), expira em **15 minutos**, contém `sub`, `role`, `iat`, `exp`.
**RN-AUTH-07** — Refresh token é opaco (32 bytes aleatórios, base64url), expira em **7 dias**, armazenado como hash SHA-256.
**RN-AUTH-08** — Refresh token é de uso único (rotação). Reuso de token revogado invalida **toda** a família de tokens do usuário (detecção de roubo).
**RN-AUTH-09** — Troca de senha revoga **todas** as sessões exceto a corrente.
**RN-AUTH-10** — Desativação revoga **todas** as sessões do usuário.
**RN-AUTH-11** — O sistema não permite remover o papel `admin` do último admin ativo, nem desativá-lo.
**RN-AUTH-12** — Rate limit de login: **10 tentativas por 15 minutos** por `IP + email`. Bloqueio de 15 min após exceder.
**RN-AUTH-13** — Após 5 tentativas falhas consecutivas por `email` em 15 min, o rate limit se aplica mesmo que o IP mude.
**RN-AUTH-14** — Login bem-sucedido reseta o contador de tentativas daquele `email + IP`.
**RN-AUTH-15** — Refresh token é vinculado ao `IP` e `userAgent` do login original, mas **não bloqueia** se mudarem (registra para auditoria).
**RN-AUTH-16** — Todo `AuthEvent` registra `actorId`; para login do próprio usuário, `actorId` pode ser `null`.
**RN-AUTH-17** — Admin não pode alterar o próprio papel nem desativar a própria conta (evita auto-lockout).
**RN-AUTH-18** — `displayName` é editável apenas pelo Admin via `PATCH /admin/users/:id` (endpoint adicional implícito).

## 8. Segurança

- **Transporte:** HTTPS obrigatório em produção. Cookies `Secure`.
- **Cookies:**
  - `access_token`: `httpOnly`, `Secure`, `SameSite=None` (prod) / `Lax` (dev), `Path=/`, `Max-Age=900`.
  - `refresh_token`: `httpOnly`, `Secure`, `SameSite=None` (prod) / `Lax` (dev), `Path=/api/v1/auth`, `Max-Age=604800`.
- **CSRF:** como os tokens estão em cookies httpOnly, todas as rotas que mudam estado (exceto `login` e `refresh`) exigem verificação via **`X-CSRF-Token`** (double-submit cookie) ou verificação de `Origin`/`Referer`. A estratégia será detalhada na implementação.
- **Headers:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` compatível com Next.js.
- **Timing attacks:** comparação de senha via Argon2 `verify` (constant-time).
- **Rate limit:** implementado em camada de infraestrutura (Redis ou in-memory). Se in-memory, documentar limitação em deploy horizontal.
- **JWT secret:** variável de ambiente obrigatória, sem valor default, mínimo 256 bits.
- **Logs:** nunca logar senhas, tokens, hashes ou cookies. Logar apenas IDs e tipos de evento.

## 9. UX (User Experience)

### 9.1 Jornadas do usuário

- **Admin:** loga → painel de usuários → cria usuário (vê senha gerada, copia e envia manualmente) → eventualmente reseta senha.
- **Mestre/Jogador:** recebe credenciais do Admin → loga → cai no dashboard → eventualmente troca a senha.

### 9.2 Telas necessárias

- **`/login`**: formulário com e-mail, senha, botão "Entrar". Erro inline. Não expõe quais credenciais falharam.
- **`/admin/users`**: tabela com busca (nome/e-mail), filtro por papel e status, paginação. Ações por linha: alterar papel, resetar senha, desativar/reativar, ver eventos.
- **`/admin/users/new`**: formulário de criação. Ao salvar, **modal com a senha gerada** e botão "Copiar", com aviso em destaque: "Esta senha não será exibida novamente".
- **`/admin/users/:id`**: detalhe do usuário + histórico de `AuthEvent`.
- **`/account/security`**: troca de própria senha.
- **Menu de usuário**: exibe `displayName`, papel, botão de logout.

### 9.3 Estados visuais obrigatórios

- **Loading:** skeleton na tabela, spinner no botão de submit.
- **Empty:** mensagem clara em listas vazias ("Nenhum usuário encontrado" com ação sugerida).
- **Error:** toasts para erros de rede; erros inline para validação de formulário.
- **Success:** toast de confirmação.
- **Destrutivo:** toda ação de desativar/resetar exige **confirmação** com modal.

### 9.4 Microcopy (via Humanizer)

- "Credenciais inválidas." (não "E-mail ou senha incorretos", para não revelar)
- "Sua nova senha foi gerada. Copie agora — ela não será exibida novamente."
- "Esta conta está inativa. Procure o administrador." (retornada apenas quando aplicável — não no login público)
- "A nova senha precisa ter ao menos 12 caracteres e combinar letras maiúsculas, minúsculas, números e símbolos." (com `details.reasons` detalhando o que faltou)

## 10. Design System (contexto para a Spec 07)

Componentes a criar/usar:

- **`<Button variant="primary|secondary|danger|ghost">`** — estados: default, hover, focus, active, disabled, loading.
- **`<Input type="email|password|text">`** — estados: default, focus, error, disabled, com label e helper text.
- **`<PasswordInput>`** — com toggle "mostrar senha".
- **`<DataTable>`** — colunas configuráveis, ordenação, busca integrada, paginação, estado vazio.
- **`<Modal>`** — acessível (foco preso, ESC fecha, `aria-modal`).
- **`<Toast>`** — 4 variantes (success, error, warning, info), posição canto superior direito, auto-dismiss 5s, pausável no hover.
- **`<RoleBadge role="admin|mestre|jogador">`** — dourado/azul/verde respectivamente.
- **`<Avatar>`** — iniciais em círculo com fundo dourado.
- **`<Card>`** — borda esquerda dourada, conforme escudo.
- **`<ConfirmDialog>`** — variante de Modal para ações destrutivas.

Todos os componentes devem ser reutilizáveis e testados visualmente (Storybook é recomendado, não obrigatório no MVP).

## 11. Modelo de Dados (Postgres)

### 11.1 Tabela `users`

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email          VARCHAR(254) NOT NULL,
password_hash  TEXT NOT NULL,
display_name   VARCHAR(60) NOT NULL,
role           VARCHAR(16) NOT NULL CHECK (role IN ('admin','mestre','jogador')),
status         VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
last_login_at  TIMESTAMPTZ NULL,
created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at     TIMESTAMPTZ NULL
```

````

**Índices e constraints:**

- `UNIQUE (LOWER(email)) WHERE deleted_at IS NULL` — unicidade entre ativos.
- `INDEX (role) WHERE deleted_at IS NULL`.
- `INDEX (email) WHERE deleted_at IS NULL`.

### 11.2 Tabela `refresh_tokens`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
token_hash   TEXT NOT NULL UNIQUE,
expires_at   TIMESTAMPTZ NOT NULL,
revoked_at   TIMESTAMPTZ NULL,
ip_address   VARCHAR(45) NULL,
user_agent   TEXT NULL,
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**

- `INDEX (user_id, revoked_at)`.
- `INDEX (expires_at)`.

### 11.3 Tabela `auth_events`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id     UUID NOT NULL REFERENCES users(id),
actor_id    UUID NULL REFERENCES users(id),
event_type  VARCHAR(32) NOT NULL,
metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:** `INDEX (user_id, created_at DESC)`, `INDEX (event_type)`.

## 12. i18n (chaves de tradução — namespace `auth.*`)

```
auth.login.title
auth.login.subtitle
auth.login.email.label
auth.login.email.placeholder
auth.login.password.label
auth.login.password.placeholder
auth.login.submit
auth.login.error.invalid_credentials
auth.login.error.too_many_attempts
auth.logout.confirm
auth.logout.success

auth.account.security.title
auth.account.security.current_password
auth.account.security.new_password
auth.account.security.confirm_password
auth.account.security.submit
auth.account.security.error.weak_password
auth.account.security.error.password_mismatch
auth.account.security.error.invalid_current
auth.account.security.success

admin.users.title
admin.users.search.placeholder
admin.users.filter.role.all
admin.users.filter.status.active
admin.users.filter.status.inactive
admin.users.action.create
admin.users.action.change_role
admin.users.action.reset_password
admin.users.action.deactivate
admin.users.action.reactivate
admin.users.action.view_events
admin.users.empty
admin.users.create.title
admin.users.create.password_notice
admin.users.create.copy_password
admin.users.create.confirm_copy
admin.users.reset.confirm
admin.users.reset.success
admin.users.deactivate.confirm
admin.users.deactivate.success
admin.users.last_admin.error

role.admin
role.mestre
role.jogador
```

> Os textos PT-BR devem passar pela skill **Humanizer** antes de virarem o arquivo `pt-BR.json`.

## 13. Seed

A seed de autenticação deve criar **1 usuário admin inicial**, lido de variáveis de ambiente:

```
ADMIN_EMAIL=admin@forjaselvagem.local
ADMIN_DISPLAY_NAME=Administrador
ADMIN_INITIAL_PASSWORD=<senha gerada no primeiro boot, exibida no log>
```

**Comportamento:**

- Idempotente: se já existe um `admin` ativo com esse e-mail, não recria.
- Se `ADMIN_INITIAL_PASSWORD` estiver vazia, gera uma e exibe **uma vez** no stdout do container (com aviso em vermelho).
- A seed não cria outros usuários.

## 14. Contrato de Testes (TDD)

### 14.1 Unit tests (domínio)

- `User.create` valida e-mail, displayName, papel.
- `User.changeRole` falha quando resultaria em zero admins.
- `User.deactivate` falha quando é o último admin.
- `PasswordPolicy.validate` retorna razões específicas por regra violada.
- `PasswordGenerator.generate` produz 16 caracteres com os 4 grupos.

### 14.2 Integration tests (application + infra)

- `CreateUserUseCase` persiste usuário e retorna senha.
- `LoginUseCase` retorna 401 para e-mail inexistente, senha errada e conta inativa, com o mesmo código.
- `LoginUseCase` sucesso atualiza `lastLoginAt` e cria `AuthEvent`.
- `RefreshTokenUseCase` rotaciona e revoga o anterior.
- **Reuso de refresh token revogado invalida a família inteira** (RN-AUTH-08).
- `ChangeOwnPasswordUseCase` revoga sessões exceto a corrente.
- `ResetUserPasswordUseCase` revoga todas as sessões.
- `ChangeUserRoleUseCase` bloqueia rebaixamento do último admin.
- Rate limit bloqueia após 10 tentativas em 15 min.
- Rate limit reseta após login bem-sucedido.

### 14.3 E2E tests (HTTP)

- Fluxo completo: admin cria usuário → usuário loga → usuário troca senha → sessão antiga cai, nova persiste → logout → refresh falha.
- Cookies estão com flags corretas (`httpOnly`, `Secure` em prod).

### 14.4 Cobertura mínima

- **Domínio:** 100%.
- **Application:** ≥ 90%.
- **Infra/HTTP:** ≥ 80%.

## 15. Conventional Commits esperados

Sequência sugerida (a IA pode adaptar, mantendo a granularidade):

```
chore(auth): bootstrap auth bounded context structure
feat(auth): add User aggregate and value objects
feat(auth): add PasswordPolicy and PasswordGenerator
feat(auth): add PasswordHasher abstraction and Argon2 implementation
feat(auth): add RefreshToken entity and repository contract
feat(auth): add AuthEvent entity and repository contract
feat(auth): implement CreateUserUseCase
feat(auth): implement LoginUseCase with rate limiting
feat(auth): implement RefreshTokenUseCase with rotation
feat(auth): implement LogoutUseCase
feat(auth): implement ChangeOwnPasswordUseCase
feat(auth): implement admin use cases (role, reset, deactivate)
feat(auth): add HTTP controllers and guards
feat(auth): add JWT and cookie middleware
feat(auth): add auth seed
feat(web): add login page
feat(web): add admin users management pages
feat(web): add account security page
test(auth): add integration tests for session rotation
test(auth): add e2e tests for full auth flow
docs(auth): document auth endpoints and security decisions
```

## 16. Critérios de Aceite

- [ ] Admin consegue criar usuário e recebe senha auto-gerada **uma única vez**.
- [ ] Login com credenciais válidas define os dois cookies e retorna o usuário.
- [ ] Login com e-mail inexistente, senha errada ou conta inativa retorna **o mesmo erro**.
- [ ] Após 10 tentativas em 15 min, retorna `429`.
- [ ] Refresh rotaciona e revoga o token anterior.
- [ ] Reuso de refresh token revogado invalida toda a família.
- [ ] Usuário logado consegue trocar a própria senha.
- [ ] Troca de senha encerra sessões antigas exceto a corrente.
- [ ] Admin consegue resetar senha; todas as sessões do usuário caem.
- [ ] Admin não consegue remover o papel do último admin ativo.
- [ ] Admin não consegue se auto-desativar.
- [ ] Desativação é lógica (`status = 'inactive'`), nunca física.
- [ ] Todos os endpoints têm testes unitários e de integração correspondentes.
- [ ] Cobertura mínima da seção 14.4 atingida.
- [ ] Nenhuma senha em texto plano é logada ou persistida.
- [ ] Todas as strings de UI passam por i18n.
- [ ] Skill Humanizer aplicada em toda copy PT-BR.

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- Login por **e-mail** (não username).
- Senha auto-gerada: **16 caracteres**, 4 grupos.
- Sessão: **JWT access (15 min) + refresh opaco (7 dias)** em cookies `httpOnly`.
- Rotação de refresh token com detecção de roubo (reuso invalida família).
- Argon2id como algoritmo de hash.
- Sem auto-lockout por tentativas no MVP (só rate limit).
- Enumeração de usuário evitada.
- Admin não pode alterar o próprio papel nem se desativar.
- Auditoria mínima via `auth_events` (não é audit log completo).

### 17.2 Pendências para o time de implementação (a IA deve reportar ao autor antes de codar)

- **Algoritmo JWT:** HS256 (simples, secret compartilhado) vs. RS256 (assimétrico, mais robusto). Recomendação: **HS256** para MVP, com plano de migração futura documentado.
- **Estratégia CSRF:** double-submit cookie vs. verificação de `Origin`. Recomendação: **verificação de `Origin`** para MVP, mais simples.
- **Armazenamento de rate limit:** in-memory (simples, não escala horizontalmente) vs. Redis (requer infraestrutura adicional). Recomendação: **in-memory para MVP**, com nota de migração futura.
- **Biblioteca de JWT:** `@nestjs/jwt` é padrão; verificar compatibilidade com Node 24 antes de fixar versão.
````
