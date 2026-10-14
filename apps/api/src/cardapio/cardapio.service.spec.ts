import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardapioService } from './cardapio.service';
import type { PrismaService } from '../prisma/prisma.service';

function criarService(prisma: Record<string, unknown>) {
  return new CardapioService(prisma as unknown as PrismaService);
}

test('listar filtra produtos inativos por padrão e permite incluí-los', async () => {
  const chamadas: unknown[] = [];
  const service = criarService({
    categoria: { findMany: async (args: unknown) => { chamadas.push(args); return []; } },
  });

  await service.listar('e1');
  await service.listar('e1', true);

  const primeira = chamadas[0] as { where: unknown; include: { produtos: { where: unknown } } };
  const segunda = chamadas[1] as { include: { produtos: { where: unknown } } };
  assert.deepEqual(primeira.where, { estabelecimentoId: 'e1' });
  assert.deepEqual(primeira.include.produtos.where, { ativo: true });
  assert.deepEqual(segunda.include.produtos.where, {});
});

test('criarProduto rejeita categoria de outro estabelecimento', async () => {
  let criouProduto = false;
  const service = criarService({
    categoria: { findFirst: async () => null },
    produto: { create: async () => { criouProduto = true; } },
  });

  await assert.rejects(
    service.criarProduto('e1', { nome: 'Suco', categoriaId: 'cat-alheia', precoCentavos: 800, destino: 'BAR' }),
    BadRequestException,
  );
  assert.equal(criouProduto, false);
});

test('atualizarProduto rejeita categoria inválida e produto inexistente', async (t) => {
  await t.test('categoria de outro estabelecimento', async () => {
    const service = criarService({
      categoria: { findFirst: async () => null },
      produto: { updateMany: async () => ({ count: 1 }) },
    });
    await assert.rejects(service.atualizarProduto('e1', 'p1', { categoriaId: 'cat-alheia' }), BadRequestException);
  });

  await t.test('produto inexistente', async () => {
    const service = criarService({ produto: { updateMany: async () => ({ count: 0 }) } });
    await assert.rejects(service.atualizarProduto('e1', 'p-inexistente', { ativo: false }), NotFoundException);
  });
});