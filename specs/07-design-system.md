# Spec 07 — Design System

## 1. Objetivo

Definir o **Design System** do Forja Selvagem como um conjunto de **tokens, componentes, padrões de interação e diretrizes de UX** que garantem consistência visual, comportamental e de acessibilidade em todas as telas do sistema. Este documento é a fonte de verdade para frontend, e deve ser construído com base nas **skills obrigatórias de UX e Design** definidas na Spec 00 §5.3.

O design visual baseia-se no arquivo `swade-cheat-sheet.html` (fornecido no repositório), que estabelece paleta, tipografia e padrão de card. Este documento **extrapola** o escudo: define tokens, componentes, estados, acessibilidade e padrões de interação para todo o sistema.

## 2. Escopo

### 2.1 Dentro do escopo

- **Tokens** de cor, tipografia, espaçamento, elevação, raio, movimento.
- **Tema claro e escuro** com alternância persistida por usuário.
- **Componentes atômicos** (botões, inputs, badges, etc.).
- **Componentes compostos** (cards, tabelas, modais, timelines).
- **Componentes de domínio** (campaign card, character card, dice roll result, npc card).
- **Padrões de layout** (grid, page shell, sidebars, tabs).
- **Padrões de interação** (drag-and-drop, upload, wizard multi-etapa, busca com filtros).
- **Padrões de estado** (loading, empty, error, success, disabled, skeleton).
- **Padrões de validação** e mensagens de erro (com `message` + `hint`).
- **Acessibilidade** (WCAG AA, navegação por teclado, ARIA).
- **Microcopy** (com skill Humanizer obrigatória).
- **i18n** (PT-BR apenas no MVP).
- **Busca por palavra-chave** global, presente em todas as telas com listas.
- **Documentação** no repositório (pasta `docs/design/` e Storybook recomendado).

### 2.2 Fora do escopo

- Design de telas individuais (cada spec de feature detalha suas telas).
- Ilustrações (usar biblioteca de ícones — ver §5.4).
- Logos e marca (Forja Selvagem é um nome; o logo pode ser um texto estilizado).
- Animações complexas (apenas transições essenciais no MVP).
- Testes de usabilidade com usuários reais (não no MVP).
- Internacionalização além de PT-BR (estrutura preparada, mas não traduzido).

## 3. Skills Obrigatórias de UX e Design

A IA desenvolvedora **deve buscar, listar e aplicar** skills das seguintes áreas antes de começar qualquer componente. A ausência da skill na base consultada deve ser reportada ao autor.

### 3.1 User Experience (UX)

- **Pesquisa de UX** — personas (Admin, Mestre, Jogador), jornadas, dores.
- **Arquitetura da informação** — mapa de telas, hierarquia de navegação, taxonomia.
- **Design de interação** — fluxos críticos (login, criação de ficha, rolagem, entrada em campanha).
- **Usabilidade mobile-first** para a visão do jogador; **desktop-first** para a visão do mestre.
- **Acessibilidade** — WCAG AA como meta; navegação por teclado; ARIA quando necessário.
- **Microcopy** — mensagens de erro que explicam o "porquê"; feedback de sistema; onboarding.
- **Feedback do sistema** — loading, empty, error, success, confirmação de ações destrutivas.
- **Testes de usabilidade heurísticos** — revisão contra as 10 heurísticas de Nielsen antes de cada entrega.

### 3.2 Design

- **Design System** — tokens, componentes, padrões.
- **Tipografia** — hierarquia visual, tamanhos, pesos.
- **Cores** — paleta, contraste, semântica (sucesso, erro, aviso, info).
- **Iconografia** — coerência visual, tamanhos, alinhamento.
- **Componentização visual** — anatomia de cada componente.
- **Temas** — claro/escuro com paridade visual.
- **Documentação** — Storybook ou similar (recomendado).

### 3.3 Texto

- **Humanizer** — todos os textos de UI, mensagens de erro, docs e onboarding.
- **Tom de voz** — direto, próximo, sem jargão técnico desnecessário, sem clichês de IA.
- **Consistência terminológica** — glossário do sistema aplicado em toda copy.

## 4. Princípios de Design

1. **Rápido, Divertido e Furioso** — o sistema deve transmitir a energia do Savage Worlds. Sem telas lentas, sem cliques desnecessários, sem fricção.
2. **Clareza antes de decoração** — a informação mais importante (rolagem, nome do personagem, contadores) deve ser a mais visível.
3. **Consistência entre telas** — mesmos padrões em todas as features. Um botão de "Rolar" deve se comportar igual em qualquer tela.
4. **Densidade com respiro** — a visão do mestre pode ser densa; a do jogador pode ser mais espaçada. Nunca sacrificar legibilidade.
5. **Acessível por padrão** — contraste AA, navegação por teclado, foco visível, ARIA quando necessário. Acessibilidade não é feature opcional.
6. **Mobile-first no jogador, desktop-first no mestre** — o jogador usa celular na mesa; o mestre usa notebook para preparação e condução.
7. **Feedback imediato** — toda ação tem retorno visual em menos de 100ms. Toda operação longa mostra progresso.
8. **Reversibilidade** — ações destrutivas exigem confirmação; soft delete é o padrão; nada é irreversível sem aviso.

