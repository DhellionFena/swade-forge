# Como retomar o desenvolvimento

Este arquivo existe para que uma nova sessão consiga continuar sem redescobrir o projeto.

## Retomada em uma frase

Se o pedido for apenas **“continue de onde parou”**, faça nesta ordem:

1. Leia `PROGRESS.md`, `DECISIONS.md` e este arquivo.
2. Rode `git status` e confirme que está na branch `feat/phase-0-foundation`.
3. Rode `npm install`, `npm run typecheck`, `npm run lint`, `npm run test` e
   `docker compose up -d --build` (use `POSTGRES_PORT=5433` se a 5432 estiver ocupada).
4. Valide `:3000`, `:3001/health` e `:3001/health/ready`.
5. A Fase 0 está concluída. Antes de codar a Fase 1, apresente as decisões pendentes de
   autenticação em `DECISIONS.md` e peça aprovação. Não implemente por suposição.

## Leitura obrigatória

1. [`PROGRESS.md`](./PROGRESS.md) — o que já foi feito e o que falta.
2. [`DECISIONS.md`](./DECISIONS.md) — decisões aplicadas e pendências que exigem aprovação.
3. `specs/10-mvp-roadmap.md` — fase atual e critérios de aceite.
4. `specs/09-infrastructure.md` — infraestrutura, env e operações.

## Regras de trabalho

- Cada funcionalidade nova nasce em uma **branch própria** a partir de `develop`.
- O usuário abre e faz o merge da PR; não mergear por conta própria.
- Não implementar decisões pendentes sem confirmação explícita.
- Implementar em passos pequenos, validando lint, typecheck, testes e build a cada etapa.
- Manter este diretório atualizado ao final de cada fase.

## Comandos úteis

```bash
# Instalar
npm install

# Desenvolvimento local (Postgres via Docker, apps em watch)
docker compose up -d postgres
npm run dev

# Stack completa em containers
cp .env.example .env
docker compose up -d --build
docker compose logs -f backend

# Se a porta 5432 já estiver em uso na máquina
POSTGRES_PORT=5433 docker compose up -d --build

# Qualidade
npm run lint
npm run typecheck
npm run test
npm run build

# Banco
npm run db:migrate
npm run db:seed
```

## Endpoints de desenvolvimento

| Serviço   | URL                                  |
| --------- | ------------------------------------ |
| Web       | http://localhost:3000                |
| API       | http://localhost:3001/api/v1         |
| Liveness  | http://localhost:3001/health         |
| Readiness | http://localhost:3001/health/ready   |
| Storage   | http://localhost:3001/health/storage |
| Postgres  | localhost:5432 (ou `POSTGRES_PORT`)  |

## Estrutura relevante

```text
apps/backend/        NestJS 12 (ESM), TypeORM, health checks, migrations
apps/web/            Next.js 15 App Router, Tailwind, tokens
packages/shared/     Tipos e contratos compartilhados
packages/design-tokens/  CSS variables e nomes de tokens
infra/docker/        Compose e init do Postgres
infra/scripts/       Migrate, seed, healthcheck e backup
docs/development/    Progresso, decisões e este guia
specs/               Especificação completa (fonte de verdade)
```

## Armadilhas conhecidas

- O backend é **ESM**: imports relativos precisam de extensão `.js` no código TypeScript.
- Templates de env dos apps usam `env.example` (sem ponto inicial). Copie para `.env`.
- `RUN_MIGRATIONS=true` faz o container rodar migrations no entrypoint.
- O Docker Compose usa `include`; execute sempre da raiz do repositório.
- Testes do backend exigem `NODE_OPTIONS=--experimental-vm-modules` (já configurado nos scripts).
- Em ESM não existe `__dirname`; use `dirname(fileURLToPath(import.meta.url))`.
- TypeORM exige timestamp no **nome da classe** da migration, não só no arquivo.
- Injeção de dependência precisa de import-valor ou `@Inject(...)`; `import type` apaga o
  metadado e o Nest recebe `Function`.
- O Next standalone escuta no `HOSTNAME` do ambiente; o Docker define o nome do container.
  Por isso o Dockerfile força `HOSTNAME=0.0.0.0`.
- `pino-pretty` é dependência de produção porque o Compose usa `NODE_ENV=development`.
- Se `5432` estiver ocupada, rode com `POSTGRES_PORT=5433` (o backend continua usando
  `postgres:5432` dentro da rede do Compose).
