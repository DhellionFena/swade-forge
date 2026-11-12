# Spec 10 — Roadmap MVP

## 1. Objetivo

Consolidar **todas as Specs 01–09 e 11–12** em um **plano de implementação sequencial e incremental**, com fases claras, dependências explícitas, critérios de aceite por fase, ordem de commits e pontos de validação. Serve como **guia executável** para a IA desenvolvedora e como **checklist de progresso** para o autor.

**Regra de ouro:** nenhuma fase começa sem que a anterior esteja com **critérios de aceite 100% verdes**, a menos que a fase seja explicitamente paralelizável.

## 2. Princípios do Roadmap

1. **TDD-first:** testes escritos antes da implementação em toda fase.
2. **Vertical slices:** cada fase entrega uma feature **completa** (domínio + application + infra + HTTP + UI), pronta para uso, não um pedaço de camada.
3. **Deploy contínuo:** o sistema é deployável a partir da Fase 1 (auth funcional) e permanece deployável em toda fase seguinte.
4. **Demonstrável:** ao fim de cada fase, há um roteiro de demonstração de 5 minutos que prova o valor entregue.
5. **Não inverter dependências:** se a fase B depende da fase A, B **não** começa sem A concluída.
6. **Design System entra cedo:** tokens e componentes-base entram na Fase 2, não no fim — senão o frontend acumula dívida visual.

## 3. Visão Geral das Fases

| Fase          | Nome                              | Specs                    | Duração estimada   | Paralelizável com |
| ------------- | --------------------------------- | ------------------------ | ------------------ | ----------------- |
| **0**         | Fundação                          | 09 (infra)               | 1–2 semanas        | —                 |
| **1**         | Autenticação                      | 01                       | 1–2 semanas        | —                 |
| **2**         | Design System + Seed de catálogos | 07 (parcial) + 09 (seed) | 2–3 semanas        | —                 |
| **3**         | Campanhas                         | 02                       | 2 semanas          | 06 (parcial)      |
| **4**         | Fichas de personagem              | 03                       | 3–4 semanas        | 06 (parcial)      |
| **5**         | Motor de rolagens                 | 04                       | 2–3 semanas        | —                 |
| **6**         | NPCs e Chefes                     | 05                       | 2 semanas          | —                 |
| **7**         | Eventos/Marcos                    | 06                       | 1 semana           | —                 |
| **8**         | Iniciativa                        | 11                       | 1 semana           | —                 |
| **9**         | Player Notes                      | 12                       | 3–4 dias           | —                 |
| **10**        | Polish, deploy e documentação     | todas                    | 1–2 semanas        | —                 |
| **Total MVP** | —                                 | —                        | **~16–22 semanas** | —                 |

> **Duração estimada:** assume 1 desenvolvedor sênior full-time, com TDD rigoroso e revisões de código. Pode variar com familiaridade com as stacks.

## 4. Fases Detalhadas

---

### Fase 0 — Fundação

**Objetivo:** ter o esqueleto do monorepo, Docker, banco, CI e scripts rodando. Nenhuma feature de usuário ainda.

**Specs de referência:** 09 (infraestrutura) inteira, exceto §7.5 (seeds) e partes de §8 (storage) que entram na Fase 2.

**Entregas:**

1. Monorepo com npm workspaces + Turborepo.
2. `apps/backend` com NestJS + TypeORM + datasource configurado.
3. `apps/web` com Next.js 15 (App Router) + Tailwind + design tokens base (sem componentes ainda).
4. `docker-compose.yml` funcional (backend + web + postgres).
5. Dockerfile multi-stage do backend e do web.
6. Primeira migration (`0001_extensions` com `pgcrypto`).
7. Config de env com Zod (backend + web).
8. ESLint + Prettier + Husky + lint-staged + commitlint.
9. CI (`ci.yml`) rodando lint, typecheck e build.
10. Health check `/health` e `/health/ready` no backend.
11. README com `docker-compose up` em 5 comandos.

**Critérios de aceite:**

- [ ] `docker-compose up` sobe backend + web + postgres sem erros.
- [ ] `GET http://localhost:3001/health` retorna 200.
- [ ] `GET http://localhost:3000` renderiza página inicial.
- [ ] CI verde em PR de teste.
- [ ] `npm run build` funciona em ambos apps.
- [ ] Migration roda no entrypoint do container.
- [ ] `.env.example` cobre 100% das variáveis usadas.
- [ ] README segue o "quickstart" em ≤ 5 comandos.

**Commits esperados (resumo):**

```
chore(infra): bootstrap monorepo with npm workspaces and turborepo
chore(infra): add base tsconfig, eslint and prettier configs
chore(infra): add husky, lint-staged and commitlint
chore(infra): add docker-compose for local development
feat(infra): add backend Dockerfile with multi-stage build
feat(infra): add web Dockerfile with next standalone output
feat(infra): add typeorm datasource and migration setup
feat(infra): add structured logging with request id
feat(infra): add health check endpoints
ci(infra): add GitHub Actions workflow for CI
docs(infra): add README with dev setup
```

**Riscos:**

- Configuração de Docker em Windows/Mac pode exigir `host.docker.internal` no `DATABASE_URL`. Documentar.
- Turborepo com npm workspaces exige config correta de `outputs` no `turbo.json`.

**Demonstração:**

- `docker-compose up` → `/health` responde → página inicial abre.

---

### Fase 1 — Autenticação

**Objetivo:** login, gestão de usuários e sessão funcionando de ponta a ponta.

**Specs de referência:** 01 (autenticação) inteira.

**Pré-requisitos:** Fase 0 concluída.

**Entregas:**

