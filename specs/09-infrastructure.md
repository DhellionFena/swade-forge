# Spec 09 — Infraestrutura

## 1. Objetivo

Definir **como o Forja Selvagem é construído, empacotado, executado, testado e implantado**. Esta spec cobre o monorepo, Docker, banco de dados, migrations, seeds, storage de arquivos, i18n, WebSocket, rate limiting, autenticação (infra), observabilidade, CI/CD, Terraform agnóstico, segurança de infraestrutura, backups e variáveis de ambiente.

Não define features — essas estão nas Specs 01–08 e 10–12. Aqui é o **"como rodar tudo junto"**.

## 2. Escopo

### 2.1 Dentro do escopo

- Estrutura do monorepo.
- Gerenciador de pacotes e workspaces.
- Containers Docker (backend, frontend, Postgres).
- Migrations com TypeORM.
- Seeds idempotentes (admin, catálogos, bestiário).
- Storage de imagens em volume de 1 GB.
- Estratégia de i18n (frontend + backend).
- WebSocket (Socket.IO) na mesma instância do backend.
- Rate limiting (in-memory).
- Autenticação (JWT + Argon2id) — infra.
- Observabilidade (logs, health checks, Sentry).
- Estratégia de testes (unit, integração, e2e).
- CI/CD (GitHub Actions).
- Terraform agnóstico.
- Segurança de infraestrutura (headers, TLS, secrets).
- Backups de banco e imagens.
- Variáveis de ambiente.
- Scripts de desenvolvimento e operação.

### 2.2 Fora do escopo

- Escolha definitiva de provedor pago de hospedagem (apenas free tier no MVP).
- Redis (migração futura para rate limit e Socket.IO adapter).
- CDN para imagens (futuro).
- Observabilidade avançada (APM, tracing distribuído) — futuro.
- Multi-região / HA.
- Kubernetes.
- E-mail transacional (Resend/Postmark) — fora do MVP.