## 5. Tokens de Design

Todos os tokens são definidos como **CSS variables** no `:root` e no `.light` (ou tema equivalente) e mapeados no Tailwind config. Nenhum valor de cor/tipografia/espaçamento deve ser hardcoded em componentes.

### 5.1 Cores (semânticas)

Baseadas no escudo (`swade-cheat-sheet.html`) e na paleta SWADE.

| Token                    | Tema escuro | Tema claro | Uso                                 |
| ------------------------ | ----------- | ---------- | ----------------------------------- |
| `--color-bg-base`        | `#12121a`   | `#f0f0f5`  | Fundo de página                     |
| `--color-bg-surface`     | `#1a1a24`   | `#ffffff`  | Fundo de cards e seções             |
| `--color-bg-elevated`    | `#222230`   | `#fafafa`  | Fundo de cards elevados, modais     |
| `--color-bg-hover`       | `#2a2a3a`   | `#f0f0f8`  | Hover em cards e itens              |
| `--color-bg-input`       | `#222230`   | `#ffffff`  | Fundo de inputs                     |
| `--color-text-primary`   | `#e6e6f0`   | `#222233`  | Texto principal                     |
| `--color-text-secondary` | `#8a8aa0`   | `#666680`  | Texto secundário, helper            |
| `--color-text-disabled`  | `#5a5a70`   | `#a0a0b0`  | Texto desabilitado                  |
| `--color-border`         | `#2e2e3e`   | `#d0d0e0`  | Bordas padrão                       |
| `--color-border-strong`  | `#4a4a5e`   | `#a0a0b0`  | Bordas de destaque                  |
| `--color-accent`         | `#e0b040`   | `#a08030`  | Dourado SWADE (CTA, destaque)       |
| `--color-accent-hover`   | `#f0c050`   | `#b09040`  | Dourado hover                       |
| `--color-accent-dim`     | `#a08030`   | `#806020`  | Dourado escurecido (bordas, ícones) |
| `--color-success`        | `#4a9a4a`   | `#3a7a3a`  | Sucesso, verde                      |
| `--color-danger`         | `#c04040`   | `#a03030`  | Erro, Falha Crítica, vermelho       |
| `--color-warning`        | `#d09030`   | `#b07020`  | Aviso, laranja                      |
| `--color-info`           | `#4a7aaa`   | `#3a5a8a`  | Informação, azul                    |
| `--color-focus-ring`     | `#e0b040`   | `#a08030`  | Anel de foco (acessibilidade)       |

**Regra:** todo contraste texto/fundo deve passar **WCAG AA** (4.5:1 para texto normal, 3:1 para texto grande).

### 5.2 Cores por papel semântico

Aplicações específicas:

| Token                     | Uso                                |
| ------------------------- | ---------------------------------- |
| `--color-role-admin`      | Dourado `#e0b040`                  |
| `--color-role-master`     | Azul `#4a7aaa`                     |
| `--color-role-player`     | Verde `#4a9a4a`                    |
| `--color-rank-novato`     | Cinza `#8a8aa0`                    |
| `--color-rank-experiente` | Azul `#4a7aaa`                     |
| `--color-rank-veterano`   | Roxo `#8a4aaa`                     |
| `--color-rank-heroico`    | Dourado `#e0b040`                  |
| `--color-rank-lendario`   | Vermelho `#c04040`                 |
| `--color-wc`              | Dourado `#e0b040` (Carta Selvagem) |
| `--color-extra`           | Cinza `#8a8aa0`                    |
| `--color-critical`        | Vermelho `#c04040` (Falha Crítica) |
| `--color-ace`             | Dourado `#e0b040` (Ás)             |

### 5.3 Tipografia

**Fonte principal:** `Inter` (UI) — sans-serif, legibilidade alta em telas.
**Fonte mono:** `JetBrains Mono` (código, expressões de dano, números de dados).

