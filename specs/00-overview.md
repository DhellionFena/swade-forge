# Spec 00 — Visão Geral do Projeto

## 1. Identidade

- **Nome do projeto:** Forja Selvagem
- **Propósito:** Sistema web para gerenciamento de campanhas de RPG de mesa no sistema **Savage Worlds — Edição Aventura** (SWADE).
- **Público-alvo:** Mesas pequenas (1 mestre + 3 a 6 jogadores), uso pessoal, open source no GitHub.
- **Idioma:** Português brasileiro (PT-BR). A arquitetura deve estar preparada para i18n desde o dia 1, mas apenas PT-BR é entregue no MVP.
- **Licença:** a definir pelo autor (sugestão: MIT para o código, com aviso de que SWADE® e Savage Worlds® são marcas da Pinnacle Entertainment Group).

## 2. Atores

O sistema possui três papéis funcionais. Um mesmo usuário pode ser **Admin**, **Mestre** e **Jogador** simultaneamente, respeitando as permissões de cada contexto.

### 2.1 Admin

- Cria contas de usuário (senha autogerada, entregue ao usuário).
- Altera o papel global de qualquer usuário (admin, mestre, jogador).
- Reseta senhas de usuários (inclusive de campanhas, como última instância).
- Cria, edita e inativa **conteúdo de referência global**: raças, vantagens, complicações, poderes, antecedentes arcanos e criaturas do bestiário.
- Não participa de campanhas como personagem (a menos que também tenha papel de mestre/jogador).

### 2.2 Mestre

- Herda todas as capacidades de um jogador.
- Cria campanhas sem limite de quantidade.
- Dentro de uma campanha que lhe pertence:
  - Define a senha de entrada (opcional).
  - Vê e edita fichas de personagens vinculados à campanha.
  - Cria e gerencia **NPCs** (privados).
  - Cria e gerencia **Chefes/Inimigos** (privados).
  - Escreve em **Eventos/Marcos** (privados, ordenação livre).
  - Faz rolagens de NPCs/Chefes.
  - Escolhe se rolagens próprias são visíveis aos jogadores (padrão: privado).
- Não pode acessar campanhas de outros mestres como mestre (vira jogador automaticamente se entrar como participante).

### 2.3 Jogador

- Cria **personagens globais** (não vinculados a nenhuma campanha por padrão).
- Vincula um ou mais personagens a uma ou mais campanhas.
- Vê a lista de campanhas disponíveis (com senha opcional).
- Rola perícias, atributos e danos clicando na própria ficha.
- Vê o log de rolagens da campanha (excluindo rolagens privadas do mestre).
- Edita a própria ficha após a criação (com log de alterações).
- Gerencia Benes e Convicção manualmente via botões +/−.

## 3. Glossário

### 3.1 Termos do SWADE aplicados no sistema

- **Carta Selvagem (Wild Card):** personagem com Dado Selvagem e limite de 3 Ferimentos. Todo PJ é Carta Selvagem. O mestre pode marcar NPCs/Chefes como Cartas Selvagens.
- **Extra:** personagem sem Dado Selvagem, com 1 Ferimento (ou 2 se Resiliente, 3 se Muito Resiliente).
- **Dado Selvagem:** d6 extra rolado por Cartas Selvagens. Deve aparecer em destaque visual (cor diferente) no log.
- **Ás (Ace):** quando um dado rola o valor máximo, rola novamente e soma. Aplicado para perícias, atributos e dano.
- **Falha Crítica:** 1 no dado de Característica E 1 no Dado Selvagem (apenas Cartas Selvagens). Deve ser destacada em **vermelho** no log.
- **Teste sem perícia:** d4 − 2 (+ Dado Selvagem se Carta Selvagem). Aplicado automaticamente.
- **Ampliação (Raise):** cada 4 pontos acima da Dificuldade.
- **Aparar (Parry):** 2 + metade do dado de Lutar (arredondado para baixo).
- **Resistência (Toughness):** 2 + metade do dado de Vigor + Armadura.
- **Movimentação:** 6 (padrão), alterável por raça/vantagem/complicação.
- **Tamanho:** 0 (padrão), alterável.
- **Curinga:** carta de iniciativa que concede +2 em todas as rolagens da rodada. Espaço para marcar "Curinga ativo" na ficha, aplicando +2 automaticamente.
- **Bene:** recurso de sorte. Gestão manual via botões +/− na ficha.
- **Convicção:** recurso especial, gestão manual via botões +/− na ficha.

