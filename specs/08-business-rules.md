# Spec 08 — Regras de Negócio (SWADE)

## 1. Objetivo

Consolidar, em um único documento, **todas as regras do Savage Worlds — Edição Aventura (SWADE)** que o Forja Selvagem aplica automaticamente, deixa manuais ou exclui do escopo do MVP. Esta spec é a **fonte de verdade** para os times de backend, frontend e QA. Cada regra é classificada como:

- **AUTOMÁTICA** — o sistema aplica sozinho, sem intervenção do usuário.
- **VALIDADA** — o sistema verifica e bloqueia se inválido, mas o cálculo/pagamento de custo é feito pelo usuário.
- **MANUAL** — o sistema apenas registra; quem resolve é o jogador/mestre.
- **EXCLUÍDA** — fora do escopo do MVP (documentada para transparência).

A referência de página no livro do SWADE está indicada entre parênteses.

## 2. Mapa de Aplicação

| Categoria                                                           | Spec de feature | Automação            |
| ------------------------------------------------------------------- | --------------- | -------------------- |
| Criação de personagem (atributos, perícias)                         | 03              | VALIDADA             |
| Raças e bônus raciais                                               | 03              | AUTOMÁTICA           |
| Complicações                                                        | 03              | VALIDADA             |
| Vantagens e requisitos                                              | 03              | VALIDADA             |
| Progressão / Rank                                                   | 03              | VALIDADA             |
| Características derivadas (Aparar, Resistência, Movimento, Tamanho) | 03              | AUTOMÁTICA           |
| Rolagens de perícia/atributo                                        | 04              | AUTOMÁTICA           |
| Rolagens de dano                                                    | 04              | AUTOMÁTICA           |
| Dado Selvagem                                                       | 04              | AUTOMÁTICA           |
| Ases (explosão de dados)                                            | 04              | AUTOMÁTICA           |
| Falha Crítica                                                       | 04              | AUTOMÁTICA           |
| Teste sem perícia (d4−2)                                            | 04              | AUTOMÁTICA           |
| Penalidades por Ferimento/Fadiga                                    | 04              | AUTOMÁTICA           |
| Bônus de Curinga                                                    | 03 + 04         | AUTOMÁTICA           |
| Limite de Ferimentos                                                | 03 + 05         | AUTOMÁTICA           |
| Benes e Convicção                                                   | 03              | MANUAL (botões +/−)  |
| Aplicação de dano vs Resistência                                    | —               | EXCLUÍDA (mestre)    |
| Regras de Ambientação                                               | —               | EXCLUÍDA             |
| Iniciativa por cartas                                               | 11              | AUTOMÁTICA           |
| Poderes e Pontos de Poder                                           | —               | MANUAL (texto livre) |
| Equipamento e Carga                                                 | —               | MANUAL (texto livre) |

## 3. Regras de Criação de Personagem

### 3.1 Atributos

**RN-BR-01 (AUTOMÁTICA)** — Todo personagem começa com **d4** em cada um dos 5 atributos (pág. 10).
**RN-BR-02 (VALIDADA)** — O jogador tem **5 pontos** para distribuir entre atributos na criação (pág. 10).
**RN-BR-03 (VALIDADA)** — Cada ponto eleva um atributo em **1 tipo de dado** (ex.: d4 → d6) (pág. 10).
**RN-BR-04 (VALIDADA)** — Nenhum atributo pode ultrapassar **d12** na criação, a menos que a raça conceda um valor inicial ≥ d6 (nesse caso, o cap sobe para **d12+1+**) (pág. 10, 11).
**RN-BR-05 (AUTOMÁTICA)** — Quando um atributo passa de d12, cada aumento adicional soma **+1** ao valor (ex.: d12+2) (pág. 10).

### 3.2 Perícias

**RN-BR-06 (AUTOMÁTICA)** — Cinco perícias básicas começam com **d4 grátis**: Atletismo, Conhecimento Geral, Furtividade, Perceber, Persuadir (pág. 10).
**RN-BR-07 (VALIDADA)** — O jogador tem **12 pontos** para gastar em perícias na criação (pág. 10).
**RN-BR-08 (VALIDADA)** — Custo por tipo de dado:

- **1 ponto** se a perícia está ≤ atributo associado.
- **2 pontos** se a perícia está > atributo associado (pág. 10).
  **RN-BR-09 (VALIDADA)** — Nenhuma perícia pode ultrapassar **d12** na criação, a menos que a raça conceda essa perícia em d6 (cap sobe para **d12+1+**) (pág. 11).
  **RN-BR-10 (AUTOMÁTICA)** — Perícias não listadas no catálogo global não podem ser adquiridas.

### 3.3 Complicações

**RN-BR-11 (VALIDADA)** — Máximo de **4 pontos** de complicação por personagem (pág. 10, 24).
**RN-BR-12 (AUTOMÁTICA)** — Complicação Maior vale **2 pontos**; Complicação Menor vale **1 ponto** (pág. 10).
**RN-BR-13 (VALIDADA)** — Gastos permitidos dos pontos de complicação:

- **2 pontos** → +1 tipo de dado em um atributo **ou** 1 Vantagem (pág. 10).
- **1 ponto** → +1 ponto de perícia **ou** dobrar recursos iniciais (pág. 10).

### 3.4 Vantagens

**RN-BR-14 (VALIDADA)** — Requisitos verificados no momento da aquisição:

- **Estágio** (Novato, Experiente, Veterano, Heroico, Lendário).
- **Atributos** (mínimos).
- **Perícias** (mínimos).
- **Outras Vantagens** (pré-requisitos).
- **Complicações** (quando o catálogo exigir) (pág. 41).
  **RN-BR-15 (VALIDADA)** — Vantagens compradas com pontos de complicação também respeitam o Estágio mínimo.
  **RN-BR-16 (AUTOMÁTICA)** — Vantagens raciais (ex.: Adaptável dos Humanos) não custam pontos; são concedidas pela raça.

### 3.5 Raças

**RN-BR-17 (AUTOMÁTICA)** — Ao selecionar uma raça, o sistema:

- Aplica bônus raciais de atributos (e eleva o cap correspondente).
- Aplica bônus raciais de perícias (e eleva o cap correspondente).
- Concede vantagens raciais gratuitas (quando aplicável).
- Impõe complicações raciais obrigatórias (quando aplicável).
- Aplica habilidades especiais raciais como texto informativo (sem efeito mecânico automatizado no MVP).

**Raças pré-cadastradas (pág. 12–18 e 23):**
Anões, Androide, Aquariano, Aviano, Elfos, Meio-Elfos, Humanos, Pequeninos, Rakashanos, Sáurios, Celestiais, Guardiões.

### 3.6 Personagens mais experientes

**RN-BR-18 (AUTOMÁTICA)** — Personagens de jogador são criados como **Novato** e depois recebem Progressos (pág. 61).
**RN-BR-19 (AUTOMÁTICA)** — O sistema **não** permite criar diretamente como Experiente/Veterano/Heroico/Lendário — apenas via Progressos válidos.

## 4. Características Derivadas

### 4.1 Aparar

**RN-BR-20 (AUTOMÁTICA)** — `Aparar = 2 + floor(rank_atual_de_Lutar / 2)` (pág. 11).

- Sem Lutar: Aparar = **2**.
- Lutar d10: Aparar = 2 + 5 = **7**.
- Lutar d12+1: Aparar = 2 + 6 = **8** (metade do modificador fixo, arred. baixo).
- Lutar d12+2: Aparar = 2 + 6 = **8**.
- Lutar d12+3: Aparar = 2 + 7 = **9**.

**RN-BR-21 (AUTOMÁTICA)** — Bônus de escudo e armas com Aparar (do livro) **não** são aplicados no MVP (equipamento é texto livre).

### 4.2 Resistência

**RN-BR-22 (AUTOMÁTICA)** — `Resistência = 2 + floor(rank_atual_de_Vigor / 2) + Armadura` (pág. 11).