1. Bounded context `Auth` com agregado `User`, `RefreshToken`, `AuthEvent`.
2. Value Objects: `Email`, `PasswordHash`, `UserRole`.
3. Serviços: `PasswordPolicy`, `PasswordGenerator`, `PasswordHasher` (Argon2id).
4. Casos de uso: `CreateUser`, `Login`, `RefreshToken`, `Logout`, `ChangeOwnPassword`, `ChangeUserRole`, `ResetUserPassword`, `DeactivateUser`, `ReactivateUser`, `GetMe`, `ListUsers`.
5. Controllers REST + guards de autorização.
6. Middleware de JWT + cookies httpOnly.
7. Rate limit de login (in-memory).
8. Seed do admin inicial (via env).
9. Frontend: página `/login`, `/admin/users` (lista + criação + reset + desativar), `/account/security`.
10. Componentes de design system usados: `Button`, `Input`, `PasswordInput`, `Modal`, `ConfirmDialog`, `Toast`, `DataTable`, `RoleBadge`, `Avatar`.

**Critérios de aceite:**

- [ ] Admin cria usuário e recebe senha gerada **uma única vez**.
- [ ] Login com credenciais válidas define cookies httpOnly.
- [ ] Login inválido retorna **mesmo erro** para e-mail inexistente, senha errada e conta inativa.
- [ ] Refresh rotaciona token e revoga o anterior.
- [ ] Reuso de refresh revogado invalida família.
- [ ] Troca de senha encerra outras sessões.
- [ ] Admin não pode rebaixar/desativar a si mesmo.
- [ ] Cobertura de testes: domínio 100%, application ≥ 90%, infra ≥ 80%.
- [ ] Todas as strings passam por i18n.
- [ ] Humanizer aplicado em toda copy PT-BR.
- [ ] Login e dashboard do admin funcionam em mobile.

**Commits esperados (resumo):**

```
feat(auth): add User aggregate and value objects
feat(auth): implement CreateUserUseCase with password generator
feat(auth): implement LoginUseCase with rate limiting
feat(auth): implement RefreshTokenUseCase with rotation
feat(auth): implement admin use cases (role, reset, deactivate)
feat(auth): add HTTP controllers and guards
feat(auth): add JWT and cookie middleware
feat(auth): add auth seed
feat(web): add login page
feat(web): add admin users management pages
feat(web): add account security page
test(auth): add integration tests for session rotation
docs(auth): document auth endpoints and security decisions
```

**Riscos:**

- Configuração de cookies cross-origin (Vercel + Render) exige `SameSite=None` + `Secure` em prod. Testar cedo.
- Argon2id é lento em Render free tier (0.1 CPU). Ajustar parâmetros se necessário (mínimos: `timeCost=2`, `memoryCost=19456`).

**Demonstração:**

- Admin cria jogador → jogador loga → troca senha → refresh → logout.

---

### Fase 2 — Design System + Seed de catálogos

**Objetivo:** todos os componentes-base do design system prontos e todos os catálogos do livro seedados no banco.

**Specs de referência:** 07 (design system) inteira; 09 §7.5 (seeds).

**Pré-requisitos:** Fase 0 e Fase 1 concluídas (para o design system usar auth nas páginas de demonstração).

**Entregas:**

**2A — Design System:**

1. Tokens completos (cores, tipografia, espaçamento, raios, sombras, movimento).
2. Tema claro/escuro com toggle.
3. Componentes atômicos: `Button`, `Input`, `Textarea`, `PasswordInput`, `SearchInput`, `Select`, `Checkbox`, `Radio`, `Switch`, `Badge`, `Avatar`, `Spinner`, `Skeleton`, `Chip`, `TagInput`.
4. Componentes compostos: `Card`, `Modal`, `ConfirmDialog`, `Toast`, `DataTable`, `Tabs`, `Pagination`, `EmptyState`, `Timeline`, `ReorderHandle`, `MarkdownEditor`, `MarkdownRenderer`, `ImageUploader`, `ImageGallery`.
5. Componentes de domínio: `RoleBadge`, `RankBadge`, `CampaignCard`, `CharacterCard`, `NpcCard`, `DiceRollButton`, `DiceRollResult`, `AceBadge`, `CriticalFailureBadge`, `WildDieIndicator`, `DerivedStatCard`, `RuntimeCounter`, `CuringaToggle`, `BudgetBar`, `StoryEventCard`, `StoryEventKindBadge`.
6. App Shell (header, sidebar, mobile drawer).
7. Command Palette (`Ctrl/Cmd+K`) com busca global (mockada).
8. Atalho `/` foca busca em telas com listas.
9. `docs/design/tokens.md`, `components.md`, `patterns.md`, `accessibility.md`, `microcopy.md`.

**2B — Seed de catálogos:**

1. `attributes.json` (5).
2. `skills.json` (28).
3. `arcane-backgrounds.json` (5).
4. `powers.json` (todos do Cap. 5).
5. `races.json` (12 com `racial_traits` completos).
6. `complications.json` (todas do livro).
7. `advantages.json` (todas do livro com `requirements` estruturados).
8. `bestiary.json` (37 criaturas com atributos, perícias, ataques, habilidades).
9. Seed runner idempotente.
10. Testes de seed: cada arquivo com teste de contagem + estrutura + idempotência.

**Critérios de aceite:**

- [ ] Todos os componentes atômicos e compostos implementados e cobertos por testes unitários.
- [ ] Tema claro/escuro funcional em todos os componentes.
- [ ] Contraste WCAG AA validado com axe-core (0 violações críticas).
- [ ] Todos os estados (loading, empty, error, success, disabled) implementados.
- [ ] Documentação em `docs/design/` completa.
- [ ] Seed popula 5 attributes + 28 skills + 5 backgrounds + todos os powers + 12 races + todas as complications + todas as advantages + 37 bestiary entries.
- [ ] Seed é idempotente: rodar duas vezes não duplica nem sobrescreve.
- [ ] Teste da seed valida contagens e estrutura.
- [ ] `npm run seed` funciona em ambiente limpo.

**Commits esperados (resumo):**

