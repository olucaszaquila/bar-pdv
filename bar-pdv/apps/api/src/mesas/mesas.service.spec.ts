import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { EVENTOS } from '@bar/shared';
import { MesasService } from './mesas.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { EventosGateway } from '../eventos/eventos.gateway';

function criarService(prisma: Record<string, unknown>, emitir = () => {}) {
  const eventos = { emitir };
  return new MesasService(prisma as unknown as PrismaService, eventos as unknown as EventosGateway);
}

test('listar inclui anotação e total da comanda aberta, ignorando itens cancelados', async () => {
  const service = criarService({
    mesa: {
      findMany: async () => [{
        id: 'm1', numero: 7, anotacao: 'Janaina',
        comandas: [{
          id: 'c1', nomeCliente: 'Cliente', abertaEm: new Date('2026-01-01'), taxaServicoPct: 10,
          itens: [
            { quantidade: 2, precoCentavos: 1000, status: 'PENDENTE' },
            { quantidade: 1, precoCentavos: 500, status: 'CANCELADO' },
          ],
        }],
      }],
    },
  });

  const [mesa] = await service.listar('e1');
  assert.equal(mesa.anotacao, 'Janaina');
  assert.equal(mesa.comanda?.total, 2200);
});

test('atualizarAnotacao limpa espaços, salva e notifica as mesas', async () => {
  const eventos: unknown[][] = [];
  let dadosAtualizacao: unknown;
  const service = criarService({
    mesa: {
      findFirst: async () => ({ id: 'm1' }),
      update: async (args: { data: unknown }) => { dadosAtualizacao = args.data; return { id: 'm1', anotacao: null }; },
    },
  }, (...args) => eventos.push(args));

  await service.atualizarAnotacao('e1', 'm1', { anotacao: '   ' });

  assert.deepEqual(dadosAtualizacao, { anotacao: null });
  assert.deepEqual(eventos, [['e1', EVENTOS.MESAS]]);
});

test('atualizarAnotacao não permite acessar mesa de outro estabelecimento', async () => {
  let atualizou = false;
  const service = criarService({
    mesa: {
      findFirst: async () => null,
      update: async () => { atualizou = true; },
    },
  });

  await assert.rejects(service.atualizarAnotacao('e1', 'm-alheia', { anotacao: 'Reserva' }), NotFoundException);
  assert.equal(atualizou, false);
});