- Vigor d8: Resistência = 2 + 4 = **6**.
- Vigor d12+2: Resistência = 2 + 7 = **9** (metade do modificador fixo, arred. baixo).

**RN-BR-23 (AUTOMÁTICA)** — Para personagens de jogador, **Armadura = 0** no MVP (equipamento é texto livre; o jogador anota a resistência final manualmente em `equipmentNotes` se quiser).

**RN-BR-24 (AUTOMÁTICA)** — Para NPCs/Chefes, `armor` é um campo numérico e entra no cálculo (Spec 05).

**RN-BR-25 (AUTOMÁTICA)** — **Tamanho** afeta Resistência (pág. 215):

- `Resistência_total = 2 + floor(Vigor / 2) + Armadura + Tamanho`.

### 4.3 Movimentação

**RN-BR-26 (AUTOMÁTICA)** — `Movimentação = 6` (padrão) (pág. 11).
**RN-BR-27 (AUTOMÁTICA)** — Bônus/penalidades raciais (ex.: Anão reduz 1) e de vantagens/complicações (ex.: Lento) são aplicados.
**RN-BR-28 (AUTOMÁTICA)** — NPCs/Chefes podem sobrescrever com `movementOverride` (Spec 05).

### 4.4 Tamanho

**RN-BR-29 (AUTOMÁTICA)** — `Tamanho = 0` (padrão) (pág. 11).
**RN-BR-30 (AUTOMÁTICA)** — Tamanho pode variar de **−1 a +3** por raça/vantagem/complicação (pág. 11).
**RN-BR-31 (AUTOMÁTICA)** — NPCs/Chefes podem sobrescrever com `sizeOverride` (Spec 05).

## 5. Progressão (Rank)

### 5.1 Mapeamento Rank ↔ Progressos

**RN-BR-32 (AUTOMÁTICA)** — Rank derivado de `advancesCount` (pág. 61):

| `advancesCount` | Rank       |
| --------------- | ---------- |
| 0–3             | Novato     |
| 4–7             | Experiente |
| 8–11            | Veterano   |
| 12–15           | Heroico    |
| 16+             | Lendário   |

### 5.2 Opções de Progresso

**RN-BR-33 (AUTOMÁTICA)** — Cada Progresso concede **uma** das opções (pág. 61):

- Ganhar uma nova Vantagem.
- Aumentar 1 perícia **igual ou maior** que o atributo associado em 1 tipo.
- Aumentar **2 perícias menores** que o atributo associado em 1 tipo cada (incluindo novas perícias).
- Aumentar **1 atributo** em 1 tipo (**uma vez por Estágio**).
- Remover uma Complicação Menor **ou** reduzir uma Maior para Menor.

**RN-BR-34 (AUTOMÁTICA)** — **Aumento de atributo** só pode ocorrer **uma vez por Estágio**, exceto no Estágio Lendário, onde pode ocorrer a cada **2 Progressos** (pág. 61).

**RN-BR-35 (AUTOMÁTICA)** — Personagens Lendários podem aumentar atributos a cada 2 Progressos, até o **máximo racial** (pág. 61).

**RN-BR-36 (AUTOMÁTICA)** — Remover Complicação Menor custa **1 Progresso**; reduzir Complicação Maior para Menor custa **1 Progresso**; remover Complicação Maior custa **2 Progressos** (com permissão do Mestre, pág. 61).

**RN-BR-37 (AUTOMÁTICA)** — Nenhuma Característica pode ultrapassar o **máximo racial** (pág. 61).

## 6. Rolagens

### 6.1 Rolagem de Característica

**RN-BR-38 (AUTOMÁTICA)** — `Sucesso = total ≥ 4` (Dificuldade padrão) (pág. 102).

**RN-BR-39 (AUTOMÁTICA)** — **Cartas Selvagens** (todo PJ + NPCs/Chefes marcados como WC) rolam **1d6 extra** (Dado Selvagem) e escolhem o **maior** resultado (pág. 102).

**RN-BR-40 (AUTOMÁTICA)** — **Extras** rolam apenas 1 dado (sem Dado Selvagem) (pág. 102).

