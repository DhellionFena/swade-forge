# Specs — Forja Selvagem

Este diretório contém a **especificação completa** do Forja Selvagem, organizada em 13 documentos numerados. Cada spec é **auto-contida** e segue a mesma estrutura: objetivo, escopo, atores e permissões, modelo de domínio (DDD), fluxos de negócio, contratos de API, regras de negócio numeradas, UX, design system, modelo de dados, i18n, seed, contrato de testes (TDD), conventional commits esperados, critérios de aceite, e decisões e pendências.

**Fonte de verdade.** Quando houver conflito entre uma spec de feature e a Spec 08 (Regras de Negócio) ou a Spec 09 (Infraestrutura), prevalecem as specs 08 e 09.

**Uso pela IA desenvolvedora.** As specs são consumidas em ordem pelo time de implementação. Cada spec referencia explicitamente as skills obrigatórias (engenharia, UX, Design, Humanizer) que devem ser consultadas antes de começar. As pendências em aberto de cada spec estão listadas no final do documento e, consolidadas, na seção [Pendências Abertas](#pendências-abertas) abaixo.

---

## Índice

| #                            | Spec                    | Objetivo em uma linha                                                          | Estado   |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------ | -------- |
| [00](./00-overview.md)       | Visão Geral             | Identidade, atores, glossário, requisitos técnicos obrigatórios, escopo do MVP | Aprovada |
| [01](./01-auth.md)           | Autenticação            | Login, sessão JWT em cookies, gestão de usuários pelo admin, reset de senha    | Aprovada |
| [02](./02-campaigns.md)      | Campanhas               | Criação, entrada por senha opcional, membros, seções privadas                  | Aprovada |
| [03](./03-characters.md)     | Fichas de Personagem    | Wizard de criação, validação SWADE, progressão, vínculo com campanhas          | Aprovada |
| [04](./04-dice-roller.md)    | Rolagens                | Motor de dados, Dado Selvagem, Ases, Falha Crítica, log em tempo real          | Aprovada |
| [05](./05-npcs.md)           | NPCs, Chefes e Inimigos | Ficha resumida rolável, importação do bestiário, painel de combate             | Aprovada |
| [06](./06-events.md)         | Eventos e Marcos        | Anotações narrativas do mestre, markdown, imagens, ordenação                   | Aprovada |
| [07](./07-design-system.md)  | Design System           | Tokens, componentes, temas claro/escuro, acessibilidade WCAG AA                | Aprovada |
| [08](./08-business-rules.md) | Regras de Negócio       | Referência canônica de todas as regras SWADE aplicadas pelo sistema            | Aprovada |
| [09](./09-infrastructure.md) | Infraestrutura          | Monorepo, Docker, banco, seeds, storage, CI/CD, Terraform agnóstico            | Aprovada |
| [10](./10-mvp-roadmap.md)    | Roadmap MVP             | Ordem de implementação em 11 fases, DoD e critérios globais                    | Aprovada |
| [11](./11-initiative.md)     | Iniciativa              | Cartas de Ação, Curinga, rodadas, painel de combate em tempo real              | Aprovada |
| [12](./12-player-notes.md)   | Player Notes            | Anotações privadas do jogador por par (personagem × campanha)                  | Aprovada |

---

## Ordem de Leitura Recomendada

**Para entender o projeto do zero:**

1. [00 — Visão Geral](./00-overview.md) — a base.
2. [08 — Regras de Negócio](./08-business-rules.md) — o que o sistema aplica do SWADE.
3. [09 — Infraestrutura](./09-infrastructure.md) — como o sistema é construído e hospedado.
4. [10 — Roadmap MVP](./10-mvp-roadmap.md) — em que ordem as features são implementadas.

**Para implementar uma feature:**

- Sempre leia primeiro [00](./00-overview.md) e [08](./08-business-rules.md) para contexto.
- Depois leia a spec da feature (01 a 07, 11 ou 12).
- Antes de codar, confira a seção "Pendências" da spec da feature — muitas decisões precisam ser confirmadas com o autor antes da implementação.

**Para revisar regras ou resolver dúvidas:**

- A Spec [08 — Regras de Negócio](./08-business-rules.md) é a fonte de verdade para o SWADE.
- A Spec [09 — Infraestrutura](./09-infrastructure.md) é a fonte de verdade para stack, deploy e operações.

---

## Mapa de Dependências

```
Spec 00 (Visão Geral) ─── referência para todas as outras
    │
    ├── Spec 01 (Auth) ─── base para tudo
    ├── Spec 02 (Campanhas) ─── depende de 01
    ├── Spec 03 (Fichas) ─── depende de 01, 02
    ├── Spec 04 (Rolagens) ─── depende de 01, 03
    ├── Spec 05 (NPCs) ─── depende de 01, 02, 04
    ├── Spec 06 (Eventos) ─── depende de 01, 02
    ├── Spec 07 (Design System) ─── transveral
    ├── Spec 08 (Regras de Negócio) ─── transveral
    ├── Spec 09 (Infraestrutura) ─── transveral
    ├── Spec 10 (Roadmap) ─── índice das fases
    ├── Spec 11 (Iniciativa) ─── depende de 01, 02, 03, 05, 04
    └── Spec 12 (Player Notes) ─── depende de 01, 02, 03
```

---

## Stack e Metodologia (resumo da Spec 09)

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, Radix UI.
- **Backend:** NestJS, TypeScript, TypeORM, Postgres 16.
- **Runtime:** Node 24 LTS.
- **Monorepo:** npm workspaces + Turborepo.
- **Metodologia:** TDD obrigatório, DDD, Clean Architecture, Clean Code, Conventional Commits.
- **Hospedagem:** exclusivamente free tier (Vercel + Render + Neon + Backblaze B2 + GHCR + Sentry).
- **Storage de imagens:** volume de 1 GB no backend.
- **i18n:** `next-intl` no frontend; backend retorna códigos de erro.
- **WebSocket:** Socket.IO na mesma instância do backend.

---

## Skills Obrigatórias (resumo da Spec 00 §5.3)

A IA desenvolvedora deve buscar, listar e aplicar skills de todas as áreas abaixo antes de iniciar cada spec. A ausência de qualquer uma deve ser reportada ao autor.

**Engenharia:**

- Desenvolvimento de software (SOLID, padrões).
- DDD (Domain-Driven Design).
- TDD (Test-Driven Development).
- Clean Architecture.
- Clean Code.
- Conventional Commits.

**User Experience:**

- Pesquisa de UX, personas e jornadas.
- Arquitetura da informação.
- Design de interação.
- Usabilidade mobile-first (jogador) / desktop-first (mestre).
- Acessibilidade (WCAG AA).
- Microcopy e mensagens de erro.
- Feedback do sistema (estados).
- Testes heurísticos.

**Design:**

- Design System (tokens, componentes, padrões).
- Tipografia, cores, iconografia.
- Temas claro/escuro.
- Documentação.

**Texto:**

- Humanizer em todos os textos de UI, docs e onboarding.
- Tom de voz direto e próximo.
- Consistência terminológica.

---

## Pendências Abertas

As decisões abaixo **não bloqueiam** o início da implementação das fases correspondentes, mas precisam ser confirmadas pelo autor **antes** da fase que as usa. Cada spec lista detalhes completos na seção §17 "Decisões e Pendências".

### Spec 01 — Autenticação

- Algoritmo JWT: **HS256** (recomendado) vs. RS256.
- Estratégia CSRF: **verificação de Origin** (recomendado) vs. double-submit cookie.
- Rate limit: **in-memory** (recomendado no MVP) vs. Redis.
- Biblioteca JWT × compatibilidade com Node 24.

### Spec 02 — Campanhas

- GMPC (mestre com personagem na própria campanha): **fora do MVP** (recomendado).
- Campanhas privadas (invisíveis na listagem): **fora do MVP** (recomendado).
- Transferência de posse: **fora do MVP** (recomendado).
- Banimento de membro removido: **fora do MVP** (recomendado).

### Spec 03 — Fichas

- Toggle `curingaActive`: apenas mestre (recomendado) ou mestre + dono?
- Reduzir `advancesCount`: remover progressos órfãos automaticamente (recomendado) ou bloquear?
- Cap dinâmico no Estágio Lendário via Vantagens Profissional/Especialista: **aplicar** (recomendado) vs. cap fixo d12+1.
- Descrição/histórico de raça na seed: **incluir texto curto** (recomendado) vs. apenas mecânica.

### Spec 04 — Rolagens

- Biblioteca WebSocket: **Socket.IO** (recomendado).
- Rolagem solo (sem campanha): **permitir** (recomendado).
- Buffer de replay: **50 eventos** por room (recomendado).
- Retenção do log: **permanente** (recomendado).
- Modificadores situacionais pré-configurados: **manter manual** no MVP (recomendado).
- Rolagem combinada de ataque + dano: **manter separados** (recomendado).
- Retenção de rolagens ao desvincular: **manter** (recomendado).

### Spec 06 — Eventos

- Log de alterações: **habilitar** (recomendado).
- Múltiplas imagens por evento: **até 10** (recomendado).
- Markdown sanitizado: **sim** (recomendado).
- `kind` (nota/marco/cena/sessão): **incluir** (recomendado).
- `eventDate` + `inGameDate` (ambos): **sim** (recomendado).
- Calendário visual: **fora do MVP** (recomendado).

### Spec 07 — Design System

- Regressão visual (Chromatic/Percy): **futuro** (recomendado).

### Spec 12 — Player Notes

- Notas de vínculo inativo: **preservar** (recomendado).
- Busca global (`Ctrl/Cmd+K`): **não indexar notas** (recomendado).
- Acesso do admin em suporte: **não no MVP** (recomendado).
- Tags livres vs. pré-definidas: **livres** (recomendado).
- Ordenação: **fixa** (recomendado).
- Notas em fichas não vinculadas: **não existem** (recomendado).

---

## Como Contribuir (para a IA desenvolvedora)

1. **Leia as specs antes de codar.** Nunca implemente uma feature sem ler a spec correspondente.
2. **Consulte a Spec 08** para qualquer regra SWADE. Se a regra estiver listada como **EXCLUÍDA**, não implemente.
3. **Consulte a Spec 09** para qualquer decisão de infraestrutura. Se houver conflito com uma spec de feature, a 09 prevalece.
4. **Antes de implementar**, verifique as pendências da spec da feature e consulte o autor sobre as que ainda não foram confirmadas.
5. **Escreva testes antes do código** (TDD obrigatório).
6. **Referencie a regra numerada** (ex.: `RN-BR-45`) no nome do teste correspondente.
7. **Use Conventional Commits.** A ordem dos commits segue o padrão listado em cada spec.
8. **Aplique a skill Humanizer** em toda copy PT-BR antes de commitar.
9. **Nunca implemente features do backlog pós-MVP** (listado em [Spec 10 §5](./10-mvp-roadmap.md#5-pós-mvp-backlog-documentado-não-comprometido)) por engano.
10. **Pendências devem ser reportadas ao autor** antes de qualquer decisão unilateral.

---

## Formato Padrão de Cada Spec

Todas as specs seguem a mesma estrutura, para facilitar a consulta e a implementação:

1. **Objetivo** — o que a spec define em uma frase.
2. **Escopo** — o que está dentro e fora.
3. **Atores e Permissões** — matriz de quem pode fazer o quê.
4. **Modelo de Domínio (DDD)** — agregados, entidades, value objects, serviços, repositórios, casos de uso.
5. **Fluxos de Negócio** — passo a passo dos fluxos críticos.
6. **Contratos de API** — endpoints REST (ou WebSocket, quando aplicável).
7. **Regras de Negócio** — numeradas (`RN-XXX-NN`), classificadas.
8. **Segurança** — autorização, rate limit, sanitização, CSRF.
9. **UX** — jornadas, telas, estados visuais, microcopy.
10. **Design System** — componentes novos e reutilizados.
11. **Modelo de Dados (Postgres)** — DDL das tabelas, índices, constraints.
12. **i18n** — chaves de tradução por namespace.
13. **Seed** — dados populados no primeiro boot (quando aplicável).
14. **Contrato de Testes (TDD)** — casos por camada e cobertura mínima.
15. **Conventional Commits esperados** — sequência sugerida de commits.
16. **Critérios de Aceite** — checklist para fechar a fase.
17. **Decisões e Pendências** — o que já está decidido, o que aguarda aprovação, e o que herdou de outras specs.

---

**Última atualização:** 11 de novembro de 2026.
