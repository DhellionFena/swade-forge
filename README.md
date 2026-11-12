# Forja Selvagem

Um sistema web para mestrar Savage Worlds — Edição Aventura. Campanhas, fichas de personagem, rolagens de dados com todas as regras do sistema, NPCs, eventos e um painel de iniciativa por cartas, tudo em um só lugar.

Feito para mesas pequenas e para uso pessoal. É open source e vive na web gratuita.

---

## Por que este projeto existe

Mestrar Savage Worlds é rápido, divertido e furioso. Mas manter tudo organizado fora da mesa — fichas, NPCs, anotações de campanha, histórico de rolagens — costuma virar um monte de planilhas, cadernos e PDFs espalhados.

A ideia do Forja Selvagem é simples: dar ao mestre e aos jogadores um lugar só para a campanha viver. O mestre prepara NPCs e cenas sem depender de papel; o jogador cria e mantém sua ficha com o sistema validando as regras automaticamente; todo mundo rola dados direto da ficha, com o Dado Selvagem explodindo na tela quando dá Ás e a Falha Crítica aparecendo em vermelho quando acontece.

O nome vem da ideia de "forjar" — montar, temperar, dar forma à campanha junto com os amigos.

---

## O que dá pra fazer aqui

**Para o mestre:**

- Criar campanhas com senha opcional e convidar os jogadores.
- Gerenciar NPCs, chefes e inimigos com ficha resumida e totalmente rolável.
- Importar criaturas do bestiário do livro com um clique.
- Registrar cenas, marcos e sessões em anotações organizadas por ordem.
- Rodar combates com iniciativa por cartas em tempo real (com o Curinga marcando +2 automaticamente).
- Ver todas as rolagens da mesa em um log que atualiza ao vivo.

**Para o jogador:**

- Criar fichas com um passo a passo guiado que valida as regras sozinho — orçamento de atributos, custo de perícias, pré-requisitos de vantagens, tudo.
- Ver Aparar, Resistência, Movimentação e Tamanho calculados automaticamente conforme a ficha muda.
- Rolar qualquer perícia, atributo ou dano clicando direto na ficha, com Dado Selvagem, Ases, ampliações e penalidades por ferimento aplicados corretamente.
- Manter um diário privado por campanha — anotações que só você vê, que ficam no vínculo do personagem com aquela campanha específica.
- Usar o mesmo personagem em várias campanhas, com as anotações de cada uma ficando separadas.

---

## O que ele aplica das regras do Savage Worlds

O sistema automatiza o que dá para automatizar sem tirar o controle do mestre. Algumas coisas que ele faz sozinho:

- Rolagem com **Dado Selvagem** para Cartas Selvagens, com Áses e escolha do melhor dado.
- **Falha Crítica** detectada quando o dado de Característica e o Dado Selvagem dão 1 ao mesmo tempo.
- **Teste sem perícia** (`d4−2`) aplicado automaticamente quando o personagem não tem a perícia.
- Penalidades de **Ferimento** (até −3) e **Fadiga** somadas a toda rolagem.
- **Bônus de Curinga** (+2) marcado na ficha e refletido em todas as rolagens.
- **Limite de Ferimentos** por tipo de personagem (3 para PJ, 1 para Extra, com as variações de Resiliente).
- Cálculo automático de **Aparar** e **Resistência** com as fórmulas do livro.

O que ele **não** faz (e nem deveria, no MVP): aplicar dano na Resistência do alvo, rolar Absorção, calcular Pontos de Poder, validar compras de equipamento. Essas partes continuam sendo do mestre — o sistema só ajuda a rolar os dados.

---

## Como ele é construído

- **Frontend:** Next.js 15 (App Router) com TypeScript e Tailwind.
- **Backend:** NestJS com TypeScript e TypeORM.
- **Banco de dados:** PostgreSQL.
- **Infra:** Docker, Node 24 LTS, monorepo com npm workspaces e Turborepo.
- **WebSocket:** Socket.IO para log de rolagens e painel de iniciativa em tempo real.
- **Hospedagem:** exclusivamente em free tier (Vercel + Render + Neon + Backblaze B2).
- **Metodologia:** TDD obrigatório, DDD, Clean Architecture, Conventional Commits.

O projeto é pensado para caber em free tiers de hospedagem, com arquitetura agnóstica o suficiente para migrar para um provedor pago sem reescrever nada. O Terraform está lá justamente para isso.

---

## Como ele está organizado

Toda a especificação do projeto vive em `specs/`. São 13 documentos, do overview até o roadmap de implementação, organizados para servir tanto de guia para a IA desenvolvedora quanto de referência para quem for contribuir depois.

- **[`specs/README.md`](./specs/README.md)** — índice navegável, ordem de leitura e pendências abertas.
- **[`specs/00-overview.md`](./specs/00-overview.md)** — visão geral, atores, glossário e escopo do MVP.
- **[`specs/08-business-rules.md`](./specs/08-business-rules.md)** — referência canônica de todas as regras SWADE aplicadas.
- **[`specs/09-infrastructure.md`](./specs/09-infrastructure.md)** — stack, deploy, seeds, backups e operações.
- **[`specs/10-mvp-roadmap.md`](./specs/10-mvp-roadmap.md)** — ordem de implementação em 11 fases, com DoD.

Se você chegou agora e quer entender o projeto do zero, o caminho é ler `specs/00`, depois `specs/08` e `specs/09`. O resto é consulta.

---

## Status

**Fase atual: especificação concluída.** Nenhuma linha de código de produção foi escrita ainda. O próximo passo é implementar as fases da Spec 10, começando pela fundação (monorepo, Docker, banco, CI) e depois autenticação.

Acompanhe o andamento pelo roadmap em `specs/10-mvp-roadmap.md`.

---

## Sobre Savage Worlds

Savage Worlds, SWADE (Savage Worlds Adventure Edition) e todos os
personagens, criaturas, locais e logos associados são marcas registradas da
**Pinnacle Entertainment Group**. Este projeto é uma ferramenta não oficial,
sem fins comerciais, criada por fãs para uso pessoal.

O **código-fonte** do Forja Selvagem é distribuído sob a **Licença MIT**
(veja [LICENSE](./LICENSE)). O **conteúdo derivado do livro do Savage Worlds**
(estatísticas de criaturas, descrições de habilidades, requisitos de
vantagens, nomes de raças e complicações) é disponibilizado exclusivamente
para uso pessoal e não comercial, em conformidade com a política de conteúdo
de fãs da Pinnacle, e **não está coberto pela licença MIT** (veja
[NOTICE.md](./NOTICE.md)).

Se você joga Savage Worlds, compre o livro. Ele vale cada centavo.

---

## Contribuindo

Este é, no momento, um projeto pessoal em desenvolvimento. Se você se interessou pela ideia e quer contribuir, abra uma issue no GitHub ou entre em contato. Toda ajuda é bem-vinda, especialmente de quem já mestra Savage Worlds e sabe o que faz falta na mesa.

---

**Feito com carinho para mesas que gostam de rolar dados e contar boas histórias.**