| Token                    | Valor                          | Uso                                         |
| ------------------------ | ------------------------------ | ------------------------------------------- |
| `--font-sans`            | `Inter, system-ui, sans-serif` | Texto padrão                                |
| `--font-mono`            | `JetBrains Mono, monospace`    | Dados, expressões                           |
| `--text-xs`              | `0.75rem` (12px)               | Labels, helper                              |
| `--text-sm`              | `0.875rem` (14px)              | Corpo secundário                            |
| `--text-base`            | `1rem` (16px)                  | Corpo padrão                                |
| `--text-lg`              | `1.125rem` (18px)              | Subtítulos                                  |
| `--text-xl`              | `1.25rem` (20px)               | Títulos pequenos                            |
| `--text-2xl`             | `1.5rem` (24px)                | Títulos de página                           |
| `--text-3xl`             | `1.875rem` (30px)              | Títulos grandes                             |
| `--text-4xl`             | `2.25rem` (36px)               | Números de destaque (resultado de rolagem)  |
| `--font-weight-normal`   | `400`                          | Corpo                                       |
| `--font-weight-medium`   | `500`                          | Ênfase leve                                 |
| `--font-weight-semibold` | `600`                          | Títulos                                     |
| `--font-weight-bold`     | `700`                          | Destaque forte                              |
| `--line-height-tight`    | `1.2`                          | Títulos                                     |
| `--line-height-normal`   | `1.5`                          | Corpo                                       |
| `--line-height-relaxed`  | `1.7`                          | Textos longos (descrição de ficha, eventos) |

### 5.4 Espaçamento

Escala de 4px:

| Token        | Valor            |
| ------------ | ---------------- |
| `--space-1`  | `0.25rem` (4px)  |
| `--space-2`  | `0.5rem` (8px)   |
| `--space-3`  | `0.75rem` (12px) |
| `--space-4`  | `1rem` (16px)    |
| `--space-5`  | `1.25rem` (20px) |
| `--space-6`  | `1.5rem` (24px)  |
| `--space-8`  | `2rem` (32px)    |
| `--space-10` | `2.5rem` (40px)  |
| `--space-12` | `3rem` (48px)    |
| `--space-16` | `4rem` (64px)    |

### 5.5 Raios (border-radius)

| Token           | Valor            | Uso                    |
| --------------- | ---------------- | ---------------------- |
| `--radius-sm`   | `0.25rem` (4px)  | Inputs, badges         |
| `--radius-md`   | `0.375rem` (6px) | Botões, cards pequenos |
| `--radius-lg`   | `0.5rem` (8px)   | Cards, modais          |
| `--radius-xl`   | `0.75rem` (12px) | Painéis maiores        |
| `--radius-full` | `9999px`         | Avatares, pills        |

### 5.6 Sombras (elevação)

| Token            | Valor                               | Uso                 |
| ---------------- | ----------------------------------- | ------------------- |
| `--shadow-sm`    | `0 1px 2px rgba(0,0,0,0.2)`         | Elementos discretos |
| `--shadow-md`    | `0 2px 8px rgba(0,0,0,0.3)`         | Cards, botões hover |
| `--shadow-lg`    | `0 4px 16px rgba(0,0,0,0.4)`        | Modais, dropdowns   |
| `--shadow-focus` | `0 0 0 2px var(--color-focus-ring)` | Foco visível        |

### 5.7 Movimento (transições)

| Token                 | Valor                        | Uso                                  |
| --------------------- | ---------------------------- | ------------------------------------ |
| `--duration-fast`     | `100ms`                      | Hover, foco                          |
| `--duration-normal`   | `200ms`                      | Aparecer/sumir, transições de estado |
| `--duration-slow`     | `300ms`                      | Modais, wizards                      |
| `--easing-standard`   | `cubic-bezier(0.2, 0, 0, 1)` | Padrão                               |
| `--easing-decelerate` | `cubic-bezier(0, 0, 0, 1)`   | Entrada de elementos                 |

**Preferência de movimento reduzido:** respeitar `prefers-reduced-motion` e reduzir transições a 0ms.

### 5.8 Ícones

Biblioteca: **Lucide** (consistente, árvore pequena, MIT).

- Tamanhos: `16`, `20`, `24`, `32`.
- Cor: herda de `currentColor`.
- Uso: **sempre com `aria-hidden="true"`** quando decorativo; `aria-label` quando é o único conteúdo.

### 5.9 Z-index

| Token          | Valor  | Uso                    |
| -------------- | ------ | ---------------------- |
| `--z-base`     | `0`    | Fluxo normal           |
| `--z-dropdown` | `100`  | Dropdowns, popovers    |
| `--z-sticky`   | `200`  | Cabeçalhos sticky      |
| `--z-modal`    | `1000` | Modais                 |
| `--z-toast`    | `1100` | Toasts (acima de tudo) |

## 6. Temas (Claro/Escuro)

- **Alternância global** no topo de todas as telas.
- **Persistência** por usuário (localStorage + preferência do sistema como default).
- **Sistema:** respeitar `prefers-color-scheme` na primeira visita.
- **Todos os componentes** devem funcionar em ambos os temas sem perda de contraste.
- **Testes** de contraste em ambos os temas obrigatórios antes de fechar qualquer componente.

## 7. Componentes Atômicos