```
feat(design): add design tokens
feat(design): add theme system with light and dark modes
feat(design): add all atomic components
feat(design): add composite components
feat(design): add domain components
feat(design): add app shell with header and sidebar
feat(design): add command palette
feat(infra): add seed data for attributes and skills
feat(infra): add seed data for races with racial traits
feat(infra): add seed data for complications and advantages
feat(infra): add seed data for arcane backgrounds and powers
feat(infra): add seed data for bestiary
docs(design): add tokens, components, patterns and accessibility docs
```

**Riscos:**

- Transcrição dos 37 monstros do bestiário é trabalhosa e sujeita a erro. Validar com testes de snapshot por entrada.
- Transcrição das `requirements` de todas as Vantagens precisa ser precisa; erro aqui afeta Fase 4.
- Radix UI exige peer dependencies corretas; validar versões com Next.js 15.

**Demonstração:**

- Storybook em markdown → navegar por todas as cores e componentes em ambos os temas.
- Seed → consultar catálogo de raças e vantagens via API.

---

### Fase 3 — Campanhas

**Objetivo:** mestres criam campanhas, jogadores entram, membros são gerenciados.

**Specs de referência:** 02 (campanhas).

**Pré-requisitos:** Fases 0, 1, 2.

**Entregas:**

1. Bounded context `Campaign` com agregado `Campaign`, `CampaignMembership`, `CampaignEvent`.
2. Value Objects: `CampaignName`, `CampaignDescription`, `CampaignPasswordHash`.
3. Serviços: `CampaignPasswordPolicy`, `CampaignAccessGuard`.
4. Casos de uso: `CreateCampaign`, `ListCampaigns`, `GetCampaign`, `UpdateCampaign`, `SetCampaignPassword`, `ClearCampaignPassword`, `JoinCampaign`, `LeaveCampaign`, `RemoveMember`, `ListMembers`, `ArchiveCampaign`, `ReactivateCampaign`, `ResetCampaignPasswordByAdmin`.
5. Controllers REST + guard.
6. Rate limit de join (5/10min por usuário+campanha).
7. Frontend:
   - `/campaigns` (descoberta).
   - `/campaigns/new` (criar).
   - `/campaigns/:id` (detalhe com abas: Visão geral, Membros, Fichas [vazio até Fase 4], Rolagens [vazio até Fase 5], NPCs/Chefes/Eventos [vazio até Fases 6/7]).
   - `/campaigns/:id/settings` (owner).
8. Modal de entrada com senha.
9. Confirmação de arquivamento.

**Critérios de aceite:**

- [ ] Mestre cria campanha com/sem senha.
- [ ] Jogador entra na campanha (senha quando exigida).
- [ ] Usuário não entra duas vezes.
- [ ] Owner não pode entrar como membro.
- [ ] Owner remove membro; membro removido pode reentrar.
- [ ] Owner arquiva e reativa.
- [ ] `passwordHash` nunca aparece em DTO.
- [ ] Senha usa Argon2id.
- [ ] Admin acessa qualquer campanha como moderação.
- [ ] Matriz de permissões da Spec 02 §3.2 respeitada 100%.
- [ ] Cobertura: domínio 100%, application ≥ 90%, infra ≥ 80%.
- [ ] UI mobile funcional.

**Commits esperados (resumo):**

```
feat(campaign): add Campaign aggregate and value objects
feat(campaign): add CampaignMembership entity
feat(campaign): implement CreateCampaignUseCase
feat(campaign): implement JoinCampaignUseCase with password verification
feat(campaign): implement member management use cases
feat(campaign): implement ArchiveCampaignUseCase
feat(campaign): add HTTP controllers and CampaignAccessGuard
feat(web): add campaign discovery page
feat(web): add campaign detail page with tabs
feat(web): add campaign create/edit pages
feat(web): add campaign member management
test(campaign): add e2e tests for full campaign lifecycle
```

**Riscos:**

- Rate limit do join com múltiplas campanhas: testar edge cases (usuário em 5 campanhas diferentes).
- Arquivamento em cascata de memberships: testar transação.
- Convites "ocultos" (campanha existe mas usuário não vê sem senha) não existem no MVP — todas são públicas. Confirmar que isso está claro na UI.

**Demonstração:**

- Mestre cria campanha com senha → jogador entra com senha → mestre remove → jogador reentra → mestre arquiva.

---

### Fase 4 — Fichas de personagem

**Objetivo:** wizard de criação de ficha com validação de regras SWADE, cálculo de derivadas, progressão e vínculo com campanhas.

**Specs de referência:** 03 (fichas), 08 §3–5 e §8 (regras de negócio).

**Pré-requisitos:** Fases 0, 1, 2, 3.

**Entregas:**

1. Bounded context `Character` com agregados e entidades: `Character`, `CharacterAttribute`, `CharacterSkill`, `CharacterComplication`, `CharacterAdvantage`, `CharacterAdvance`, `CharacterChangeLog`, `CharacterCampaignLink`.
2. Value Objects: `CharacterName`, `DieType`, `Rank`.
3. Serviços: `CharacterBuilder`, `CharacterValidator`, `DerivedStatsCalculator`, `RankCalculator`.
4. Casos de uso: `CreateCharacterDraft`, `ValidateCharacter`, `SaveCharacter`, `GetCharacter`, `ListCharacters`, `UpdateCharacter`, `SetRank`, `ApplyAdvance`, `RemoveAdvance`, `ManageRuntimeCounters`, `ArchiveCharacter`, `LinkCharacterToCampaign`, `UnlinkCharacterFromCampaign`, `ListCharacterChangeLog`.
5. Controllers REST + guard.
6. Frontend:
   - `/characters` (lista).
   - `/characters/new` (wizard multi-etapa — 9 etapas).
   - `/characters/:id` (abas: Resumo, Atributos & Perícias, Complicações, Vantagens, Progressos, Notas, Campanhas, Log).
   - `/characters/:id/edit`.
   - Componentes: `CharacterWizard`, `BudgetBar`, `AttributeGrid`, `SkillList`, `ComplicationPicker`, `AdvantagePicker`, `RankBadge`, `RuntimeCounter`, `CuringaToggle`, `DerivedStatCard`, `ChangeLogTimeline`.

