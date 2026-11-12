# Progresso do desenvolvimento

Atualizado em: 2026-11-12
Branch de trabalho: `feat/phase-0-foundation`

## Fase 0 — Fundação

Status: **implementada e validada em containers**.

### Entregas

- [x] Monorepo com npm workspaces + Turborepo.
- [x] `apps/backend` com NestJS 12 + TypeORM 1.x + datasource configurado.
- [x] `apps/web` com Next.js 15.5 (App Router) + Tailwind + tokens base.
- [x] `docker-compose.yml` na raiz, incluindo `infra/docker/docker-compose.yml` (backend + web + postgres).
- [x] Dockerfiles multi-stage do backend e do web (Next standalone).
- [x] Migration `0001-extensions` com `pgcrypto` e `uuid-ossp`.
- [x] Configuração de env com Zod no backend (`env.schema.ts`) e no web (`src/lib/env.ts`).
- [x] ESLint + Prettier + Husky + lint-staged + commitlint.
- [x] CI (`.github/workflows/ci.yml`) com lint, typecheck, test, build e commitlint.
- [x] Health checks `/health`, `/health/ready` e `/health/storage`.
- [x] README com quickstart em 5 comandos.

### Validações executadas

```text
npm install       ok
npm run typecheck ok
npm run lint      ok
npm run test      ok (backend: 4 testes; web: 2 testes)
npm run build     ok (backend + web + packages)
format:check      ok
docker compose up ok (postgres, backend e web healthy)
```

Endpoints validados nos containers:

```text
GET :3001/health        200 {"status":"ok",...}
GET :3001/health/ready  200 {"checks":{"database":"up","storage":"up"}}
GET :3001/health/storage 200 {"used":0,"max":1073741824,...}
GET :3000/              200 (HTML com <title>Forja Selvagem</title>)
```

O host local tinha outro Postgres na porta 5432; a validação usou
`POSTGRES_PORT=5433 docker compose up -d`. O Compose mantém 5432 como padrão.

### Correções feitas durante a validação Docker

- `wait-for-db.js` convertido para ESM (`import` em vez de `require`).
- `datasource.ts` trocou `__dirname` por `import.meta.url` (ESM).
- Migration renomeada para `Extensions0000000000001`; o TypeORM exige timestamp no nome
  da classe.
- `DataSource` injetado com `@Inject(DataSource)` para manter o token de DI no build ESM.
- `pino-pretty` movido para dependências de produção, porque o Compose roda com
  `NODE_ENV=development` e o transporte é usado em runtime.
- Web define `HOSTNAME=0.0.0.0`; sem isso o Next standalone escuta apenas no hostname do
  container (definido pelo Docker) e o healthcheck em `localhost` falha.

### Desvios e decisões temporárias

- **NestJS 12 é ESM-only.** O backend usa `"type": "module"`, imports relativos com `.js`
  e Jest em modo ESM (`node --experimental-vm-modules`).
- **TypeScript 6.0.3.** O NestJS 12 exige TypeScript >= 6 e o `typescript-eslint` 8.x
  suporta apenas `< 6.1`. O TypeScript 7 ainda não é compatível com o lint.
- **Templates de env dos apps** são `apps/backend/env.example` e `apps/web/env.example`.
  A política de edição bloqueia arquivos `.env.example` aninhados; o arquivo canônico do
  Compose é o `.env.example` da raiz. Copie o template do app para `.env` quando rodar
  fora do Docker.
- **`specs/` permanece na raiz** (a Spec 09 sugere `docs/specs/`). O README já aponta para
  esse caminho e mover agora criaria ruído sem ganho funcional.
- **Lint do Next desativado no build.** `next build` não roda mais lint; o ESLint é
  executado como passo dedicado no CI. O lint integrado do Next está depreciado.
- **Seed é placeholder.** Catálogos, admin inicial e bestiário entram na Fase 2.
- **i18n não está conectado.** `apps/web/src/messages/pt-BR.json` existe como base, mas
  `next-intl` entra na Fase 1/2.
- **Terraform reservado.** Os diretórios existem com `.gitkeep`; módulos e providers são
  entregas de fase posterior.
- **Storage de health** lê `STORAGE_PATH` e calcula uso; upload/validação de imagem
  entram na Fase 2.

## Próxima fase

Fase 1 — Autenticação. Antes de implementar, confirmar as decisões pendentes em
[`DECISIONS.md`](./DECISIONS.md).