Todos os componentes são **TypeScript**, com props tipadas, testes unitários e story no Storybook (recomendado).

### 7.1 Botões (`<Button>`)

**Variantes:** `primary`, `secondary`, `ghost`, `danger`, `link`.
**Tamanhos:** `sm`, `md`, `lg`.
**Estados:** default, hover, focus, active, disabled, loading.

**Props:**

```typescript
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};
```

````

**Regras de UX:**

- Botão `primary` só um por tela (ação principal).
- `danger` exige confirmação em fluxos destrutivos (via `<ConfirmDialog>`).
- `loading` desabilita interação e mostra spinner.
- Área de toque mínima 44×44px (mobile).

### 7.2 Inputs (`<Input>`, `<Textarea>`, `<PasswordInput>`, `<SearchInput>`)

**Estados:** default, focus, error, disabled, readonly.

**Props essenciais:**

- `label` (obrigatório).
- `helperText` (opcional).
- `error` (opcional, string com mensagem + `hint`).
- `required`, `disabled`, `readonly`.
- `leftIcon`, `rightIcon`.

**Regras:**

- Sempre com `<label>` associado via `htmlFor` (acessibilidade).
- Erro mostra borda `--color-danger` + mensagem abaixo em `--color-danger` + `hint` em `--color-text-secondary`.
- `PasswordInput` tem toggle "mostrar senha" (ícone `Eye`/`EyeOff`).
- `SearchInput` tem ícone `Search` à esquerda e botão "limpar" (X) à direita quando há texto.

### 7.3 Select (`<Select>`)

- Usar componente acessível (Radix UI Select ou equivalente — não `<select>` nativo estilizado, exceto em casos simples).
- Suporta busca quando há mais de 10 opções.
- Suporta grupos.
- Estados: default, focus, error, disabled.

### 7.4 Checkbox / Radio / Switch

- `<Checkbox>` — label ao lado, área de toque 44×44px.
- `<RadioGroup>` — usado em escolhas mutuamente exclusivas.
- `<Switch>` — toggle para preferências (tema, visibilidade).

### 7.5 Badges (`<Badge>`)

**Variantes:**

- `role` — Admin (dourado), Mestre (azul), Jogador (verde).
- `rank` — Novato, Experiente, Veterano, Heroico, Lendário (cores por rank).
- `status` — Ativo (verde), Arquivado (cinza), Inativo (vermelho).
- `wildcard` — ⭐ Carta Selvagem (dourado).
- `extra` — Extra (cinza).
- `critical` — Falha Crítica (vermelho).
- `ace` — Ás (dourado).
- `kind` — Nota, Marco, Cena, Sessão (cores específicas).
- `custom` — texto livre com cor.

### 7.6 Avatar (`<Avatar>`)

- Iniciais do nome em círculo com fundo `--color-accent-dim`.
- Tamanhos: `sm`, `md`, `lg`.
- Fallback: ícone de usuário.
- Suporta imagem (foto do usuário — futuro).

### 7.7 Spinner e Skeleton

- `<Spinner>` — circular, tamanhos `sm`, `md`, `lg`.
- `<Skeleton>` — retângulo animado, formas: `text`, `circle`, `rect`.
- Regra: **nunca** usar texto "Carregando..." como único feedback — sempre skeleton ou spinner visível.

### 7.8 Chips e Tags

- `<Chip>` — usado para tags (removível com X).
- `<TagInput>` — input com chips, limite configurável, deduplicação case-insensitive.

## 8. Componentes Compostos

### 8.1 Card (`<Card>`)

Base de **todas** as superfícies.

**Props:**

- `accent` (boolean) — borda esquerda dourada (padrão do escudo).
- `elevated` (boolean) — sombra maior.
- `interactive` (boolean) — hover + cursor pointer.
- `onClick` (opcional).
- `padding` (`none` | `sm` | `md` | `lg`).
- `children`.

**Regra do escudo:** cards de conteúdo principal usam `accent=true` (borda esquerda dourada). Cards de listagem simples (linha de tabela) não usam.

### 8.2 Modal / Dialog (`<Modal>`, `<ConfirmDialog>`)

- Baseado em Radix Dialog (ou equivalente).
- Foco preso, ESC fecha, clique fora fecha (configurável).
- `aria-modal`, `aria-labelledby`.
- Botões no rodapé, alinhados à direita.
- `<ConfirmDialog>` é uma variante com título, mensagem, botão de confirmação (primary ou danger) e cancelar.

### 8.3 Toast (`<Toast>`)

- 4 variantes: `success`, `error`, `warning`, `info`.
- Posição: canto superior direito (desktop), topo central (mobile).
- Auto-dismiss em 5s (pausável no hover).
- Empilhamento: máximo 3 visíveis.
- `role="status"` para sucesso/info, `role="alert"` para erro/aviso.