### 3.2 Termos do sistema

- **Campanha:** unidade de organização criada por um mestre. Contém jogadores, fichas vinculadas, NPCs, Chefes/Inimigos, Eventos/Marcos e log de rolagens.
- **Ficha:** personagem de um jogador. Global (não pertence a uma campanha específica), mas pode ser vinculada a várias.
- **NPC:** personagem não jogável de cunho narrativo/social, privado do mestre.
- **Chefe/Inimigo:** personagem não jogável de combate, privado do mestre. Entidade separada de NPC.
- **Evento/Marco:** anotação de cena ou contexto do mestre, privada e reordenável.
- **Rolagem:** resultado de um teste registrado no log persistente.
- **Soft delete:** toda operação de "remoção" no sistema é lógica, nunca física.

## 4. Mapa de Funcionalidades (alto nível)

| Módulo            | Descrição                                                                                                              | Spec |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- |
| Autenticação      | Login, sessão, criação de contas pelo admin, reset de senha                                                            | 01   |
| Campanhas         | Criação, listagem, senha, entrada, saída, vínculo de fichas                                                            | 02   |
| Fichas            | Criação dinâmica, validação, raças, vantagens, complicações, perícias, atributos, cálculo de derivadas, edição com log | 03   |
| Rolagens          | Perícias, atributos, danos, Dado Selvagem, Ases, Falha Crítica, penalidades por ferimento, log em tempo real           | 04   |
| NPCs e Chefes     | Entidades separadas, ficha resumida rolável, privadas do mestre                                                        | 05   |
| Eventos/Marcos    | Anotações privadas do mestre, ordenação livre                                                                          | 06   |
| Design System     | Tokens de cor, componentes, tema claro/escuro, busca                                                                   | 07   |
| Regras de Negócio | Regras SWADE que o sistema aplica automaticamente vs. manual                                                           | 08   |
| Infraestrutura    | Docker, seed, ORM, i18n, storage de imagens                                                                            | 09   |
| Roadmap MVP       | Ordem de implementação e critérios de aceite                                                                           | 10   |
| Iniciativa        | Gerenciador de iniciativa por cartas                                                                                   | 11   |

## 5. Requisitos Técnicos Obrigatórios

Estes requisitos são **não negociáveis** e devem orientar todas as specs seguintes.

### 5.1 Stack

- **Frontend:** Next.js (App Router, TypeScript), componentização máxima.
- **Backend:** NestJS (TypeScript).
- **Banco de dados:** PostgreSQL.
- **ORM:** TypeORM (com migrations versionadas).
- **Runtime:** Node.js **24**.
- **Containerização:** Docker + docker-compose para o desenvolvimento local; imagem do backend preparada para produção.
- **Autenticação:** implementada do zero (sem Supabase Auth, Clerk, NextAuth ou similares).

### 5.2 Metodologia

- **TDD obrigatório**: ciclo red-green-refactor em toda funcionalidade nova. Nenhuma feature entra no branch principal sem testes que a cobrem.
- **DDD**: separar o domínio em bounded contexts explícitos (Auth, Campaign, Character, Roll, Npc, Event, Reference, Initiative). Cada contexto tem seu agregado, entidades, value objects, repositórios e serviços de aplicação.
- **Clean Architecture**: camadas `domain` → `application` → `infrastructure` → `presentation`. Regra de dependência: o domínio não conhece frameworks. NestJS e TypeORM vivem na infraestrutura.
- **Clean Code**: nomes claros, funções curtas, sem duplicação, sem números mágicos, sem dependências ocultas.

### 5.3 Processo de desenvolvimento e skills obrigatórias

A IA desenvolvedora **deve buscar, listar e aplicar** skills de todas as áreas abaixo antes de iniciar qualquer spec. A ausência da skill na base consultada deve ser registrada e reportada ao autor.

**Engenharia de software**

- Desenvolvimento de software (princípios gerais, SOLID, padrões de projeto).
- DDD (Domain-Driven Design).
- TDD (Test-Driven Development).
- Clean Architecture.
- Clean Code.
- Conventional Commits.
- Componentização máxima no frontend.

**User Experience (UX)**