**RN-BR-41 (AUTOMÁTICA)** — **Ases:** quando um dado rola o valor máximo, rola novamente e soma ao total, repetidamente (pág. 102).

**RN-BR-42 (AUTOMÁTICA)** — Modificadores são aplicados **depois** dos Ases (pág. 102).

**RN-BR-43 (AUTOMÁTICA)** — **Ampliações:** cada 4 pontos acima da Dificuldade = 1 Ampliação (pág. 102).

### 6.2 Teste sem Perícia

**RN-BR-44 (AUTOMÁTICA)** — Se o personagem não tem a perícia: `d4 − 2` (penalidade após Ases) + Dado Selvagem se WC (pág. 103).

### 6.3 Falha Crítica

**RN-BR-45 (AUTOMÁTICA)** — **Carta Selvagem:** Falha Crítica = **1 no dado de Característica E 1 no Dado Selvagem**, ambos no **primeiro lançamento** (pág. 103).

**RN-BR-46 (AUTOMÁTICA)** — **Extra:** Falha Crítica = **1 no dado de Característica** + confirmação em **d6 = 1** (pág. 103).

**RN-BR-47 (AUTOMÁTICA)** — Falha Crítica **não pode ser rerrolada**, nem com Benes (exceto regra de ambientação Pura Sorte, que **não** está no MVP) (pág. 103).

### 6.4 Escolha entre Característica e Dado Selvagem

**RN-BR-48 (AUTOMÁTICA)** — O sistema escolhe **o maior total** entre característico e selvagem (pág. 102).
**RN-BR-49 (AUTOMÁTICA)** — Em caso de **empate**, o sistema escolhe o dado de Característica.
**RN-BR-50 (AUTOMÁTICA)** — Em **Falha Crítica**, o dado escolhido é o de Característica (o Dado Selvagem não "salva" a falha).

### 6.5 Rolagem de Dano

**RN-BR-51 (AUTOMÁTICA)** — Rolagem de dano **nunca** usa Dado Selvagem (pág. 108).
**RN-BR-52 (AUTOMÁTICA)** — Ases se aplicam a dados de dano (pág. 102).
**RN-BR-53 (AUTOMÁTICA)** — Bônus de Curinga (+2) se aplica a dano quando ativo (pág. 106).

## 7. Modificadores Automáticos em Rolagens

### 7.1 Ferimentos

**RN-BR-54 (AUTOMÁTICA)** — Penalidade por Ferimento: **−1 por Ferimento**, máximo **−3** (pág. 110).

- 0 Ferimentos → 0.
- 1 Ferimento → −1.
- 2 Ferimentos → −2.
- 3+ Ferimentos → −3 (cap).

**RN-BR-55 (AUTOMÁTICA)** — Ferimentos também reduzem a **Movimentação** em 1 por Ferimento (mínimo 1) (pág. 110). **No MVP**, o sistema **não** recalcula a Movimentação exibida na ficha (é informativo); apenas aplica a penalidade em rolagens.

### 7.2 Fadiga

**RN-BR-56 (AUTOMÁTICA)** — Penalidade por Fadiga (pág. 122):

- Fatigado (1) → −1 em todas as rolagens.
- Exausto (2) → −2 em todas as rolagens.
- Incapacitado (3) → não rola.

**RN-BR-57 (AUTOMÁTICA)** — Fadiga nunca ultrapassa 3 (Incapacitado).

### 7.3 Curinga

**RN-BR-58 (AUTOMÁTICA)** — Quando `curingaActive = true`: **+2 em todas as rolagens de Característica e dano** (pág. 106).

**RN-BR-59 (AUTOMÁTICA)** — `curingaActive` é resetado quando o mestre encerra a rodada (Spec 11).

### 7.4 Modificador manual

**RN-BR-60 (AUTOMÁTICA)** — O jogador pode digitar um modificador manual (positivo ou negativo), somado ao `modifierBreakdown.total` (Spec 04).

**RN-BR-61 (AUTOMÁTICA)** — O modificador manual tem limite de **±50** por rolagem (proteção contra erro de digitação).