### 8.4 DataTable (`<DataTable>`)

- Colunas configuráveis, ordenáveis, com busca integrada.
- Paginação (com controle de itens por página).
- Estado vazio configurável.
- Skeleton durante carregamento.
- Acessível: `<table>` semântica com `<thead>`/`<tbody>`/`<caption>`.

### 8.5 Tabs (`<Tabs>`)

- Baseado em Radix Tabs.
- Navegação por setas do teclado.
- Estado ativo visualmente distinto (borda inferior dourada).
- Suporta ícone por tab.

### 8.6 Pagination (`<Pagination>`)

- Botões: primeira, anterior, próxima, última.
- Seletor de itens por página (10, 20, 50, 100).
- Mostra "1–20 de 137".

### 8.7 SearchBox (`<SearchBox>`)

- Input com ícone de busca à esquerda, botão limpar à direita.
- Debounce de 300ms.
- Atalho de teclado `/` para focar (global).
- **Usado em todas as telas com listas** (campanhas, fichas, vantagens, complicações, poderes, bestiário, regras, eventos, NPCs).

### 8.8 EmptyState (`<EmptyState>`)

- Ícone grande, título, descrição e CTA.
- Variantes: `default`, `error`, `no-results`.
- Mensagens específicas por tela (passadas via props).

### 8.9 Timeline (`<Timeline>`)

- Para change logs (fichas, eventos) e log de rolagens.
- Cada item: timestamp, ícone, título, descrição, metadados.
- Ordem decrescente (mais recente primeiro).

### 8.10 ReorderHandle (`<ReorderHandle>`)

- Ícone de arrastar (6 pontinhos).
- Usado em listas ordenáveis (eventos, imagens).
- Acessível: suporta teclado (setas + Enter) além de drag-and-drop.

### 8.11 Markdown Editor / Renderer

- `<MarkdownEditor>` — abas "Editar" / "Preview".
- `<MarkdownRenderer>` — renderiza markdown sanitizado (sem HTML bruto, sem scripts).
- Suporte: headings, negrito, itálico, listas, links, código inline, blockquote, tabelas simples.
- Sanitização obrigatória (DOMPurify ou equivalente).

### 8.12 Image Uploader / Gallery

- `<ImageUploader>` — dropzone com preview, progresso, validação de MIME e tamanho.
- `<ImageGallery>` — grid com lightbox e botão remover.
- Suporta reordenação (arrastar).

## 9. Componentes de Domínio

### 9.1 `<CampaignCard>`

- Nome, descrição curta, dono (avatar + nome), badge de senha, badge "membro"/"dono".
- CTA: "Entrar" / "Ver".

### 9.2 `<CharacterCard>`

- Nome, raça, rank (badge), derivadas resumidas (Aparar/Resistência), indicador de Curinga ativo.
- CTA: "Abrir".

### 9.3 `<NpcCard>`

- Nome, tipo (`npc`/`enemy`/`boss`, badge colorido), WC/Extra, thumbnail, wounds/fatigue.
- CTA: "Abrir".

### 9.4 `<DiceRollButton>`

- Label (ex.: "Lutar"), dado (ex.: "d10"), ícone de dado.
- Estados: idle, rolling, result.

### 9.5 `<DiceRollResult>`

- Breakdown visual de dados.
- Cada dado com valor, Áses destacados, wild die marcado.
- Modificadores em tabela.
- Total em destaque (`--text-4xl`).
- Falha Crítica: fundo vermelho suave + ícone.

### 9.6 `<AceBadge>` / `<CriticalFailureBadge>` / `<WildDieIndicator>`

### 9.7 `<DerivedStatCard>`

- Bloco com Aparar, Resistência, Movimentação, Tamanho.

### 9.8 `<RuntimeCounter>`

- +/− ao redor de um número, com label e cor.

### 9.9 `<CuringaToggle>`

- Botão com estado visual pulsante quando ativo (badge dourado).

### 9.10 `<BudgetBar>`

- Barra de orçamento (usado/total) com cor de alerta quando excedido.

### 9.11 `<RankBadge>`

### 9.12 `<RoleBadge>`

### 9.13 `<StoryEventCard>`

- Título, kind badge, datas, thumbnail, tags.

### 9.14 `<ThemeToggle>`

- Ícone sol/lua, alterna tema.

### 9.15 `<CommandPalette>`

- Busca global (atalho `Ctrl/Cmd + K`) que navega por todas as páginas e entidades.
- Resultados agrupados por categoria.
- Navegação por teclado.

## 10. Layout e Navegação

### 10.1 App Shell

**Estrutura:**

- **Header** (sticky): logo "Forja Selvagem", busca global, theme toggle, avatar/menu do usuário.
- **Sidebar** (desktop ≥ 1024px): navegação principal (Início, Campanhas, Fichas, [Bestiário se mestre], [Admin se admin]).
- **Mobile:** header compacto + menu hamburguer (drawer).
- **Conteúdo:** container centralizado com max-width (1280px desktop, 100% mobile).