- Pesquisa de UX e definição de personas/jornadas (Admin, Mestre, Jogador).
- Arquitetura da informação e hierarquia de navegação (mapa de telas, fluxos de entrada, fluxos de rolagem).
- Design de interação (fluxos de criação de ficha, fluxo de rolagem com modificador, fluxo de vínculo de ficha a campanha).
- Usabilidade mobile-first para a visão do jogador e desktop-first para a visão do mestre.
- Acessibilidade (WCAG AA como meta, navegação por teclado, contraste, foco visível).
- Microcopy e mensagens de erro que expliquem o "porquê" da validação (exigência registrada na Spec 00, seção 5.4.13 das respostas do autor).
- Feedback de sistema (estados de carregamento, vazio, erro, sucesso, confirmação de ações destrutivas).

**Design**

- Design System baseado na paleta e nos componentes do arquivo `swade-cheat-sheet.html`.
- Tokens de cor, tipografia, espaçamento e elevação.
- Componentização visual (botões, cards, tabelas, modais, inputs, chips, badges de estado).
- Tema claro/escuro com contraste validado.
- Consistência visual entre telas, incluindo estados de erro (vermelho `#c04040`), sucesso (verde `#4a9a4a`) e informação (azul `#4a7aaa`).
- Iconografia e hierarquia tipográfica.

**Texto**

- **Humanizer** em todos os textos de UI, mensagens de erro, documentação e copy de onboarding. Tom natural, sem clichês de IA, sem redundância, sem "Como uma IA..." ou equivalentes.

### 5.4 Processo de trabalho

- **Git** com **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`, `perf:`).
- Branches curtas por feature, com PRs para `main`.
- Cada PR deve referenciar a spec correspondente e listar as skills aplicadas.

### 5.5 Seed obrigatória

- Toda vez que um banco novo é criado (dev, staging, prod), uma **seed** roda automaticamente.
- A seed popula:
  - Usuário admin inicial (via variável de ambiente).
  - Atributos (5).
  - Perícias (todas as 28 do livro, com atributo associado e flag "básica").
  - Raças pré-cadastradas (10 + 2 exemplos do livro: Anões, Androide, Aquariano, Aviano, Elfos, Meio-Elfos, Humanos, Pequeninos, Rakashanos, Sáurios, Celestiais, Guardiões).
  - Complicações (todas do livro).
  - Vantagens (todas do livro, com estágio, requisitos e descrição).
  - Antecedentes arcanos (5: Ciência Estranha, Dom, Magia, Milagres, Psionicos).
  - Poderes (todos do Capítulo 5).
  - Bestiário (todas as criaturas do Capítulo 6).
- Seeds devem ser **idempotentes** e seguras para reexecução.

### 5.6 Storage de imagens

- Anexos de imagem são salvos em **volume do backend**, não em banco.
- Volume com **1 GB reservado** no ambiente inicial.
- Nomes de arquivo não colidem (UUID + hash + extensão).
- Backend serve imagens via endpoint autenticado (nunca estático público no MVP).

### 5.7 Infraestrutura como código

- Configuração de infraestrutura em **Terraform agnóstico de provedor** (módulos separados para o domínio de infra e para o adapter de hospedagem).
- Hospedagem preferencial: Vercel para o frontend. Backend e banco em qualquer provedor com Docker + Postgres gerenciado.

## 6. Requisitos Não-Funcionais

- **Responsivo**: mobile-first para a visão do jogador; desktop-first para a visão do mestre.
- **Tempo real**: log de rolagem via WebSocket (a definir na spec 04 qual biblioteca/camada).
- **Soft delete** em todas as entidades que representam conteúdo do usuário.
- **Busca por palavra-chave**: presente em todas as telas com listas (campanhas, fichas, vantagens, complicações, poderes, bestiário, regras).
- **Tema claro/escuro**: toggle global, preferência salva por usuário.
- **Acessibilidade**: navegação por teclado e contraste mínimo (WCAG AA é desejável, não bloqueante).
- **i18n**: todos os textos visíveis passam por chaves de tradução. PT-BR é o único idioma traduzido no MVP.

## 7. Design System

O Design System deve ser construído com base nas **skills de UX e Design** listadas na seção 5.3, e não apenas replicando a paleta do escudo. O arquivo `swade-cheat-sheet.html` é a **referência de paleta, tipografia e padrão de card**, mas o sistema deve:

- Definir tokens de cor, espaçamento, tipografia e elevação.
- Definir a biblioteca de componentes visuais reutilizáveis (botões, cards, tabelas, modais, inputs, chips, badges de estado, toasts).
- Definir padrões de estado (loading, empty, error, success, disabled) para todos os componentes.
- Definir padrões de validação e mensagens de erro que expliquem o "porquê" ao usuário (exigência do autor).
- Garantir contraste adequado em ambos os temas (claro e escuro).
- Ser documentado como parte do repositório (pasta `docs/design/` ou similar).

**Paleta principal:**

- Fundo escuro: `#12121a`
- Acento/dourado: `#e0b040`
- Vermelho (Falha Crítica e alertas): `#c04040`
- Verde (sucesso): `#4a9a4a`
- Azul (informação): `#4a7aaa`