**Critérios de aceite:**

- [ ] Wizard bloqueia save se orçamentos não fecham.
- [ ] Mensagens de erro explicam o **porquê** (via `hint`).
- [ ] Raça aplica bônus de atributo/perícia e eleva cap.
- [ ] Atributos começam em d4, custam 1 ponto, respeitam cap.
- [ ] Perícias Básicas começam em d4 grátis; custo 1 ou 2 por rank.
- [ ] Complicações até 4 pontos.
- [ ] Vantagens validam requisitos completos (estágio, atributos, perícias).
- [ ] Aparar, Resistência, Movimentação, Tamanho calculados automaticamente.
- [ ] Aplicar Progresso respeita estágio (1 aumento de atributo por estágio).
- [ ] Reduzir `advancesCount` remove progressos órfãos automaticamente.
- [ ] Edição gera entradas em `CharacterChangeLog`.
- [ ] Botões +/− de Benes/Convicção/Wounds/Fatigue funcionam.
- [ ] Toggle "Curinga ativo" funcional.
- [ ] Vínculo com campanha funciona (e desvínculo).
- [ ] Sair de campanha arquiva vínculos.
- [ ] Todas as regras RN-BR-01 a RN-BR-37 e RN-BR-64 a RN-BR-70 da Spec 08 cobertas por testes.
- [ ] Cobertura: domínio 100%, application ≥ 90%, infra ≥ 80%.

**Commits esperados (resumo):**

```
feat(character): add Character aggregate and value objects
feat(character): add CharacterAttribute and CharacterSkill entities
feat(character): add CharacterComplication and CharacterAdvantage entities
feat(character): implement DerivedStatsCalculator
feat(character): implement CharacterValidator with budget validation
feat(character): implement character creation use cases
feat(character): implement ApplyAdvanceUseCase with stage rules
feat(character): implement LinkCharacterToCampaignUseCase
feat(character): add HTTP controllers and CharacterAccessGuard
feat(web): add character wizard multi-step form
feat(web): add character detail page with tabs
feat(web): add runtime counters and curinga toggle
test(character): add unit tests for DerivedStatsCalculator
test(character): add integration tests for validation pipeline
test(character): add e2e tests for full character lifecycle
```

**Riscos:**

- Wizard multi-etapa é o componente mais complexo do MVP. Reservar tempo para UX.
- Redução de `advancesCount` com remoção automática de progressos órfãos é regra sutil — testar exaustivamente.
- Cap dinâmico de Estágio Lendário (d12+2, d12+3 via Vantagens Profissional/Especialista) precisa ser implementado corretamente.

**Demonstração:**

- Criar ficha de Anão com bônus raciais → aplicar 4 progressos → rank Experiente → adquirir Vantagem Experiente → editar → log registra → vincular a campanha.

---

### Fase 5 — Motor de rolagens

**Objetivo:** clicar em uma perícia/atributo/dano na ficha dispara uma rolagem com todas as regras do SWADE aplicadas, com log em tempo real.

**Specs de referência:** 04 (rolagens), 08 §6–7 (regras).

**Pré-requisitos:** Fases 0, 1, 2, 3, 4.

**Entregas:**

1. Bounded context `Roll` com agregado `Roll`.
2. Value Objects: `ModifierBreakdown`, `DicePool`, `DieType`, `DiceExpression`.
3. Serviços: `DiceRoller` (com CSPRNG), `DiceExpressionParser`, `ModifierCalculator`, `CriticalFailureDetector`, `RollComposer`.
4. Casos de uso: `RollCharacterSkill`, `RollCharacterAttribute`, `RollCharacterDamage`, `ListRolls`.
5. Controllers REST + guard.
6. WebSocket (Socket.IO) com rooms (public/master) e replay buffer.
7. Rate limit de rolagem (30/min por usuário).
8. Frontend:
   - `DiceRollButton` nas perícias/atributos da ficha.
   - `DiceRollResult` com breakdown visual de dados.
   - Modal de dano com validação em tempo real.
   - `RollTimeline` no painel da campanha + painel lateral na ficha.
   - Filtros no log.
   - Animação de rolagem (fade + bounce leve).

**Critérios de aceite:**

- [ ] Rolar perícia treinada aplica Wild Die, Ferimentos, Fadiga, Curinga.
- [ ] Perícia não treinada aplica `d4−2` após Ases.
- [ ] Rolar atributo nunca é untrained.
- [ ] Rolar dano **nunca** usa Wild Die; aplica Ases e Curinga.
- [ ] Expressão de dano suporta `@for`, `@agi`, `@ast`, `@esp`, `@vig`, `NdX`, modificadores.
- [ ] Parse rejeita expressões inválidas com `details.errors[]`.
- [ ] Ases exibidos com badge no log.
- [ ] Falha Crítica destacada em vermelho.
- [ ] Extra com 1 no dado rola d6 de confirmação.
- [ ] Log propaga via WebSocket em tempo real.
- [ ] Rolagem privada do mestre **não** aparece para jogadores.
- [ ] Rolagem solo não é propagada.
- [ ] Toda `Roll` é imutável.
- [ ] RNG usa `crypto.randomInt`.
- [ ] Rolar ficha arquivada → bloqueado.
- [ ] Rate limit bloqueia após 30 em 1 min.
- [ ] WebSocket reentra em rooms após reconexão.
- [ ] Todas as regras RN-BR-38 a RN-BR-61 cobertas por testes.
- [ ] Cobertura: domínio 100%, application ≥ 95%, infra ≥ 85%, WS ≥ 80%.

**Commits esperados (resumo):**