### 10.2 Page Header

- Título da página (grande).
- Subtítulo/descrição curta.
- Ações primárias à direita.
- Breadcrumbs quando houver hierarquia.

### 10.3 Sidebars Contextuais

- Na ficha: painel lateral com últimas rolagens (Spec 04).
- No painel de combate: lista de NPCs à esquerda, log à direita.

### 10.4 Tabs

- Uso em entidades com múltiplas facetas (campanha, ficha, NPC).
- Tabs fixas no topo do conteúdo.
- URL reflete a tab ativa (ex.: `/campaigns/:id?tab=members`).

### 10.5 Breakpoints

| Token     | Valor    | Comportamento  |
| --------- | -------- | -------------- |
| `--bp-sm` | `640px`  | Mobile grande  |
| `--bp-md` | `768px`  | Tablet         |
| `--bp-lg` | `1024px` | Desktop        |
| `--bp-xl` | `1280px` | Desktop grande |

### 10.6 Regras de Responsividade

- **Mobile-first** no player (ficha, rolamento).
- **Desktop-first** no mestre (painel de combate, gestão de campanha).
- Área de toque mínima **44×44px** em mobile.
- **Nunca** esconder informação crítica atrás de hover em mobile.

## 11. Padrões de Estado

### 11.1 Loading

- **Skeleton** para listas e cards.
- **Spinner inline** para botões em submit.
- **Barra de progresso** para operações longas (upload).
- **Nunca** tela em branco durante carregamento.

### 11.2 Empty

- Toda lista tem um `<EmptyState>` com:
  - Ícone ilustrativo.
  - Título claro ("Nenhuma campanha ainda").
  - Descrição curta ("Crie sua primeira campanha para começar").
  - CTA (quando aplicável).

### 11.3 Error

- **Inline** para validação de formulário (mensagem abaixo do campo).
- **Toast** para erros de rede ou ações que falharam.
- **Página de erro** para erros de rota (404, 500).

### 11.4 Success

- **Toast** para ações concluídas (criar, editar, arquivar).
- **Confirmação visual** para ações críticas (ex.: "Senha copiada").

### 11.5 Disabled

- Aparência reduzida (opacidade 50%), cursor `not-allowed`, `aria-disabled="true"`.
- **Sempre** com motivo visível (tooltip ou helper text).

## 12. Validação e Mensagens de Erro

Regra do autor (Spec 00 §5.4.13 das respostas): "exibe mensagens de 'erro ou inválido explicando o porquê ao usuário".

### 12.1 Estrutura de Erro

Todo erro de validação tem:

- `code` — identificador técnico (ex.: `BUDGET_EXCEEDED`).
- `message` — mensagem principal (via Humanizer).
- `hint` — dica de como corrigir (via Humanizer).
- `field` — campo associado (quando aplicável).

### 12.2 Exemplos

| Situação                       | message                                             | hint                                                               |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| Orçamento de atributo excedido | "Você usou 6 de 5 pontos de atributo."              | "Reduza 1 ponto em qualquer atributo para continuar."              |
| Perícia acima do cap           | "Lutar não pode passar de d12 sem um bônus racial." | "Escolha uma raça que conceda esse bônus ou reduza o valor."       |
| Vantagem sem requisito         | "A Vantagem Focado exige Estágio Experiente."       | "Você está no Novato. Aplique Progressos até chegar a Experiente." |
| Senha fraca                    | "A nova senha precisa ter ao menos 12 caracteres."  | "Combine maiúsculas, minúsculas, números e símbolos."              |
| Nome duplicado                 | "Já existe uma campanha com esse nome."             | "Escolha outro nome ou edite a campanha existente."                |

### 12.3 Regras

- **Nunca** usar "Erro 400", "Erro inesperado" sem explicação.
- **Nunca** usar jargão técnico em mensagens de usuário.
- **Sempre** indicar o campo com erro (borda + ícone + mensagem).
- **Sempre** permitir que o usuário corrija sem perder o que digitou.
- **Nunca** bloquear o usuário sem explicar o motivo.

## 13. Acessibilidade

Meta: **WCAG AA**. Não é opcional.

### 13.1 Regras obrigatórias

