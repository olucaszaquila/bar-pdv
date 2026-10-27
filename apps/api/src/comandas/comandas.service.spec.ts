import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EVENTOS, type JwtPayload } from '@bar/shared';
import { ComandasService } from './comandas.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { EventosGateway } from '../eventos/eventos.gateway';

const garcom: JwtPayload = { sub: 'u1', nome: 'Ana', estabelecimentoId: 'e1', papel: 'GARCOM' };

function criarService(prisma: Record<string, unknown>, emitir = () => {}) {
  return new ComandasService(
    prisma as unknown as PrismaService,
    { emitir } as unknown as EventosGateway,
  );
}

test('abrir rejeita mesa inexistente ou pertencente a outro estabelecimento', async () => {
  const service = criarService({ mesa: { findFirst: async () => null } });
  await assert.rejects(service.abrir(garcom, { mesaId: 'm-alheia' }), NotFoundException);
});

test('abrir rejeita mesa com comanda já aberta', async () => {
  const service = criarService({
    mesa: { findFirst: async () => ({ id: 'm1', numero: 1 }) },
    comanda: { findFirst: async () => ({ id: 'c-existente' }) },
  });
  await assert.rejects(service.abrir(garcom, { mesaId: 'm1' }), ConflictException);
});

test('fechar rejeita comanda sem itens cobraveis e pagamento insuficiente', async (t) => {
  async function executar(itens: { quantidade: number; precoCentavos: number; status: string }[], valorCentavos: number) {
    const service = criarService({
      comanda: { findFirst: async () => ({ status: 'ABERTA', itens, taxaServicoPct: 0 }) },
    });
    return service.fechar(garcom, 'c1', { pagamentos: [{ forma: 'PIX', valorCentavos }] });
  }

  await t.test('sem itens cobraveis', async () => {
    await assert.rejects(executar([{ quantidade: 1, precoCentavos: 1000, status: 'CANCELADO' }], 1000), BadRequestException);
  });
  await t.test('pagamento menor que o total', async () => {
    await assert.rejects(executar([{ quantidade: 1, precoCentavos: 1000, status: 'PENDENTE' }], 999), BadRequestException);
  });
});

test('fechar persiste pagamento, fecha comanda e retorna troco', async () => {
  const chamadas: { pagamentos?: unknown; fechamento?: unknown; evento?: unknown } = {};
  const tx = {
    pagamento: { createMany: async (args: unknown) => { chamadas.pagamentos = args; } },
    comanda: { update: async (args: unknown) => { chamadas.fechamento = args; } },
    eventoComanda: { create: async (args: unknown) => { chamadas.evento = args; } },
  };
  const service = criarService({
    comanda: { findFirst: async () => ({
      id: 'c1', status: 'ABERTA', taxaServicoPct: 10,
      itens: [{ quantidade: 1, precoCentavos: 1000, status: 'PENDENTE' }],
    }) },
    $transaction: async (callback: (transaction: {
      pagamento: typeof tx.pagamento;
      comanda: typeof tx.comanda;
      eventoComanda: typeof tx.eventoComanda;
    }) => Promise<void>) => callback(tx),
  });

  const resultado = await service.fechar(garcom, 'c1', {
    taxaServicoPct: 10,
    pagamentos: [{ forma: 'PIX', valorCentavos: 1200 }],
  });

  assert.deepEqual(resultado, { total: 1100, pago: 1200, troco: 100 });
  assert.ok(chamadas.pagamentos);
  assert.ok(chamadas.fechamento);
  assert.ok(chamadas.evento);
});

test('fechar calcula troco em pagamento dividido com dinheiro', async () => {
  const tx = {
    pagamento: { createMany: async () => {} },
    comanda: { update: async () => {} },
    eventoComanda: { create: async () => {} },
  };
  const service = criarService({
    comanda: { findFirst: async () => ({
      id: 'c1', status: 'ABERTA', taxaServicoPct: 0,
      itens: [{ quantidade: 1, precoCentavos: 1000, status: 'PENDENTE' }],
    }) },
    $transaction: async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
  });

  const resultado = await service.fechar(garcom, 'c1', {
    pagamentos: [
      { forma: 'DINHEIRO', valorCentavos: 600 },
      { forma: 'PIX', valorCentavos: 400 },
    ],
    dinheiroRecebidoCentavos: 1000,
  });

  assert.deepEqual(resultado, { total: 1000, pago: 1000, troco: 400 });
});

test('fechar rejeita pagamentos divididos que nao somam o total', async () => {
  const service = criarService({
    comanda: { findFirst: async () => ({
      id: 'c1', status: 'ABERTA', taxaServicoPct: 0,
      itens: [{ quantidade: 1, precoCentavos: 1000, status: 'PENDENTE' }],
    }) },
  });

  await assert.rejects(service.fechar(garcom, 'c1', {
    pagamentos: [{ forma: 'PIX', valorCentavos: 999 }],
    dinheiroRecebidoCentavos: 0,
  }), BadRequestException);
});

test('atualizarStatus restringe transições conforme o papel do usuário', async (t) => {
  async function executar(papel: JwtPayload['papel'], status: 'EM_PREPARO' | 'ENTREGUE') {
    let transacionou = false;
    const service = criarService({
      itemComanda: { findFirst: async () => ({ id: 'i1', comandaId: 'c1', nomeProduto: 'Suco', status: 'PENDENTE' }) },
      $transaction: async () => { transacionou = true; },
    });
    await service.atualizarStatus({ ...garcom, papel }, 'i1', status);
    return transacionou;
  }

  await t.test('garçom não inicia preparo', async () => {
    await assert.rejects(executar('GARCOM', 'EM_PREPARO'), ForbiddenException);
  });
  await t.test('cozinha não marca item como entregue', async () => {
    await assert.rejects(executar('COZINHA', 'ENTREGUE'), ForbiddenException);
  });
  await t.test('cozinha pode iniciar preparo', async () => {
    assert.equal(await executar('COZINHA', 'EM_PREPARO'), true);
  });
});