```
feat(roll): add DieType and DicePool value objects
feat(roll): add ModifierBreakdown value object
feat(roll): implement DiceExpressionParser
feat(roll): implement DiceRoller with crypto RNG
feat(roll): implement CriticalFailureDetector
feat(roll): implement ModifierCalculator
feat(roll): implement RollComposer orchestrator
feat(roll): implement roll use cases
feat(roll): add HTTP controllers and RollAccessGuard
feat(roll): add dice expression validation endpoint
feat(realtime): add WebSocket module with socket.io
feat(realtime): add JWT handshake authentication
feat(realtime): add campaign rooms with visibility split
feat(web): add dice roll button and result component
feat(web): add damage roll modal
feat(web): add roll timeline with real-time updates
test(roll): add e2e tests with WebSocket
```

**Riscos:**

- WebSocket com JWT handshake em Vercel (frontend) + Render (backend): testar cedo.
- Cold start do Render afeta WebSocket: primeira conexão pode demorar 30–60s. Documentar.
- Buffer de replay em memória é perdido em restart do Render (que dorme). Aceitável no MVP.

**Demonstração:**

- Jogador clica em "Lutar" → resultado aparece animado → mestre vê no log → rola NPC (Fase 6) → ver ambos no log.

---

### Fase 6 — NPCs e Chefes

**Objetivo:** mestre cria/importa/rola NPCs, Chefes e Inimigos na campanha.

**Specs de referência:** 05 (NPCs).

**Pré-requisitos:** Fases 0–5.

**Entregas:**

1. Bounded context `Npc` com agregado `Npc` (unificado com `type`).
2. Entidade `BestiaryEntry` (já seedada na Fase 2, mas agora exposta).
3. Serviços: `NpcStatsCalculator`, `NpcImporter`.
4. Casos de uso: `CreateNpc`, `ImportNpcFromBestiary`, `UpdateNpc`, `ArchiveNpc`, `ReactivateNpc`, `AdjustNpcRuntime`, `ListNpcs`, `GetNpc`, `ListBestiary`.
5. Controllers REST + guard.
6. Integração com motor de rolagem (Spec 04).
7. Frontend:
   - `/campaigns/:id/npcs` (tabs: NPCs, Chefes, Inimigos).
   - `/campaigns/:id/npcs/new` (formulário).
   - `/campaigns/:id/npcs/import` (modal do bestiário).
   - `/npcs/:id` (ficha resumida).
   - `/campaigns/:id/combat-panel` (painel rápido de combate).
8. Upload de imagem do NPC (storage da Spec 09).

**Critérios de aceite:**

- [ ] Mestre cria NPC com tipo (`npc`/`enemy`/`boss`).
- [ ] Importa do bestiário com 1 clique.
- [ ] NPC importado é independente do template.
- [ ] Marcação WC vs. Extra altera limite de ferimentos e rolagem.
- [ ] Resiliência/Muito Resiliente só em Extras.
- [ ] Aparar, Resistência, Movimento, Tamanho calculados.
- [ ] Rolagem usa motor da Spec 04.
- [ ] Extra não rola Wild Die.
- [ ] NPC arquivado não pode ser rolado.
- [ ] Jogadores **nunca** veem NPCs.
- [ ] WebSocket de rolagem de NPC só para mestre/admin.
- [ ] Painel de combate funcional.
- [ ] Upload de imagem funciona com quota.
- [ ] Todas as regras RN-NPC-01 a RN-NPC-20 cobertas por testes.

**Commits esperados (resumo):**

```
feat(npc): add Npc aggregate with type and wildcard rules
feat(npc): implement NpcStatsCalculator
feat(npc): implement NpcImporter from bestiary
feat(npc): implement NPC use cases
feat(npc): add HTTP controllers and NpcAccessGuard
feat(npc): integrate with roll engine
feat(web): add npc list with type tabs
feat(web): add npc form and bestiary import modal
feat(web): add combat quick panel
feat(web): add npc detail page
feat(web): add npc image upload
test(npc): add e2e tests for full npc lifecycle
```

**Riscos:**

- Painel de combate é desktop-first; garantir que funciona em tablet também.
- Import do bestiário: testar todas as 37 entradas.

**Demonstração:**

- Mestre importa Troll → edita nome → rola Lutar → rola dano → ajusta wound → arquiva → reativa.

---

### Fase 7 — Eventos/Marcos

**Objetivo:** mestre registra cenas, marcos e sessões para organizar a narrativa.

**Specs de referência:** 06 (eventos).

**Pré-requisitos:** Fases 0–3 (só precisa de campanha + auth + design system).

**Paralelizável com:** Fase 6 (mas recomendo fazer depois para não fragmentar a UX da campanha).

**Entregas:**

1. Bounded context `Story` com agregado `StoryEvent`, `StoryEventImage`.
2. Value Objects: `StoryEventTitle`, `StoryEventKind`, `StoryEventTag`, `MarkdownContent`.
3. Serviços: `StoryEventOrderer`, `MarkdownSanitizer`.
4. Casos de uso: `CreateStoryEvent`, `ListStoryEvents`, `GetStoryEvent`, `UpdateStoryEvent`, `ReorderStoryEvents`, `ArchiveStoryEvent`, `ReactivateStoryEvent`, `UploadStoryEventImage`, `RemoveStoryEventImage`.
5. Controllers REST + guard.
6. Frontend:
   - `/campaigns/:id/events` (lista ordenável com drag-and-drop).
   - `/story-events/:id` (detalhe).
   - `/story-events/:id/edit`.
   - `/story-events/new`.
   - `MarkdownEditor`, `MarkdownRenderer`, `ImageUploader`, `ImageGallery`, `TagInput`, `StoryEventCard`.

**Critérios de aceite:**