- **Contraste:** texto normal ≥ 4.5:1; texto grande ≥ 3:1; componentes interativos ≥ 3:1.
- **Foco visível:** todo elemento focável tem anel de foco (`--shadow-focus`).
- **Navegação por teclado:** toda funcionalidade é acessível por teclado (Tab, Shift+Tab, Enter, Space, setas, ESC).
- **`aria-label`:** obrigatório em ícones-botão sem texto visível.
- **`role`:** usar roles ARIA quando o elemento nativo não expressa a semântica.
- **`aria-live`:** para regiões que atualizam dinamicamente (log de rolagens, toasts).
- **Foco preso em modais:** Tab circula dentro do modal até fechar.
- **`prefers-reduced-motion`:** respeitado em todas as animações.
- **Formulários:** cada input associado a `<label>` via `htmlFor`; erros associados via `aria-describedby`.
- **Imagens:** `alt` descritivo (ou `alt=""` quando decorativas).
- **Links:** texto descritivo (nunca "clique aqui").

### 13.2 Testes de acessibilidade

- **Automáticos:** axe-core nos testes E2E (Playwright ou Cypress).
- **Manuais:** navegação por teclado em todas as telas; leitura em NVDA/VoiceOver (recomendado, não bloqueante no MVP).

## 14. Microcopy e Humanizer

Todos os textos passam pela skill **Humanizer** antes de virar `pt-BR.json`.

### 14.1 Diretrizes

- **Tom:** direto, próximo, sem jargão técnico desnecessário.
- **Voz ativa** preferida.
- **Sem clichês de IA:** "Como uma IA...", "Vamos começar!", "Neste artigo...", "Em suma...".
- **Sem redundância:** "Digite seu e-mail" → "E-mail".
- **Sem emojis** em textos de sistema (exceto ícones de UI).
- **Terminologia consistente:** usar o glossário da Spec 00 §3.
- **Erros explicam o porquê** e como corrigir.
- **Confirmações destrutivas** dizem exatamente o que vai acontecer.

### 14.2 Exemplos

| Contexto               | Errado            | Certo                                                            |
| ---------------------- | ----------------- | ---------------------------------------------------------------- |
| Botão de criar ficha   | "Vamos começar!"  | "Nova ficha"                                                     |
| Erro de senha          | "Senha inválida." | "Senha incorreta. Verifique e tente novamente."                  |
| Empty de campanhas     | "Ops! Nada aqui!" | "Nenhuma campanha ainda. Crie sua primeira."                     |
| Sucesso de criação     | "Feito!"          | "Campanha criada."                                               |
| Confirmação destrutiva | "Tem certeza?"    | "Arquivar a campanha? Ela some da listagem, mas continua salva." |
| Hint de campo          | "Digite algo."    | "Use um nome curto e fácil de lembrar."                          |

## 15. Documentação (Storybook)

- **Recomendado:** Storybook para cada componente.
- **Obrigatório no MVP:** pasta `docs/design/` no repositório com:
  - `tokens.md` — referência de todos os tokens.
  - `components.md` — lista de componentes com props e exemplos.
  - `patterns.md` — padrões de layout e interação.
  - `accessibility.md` — regras e testes.
  - `microcopy.md` — glossário e diretrizes de texto.
- **Futuro:** Storybook hospedado (Chromatic ou Vercel).

## 16. Testes

### 16.1 Testes unitários

- Cada componente com teste de render e props.
- Estados (loading, error, disabled) testados.

### 16.2 Testes visuais

- **Recomendado:** regressão visual com Chromatic ou Percy.
- **Opcional no MVP.**

### 16.3 Testes de acessibilidade

- **Obrigatório:** axe-core rodando em todas as páginas (E2E).
- Contraste verificado em ambos os temas.

### 16.4 Testes de tema

- Snapshot de cada componente em tema claro e escuro.

## 17. i18n

Toda string passa por `pt-BR.json` com namespaces por contexto:

```
common.*         — textos genéricos (salvar, cancelar, editar, etc.)
auth.*           — Spec 01
campaigns.*      — Spec 02
characters.*     — Spec 03
rolls.*          — Spec 04
npcs.*           — Spec 05
bestiary.*       — Spec 05
events.*         — Spec 06
errors.*         — erros genéricos
a11y.*           — textos de acessibilidade (aria-labels, descrições)
```

- **Estrutura preparada para múltiplos idiomas** (next-intl ou equivalente — decisão na Spec 09).
- **PT-BR apenas no MVP.**

## 18. Critérios de Aceite

- [ ] Todos os tokens de cor, tipografia, espaçamento, raio, sombra e movimento definidos como CSS variables.
- [ ] Tema claro e escuro implementados com paridade visual.
- [ ] Todos os componentes atômicos listados na §7 implementados e testados.
- [ ] Todos os componentes compostos listados na §8 implementados.
- [ ] Todos os componentes de domínio listados na §9 implementados.
- [ ] App shell com header, sidebar, menu mobile.
- [ ] Busca global (Command Palette) funcional com atalho `Ctrl/Cmd+K`.
- [ ] Atalho `/` foca a busca em telas com listas.
- [ ] Todos os estados (loading, empty, error, success, disabled) implementados em cada feature.
- [ ] Mensagens de erro seguem estrutura `message` + `hint` (Humanizer).
- [ ] Acessibilidade WCAG AA verificada com axe-core (0 violações críticas).
- [ ] Navegação por teclado funcional em todas as telas.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Contraste validado em ambos os temas.
- [ ] Documentação em `docs/design/` completa.
- [ ] Todas as strings PT-BR passam por Humanizer.
- [ ] Namespaces i18n criados para todas as features.

