# Bar PDV

Sistema de vendas para bar/restaurante: o garçom abre mesas e lança pedidos pelo celular, a cozinha e o bar veem a fila em tempo real, e o caixa fecha a conta.

## Stack

| Camada | Tecnologia |
|---|---|
| API | NestJS, Prisma, PostgreSQL, Socket.IO, JWT |
| Web (admin, caixa, cozinha/bar) | React + Vite, TanStack Query |
| Mobile (garçom) | React Native + Expo (expo-router) |
| Compartilhado | `@bar/shared`: enums, schemas Zod, tipos e regras (cálculo de totais) |

## Estrutura

```
apps/
  api/      NestJS (auth, cardapio, mesas, comandas, eventos/WebSocket)
  web/      Painel React
  mobile/   App do garçom
packages/
  shared/   Tipos e validações usados pelos três
```

## Como rodar

Pré-requisitos: Node 20+, pnpm 9+, Docker.

```bash
pnpm setup                # instala, compila o shared e gera o Prisma Client
pnpm db:up                # sobe o PostgreSQL
pnpm db:migrate           # cria as tabelas (nome sugerido da migration: init)
pnpm db:seed              # dados de demonstração

pnpm dev:shared           # (opcional) recompila o shared ao editar
pnpm dev:api              # http://localhost:3333
pnpm dev:web              # http://localhost:5173
pnpm dev:mobile           # Expo (escaneie o QR com o Expo Go)
```

No mobile, copie `apps/mobile/.env.example` para `.env` e troque o IP pelo do seu computador na rede local. Se o Expo reclamar de versões, rode `npx expo install --fix` dentro de `apps/mobile`.

Usuários do seed (senha `123456`): `admin@demo.com`, `garcom@demo.com`, `cozinha@demo.com`, `caixa@demo.com`.

## Fluxo do MVP

1. Garçom abre a mesa no app e lança itens.
2. Cada item vai para a fila do seu destino (cozinha ou bar) e aparece na hora na tela `Cozinha e bar`.
3. Cozinha marca `Iniciar` e `Pronto`; o garçom vê o item pronto e marca `Entregue`.
4. Caixa fecha a conta (taxa de serviço editável, forma de pagamento).
5. Toda ação relevante gera um registro em `EventoComanda` (auditoria).

## Decisões de arquitetura

- **Multi-tenant**: toda tabela tem `estabelecimentoId` e toda consulta filtra por ele (vem do JWT, nunca do cliente). Um mesmo sistema atende vários bares.
- **Permissões por papel**: `ADMIN`, `GARCOM`, `COZINHA`, `CAIXA` via `@Roles()`. Admin passa em tudo.
- **Snapshot em `ItemComanda`**: nome e preço são copiados no lançamento, então mexer no cardápio não altera contas antigas.
- **Dinheiro em centavos** (inteiros), nunca float.
- **Tempo real simples**: o servidor emite "algo mudou" para a sala do estabelecimento e os clientes refazem as consultas. Menos código e sem risco de estado divergente.
- **Validação única**: os schemas Zod do `@bar/shared` validam a API e podem validar formulários no front.

## Limitações conhecidas (próximos passos)

- **Offline no mobile**: hoje o pedido falha com mensagem se a rede cair. Próximo passo: fila local (outbox) com reenvio e chave de idempotência.
- **Uma comanda aberta por mesa** é checado na aplicação; para blindar contra concorrência, criar índice único parcial (`WHERE status = 'ABERTA'`) em migration SQL.
- **Impressão de comandas** em impressora térmica (ESC/POS) ainda não existe.
- **Fiscal (NFC-e/SAT), TEF e Pix integrado** ficam de fora; o sistema é controle interno. Para produção, integrar com um serviço de emissão.
- Sem testes automatizados, refresh token, recuperação de senha, divisão de conta por pessoa nem cadastro de usuários pela interface.
- Relatórios (vendas por período, cancelamentos por garçom) usam os dados que já estão no banco; falta a tela.