**Componente-base de card:** fundo escuro, borda esquerda dourada, tipografia clara.

## 8. Escopo do MVP

Baseado nas respostas do autor, o MVP inclui:

- Autenticação própria + perfis (Admin, Mestre, Jogador).
- Campanhas com senha opcional, entrada por listagem, vínculo de fichas.
- Ficha de personagem dinâmica com validação de pontos, raças, complicações, vantagens e perícias pré-cadastradas.
- Cálculo automático de Aparar, Resistência, Movimentação e Tamanho.
- Rolagens de perícias, atributos e dano com Dado Selvagem, Ases, Falha Crítica destacada e aplicação automática de penalidade por Ferimento.
- Modificador manual antes da rolagem.
- Log persistente de rolagens com WebSocket, com controle de visibilidade (jogador vê tudo da campanha; mestre escolhe se suas rolagens são públicas, padrão privado).
- Gestão manual de Benes e Convicção via botões +/−.
- Botão "Curinga" que ativa +2 nas rolagens da rodada.
- NPCs e Chefes/Inimigos separados, privados, fichas resumidas roláveis.
- Eventos/Marcos privados com ordenação livre.
- Gerenciador de iniciativa por cartas.
- Seed completa de conteúdo do livro.
- i18n estruturado (PT-BR apenas).
- Soft delete universal.
- Upload de imagens em volume de 1 GB.

## 9. Fora de Escopo (Futuro)

- Exportação de ficha (PDF/JSON) e importação.
- Idiomas além do PT-BR.
- Regras de Ambientação ativáveis por campanha.
- Aplicação automática de Progresso aos personagens de uma campanha.
- Automação completa de Benes (Curinga concedendo Bene automaticamente, etc.).
- Catálogo público de campanhas com candidatura a entrada.

## 10. Índice de Specs

- `01-auth.md` — autenticação, usuários, papéis, reset de senha
- `02-campaigns.md` — campanhas, senhas, listagem, vínculo de fichas, visibilidade
- `03-characters.md` — ficha, raças, vantagens, complicações, perícias, atributos, derivadas, edição
- `04-dice-roller.md` — rolagens, Dado Selvagem, Ases, Falha Crítica, log, WebSocket
- `05-npcs.md` — NPCs, Chefes/Inimigos, fichas resumidas, rolagens
- `06-events.md` — Eventos/Marcos
- `07-design-system.md` — tokens, componentes, tema, busca
- `08-business-rules.md` — regras SWADE aplicadas automaticamente vs. manual
- `09-infrastructure.md` — Docker, seed, ORM, i18n, storage, Terraform
- `10-mvp-roadmap.md` — ordem de implementação e critérios de aceite
- `11-initiative.md` — gerenciador de iniciativa por cartas
- `12-player-notes.md` — espaço exclusivo do jogador para anotar memórias

## 11. Decisões e Pendências

### 11.1 Decisões registradas

- O sistema é **open source** e hospedado publicamente no GitHub.
- Deleção **física** não existe no MVP (soft delete universal).
- Conteúdo de referência (raças, vantagens, complicações, poderes, bestiário) é **global** ao sistema, criado por Admin.
- Todo PJ é **Carta Selvagem** por padrão. Mestre decide para NPCs/Chefes.
- O sistema **rola** os dados, mas **não resolve** consequências de combate (dano vs. Resistência, aplicação de Ferimentos, etc.) — isso é responsabilidade do mestre.
- Dificuldade padrão 4 e modificadores situacionais são **manuais**, com o sistema apenas somando/subtraindo os valores informados.
- As skills de **UX** e **Design** são obrigatórias e a IA desenvolvedora deve declará-las no início de cada spec, assim como as skills de engenharia.

### 11.2 Pendências para specs seguintes

- `04-dice-roller`: definir biblioteca de WebSocket (Socket.IO, WebSocket nativo ou SSE), modelo de dados do log e política de retenção.
- `09-infrastructure`: definir estratégia de seed (SQL puro, migração TypeORM ou comando CLI) e formato das traduções (i18next, next-intl, custom).
- `11-initiative`: definir se a iniciativa é uma entidade persistente da campanha ou um estado em memória por sessão.