## 8. Aplicação de Dano (Manual)

**RN-BR-62 (EXCLUÍDA)** — A aplicação de dano vs. Resistência **não é automatizada**. O mestre consulta a tabela e aplica o resultado manualmente (pág. 110).

### 8.1 Tabela de referência (documentada para o mestre)

| Dano vs. Resistência | Não Abalado            | Já Abalado             |
| -------------------- | ---------------------- | ---------------------- |
| 0–3 (Sucesso)        | Abalado                | 1 Ferimento + Abalado  |
| 4–7 (1 Ampliação)    | 1 Ferimento + Abalado  | 2 Ferimentos + Abalado |
| 8–11 (2 Ampliações)  | 2 Ferimentos + Abalado | 3 Ferimentos + Abalado |
| 12–15 (3 Ampliações) | 3 Ferimentos + Abalado | 3 Ferimentos + Abalado |

**RN-BR-63 (EXCLUÍDA)** — A rolagem de **Absorção (Soak)** também é manual: o jogador gasta um Bene, rola Vigor e aplica redução (pág. 111). O sistema **não** faz Soak automático.

## 9. Limite de Ferimentos

**RN-BR-64 (AUTOMÁTICA)** — Limite de Ferimentos por tipo de personagem (pág. 110, 214):

| Tipo                       | Ferimentos antes de Incapacitado |
| -------------------------- | -------------------------------- |
| PJ (Carta Selvagem)        | **3**                            |
| PJ com Duro de Matar       | **4**                            |
| PJ com Muito Duro de Matar | **5**                            |
| Extra comum                | **1**                            |
| Extra Resiliente           | **2** (cai no 2º)                |
| Extra Muito Resiliente     | **3** (cai no 3º)                |
| Chefe NPC Carta Selvagem   | **3**                            |
| Criatura Grande            | +1 (4 para WC, 2 para Extra)     |
| Criatura Enorme            | +2 (5 para WC, 3 para Extra)     |
| Criatura Colossal          | +3 (6 para WC, 4 para Extra)     |

**RN-BR-65 (AUTOMÁTICA)** — O sistema bloqueia o incremento de `wounds` acima do limite.
**RN-BR-66 (AUTOMÁTICA)** — A **penalidade máxima** por Ferimentos é **sempre −3**, independente do limite (pág. 110).

## 10. Benes e Convicção (Manual)

**RN-BR-67 (MANUAL)** — Benes são gerenciados via botões +/− na ficha (Spec 03). O sistema **não**:

- Concede Bene automaticamente por Curinga.
- Aplica +1 por Sorte.
- Aplica +1 por Sorte Grande.
- Aplica Bene extra por Jovem.
- Remove Bene por Má Sorte.
  O jogador/mestre ajusta manualmente.

**RN-BR-68 (MANUAL)** — Convicção também é gerenciada via botões +/− (Spec 03).

**RN-BR-69 (MANUAL)** — Gastar Bene para rerrolar é uma ação do jogador: ele reduz o contador e clica em "Rolar" novamente (Spec 04).

**RN-BR-70 (MANUAL)** — O botão **"Curinga ativo"** apenas marca a flag; **não** concede Bene automaticamente (Spec 03).

## 11. Regras que o Sistema NÃO Aplica (Excluídas do MVP)

Documentadas para transparência.

**RN-BR-71 (EXCLUÍDA)** — **Regras de Ambientação** (pág. 161–168): Cura Rápida, Dano Severo, Sem Pontos de Poder, Limite de Ferimentos, Escolhas Difíceis, Fanáticos, Heróis Nunca Morrem, etc. — **não** são ativáveis no sistema. Ficam a critério do mestre na mesa.

**RN-BR-72 (EXCLUÍDA)** — **Aplicação de Dano e Soak** — manual (ver §8).

**RN-BR-73 (EXCLUÍDA)** — **Poderes e Pontos de Poder** — texto livre na ficha (Spec 03). O sistema **não**:

- Valida custo de poder.
- Reduz PP automaticamente.
- Aplica modificadores de poder.
- Calcula Choque de Retorno.
- Gerencia manutenção de poderes.