## 19. Conventional Commits esperados

```
chore(design): bootstrap design system folder structure
feat(design): add design tokens (colors, typography, spacing, radii, shadows, motion)
feat(design): add theme system with light and dark modes
feat(design): add Button component with all variants
feat(design): add Input, Textarea, PasswordInput, SearchInput components
feat(design): add Select, Checkbox, Radio, Switch components
feat(design): add Badge, Avatar, Spinner, Skeleton, Chip, TagInput
feat(design): add Card component with accent variant
feat(design): add Modal and ConfirmDialog components
feat(design): add Toast component with variants
feat(design): add DataTable with search, sort and pagination
feat(design): add Tabs, Pagination, EmptyState, Timeline, ReorderHandle
feat(design): add Markdown editor and sanitized renderer
feat(design): add ImageUploader and ImageGallery
feat(design): add domain components (CampaignCard, CharacterCard, NpcCard)
feat(design): add DiceRollButton, DiceRollResult and roll indicators
feat(design): add CharacterWizard components (BudgetBar, AttributeGrid, SkillList)
feat(design): add StoryEventCard and kind badges
feat(design): add AppShell with header, sidebar and mobile drawer
feat(design): add Command Palette with global search
feat(design): add theme toggle with persistence
test(design): add unit tests for all atomic components
test(design): add accessibility tests with axe-core
docs(design): add tokens, components, patterns and accessibility docs
chore(i18n): bootstrap pt-BR.json with common namespaces
```

## 20. Decisões e Pendências

### 20.1 Decisões registradas

- Paleta base do escudo (`swade-cheat-sheet.html`) como referência canônica.
- Fonte **Inter** (UI) + **JetBrains Mono** (dados e expressões).
- Ícones via **Lucide**.
- Tailwind + CSS variables para tokens.
- Tema claro e escuro com persistência por usuário.
- WCAG AA como meta obrigatória.
- Humanizer aplicado em todos os textos PT-BR.
- Componentes de domínio (cards, roll result, etc.) vivem no design system, não nas features.
- Command Palette (`Ctrl/Cmd+K`) como busca global.
- Atalho `/` foca a busca em telas com listas.

### 20.2 Pendências para o autor aprovar

- **Storybook:** incluir no MVP ou apenas `docs/design/` em markdown? **Recomendação:** `docs/design/` no MVP, Storybook no futuro. **Aguardando confirmação.**
- **Biblioteca de componentes headless:** Radix UI (recomendada — acessibilidade out-of-the-box) vs. Headless UI vs. construir do zero. **Recomendação:** Radix UI. **Aguardando aprovação.**
- **Tailwind vs. CSS Modules:** usar Tailwind com tokens mapeados (recomendado) ou CSS Modules com CSS variables. **Recomendação:** Tailwind com tokens. **Aguardando aprovação.**
- **Regressão visual:** Chromatic/Percy no MVP ou futuro? **Recomendação:** futuro. **Aguardando confirmação.**
- **Animações de rolagem:** "dado girando" (~500ms) no MVP ou apenas fade-in? **Recomendação:** fade + bounce leve no MVP, animação completa no futuro. **Aguardando confirmação.**
- **Nomenclatura dos componentes:** prefixo `Forja` (`ForjaButton`, `ForjaCard`) vs. nomes genéricos (`Button`, `Card`). **Recomendação:** nomes genéricos (padrão de mercado). **Aguardando confirmação.**

### 20.3 Novas decisões registradas nesta spec

- **Player Notes (Spec 12):** anotações privadas do jogador vinculadas a **`CharacterCampaignLink`** (par personagem × campanha). Se o personagem for usado em outra campanha, essas anotações **não se aplicam**. Espaço para memórias e organização pessoal. Será especificado na **Spec 12 — Player Notes** (a ser gerada após a Spec 11).

### 20.4 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket, rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: unificação de `Npc` com `type` (aprovado), painel de combate (aprovado), imagem do NPC (aprovado), histórico de NPC (aprovado), visibilidade do bestiário (aprovado), transcrição literal do bestiário (aprovado), overrides de movimento/tamanho (aprovado).
- Spec 06: espaço de anotações do jogador (confirmado, será Spec 12), log de alterações de eventos (pendente), múltiplas imagens por evento (pendente), markdown sanitizado (pendente), `kind` de eventos (pendente), `eventDate` vs. `inGameDate` (pendente), calendário visual (pendente).

```
````