- [ ] Mestre cria evento com título, descrição markdown, kind, datas, tags e imagens.
- [ ] Eventos são invisíveis para jogadores.
- [ ] Reordenação via drag-and-drop com `orderIndex` denso.
- [ ] Arquivamento some da lista ativa.
- [ ] Tags limitadas a 10, cada uma ≤ 30 caracteres, sem duplicatas.
- [ ] Imagens: até 10 por evento, 5 MB cada, PNG/JPEG/WebP.
- [ ] Markdown sanitizado.
- [ ] Full-text search funcional.
- [ ] Filtro por kind.
- [ ] Log de alterações (se habilitado) append-only.
- [ ] Todas as operações soft delete.
- [ ] Todas as regras RN-EVENT-01 a RN-EVENT-17 cobertas por testes.

**Commits esperados (resumo):**

```
feat(story): add StoryEvent aggregate with kind, dates and tags
feat(story): add StoryEventImage entity
feat(story): implement StoryEventOrderer
feat(story): implement story use cases
feat(story): add HTTP controllers and StoryEventAccessGuard
feat(web): add story events list with drag-and-drop
feat(web): add story event form with markdown editor
feat(web): add image uploader and gallery
feat(web): add story event detail page
test(story): add e2e tests for full story event lifecycle
```

**Riscos:**

- Markdown sanitizer precisa bloquear `javascript:` URLs e `<script>` — testar com payloads maliciosos.
- Drag-and-drop acessível por teclado é complexo; reservar tempo para `ReorderHandle` acessível.

**Demonstração:**

- Criar 3 eventos → reordenar → arquivar → reativar → buscar por tag.

---

### Fase 8 — Iniciativa

**Objetivo:** mestre gerencia iniciativa por cartas durante o combate.

**Specs de referência:** 11 (iniciativa — a ser escrita).

**Pré-requisitos:** Fases 0–6.

**Entregas (previstas):**

1. Bounded context `Initiative` com sessão de combate em memória.
2. WebSocket para distribuir cartas em tempo real.
3. Curinga sacado: aviso em texto (não automático) que jogadores ganham Bene.
4. Reset de `curingaActive` ao encerrar rodada.
5. Frontend: painel de iniciativa com drag para reordenar, sacar cartas, encerrar rodada.

**Critérios de aceite (providos; validados na Spec 11):**

- [ ] Mestre inicia combate com N participantes (PJs + NPCs).
- [ ] Cartas sacadas por participante.
- [ ] Ordem exibida (Curinga > Ás > 2; empate ♠>♥>♦>♣).
- [ ] Curinga marca `curingaActive = true` + avisa em texto.
- [ ] Encerrar rodada reseta `curingaActive`.
- [ ] Funciona em mobile.

**Commits esperados (resumo):**

```
feat(initiative): add initiative session aggregate
feat(initiative): implement card drawing and ordering
feat(realtime): broadcast initiative updates
feat(web): add initiative panel with drag-and-drop
test(initiative): add e2e tests for full combat round
```

**Riscos:**

- Estado em memória é perdido em restart do Render — aceitável no MVP.
- Sincronização via WebSocket precisa ser robusta a reconexão.

**Demonstração:**

- Iniciar combate com 3 PJs + 2 NPCs → sacar cartas → ver ordem → Curinga sacado → aviso de Bene → encerrar rodada.

---

### Fase 9 — Player Notes

**Objetivo:** jogador registra anotações privadas vinculadas ao par personagem × campanha.

**Specs de referência:** 12 (a ser escrita).

**Pré-requisitos:** Fases 0–5.

**Entregas (previstas):**

1. Bounded context `PlayerNote` com agregado vinculado a `CharacterCampaignLink`.
2. CRUD de notas com título, corpo (markdown), tags.
3. Frontend: aba "Minhas anotações" na ficha **dentro do contexto de campanha**.
4. Isolamento: notas de uma campanha não aparecem em outra campanha.

**Critérios de aceite (previstos; validados na Spec 12):**

- [ ] Jogador cria nota vinculada a um par (character, campaign).
- [ ] Nota é privada do jogador (nem mestre vê).
- [ ] Notas não vazam entre campanhas.
- [ ] Markdown sanitizado.

**Commits esperados (resumo):**

```
feat(player-notes): add PlayerNote aggregate
feat(player-notes): implement CRUD use cases
feat(web): add player notes tab in campaign character view
test(player-notes): add e2e tests for isolation between campaigns
```

**Riscos:**

- Confusão de UX entre "notas do personagem" (global) e "notas na campanha" (por link) — deixar muito claro na UI.

**Demonstração:**

- Vincular personagem a campanha A → criar nota → vincular a campanha B → verificar que nota não aparece em B.

---

### Fase 10 — Polish, deploy e documentação

**Objetivo:** sistema estável, documentado, deployado em produção (free tier) e pronto para uso real.

**Pré-requisitos:** Fases 0–9 concluídas.

**Entregas:**

1. **Deploy em produção:**
   - Vercel (frontend).
   - Render (backend).
   - Neon (Postgres).
   - Backblaze B2 (backups).
   - Sentry (observabilidade).
2. **Domínio customizado (opcional):**
   - Apontar domínio próprio para Vercel e Render.
3. **Terraform aplicado:**
   - Módulos e providers funcionais.
   - State remoto configurado.
4. **Documentação:**
   - `README.md` final (com screenshots).
   - `docs/operations/runbook.md` (deploy, rollback, backup, restore).
   - `docs/operations/restore.md` (passo a passo de restauração).
   - `docs/design/` completo.
   - `docs/specs/` completo (este diretório).
5. **Testes finais:**
   - E2E completo: admin cria mestre → mestre cria campanha → jogador cria ficha → rola dados → mestre cria NPC → rola dados → mestre cria evento → iniciativa → notas.
   - Testes de carga básicos (não stress): 10 usuários simultâneos, 100 rolagens.
6. **Review de acessibilidade:**
   - axe-core 0 violações críticas.
   - Navegação por teclado em todas as telas.
7. **Review de segurança:**
   - `npm audit` limpo.
   - Headers verificados.
   - Rate limits testados manualmente.
8. **Review de performance:**
   - Lighthouse ≥ 85 em performance, acessibilidade, boas práticas e SEO.
   - TTFB < 1s (fora cold start do Render).