**RN-BR-74 (EXCLUÍDA)** — **Equipamento e Carga** — texto livre na ficha (Spec 03). O sistema **não**:

- Valida compra de itens.
- Calcula sobrecarga.
- Aplica Força Mínima.
- Aplica penalidades de armadura pesada.

**RN-BR-75 (EXCLUÍDA)** — **Iniciativa por cartas** — especificada na **Spec 11** (em memória por sessão).

**RN-BR-76 (EXCLUÍDA)** — **Regeneração** de criaturas — **não** é automatizada. O mestre rola manualmente quando o livro exige (ex.: Troll regenera via Vigor).

**RN-BR-77 (EXCLUÍDA)** — **Medo e Tabela de Medo** — o mestre rola 1d20 e aplica o resultado (pág. 140). O sistema **não** rola Medo automaticamente.

**RN-BR-78 (EXCLUÍDA)** — **Perigos ambientais** (calor, frio, fome, sede, doenças, veneno, radiação) — o mestre aplica. O sistema **não** rastreia Fadiga por ambiente.

**RN-BR-79 (EXCLUÍDA)** — **Progressão de campanha** — o mestre anota em Eventos (Spec 06). O sistema **não** aplica Progressos automaticamente aos personagens vinculados.

**RN-BR-80 (EXCLUÍDA)** — **Ganho de Bene por Curinga** — manual (ver §10).

## 12. Regras Específicas por Bounded Context

### 12.1 `Auth` (Spec 01)

Regras de autenticação **não** são regras do SWADE — ver Spec 01 §7.

### 12.2 `Campaign` (Spec 02)

Regras de campanha (senha, entrada, saída, arquivamento) **não** são regras do SWADE — ver Spec 02 §7.

### 12.3 `Character` (Spec 03)

- **RN-BR-01** a **RN-BR-37** se aplicam.
- **RN-BR-64** e **RN-BR-65** se aplicam.
- **RN-BR-67** a **RN-BR-70** se aplicam.

### 12.4 `Roll` (Spec 04)

- **RN-BR-38** a **RN-BR-61** se aplicam.
- **RN-BR-62** e **RN-BR-63** (excluídas) se aplicam como **não automação**.

### 12.5 `Npc` (Spec 05)

- **RN-BR-20** a **RN-BR-31** (derivadas) se aplicam.
- **RN-BR-38** a **RN-BR-53** (rolagens) se aplicam.
- **RN-BR-64** (limite de ferimentos) se aplica com as variantes de Resiliente/Muito Resiliente.
- **RN-BR-76** (regeneração) fica manual.

### 12.6 `Story` (Spec 06)

Nenhuma regra do SWADE se aplica — eventos são apenas anotações.

### 12.7 `Initiative` (Spec 11)

- Cartas de Ação, Curinga, ordem de iniciativa.
- Ao ativar Curinga na iniciativa, o sistema **deve** ligar `curingaActive = true` no personagem correspondente (Spec 03).
- Ao encerrar rodada, o sistema **deve** resetar `curingaActive = false` em todos.

## 13. Glossário de Regras (referência cruzada)

| Sigla       | Regra                       |
| ----------- | --------------------------- |
| RN-BR-01…05 | Atributos                   |
| RN-BR-06…10 | Perícias                    |
| RN-BR-11…13 | Complicações                |
| RN-BR-14…16 | Vantagens                   |
| RN-BR-17    | Raças                       |
| RN-BR-18…19 | Criação de experientes      |
| RN-BR-20…25 | Derivadas                   |
| RN-BR-26…28 | Movimentação                |
| RN-BR-29…31 | Tamanho                     |
| RN-BR-32…37 | Progressão                  |
| RN-BR-38…43 | Rolagem básica              |
| RN-BR-44    | Teste sem perícia           |
| RN-BR-45…47 | Falha Crítica               |
| RN-BR-48…50 | Escolha de dado             |
| RN-BR-51…53 | Dano                        |
| RN-BR-54…55 | Ferimentos                  |
| RN-BR-56…57 | Fadiga                      |
| RN-BR-58…59 | Curinga                     |
| RN-BR-60…61 | Modificador manual          |
| RN-BR-62…63 | Dano e Soak (excluídas)     |
| RN-BR-64…66 | Limite de Ferimentos        |
| RN-BR-67…70 | Benes e Convicção (manuais) |
| RN-BR-71…80 | Excluídas do MVP            |

