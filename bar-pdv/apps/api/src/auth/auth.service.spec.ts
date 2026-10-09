import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

function criarService(usuario: Record<string, unknown> | null) {
  const prisma = { usuario: { findUnique: async () => usuario } };
  const jwt = { sign: (payload: unknown) => `token:${JSON.stringify(payload)}` };
  return new AuthService(prisma as unknown as PrismaService, jwt as never);
}

test('login retorna token e dados públicos do usuário ativo', async () => {
  const usuario = {
    id: 'u1', nome: 'Ana', email: 'ana@bar.com', senhaHash: bcrypt.hashSync('senha-certa', 4),
    papel: 'GARCOM', estabelecimentoId: 'e1', ativo: true,
  };
  const resposta = await criarService(usuario).login({ email: usuario.email, senha: 'senha-certa' });

  assert.equal(resposta.usuario.id, 'u1');
  assert.equal(resposta.usuario.papel, 'GARCOM');
  assert.equal(resposta.token, 'token:{"sub":"u1","nome":"Ana","estabelecimentoId":"e1","papel":"GARCOM"}');
  assert.equal('senhaHash' in resposta.usuario, false);
});

test('login rejeita usuário inexistente', async () => {
  await assert.rejects(
    criarService(null).login({ email: 'nao-existe@bar.com', senha: 'qualquer' }),
    UnauthorizedException,
  );
});

test('login rejeita usuário inativo e senha incorreta', async (t) => {
  const base = {
    id: 'u1', nome: 'Ana', email: 'ana@bar.com', senhaHash: bcrypt.hashSync('senha-certa', 4),
    papel: 'GARCOM', estabelecimentoId: 'e1', ativo: true,
  };
  await t.test('usuário inativo', async () => {
    await assert.rejects(criarService({ ...base, ativo: false }).login({ email: base.email, senha: 'senha-certa' }), UnauthorizedException);
  });
  await t.test('senha incorreta', async () => {
    await assert.rejects(criarService(base).login({ email: base.email, senha: 'errada' }), UnauthorizedException);
  });
});