## 3. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                          Usuário                            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 15, App Router, TypeScript)              │
│  - Deploy: Vercel (free tier)                               │
│  - SSR + Client Components                                  │
│  - socket.io-client para log em tempo real                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + WSS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (NestJS, TypeScript) — container Docker            │
│  - Deploy: Render (free tier) — Fly.io / Koyeb como opção   │
│  - REST API (/api/v1)                                       │
│  - WebSocket (Socket.IO) — mesma instância                  │
│  - Storage de imagens (volume 1 GB)                         │
│  - Node.js 24 LTS                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │ TCP + TLS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL 16+ — Neon (free tier, 0.5 GB)                  │
└─────────────────────────────────────────────────────────────┘
```

- Frontend e backend são **deploys separados**.
- Postgres é serviço separado (Neon free tier).
- Storage de imagens fica no volume do backend (não em banco, não em CDN no MVP).

### 3.1 Estratégia de hospedagem gratuita

| Serviço             | Provedor principal                               | Alternativas gratuitas                        |
| ------------------- | ------------------------------------------------ | --------------------------------------------- |
| Frontend            | **Vercel** (100 GB banda/mês)                    | Netlify, Cloudflare Pages                     |
| Backend             | **Render** (Web Service free, cold start 30–60s) | **Fly.io** (allowance), **Koyeb** (free tier) |
| Postgres            | **Neon** (0.5 GB)                                | Supabase, Railway trial                       |
| Storage de imagens  | **Volume do backend** (Render disk 1 GB)         | Fly.io volume                                 |
| Backups             | **Backblaze B2** (10 GB free)                    | Local retention                               |
| Registry de imagens | **GHCR** (GitHub Container Registry)             | Docker Hub free tier                          |
| Observabilidade     | **Sentry** (5k erros/mês)                        | Logs estruturados                             |

**Regra:** nenhum serviço pago no MVP. Se um free tier deixar de existir, migrar via Terraform para outro provedor equivalente ou ativar retenção local.

## 4. Estrutura do Monorepo

### 4.1 Ferramentas

- **Gerenciador de pacotes:** `npm` 10+ (bundled com Node 24)
- **Monorepo:** `npm workspaces` + **Turborepo** (cache de builds e tasks)
- **Node:** **24 LTS**
- **TypeScript:** 5.5+
- **Lint:** ESLint 9 (flat config) + `@typescript-eslint`
- **Format:** Prettier 3
- **Git hooks:** Husky + lint-staged + commitlint

### 4.2 Estrutura de diretórios

```
forja-selvagem/
├── apps/
│   ├── backend/                      # NestJS
│   │   ├── src/
│   │   │   ├── domain/               # DDD: agregados, VOs, eventos, contratos
│   │   │   │   ├── auth/
│   │   │   │   ├── campaign/
│   │   │   │   ├── character/
│   │   │   │   ├── roll/
│   │   │   │   ├── npc/
│   │   │   │   ├── story/
│   │   │   │   ├── initiative/
│   │   │   │   └── reference/        # catálogos (races, skills, etc.)
│   │   │   ├── application/          # casos de uso
│   │   │   │   └── (mesmos BCs)
│   │   │   ├── infrastructure/       # TypeORM, auth, storage, ws, seed
│   │   │   │   ├── persistence/
│   │   │   │   ├── auth/
│   │   │   │   ├── storage/
│   │   │   │   ├── realtime/
│   │   │   │   ├── seed/
│   │   │   │   │   └── data/         # JSONs versionados (races, advantages, bestiary, etc.)
│   │   │   │   └── config/           # env schema, validação
│   │   │   ├── presentation/         # controllers, guards, DTOs, WebSocket gateways
│   │   │   │   └── http/
│   │   │   └── main.ts
│   │   ├── test/                     # e2e (Supertest)
│   │   ├── migrations/               # TypeORM migrations
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                          # Next.js 15 App Router
│       ├── src/
│       │   ├── app/                  # rotas (App Router)
│       │   ├── components/           # design system + componentes de feature
│       │   ├── lib/                  # API client, hooks, providers
│       │   ├── messages/             # pt-BR.json (i18n)
│       │   ├── styles/               # tokens, tailwind
│       │   └── middleware.ts
│       ├── public/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── shared/                       # tipos compartilhados, contratos de API
│   ├── design-tokens/                # CSS variables, tailwind presets
│   └── ui/                           # (opcional) design system componente por componente
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml        # dev
│   │   ├── docker-compose.prod.yml   # prod (referência)
│   │   └── postgres/
│   │       └── init.sql              # extensões
│   ├── terraform/
│   │   ├── modules/                  # módulos agnósticos
│   │   ├── providers/                # implementações por provedor (vercel, render, neon)
│   │   └── environments/
│   │       ├── dev/
│   │       └── prod/
│   └── scripts/
│       ├── seed.sh
│       ├── migrate.sh
│       └── backup.sh
├── docs/
│   ├── specs/                        # este diretório
│   ├── design/                       # Spec 07
│   └── operations/                   # runbooks e restore
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── release.yml
├── .env.example
├── .nvmrc                            # "24"
├── .tool-versions
├── package.json                      # workspaces: ["apps/*", "packages/*"]
├── package-lock.json
├── turbo.json
├── tsconfig.base.json
├── commitlint.config.js
├── .commitlintrc.json
├── .eslintrc.cjs                     # ou eslint.config.js
├── .prettierrc
├── .gitignore
└── README.md
```

### 4.3 `package.json` (raiz)

```json
{
  "name": "forja-selvagem",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "engines": {
    "node": ">=24.0.0"
  },
  "packageManager": "npm@10",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

### 4.4 `turbo.json` (resumo)

Tasks:

- `build`: depende de `^build`, cacheia `dist/` e `.next/`
- `dev`: sem cache, persistente
- `lint`: cacheia `eslint` results
- `test`: cacheia resultados de teste
- `typecheck`: cacheia
- `migrate:run`: sem cache
- `seed`: sem cache

## 5. Ambientes

| Ambiente               | Finalidade            | Banco             | URL                                       |
| ---------------------- | --------------------- | ----------------- | ----------------------------------------- |
| **dev**                | Desenvolvimento local | Postgres (Docker) | `http://localhost:3000` / `:3001`         |
| **staging** (opcional) | Homologação           | Neon free tier    | `https://staging.<vercel-app>.vercel.app` |
| **prod**               | Produção              | Neon free tier    | `https://forjaselvagem.<vercel-domain>`   |

- **Configuração por ambiente via variáveis de ambiente.**
- Nenhum `.env` é commitado. Apenas `.env.example`.
- Secrets em produção vêm do provedor (Vercel env vars, Render secrets).

### 5.1 Estratégia de free tier

**Frontend (Vercel free tier):**

- 100 GB de banda/mês, 100 GB-hours de compute.
- Builds ilimitados para projetos pessoais.
- Domínio `*.vercel.app` grátis; domínio customizado grátis com DNS.

**Backend (Render free tier):**

- Web Service free com 512 MB RAM, 0.1 CPU.
- **Cold start de 30–60s após 15 min de inatividade** (aceitável no MVP; documentado no README).
- Deploy automático via GitHub integration.
- Alternativas: Fly.io (3 VMs small free), Koyeb (1 web + 1 worker free).

**Postgres (Neon free tier):**

- 0.5 GB de storage, 1 projeto, 10 branches.
- Branch autoscaling (serverless), cold start de ~1s.
- Backup automático point-in-time (7 dias).
- Alternativa: Supabase free (500 MB, 2 projetos).

**Storage de imagens (Render disk):**

- 1 GB no free tier (via "Persistent Disk" do Render).
- Alternativa: Fly.io volume (3 GB).

**Backups (Backblaze B2):**

- 10 GB de storage + 1 GB de download/dia gratuitamente.
- Suficiente para dumps do Postgres do MVP (< 100 MB comprimidos).

## 6. Docker

### 6.1 Backend — `apps/backend/Dockerfile`

```dockerfile
# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .
RUN npx turbo run build --filter=backend
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:24-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/package.json ./
COPY --from=build /app/apps/backend/migrations ./migrations
COPY --from=build /app/apps/backend/scripts ./scripts
RUN mkdir -p /app/storage
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./scripts/start.sh"]
```

`scripts/start.sh`:

- Espera o banco aceitar conexão (com timeout).
- Executa `npm run migrate:run` se `RUN_MIGRATIONS=true`.
- Executa `npm run seed` se `RUN_SEED=true`.
- Inicia o processo Node (`node dist/main.js`).

### 6.2 Frontend — `apps/web/Dockerfile`

Next.js **standalone output** (configurado em `next.config.js`):

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npx turbo run build --filter=web

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

> **Deploy principal:** Vercel (detecta Next.js automaticamente). O Dockerfile é **fallback** para VPS ou para testes locais.

### 6.3 `docker-compose.yml` (dev)

Serviços:

- `postgres`: `postgres:16-alpine`, volume `pgdata`, porta 5432.
- `backend`: build local, porta 3001, dependência `postgres`, volume `storage` + bind dos specs.
- `web`: build local, porta 3000, dependência `backend`.
- `pgadmin` (opcional): `dpage/pgadmin4`.

Volumes:

- `pgdata`: dados do Postgres.
- `storage`: imagens do backend (mapeado para `./storage` no host dev).

### 6.4 `docker-compose.prod.yml`

Referência para deploy via VPS (não usado no free tier do MVP):

- `backend`, `web`, `postgres` com volumes persistentes.
- `nginx` (ou Caddy) com TLS reverso para ambos.
- Healthchecks em todos os containers.

## 7. Banco de Dados

### 7.1 Versão

PostgreSQL **16+** (managed no Neon).

### 7.2 Extensões obrigatórias

- `pgcrypto` (para `gen_random_uuid()`).
- `uuid-ossp` (fallback).

Aplicadas em `infra/docker/postgres/init.sql` no dev; no staging/prod, via migration `0001_extensions`.

### 7.3 TypeORM

- `synchronize: false` **sempre** (nunca em prod).
- `migrationsRun: false` (migrations rodam via script `migrate:run` no entrypoint).
- `logging`: `['error', 'warn']` em prod; `['query']` em dev se `SQL_LOG=true`.
- Conexão via `DATABASE_URL` (string única) — Neon fornece no formato `postgresql://user:pass@host/db?sslmode=require`.
- **SSL obrigatório** em staging/prod.

### 7.4 Migrations

- Geradas via `npm run migration:generate -w backend -- -n nome-da-migration`.
- **Nunca editadas manualmente** depois de commitadas (criar nova migration para corrigir).
- Executadas no entrypoint do container quando `RUN_MIGRATIONS=true`.
- Em CI, rodam no setup do job de integração para criar schema do zero.

### 7.5 Seeds

Comando: `npm run seed -w backend`

**Idempotência:** para cada entidade seedada, verificar por chave natural (`slug` ou `name`) antes de inserir. Se já existe e os dados são idênticos, skip. Se existir com dados diferentes, **não sobrescrever** e emitir warning no log (evita perda de customizações).

**Dados versionados** em `apps/backend/src/infrastructure/seed/data/`:

| Arquivo                   | Conteúdo                                |
| ------------------------- | --------------------------------------- |
| `attributes.json`         | 5 atributos                             |
| `skills.json`             | 28 perícias                             |
| `races.json`              | 12 raças com `racial_traits`            |
| `complications.json`      | Todas as complicações do livro          |
| `advantages.json`         | Todas as vantagens do livro             |
| `arcane-backgrounds.json` | 5 antecedentes arcanos                  |
| `powers.json`             | Todos os poderes do Capítulo 5          |
| `bestiary.json`           | 37 criaturas do Capítulo 6              |
| `admin.json`              | (opcional; gerado a partir de env vars) |

**Ordem de execução:** attributes → skills → arcane-backgrounds → powers → races → complications → advantages → bestiary → admin.

**Admin bootstrap:** lido de `ADMIN_EMAIL`, `ADMIN_DISPLAY_NAME`, `ADMIN_INITIAL_PASSWORD` (opcional). Se senha ausente, gera e exibe **uma vez** no stdout com aviso em vermelho.

**Seed automático:** controlado por `RUN_SEED=true` no entrypoint. Em prod, **recomendação:** rodar apenas na primeira inicialização, ou em migrations específicas.

**Testes da seed:** cada arquivo JSON tem teste que verifica estrutura e quantidade esperada (ex.: 28 skills, 37 bestiary entries). Teste adicional verifica idempotência.

### 7.6 Backups

- **Postgres:** dump diário comprimido (`pg_dump -Fc`).
- **Destino principal:** **Backblaze B2** (free tier: 10 GB de storage + 1 GB de download/dia).
- **Destino secundário (fallback):** retenção local no disco do backend (30 dias), para o caso do free tier do B2 ser excedido.
- **Retenção:** 30 dias (diários), 12 meses (mensais, sintetizados a partir dos diários).
- **Imagens:** snapshot semanal do volume `storage/`, mesmo destino.
- **Restauração:** documento `docs/operations/restore.md` (a ser gerado na implementação) com passo a passo.
- **Custo:** R$ 0 no MVP. Se o uso ultrapassar o free tier do B2, o job de backup passa a fazer apenas retenção local e emite alerta no log.

## 8. Storage de Arquivos

### 8.1 Estrutura

Volume no backend em `STORAGE_PATH` (default `/app/storage`).

**Layout em disco:**

```
storage/
├── npcs/
│   └── {npcId}/
│       └── {uuid}.{ext}
├── story-events/
│   └── {eventId}/
│       └── {uuid}.{ext}
└── tmp/
    └── (uploads em progresso; limpos periodicamente)
```

- Nome do arquivo: `{uuid}.{ext}` (sem nome original no disco, sem PII).
- Metadados (nome original, MIME, tamanho) salvos na tabela correspondente do banco.
- Extensões aceitas: `.png`, `.jpg`, `.jpeg`, `.webp`.

### 8.2 Limite de storage

- **Total do volume:** 1 GB inicial (`STORAGE_MAX_BYTES=1073741824`).
- **Por arquivo:** 5 MB (definido em código, por tipo de upload).
- **Enforcement:** ao subir um arquivo, o backend calcula `usado + novo_tamanho`. Se exceder `STORAGE_MAX_BYTES`, retorna `507 INSUFFICIENT_STORAGE`.
- **Monitoramento:** endpoint `/health/storage` retorna `{ used, max, percent }`.

### 8.3 Serving de imagens

- Endpoint autenticado por entidade, conforme as Specs 05 e 06:
  - `GET /npcs/:id/images/:imageId` (verifica permissão do mestre).
  - `GET /story-events/:id/images/:imageId` (verifica permissão do mestre).
- **Não** há servidor estático público de imagens no MVP.
- **Cache:** header `Cache-Control: private, max-age=3600`.
- **CDN:** futuro (Vercel Blob, Cloudflare R2, S3). Documentar trade-off.

### 8.4 Job de limpeza

- Cron diário (via entrypoint ou scheduled job do provedor) remove arquivos físicos de registros com `deleted_at IS NOT NULL` há mais de 7 dias.
- Também limpa `storage/tmp/` com arquivos com mais de 24h.

## 9. i18n

### 9.1 Frontend

- **Biblioteca:** `next-intl`
- Arquivo de mensagens: `apps/web/src/messages/pt-BR.json`
- Namespaces por feature: `common.*`, `auth.*`, `campaigns.*`, `characters.*`, `rolls.*`, `npcs.*`, `bestiary.*`, `events.*`, `errors.*`, `a11y.*`
- Server components usam `getTranslations()`; client components usam `useTranslations()`.
- **Todas as strings de UI** passam por `t('namespace.key')`.

### 9.2 Backend

- **Backend retorna códigos de erro estáveis** (ex.: `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `CHARACTER_INVALID`), não strings traduzidas.
- Payload de erro:
  ```json
  {
    "error": {
      "code": "WEAK_PASSWORD",
      "message": "fallback em pt-BR (opcional)",
      "details": { "reasons": ["min_length", "missing_symbol"] }
    }
  }
  ```
- O **frontend** traduz `code` e `details.reasons` para a mensagem ao usuário via `next-intl`, aplicando Humanizer.
- **Fallback:** se o frontend não conhecer o `code`, exibe `error.message` (fallback) e loga o `code` desconhecido para telemetria.

### 9.3 Estrutura preparada para outros idiomas

- `apps/web/src/messages/` aceita novos arquivos (`en.json`, `es.json`).
- `next-intl` configurado com `locales: ['pt-BR']` no MVP; adicionar é só incluir o arquivo e atualizar a lista.
- **Backend não traduz** — apenas retorna códigos.

## 10. WebSocket

- **Biblioteca:** Socket.IO 4+
- Mesma instância do backend (porta 3001).
- **Namespace:** `/realtime`
- **Autenticação:** JWT de acesso via handshake (`auth.token`).
- **Rooms:** conforme Spec 04 §6.5.
- **Adapter:** `@socket.io/redis-adapter` **não** no MVP (single instance). Documentar migração para HA no futuro.
- **Reconexão:** `socket.io-client` configurado com backoff exponencial (padrão).
- **Buffer de replay:** ring buffer em memória de 50 eventos por room (Spec 04). Perdido em restart — cliente recarrega via REST.

## 11. Rate Limiting

- **MVP:** in-memory (`@nestjs/throttler` ou custom).
- **Limitações conhecidas:** não escala horizontalmente; ao reiniciar, contadores são resetados.
- **Configuração por rota** (Spec 01, 02, 04, 05, 06):
  - Login: 10/15min por IP+email.
  - Join de campanha: 5/10min por usuário+campanha.
  - Rolagem: 30/min por usuário.
  - Criar NPC: 60/h por campanha.
  - Criar evento: 120/h por campanha.
- **Futuro:** Redis (`@nestjs/throttler` + `ioredis`). Documentar.

## 12. Autenticação (Infra)

- **JWT:** `@nestjs/jwt`, HS256 (recomendação herdada da Spec 01).
- **Argon2id:** `argon2` (lib nativa) com parâmetros padrão da Spec 01.
- **Cookies:** `httpOnly`, `Secure` (prod), `SameSite=None` (prod) / `Lax` (dev).
- **CSRF:** verificação de `Origin` (recomendação Spec 01).
- **Secret JWT:** `JWT_SECRET` (mínimo 256 bits), validado no boot.
- **Rotação de refresh token:** implementação própria na Spec 01.

## 13. Observabilidade

### 13.1 Logs

- **Biblioteca:** `pino` com `pino-http`.
- **Formato:** JSON estruturado em prod; pretty em dev.
- **Campos:** `timestamp`, `level`, `requestId`, `userId` (quando autenticado), `route`, `method`, `statusCode`, `durationMs`, `message`, `error` (stack quando aplicável).
- **Request ID:** gerado via `AsyncLocalStorage`, propagado nos headers (`X-Request-Id`).
- **Nunca logar:** senhas, tokens, cookies, hashes, payloads completos de rolagem.

### 13.2 Health checks

- `GET /health` — liveness (retorna 200 se o processo está de pé).
- `GET /health/ready` — readiness (verifica conexão com banco e storage).
- `GET /health/storage` — uso do storage (`{ used, max, percent }`).

### 13.3 Métricas

- **MVP:** apenas health checks expostos.
- **Futuro:** Prometheus / OpenTelemetry.

### 13.4 Sentry

- **Habilitado no MVP** (free tier: 5k erros/mês).
- Backend: `@sentry/node`.
- Frontend: `@sentry/nextjs`.
- Ativação condicional: se `SENTRY_DSN` estiver presente, integra; senão, apenas logs estruturados.
- **Configuração:**
  - `tracesSampleRate`: 0.1 (10% das transações) — economiza quota.
  - `environment`: `production` / `development`.
  - `release`: `forja-selvagem@<versão>` (injetado no build).
- **Nunca enviar** dados sensíveis: usar `beforeSend` para filtrar headers de auth, cookies, body de login.

## 14. Testes (Infra)

### 14.1 Backend

- **Unit tests:** Jest + `@swc/jest` (rápido).
- **Integration tests:** Jest + Testcontainers (Postgres efêmero) ou Postgres do docker-compose.
- **E2E:** Supertest + banco efêmero.
- **Cobertura:** por bounded context, conforme Specs 01–06. Global mínimo: **85%**.

### 14.2 Frontend

- **Unit:** Vitest + Testing Library.
- **Component:** Vitest + Testing Library + MSW (mock de API).
- **E2E:** Playwright (com backend real ou mock MSW).
- **Acessibilidade:** axe-core em E2E.
- **Cobertura:** mínimo **75%** para lógica, **60%** para componentes.

### 14.3 RNG determinístico

- `DiceRoller` injetado via interface. Testes usam RNG seedado (Spec 04 §14.1).

### 14.4 Banco de dados em CI

- Serviço `postgres:16-alpine` no job do GitHub Actions.
- Migrations rodadas no setup.
- Cada teste de integração roda em transação com rollback (ou banco novo por suite).

## 15. CI/CD

### 15.1 `.github/workflows/ci.yml`

Trigger: pull requests e push em `main`.

Jobs:

1. **`setup`:** instala Node 24 e cacheia `node_modules` via `actions/setup-node` com `cache: 'npm'`.
2. **`lint`:** `npm run lint`.
3. **`typecheck`:** `npm run typecheck`.
4. **`test-backend`:** unit + integração (Postgres service).
5. **`test-web`:** unit + componentes.
6. **`test-e2e`:** Playwright (com backend efêmero + Postgres service).
7. **`build`:** `npx turbo run build`.
8. **`commitlint`:** valida mensagens de commit (PR).

Todos os jobs dependem de `setup`. `build` depende de lint, typecheck e tests.

### 15.2 `.github/workflows/deploy.yml`

Trigger: push em `main` (após CI verde) ou manual (`workflow_dispatch`).

Jobs:

1. **`deploy-web`:** deploy para Vercel via `vercel deploy --prod` (ou `vercel build` + `vercel deploy --prebuilt`).
2. **`deploy-backend`:** build da imagem Docker + push para GHCR + trigger de deploy no Render via deploy hook.
3. **`run-migrations`:** job separado que executa `npm run migrate:run` no container recém-deployado (ou via job dedicado com acesso ao banco Neon).
4. **`smoke-test`:** curl em `/health` e `/health/ready` do backend, e `/` do frontend.

### 15.3 `.github/workflows/release.yml`

Trigger: tag `v*.*.*`.

Gera changelog (Conventional Changelog) e cria release no GitHub.

### 15.4 Conventional Commits

- `commitlint` com `@commitlint/config-conventional`.
- `husky` + `lint-staged` para rodar em pre-commit:
  - Prettier em arquivos alterados.
  - ESLint em arquivos alterados.
- Pre-commit **não** roda testes (muito lento); testes rodam em CI.

## 16. Terraform (Agnóstico)

### 16.1 Estrutura

```
infra/terraform/
├── modules/
│   ├── postgres/                     # módulo agnóstico: variáveis e outputs
│   ├── backend/                      # módulo agnóstico
│   ├── frontend/                     # módulo agnóstico
│   └── storage/                      # módulo agnóstico
├── providers/
│   ├── vercel/                       # implementação Vercel (frontend)
│   ├── render/                       # implementação Render (backend)
│   ├── neon/                         # implementação Neon (postgres)
│   └── fly/                          # implementação Fly.io (alternativa)
└── environments/
    ├── dev/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── terraform.tfvars.example
    └── prod/
        ├── main.tf
        ├── variables.tf
        └── terraform.tfvars.example
```

### 16.2 Princípios

- **Módulos agnósticos** em `modules/` expõem **contratos** (variáveis e outputs) sem referência direta a provedor.
- **Implementações** em `providers/` mapeiam os contratos para recursos específicos.
- **Ambientes** em `environments/` compõem módulos com provider escolhido.
- **State:** remote (Terraform Cloud free tier ou S3-compatible), nunca commitado.

### 16.3 Exemplo de contrato (módulo `postgres`)

**Variáveis:**

- `instance_name` (string)
- `size` (string)
- `region` (string)
- `backup_retention_days` (number)
- `tags` (map)

**Outputs:**

- `connection_url` (string, sensitive)
- `host`, `port`, `database`, `user`

**Implementações:**

- `providers/neon/`: mapeia para recurso Neon Project/Branch.
- `providers/fly/`: mapeia para `fly_postgres`.
- `providers/aws/` (futuro): mapeia para `aws_db_instance`.

### 16.4 Segredos

- **Não** ficam em `.tf` nem em `.tfstate` públicos.
- Injetados via variáveis de ambiente do runner de CI/Terraform.
- `.tfvars` contém apenas valores não-sensíveis; sensíveis via `TF_VAR_*` env.

### 16.5 Comandos

```bash
cd infra/terraform/environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## 17. Segurança de Infraestrutura

- **TLS:** obrigatório em prod (Vercel cuida do frontend; backend atrás de TLS via Render/Neon).
- **Headers de segurança** (backend):
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy` compatível com Next.js
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restritivo
- **CORS:** lista explícita de origens permitidas via `CORS_ORIGIN` (env).
- **Rate limit:** ver §11.
- **Validação de env no boot:** schema Zod; falha rápido se variável obrigatória ausente.
- **Dependabot** habilitado para PRs de segurança.
- **`npm audit`** em CI (falha em severidade `high` ou `critical`).
- **Secrets nunca commitados:** `.env` no `.gitignore`; `.env.example` com placeholders.

## 18. Variáveis de Ambiente

### 18.1 Backend (`.env.example`)

```env
# Runtime
NODE_ENV=development
PORT=3001
TZ=America/Sao_Paulo

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/forja_selvagem
DATABASE_SSL=false

# Auth
JWT_SECRET=            # min 256 bits; obrigatório
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
CORS_ORIGIN=http://localhost:3000

# Admin bootstrap
ADMIN_EMAIL=admin@forjaselvagem.local
ADMIN_DISPLAY_NAME=Administrador
ADMIN_INITIAL_PASSWORD=  # deixar vazio para gerar no boot

# Storage
STORAGE_PATH=/app/storage
STORAGE_MAX_BYTES=1073741824
STORAGE_MAX_FILE_BYTES=5242880

# Migrations / Seed
RUN_MIGRATIONS=true
RUN_SEED=true

# Rate limit
RATE_LIMIT_LOGIN_ATTEMPTS=10
RATE_LIMIT_LOGIN_WINDOW_MS=900000

# WebSocket
WS_CORS_ORIGIN=http://localhost:3000

# Logs
LOG_LEVEL=debug
SQL_LOG=false

# Sentry (opcional no dev; obrigatório em prod)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# Backups
B2_APPLICATION_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=forja-selvagem-backups
```

### 18.2 Frontend (`.env.example`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=Forja Selvagem
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

### 18.3 Validação

- Backend: `zod` schema em `src/infrastructure/config/env.schema.ts`, validado no boot.
- Frontend: `zod` schema em `src/lib/env.ts`, validado no build.
- **Falha rápida:** variável obrigatória ausente → processo encerra com mensagem clara.

## 19. Scripts de Desenvolvimento e Operação

### 19.1 Raiz (`package.json`)

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

### 19.2 Backend (`apps/backend/package.json`)

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "migration:generate": "typeorm migration:generate -d dist/datasource.js",
    "migration:create": "typeorm migration:create",
    "migrate:run": "typeorm migration:run -d dist/datasource.js",
    "migrate:revert": "typeorm migration:revert -d dist/datasource.js",
    "seed": "ts-node -r tsconfig-paths/register src/infrastructure/seed/index.ts",
    "seed:dev": "ts-node src/infrastructure/seed/index.ts"
  }
}
```

### 19.3 Frontend (`apps/web/package.json`)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### 19.4 Scripts operacionais (`infra/scripts/`)

- `seed.sh` — wrapper que executa `npm run seed -w backend`.
- `migrate.sh` — wrapper que executa `npm run migrate:run -w backend`.
- `backup.sh` — dump do Postgres + upload para Backblaze B2 (via `b2` CLI ou `rclone`).
- `healthcheck.sh` — curl em `/health/ready`.

## 20. Critérios de Aceite

- [ ] Monorepo com npm workspaces + Turborepo funcional.
- [ ] Backend NestJS + frontend Next.js rodando em dev via `docker-compose up`.
- [ ] Postgres no docker-compose com extensão `pgcrypto`.
- [ ] Migrations rodam no entrypoint do container quando `RUN_MIGRATIONS=true`.
- [ ] Seed idempotente popula admin + catálogos + bestiário.
- [ ] Volume de storage de 1 GB montado e funcional.
- [ ] Upload de imagem valida MIME, tamanho e quota.
- [ ] Serving de imagem exige autenticação e permissão.
- [ ] i18n (`next-intl`) configurado com `pt-BR.json`.
- [ ] Backend retorna códigos de erro; frontend traduz.
- [ ] WebSocket (Socket.IO) na mesma instância do backend, autenticado.
- [ ] Rate limit in-memory configurado por rota.
- [ ] Health checks `/health`, `/health/ready`, `/health/storage`.
- [ ] Logs estruturados com `requestId`.
- [ ] Sentry configurado (backend + frontend), ativação condicional por `SENTRY_DSN`.
- [ ] CI roda lint, typecheck, tests, build, commitlint.
- [ ] Deploy: Vercel (frontend) + Render (backend) + Neon (Postgres) — todos em free tier.
- [ ] Backups em Backblaze B2 (free tier) funcionando.
- [ ] Terraform agnóstico com módulos e ao menos 2 providers de exemplo (vercel, render, neon).
- [ ] Variáveis de ambiente validadas no boot.
- [ ] Backups diários do Postgres documentados.
- [ ] `npm audit` sem vulnerabilidades `high`/`critical` no CI.
- [ ] README com passo a passo de `docker-compose up` em menos de 5 comandos.

## 21. Conventional Commits esperados

```
chore(infra): bootstrap monorepo with npm workspaces and turborepo
chore(infra): add base tsconfig, eslint and prettier configs
chore(infra): add husky, lint-staged and commitlint
chore(infra): add docker-compose for local development
feat(infra): add backend Dockerfile with multi-stage build
feat(infra): add web Dockerfile with next standalone output
feat(infra): add entrypoint script with migration and seed
feat(infra): add typeorm datasource and migration setup
feat(infra): add seed runner with idempotent catalogs
feat(infra): add seed data for attributes and skills
feat(infra): add seed data for races with racial traits
feat(infra): add seed data for complications and advantages
feat(infra): add seed data for arcane backgrounds and powers
feat(infra): add seed data for bestiary
feat(infra): add storage service with 1GB quota
feat(infra): add authenticated image serving endpoints
feat(infra): add i18n with next-intl
feat(infra): add websocket module with socket.io
feat(infra): add rate limiting per route
feat(infra): add structured logging with request id
feat(infra): add health check endpoints
feat(infra): integrate sentry for backend and frontend
chore(infra): add terraform modules and vercel provider
chore(infra): add terraform modules and render provider
chore(infra): add terraform modules and neon provider
chore(infra): add backup script for postgres to backblaze b2
ci(infra): add GitHub Actions workflow for CI
ci(infra): add GitHub Actions workflow for deploy
docs(infra): add README with dev setup
docs(infra): add operations runbook and restore guide
```

## 22. Decisões e Pendências

### 22.1 Decisões registradas

- **Monorepo** com npm workspaces + Turborepo (cache de build).
- **Node 24 LTS** em containers e CI.
- **Postgres 16+** com `pgcrypto`.
- **TypeORM** com `synchronize: false` e migrations versionadas.
- **Seeds idempotentes** com dados versionados em JSON dentro do repositório.
- **Storage** em volume local do backend com quota de 1 GB.
- **i18n:** `next-intl` no frontend; backend retorna códigos de erro.
- **WebSocket:** Socket.IO na mesma instância (single instance no MVP).
- **Rate limit:** in-memory (migração futura para Redis).
- **Auth:** JWT HS256 + Argon2id (herdado das Specs 01).
- **Logs:** pino estruturado, request ID propagado.
- **Health checks:** `/health`, `/health/ready`, `/health/storage`.
- **Sentry:** habilitado no MVP (free tier, ativação condicional).
- **CI/CD:** GitHub Actions.
- **Terraform agnóstico:** módulos + providers por provedor (vercel, render, neon, fly); state remoto.
- **Backups:** dump diário do Postgres para Backblaze B2 (free tier) + retenção local como fallback.
- **Envs validadas** com Zod no boot (fail-fast).
- **Hospedagem:** exclusivamente free tier no MVP (Vercel + Render + Neon + Backblaze B2 + GHCR).
- **Registry Docker:** GHCR (gratuito para repositórios públicos e quota generosa para privados).

### 22.2 Estratégia de free tier — detalhes operacionais

- **Render free tier:** o serviço "dorme" após 15 min de inatividade, causando cold start de 30–60s. Aceitável no MVP e documentado no README. Se o cold start incomodar, ativar um cron externo (UptimeRobot free) batendo em `/health` a cada 10 min.
- **Neon free tier:** 0.5 GB de storage. Monitorar `pg_database_size()` no health check e alertar quando > 80%.
- **Vercel free tier:** 100 GB de banda/mês e 100 GB-hours de compute. Suficiente para uso pessoal.
- **Backblaze B2 free tier:** 10 GB de storage + 1 GB de download/dia. Se estourar, retenção local (30 dias) entra como fallback e emite alerta.
- **GHCR:** imagens Docker públicas são gratuitas; privadas têm quota gratuita generosa.
- **Migração futura:** se o MVP crescer além dos limites gratuitos, a arquitetura Terraform agnóstica permite migrar para provedor pago sem reescrever aplicação.

### 22.3 Pendências menores (não bloqueiam implementação)

- **Estratégia de HA:** fora do MVP. Quando necessário, migrar rate limit e Socket.IO adapter para Redis e adicionar múltiplas instâncias do backend.
- **CDN para imagens:** fora do MVP. Quando o volume de storage crescer, considerar Cloudflare R2 ou Vercel Blob.
- **E-mail transacional:** fora do MVP. Admin cria contas manualmente; se surgir requisito de e-mail (recuperação de senha por e-mail, notificações), avaliar Resend (free tier: 100 e-mails/dia).

### 22.4 Pendências herdadas

- Spec 01: algoritmo JWT (recomendação HS256), CSRF (recomendação Origin), rate limit (in-memory), biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket (Socket.IO recomendado), rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: aprovado integralmente.
- Spec 06: log de alterações de eventos (pendente), múltiplas imagens por evento (pendente), markdown sanitizado (pendente), `kind` de eventos (pendente), `eventDate` vs. `inGameDate` (pendente), calendário visual (pendente).
- Spec 07: aprovado integralmente (regressão visual como pendência menor).
- Spec 08: aprovado com cláusula sobre "Curinga ganha Bene manual" e "textos informativos".