## 14. Testes (TDD — cobertura obrigatória)

Cada regra **numerada** deve ter ao menos **um teste automatizado** correspondente. A suíte de testes deve:

- Referenciar o número da regra no nome do teste (ex.: `RN_BR_45_critical_failure_requires_both_ones`).
- Cobrir casos de sucesso, caso de borda e caso de falha.
- Ser executável em CI.

### 14.1 Distribuição esperada de testes

| Categoria                          | Nº de testes                            |
| ---------------------------------- | --------------------------------------- |
| Atributos (RN-BR-01…05)            | ≥ 8                                     |
| Perícias (RN-BR-06…10)             | ≥ 8                                     |
| Complicações (RN-BR-11…13)         | ≥ 6                                     |
| Vantagens (RN-BR-14…16)            | ≥ 6                                     |
| Raças (RN-BR-17)                   | ≥ 12 (uma por raça)                     |
| Progressão (RN-BR-32…37)           | ≥ 10                                    |
| Derivadas (RN-BR-20…31)            | ≥ 12                                    |
| Rolagem (RN-BR-38…53)              | ≥ 20                                    |
| Modificadores (RN-BR-54…61)        | ≥ 10                                    |
| Limite de Ferimentos (RN-BR-64…66) | ≥ 8                                     |
| Benes/Convicção (RN-BR-67…70)      | ≥ 4                                     |
| Excluídas (RN-BR-71…80)            | ≥ 2 (validar que **não** são aplicadas) |

**Cobertura mínima global da spec: 95%.**

## 15. Critérios de Aceite

- [ ] Todas as regras RN-BR-01 a RN-BR-80 estão documentadas com classificação (AUTOMÁTICA/VALIDADA/MANUAL/EXCLUÍDA).
- [ ] Toda regra AUTOMÁTICA tem teste automatizado correspondente.
- [ ] Toda regra VALIDADA tem teste de bloqueio + teste de aceitação.
- [ ] Toda regra MANUAL tem documentação de UI clara (botões, campos, textos).
- [ ] Toda regra EXCLUÍDA está listada explicitamente para evitar implementação acidental.
- [ ] O mapa de aplicação (§2) está refletido no código (nenhuma spec de feature implementa regra que não esteja aqui).
- [ ] A aplicação de dano (§8) é apenas referência documental — nenhum código de automação.
- [ ] Regras de Ambientação (§11) **não** são aplicadas.
- [ ] Cobertura de testes da spec ≥ 95%.

## 16. Conventional Commits esperados

```

docs(business-rules): add canonical SWADE business rules spec
test(business-rules): add test suite mapping RN-BR codes
test(business-rules): add regression tests for excluded rules
chore(business-rules): add lint rule to require RN-BR reference in test names
docs(business-rules): cross-reference RN-BR in feature specs

```

## 17. Decisões e Pendências

### 17.1 Decisões registradas

- **RN-BR-01 a RN-BR-70** são aplicadas no sistema com o nível de automação indicado.
- **RN-BR-71 a RN-BR-80** são **excluídas** do MVP e ficam a cargo do mestre/da mesa.
- A **tabela de aplicação de dano** é documentada apenas para referência; o sistema **não** aplica.
- **Curinga** só ganha Bene automaticamente **se a Spec 11 (iniciativa) for aprovada com essa regra**. No MVP sem iniciativa, é manual.
- Ferimentos **não** recalculam a Movimentação exibida na ficha (é informativo).
- Regras de raças que envolvem mecânica não estruturada (ex.: Anão "Visão no Escuro") são armazenadas como texto e aplicadas manualmente pelo mestre em jogo; o sistema **não** aplica automaticamente em rolagens.

