# Decisões do projeto

Este arquivo registra decisões já aplicadas e decisões que ainda precisam de aprovação.
Nenhuma decisão pendente deve ser implementada por suposição.

## Aplicadas na Fase 0

- Monorepo com **npm workspaces** e **Turborepo 2.x**.
- **NestJS 12** no backend, em modo **ESM**, com **TypeORM 1.x** e **PostgreSQL 16**.
- **Next.js 15.5** (App Router) no frontend, com **React 19** e **Tailwind CSS 3.4**.
- Tokens de design como **CSS variables** em `packages/design-tokens`, mapeados no Tailwind.
- **Zod** para validar variáveis de ambiente no boot/build.
- **Docker Compose** na raiz com `include` do arquivo em `infra/docker`.
- **Husky + lint-staged + commitlint** com Conventional Commits.
- **GitHub Actions** com lint, typecheck, test, build e commitlint.
- **TypeScript 6.0.3** (faixa suportada pelo NestJS 12 e pelo typescript-eslint 8.x).
- **Migrations** rodam no entrypoint quando `RUN_MIGRATIONS=true`.
- **Health checks** em `/health`, `/health/ready` e `/health/storage`.
- **Imagens de produção servem o build compilado**, mas o Compose de desenvolvimento usa
  `NODE_ENV=development`; por isso `pino-pretty` fica em `dependencies`.
- **Next standalone escuta em `0.0.0.0`** via `HOSTNAME=0.0.0.0` no Dockerfile.
- **Scripts de runtime são ESM-safe**: `wait-for-db` usa `import` e o datasource usa
  `import.meta.url` em vez de `__dirname`.
- **Migration inicial** usa classe `Extensions0000000000001`; o TypeORM valida timestamp
  no nome da classe.

## Pendentes de aprovação (não implementar sem confirmação)

### Fase 1 — Autenticação

- JWT **HS256** (simples, secret único) ou **RS256** (chave pública/privada)?
- Proteção CSRF: validação de `Origin` ou **double-submit cookie**?
- Rate limit de login: **in-memory** (MVP) ou Redis desde já?
- Biblioteca de JWT compatível com Node 24 e NestJS 12 ESM.

### Fase 2 — Catálogos e personagens

- Confirmar oficialmente **Tailwind + Radix** (a Spec 08 registra aprovados; a Spec 07
  ainda lista a decisão como pendente).
- Estratégia de seed idempotente para catálogos grandes (bestiário, vantagens, poderes).

### Fase 3 — Campanhas

- GMPC (personagem do mestre) entra no MVP?
- Campanhas privadas com senha entram no MVP?
- Transferência de posse de personagem e banimento de membro entram no MVP?

### Fase 4 — Fichas

- Toggle `curingaActive` por personagem.
- Redução de `advancesCount` ao remover avanços.
- Cap dinâmico de atributos no rank Lendário.
- Histórico de raça na seed (raças com subescolhas).

### Fase 5 — Rolagens e tempo real

- Socket.IO na mesma instância do backend (confirmado na Spec 09) e autenticação do handshake.
- Rolagem solo (sem campanha) entra no MVP?
- Buffer de 50 rolagens e retenção permanente.
- Modificadores manuais e ataques separados de dano.

### Fase 7 — Eventos e notas

- Log de alterações de eventos.
- Até 10 imagens por evento.
- Markdown sanitizado nas notas.
- Campos `kind`, `eventDate` e `inGameDate`.
- Calendário de campanha fica fora do MVP?

### Fase 9 — Administração e busca

- Preservar notas de vínculos inativos.
- Busca global não indexar notas privadas.
- Admin sem acesso ao conteúdo das campanhas.
- Tags livres e ordenação fixa.

### Fase 10 — Operação

- Ordem e duração das fases.
- Backlog pós-MVP e métricas de sucesso.