9. **Release v1.0.0:**
   - Tag Git.
   - Changelog gerado.
   - Release publicada no GitHub.

**Critérios de aceite:**

- [ ] Sistema acessível via URL pública (Vercel + Render).
- [ ] Todos os fluxos E2E passam em produção.
- [ ] Backups rodando (verificar 2 dias consecutivos).
- [ ] Sentry recebendo eventos de teste.
- [ ] Lighthouse ≥ 85 em todas as categorias.
- [ ] Nenhuma vulnerabilidade `high`/`critical`.
- [ ] README tem screenshots.
- [ ] Runbook de operações documentado.
- [ ] Terraform aplicado e reproduzível.
- [ ] Release v1.0.0 publicada.

**Riscos:**

- Free tier do Render tem cold start de 30–60s: documentar e considerar UptimeRobot.
- Neon free tier de 0.5 GB: monitorar uso; alerta em 80%.
- Backblaze B2 free tier: monitorar 10 GB.
- Vercel free tier: monitorar 100 GB de banda.

**Demonstração final:**

- Vídeo de 10 minutos cobrindo toda a jornada (admin → mestre → jogador → rolagens → NPC → evento → iniciativa → notas).

## 5. Pós-MVP (backlog documentado, não comprometido)

Estas features ficaram **fora do MVP** por decisão do autor, mas estão prontas para entrar em roadmap futuro:

1. **Regras de Ambientação** (Spec 08 §11) — Cura Rápida, Dano Severo, Limite de Ferimentos, Sem Pontos de Poder, etc., ativáveis por campanha.
2. **GMPC** (Spec 02 §17.2) — mestre com personagem na própria campanha.
3. **Campanhas privadas** (Spec 02 §17.2) — invisíveis na listagem, só por convite.
4. **Transferência de posse** de campanha.
5. **Banimento de membro** removido (impedir reentrada).
6. **Exportação/importação** de ficha (PDF/JSON).
7. **Idiomas** além de PT-BR.
8. **Aplicação automática de Progresso** por evento de campanha.
9. **Notificações por e-mail** (Resend/Postmark).
10. **Storybook hospedado** (Chromatic).
11. **Regressão visual** (Chromatic/Percy).
12. **CDN para imagens** (Cloudflare R2, Vercel Blob).
13. **Redis** para rate limit e Socket.IO adapter (HA).
14. **Sentry com tracing** distribuído (OpenTelemetry).
15. **Poderes estruturados** com controle de PP, modificadores e Choque de Retorno.
16. **Equipamento estruturado** com Carga, Força Mínima e Sobrecarga.
17. **Catálogo público** de campanhas com candidatura a entrada.
18. **Calendário visual** de eventos (Spec 06).
19. **Vantagens/habilidades raciais aplicadas automaticamente** em rolagens.
20. **Modificadores situacionais pré-configurados** (botões de "+2 Mirar", "−2 Distância").
21. **Rolagem combinada de ataque + dano** com um clique.
22. **Sorte Grande / Má Sorte** automáticos em Benes.

## 6. Dependências entre Fases

```
Fase 0 (Fundação)
  └── Fase 1 (Auth)
        └── Fase 2 (Design System + Seed)
              ├── Fase 3 (Campanhas)
              │     ├── Fase 4 (Fichas)
              │     │     ├── Fase 5 (Rolagens)
              │     │     │     ├── Fase 6 (NPCs)
              │     │     │     │     └── Fase 8 (Iniciativa)
              │     │     │     └── Fase 9 (Player Notes)
              │     │     └──
              │     └── Fase 7 (Eventos) [paralelizável com Fase 4]
              └──
                    └── Fase 10 (Polish + Deploy)
```

## 7. Ordem de Commits Globais (high-level)

A ordem de commits **segue as fases**. Entre fases, a regra é **merge na main apenas quando a fase anterior está verde**.

Para cada fase, o padrão é:

1. `chore(<bc>): bootstrap structure`
2. `feat(<bc>): add aggregate and value objects`
3. `feat(<bc>): implement use cases (plural, incremental)`
4. `feat(<bc>): add HTTP controllers and guards`
5. `feat(web): add pages and components`
6. `test(<bc>): add unit/integration/e2e tests`
7. `docs(<bc>): document endpoints and decisions`

## 8. Riscos Globais do MVP

| Risco                                               | Impacto | Mitigação                                               |
| --------------------------------------------------- | ------- | ------------------------------------------------------- |
| Free tier do Render com cold start                  | Alto    | Documentar; UptimeRobot free para ping a cada 10 min    |
| Quota do Neon (0.5 GB)                              | Médio   | Monitorar `pg_database_size()`; alerta em 80%           |
| Transcrição de 37 monstros do bestiário             | Alto    | Snapshot test por entrada; validação com o autor        |
| Transcrição de `requirements` de todas as Vantagens | Alto    | Testar cada Vantagem com caso de sucesso + falha        |
| Wizard de ficha (Fase 4) é complexo                 | Alto    | Prototipar UX antes de codar; dividir em 9 sub-entregas |
| WebSocket em Render free tier                       | Médio   | Testar cedo; fallback para polling via REST             |
| Quota de imagens (1 GB)                             | Médio   | Health check `/health/storage`; alerta em 80%           |
| Cross-origin cookies (Vercel ↔ Render)              | Alto    | Testar desde a Fase 1; `SameSite=None` + `Secure`       |
| Rate limit in-memory em Render (single instance)    | Baixo   | Aceitável no MVP; documentar migração para Redis        |
| Perda de estado da iniciativa em restart            | Baixo   | Aceitável; sessão de combate é curta                    |

## 9. Definition of Done (DoD) Global

Uma fase é considerada **concluída** quando:

- [ ] Todos os critérios de aceite da fase estão verdes.
- [ ] Cobertura de testes conforme a spec correspondente (varia por bounded context).
- [ ] Nenhuma regressão em fases anteriores (todos os testes passam).
- [ ] CI verde (`lint`, `typecheck`, `test`, `build`, `commitlint`).
- [ ] `npm audit` sem vulnerabilidades `high`/`critical`.
- [ ] Todas as strings passam por i18n.
- [ ] Toda copy PT-BR passou por Humanizer.
- [ ] Screenshots/GIFs atualizados (se a UI mudou).
- [ ] Documentação da fase atualizada em `docs/`.
- [ ] Deploy de staging (se aplicável) passou por smoke test.
- [ ] **Demonstração de 5 minutos** executada pelo autor e aprovada.
- [ ] Merge na `main` feito via PR com revisão.

## 10. Métricas de Sucesso do MVP

Após a Fase 10, o sistema deve:

- [ ] Estar disponível em URL pública (free tier).
- [ ] Suportar 1 mesa completa (1 mestre + 4 jogadores) simultaneamente.
- [ ] Ter 100% das regras RN-BR AUTOMÁTICAS e VALIDADAS cobertas por testes.
- [ ] Ter 0 violações críticas de acessibilidade (axe-core).
- [ ] Ter Lighthouse ≥ 85 em todas as categorias.
- [ ] Ter TTFB < 1s fora do cold start.
- [ ] Ter 0 vulnerabilidades `high`/`critical`.
- [ ] Ter backups rodando por ≥ 7 dias consecutivos.
- [ ] Ter Sentry capturando erros de produção (quando ocorrerem).
- [ ] Ter README com screenshots e quickstart em ≤ 5 comandos.
- [ ] Ter runbook de operações documentado.

## 11. Conventional Commits esperados (visão macro)

A ordem é por fase. Cada fase gera entre 15 e 40 commits. Padrões consolidados:

```
# Fase 0
chore(infra): ...
feat(infra): ...
ci(infra): ...
docs(infra): ...

# Fase 1
feat(auth): ...
feat(web): ...
test(auth): ...
docs(auth): ...

# Fase 2
feat(design): ...
feat(infra): ...
docs(design): ...

# Fase 3
feat(campaign): ...
feat(web): ...
test(campaign): ...

# Fase 4
feat(character): ...
feat(web): ...
test(character): ...

# Fase 5
feat(roll): ...
feat(realtime): ...
feat(web): ...
test(roll): ...

# Fase 6
feat(npc): ...
feat(web): ...
test(npc): ...

# Fase 7
feat(story): ...
feat(web): ...
test(story): ...

# Fase 8
feat(initiative): ...
feat(realtime): ...
feat(web): ...
test(initiative): ...

# Fase 9
feat(player-notes): ...
feat(web): ...
test(player-notes): ...

# Fase 10
chore(release): v1.0.0
docs(operations): ...
docs(readme): ...
ci(deploy): ...
```

## 12. Critérios de Aceite Globais do MVP

- [ ] Todas as fases 0–10 concluídas com DoD verde.
- [ ] Sistema em produção no free tier.
- [ ] Release v1.0.0 publicada no GitHub.
- [ ] Métricas de sucesso da §10 atingidas.
- [ ] Backlog pós-MVP documentado (§5).
- [ ] Nenhuma feature das Specs 01–09 e 11–12 fora do MVP.
- [ ] Nenhuma regra de negócio da Spec 08 EXCLUÍDA implementada por engano.
- [ ] Nenhuma feature pós-MVP implementada por engano.

## 13. Decisões e Pendências

### 13.1 Decisões registradas

- **Ordem das fases** conforme §3 e §6.
- **Deploy contínuo** a partir da Fase 1 (auth) — o sistema é deployável a cada fase.
- **Free tier exclusivo** no MVP (Vercel + Render + Neon + Backblaze B2 + GHCR + Sentry).
- **Design System entra na Fase 2** para evitar dívida visual.
- **Fase 6 e Fase 7 não são bloqueantes** entre si; podem ser paralelizadas se houver mais de um dev.
- **Fase 8 (Iniciativa) e Fase 9 (Player Notes) são pós-Spec 11 e Spec 12** (a serem geradas).
- **Backlog pós-MVP** documentado em §5, com 22 itens.

### 13.2 Pendências para o autor aprovar

- **Ordem de fases:** a sugestão acima prioriza "vertical slices por bounded context". O autor prefere inverter algo (ex.: Fase 7 antes da Fase 6)? **Recomendação:** manter a ordem sugerida (NPCs antes de Eventos, porque rolagens de NPC enriquecem o demo). **Aguardando confirmação.**
- **Duração total estimada:** ~16–22 semanas com 1 dev sênior full-time. O autor tem prazo específico? **Aguardando confirmação.**
- **Backlog pós-MVP:** algum item de §5 precisa entrar no MVP? **Recomendação:** manter fora. **Aguardando confirmação.**
- **Métricas de sucesso:** as da §10 estão alinhadas com a expectativa do autor? **Aguardando confirmação.**
- **Spec 11 e Spec 12:** precisam ser geradas antes da Fase 8 e Fase 9 respectivamente. O autor quer que eu gere **agora** ou **após aprovar a Spec 10**? **Recomendação:** gerar agora, em sequência, para fechar o pacote de specs. **Aguardando decisão.**

### 13.3 Pendências herdadas

- Spec 01: algoritmo JWT (HS256 recomendado), CSRF (Origin recomendado), rate limit (in-memory), biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket (Socket.IO recomendado), rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: aprovado integralmente.
- Spec 06: log de alterações de eventos (pendente), múltiplas imagens por evento (pendente), markdown sanitizado (pendente), `kind` de eventos (pendente), `eventDate` vs. `inGameDate` (pendente), calendário visual (pendente).
- Spec 07: aprovado integralmente (regressão visual como pendência menor).
- Spec 08: aprovado com cláusula sobre "Curinga ganha Bene manual" e "textos informativos".
- Spec 09: aprovado integralmente.