### 17.2 Pendências para o autor aprovar

- **Curinga ganha Bene:** a Spec 11 (iniciativa) deve **automaticamente** conceder Bene ao sacar Curinga? **Recomendação:** sim, se a Spec 11 estiver no MVP; a Spec 03 teria um evento de domínio `CuringaDrawnByPlayer` que incrementa +1 Bene em todos os PJ. **Aguardando decisão** (depende da Spec 11).
- **Habilidades raciais em rolagens:** habilidades como "Visão no Escuro" (Anão ignora penalidades por Penumbra/Escuridão) devem ser aplicadas automaticamente em rolagens? **Recomendação:** no MVP, **não** — o mestre aplica manualmente. **Aguardando confirmação.**
- **Vantagens com efeito de rolagem:** Vantagens como `Esquiva` (−2 para ser atingido a distância) e `Bloquear` (+1 Aparar) devem ser aplicadas automaticamente? **Recomendação:** no MVP, **não** — ficam como texto informativo na ficha; o mestre aplica. **Aguardando confirmação.**
- **Progressão automática de Benes por "Sorte":** no MVP, **não** é automático (manual). **Recomendação:** manter manual. **Aguardando confirmação.**
- **Regras de Ambientação "Dano Severo" e "Limite de Ferimentos":** no MVP, **não** aplicadas. **Recomendação:** manter fora. **Aguardando confirmação.**
- **Fórmula de Aparar com arredondamento:** o livro diz "metade do dado, arredondado para baixo". Confirmar que `d10 → 5` (metade = 5, sem arredondar) e `d8 → 4` (metade = 4). **Recomendação:** sim, `floor(rank / 2)`. **Aguardando confirmação.**
- **Fórmula de Resistência com Vigor d12+1:** confirmar que `2 + floor(rank/2) + Armadura`. Vigor d12+1 = rank 6 → `2 + 3 = 5 + Armadura`. **Recomendação:** sim. **Aguardando confirmação.**

### 17.3 Pendências herdadas

- Spec 01: algoritmo JWT, CSRF, rate limit, biblioteca JWT × Node 24.
- Spec 02: GMPC, campanhas privadas, transferência de posse, banimento de membros.
- Spec 03: política do toggle `curingaActive`, tratamento de `advancesCount` reduzido, cap dinâmico de Estágio Lendário, histórico de raça na seed.
- Spec 04: biblioteca WebSocket, rolagem solo, buffer de replay, retenção do log, modificadores situacionais pré-configurados, rolagem combinada de ataque+dano, retenção de rolagens ao desvincular.
- Spec 05: unificação de `Npc` com `type` (aprovado), painel de combate (aprovado), imagem do NPC (aprovado), histórico de NPC (aprovado), visibilidade do bestiário (aprovado), transcrição literal do bestiário (aprovado), overrides de movimento/tamanho (aprovado).
- Spec 06: log de alterações de eventos (pendente), múltiplas imagens por evento (pendente), markdown sanitizado (pendente), `kind` de eventos (pendente), `eventDate` vs. `inGameDate` (pendente), calendário visual (pendente).
- Spec 07: Storybook (aprovado — markdown apenas), Radix UI (aprovado), Tailwind (aprovado), nomenclatura (aprovado — genérica), animação de rolagem (aprovado — fade + bounce), regressão visual (pendente).

---

**Aguardo aprovação da Spec 08.** Pontos críticos que precisam da sua bênção antes de seguir:

1. **Curinga ganha Bene** — depende da Spec 11 (iniciativa). Se a iniciativa estiver no MVP, o sistema concede Bene automaticamente; senão, é manual.
2. **Habilidades raciais e Vantagens com efeito em rolagem** (Visão no Escuro, Esquiva, Bloquear) — no MVP ficam como **texto informativo** e o mestre aplica manualmente. Confirma?
3. **Fórmulas de Aparar/Resistência** com `floor(rank / 2)` — confirma?
4. **Regras de Ambientação** — ficam fora do MVP. Confirma?

Se aprovar, sigo para a **Spec 09 — Infraestrutura**.
