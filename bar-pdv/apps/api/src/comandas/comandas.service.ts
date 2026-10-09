import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  EVENTOS,
  calcularTotais,
  type AbrirComandaDto,
  type FecharComandaDto,
  type JwtPayload,
  type LancarItensDto,
} from '@bar/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';

@Injectable()
export class ComandasService {
  constructor(private prisma: PrismaService, private eventos: EventosGateway) {}

  /* ---------- helpers ---------- */

  private registrar(
    tx: Prisma.TransactionClient,
    user: JwtPayload,
    comandaId: string,
    tipo: string,
    dados?: Prisma.InputJsonValue,
  ) {
    return tx.eventoComanda.create({
      data: { estabelecimentoId: user.estabelecimentoId, comandaId, usuarioId: user.sub, tipo, dados },
    });
  }

  private notificar(estabelecimentoId: string) {
    this.eventos.emitir(estabelecimentoId, EVENTOS.FILA);
    this.eventos.emitir(estabelecimentoId, EVENTOS.MESAS);
  }

  private async buscar(estabelecimentoId: string, id: string) {
    const c = await this.prisma.comanda.findFirst({
      where: { id, estabelecimentoId },
      include: {
        mesa: { select: { id: true, numero: true } },
        garcom: { select: { nome: true } },
        itens: { orderBy: { criadoEm: 'asc' } },
        pagamentos: true,
      },
    });
    if (!c) throw new NotFoundException('Comanda não encontrada');
    return c;
  }

  private async buscarAberta(estabelecimentoId: string, id: string) {
    const c = await this.buscar(estabelecimentoId, id);
    if (c.status !== 'ABERTA') throw new BadRequestException('Comanda já fechada');
    return c;
  }

  /* ---------- comandas ---------- */

  async detalhe(user: JwtPayload, id: string) {
    const c = await this.buscar(user.estabelecimentoId, id);
    return { ...c, totais: calcularTotais(c.itens, c.taxaServicoPct) };
  }

  async abrir(user: JwtPayload, dto: AbrirComandaDto) {
    const mesa = await this.prisma.mesa.findFirst({
      where: { id: dto.mesaId, estabelecimentoId: user.estabelecimentoId },
    });
    if (!mesa) throw new NotFoundException('Mesa não encontrada');

    const jaAberta = await this.prisma.comanda.findFirst({ where: { mesaId: mesa.id, status: 'ABERTA' } });
    if (jaAberta) throw new ConflictException('Esta mesa já tem uma comanda aberta');

    const comanda = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comanda.create({
        data: {
          estabelecimentoId: user.estabelecimentoId,
          mesaId: mesa.id,
          garcomId: user.sub,
          nomeCliente: dto.nomeCliente,
        },
      });
      await this.registrar(tx, user, c.id, 'COMANDA_ABERTA', { mesa: mesa.numero });
      return c;
    });
    this.notificar(user.estabelecimentoId);
    return comanda;
  }

  async lancarItens(user: JwtPayload, comandaId: string, dto: LancarItensDto) {
    await this.buscarAberta(user.estabelecimentoId, comandaId);

    const ids = [...new Set(dto.itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: ids }, estabelecimentoId: user.estabelecimentoId, ativo: true },
    });
    if (produtos.length !== ids.length) throw new BadRequestException('Produto inválido ou inativo');
    const mapa = new Map(produtos.map((p) => [p.id, p]));

    await this.prisma.$transaction(async (tx) => {
      await tx.itemComanda.createMany({
        data: dto.itens.map((i) => {
          const p = mapa.get(i.produtoId)!;
          return {
            estabelecimentoId: user.estabelecimentoId,
            comandaId,
            produtoId: p.id,
            nomeProduto: p.nome, // snapshot
            precoCentavos: p.precoCentavos, // snapshot
            destino: p.destino,
            quantidade: i.quantidade,
            observacao: i.observacao,
          };
        }),
      });
      await this.registrar(tx, user, comandaId, 'ITENS_LANCADOS', {
        itens: dto.itens.map((i) => ({ produto: mapa.get(i.produtoId)!.nome, quantidade: i.quantidade })),
      });
    });
    this.notificar(user.estabelecimentoId);
    return this.detalhe(user, comandaId);
  }

  async transferirMesa(user: JwtPayload, comandaId: string, mesaId: string) {
    const c = await this.buscarAberta(user.estabelecimentoId, comandaId);
    const destino = await this.prisma.mesa.findFirst({ where: { id: mesaId, estabelecimentoId: user.estabelecimentoId } });
    if (!destino) throw new NotFoundException('Mesa de destino não encontrada');
    const ocupada = await this.prisma.comanda.findFirst({ where: { mesaId, status: 'ABERTA' } });
    if (ocupada) throw new ConflictException('Mesa de destino está ocupada');

    await this.prisma.$transaction(async (tx) => {
      await tx.comanda.update({ where: { id: comandaId }, data: { mesaId } });
      await this.registrar(tx, user, comandaId, 'MESA_TRANSFERIDA', { de: c.mesa.numero, para: destino.numero });
    });
    this.notificar(user.estabelecimentoId);
    return this.detalhe(user, comandaId);
  }

  async fechar(user: JwtPayload, comandaId: string, dto: FecharComandaDto) {
    const c = await this.buscarAberta(user.estabelecimentoId, comandaId);
    const taxa = dto.taxaServicoPct ?? c.taxaServicoPct;
    const { total } = calcularTotais(c.itens, taxa);
    const pago = dto.pagamentos.reduce((s, p) => s + p.valorCentavos, 0);
    if (total === 0) throw new BadRequestException('Comanda sem itens para cobrar');
    if (pago < total) throw new BadRequestException('Pagamento menor que o total da conta');

    await this.prisma.$transaction(async (tx) => {
      await tx.pagamento.createMany({
        data: dto.pagamentos.map((p) => ({ ...p, estabelecimentoId: user.estabelecimentoId, comandaId })),
      });
      await tx.comanda.update({
        where: { id: comandaId },
        data: { status: 'FECHADA', fechadaEm: new Date(), taxaServicoPct: taxa },
      });
      await this.registrar(tx, user, comandaId, 'COMANDA_FECHADA', {
        total,
        pago,
        taxaServicoPct: taxa,
        formas: dto.pagamentos.map((p) => p.forma),
      });
    });
    this.notificar(user.estabelecimentoId);
    return { total, pago, troco: pago - total };
  }

  eventosDaComanda(user: JwtPayload, comandaId: string) {
    return this.prisma.eventoComanda.findMany({
      where: { comandaId, estabelecimentoId: user.estabelecimentoId },
      orderBy: { criadoEm: 'asc' },
      include: { usuario: { select: { nome: true } } },
    });
  }

  /* ---------- itens ---------- */

  async fila(user: JwtPayload, destino?: 'COZINHA' | 'BAR') {
    const itens = await this.prisma.itemComanda.findMany({
      where: {
        estabelecimentoId: user.estabelecimentoId,
        status: { in: ['PENDENTE', 'EM_PREPARO', 'PRONTO'] },
        ...(destino ? { destino } : {}),
      },
      orderBy: { criadoEm: 'asc' },
      include: { comanda: { select: { mesa: { select: { numero: true } } } } },
    });
    return itens.map(({ comanda, ...i }) => ({ ...i, comandaId: i.comandaId, mesaNumero: comanda.mesa.numero }));
  }

  async atualizarStatus(user: JwtPayload, itemId: string, status: 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE') {
    const item = await this.prisma.itemComanda.findFirst({
      where: { id: itemId, estabelecimentoId: user.estabelecimentoId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.status === 'CANCELADO') throw new BadRequestException('Item cancelado');

    const preparo = status !== 'ENTREGUE';
    const papelOk = preparo
      ? ['COZINHA', 'ADMIN'].includes(user.papel)
      : ['GARCOM', 'CAIXA', 'ADMIN'].includes(user.papel);
    if (!papelOk) throw new ForbiddenException('Seu perfil não pode fazer esta mudança de status');

    await this.prisma.$transaction(async (tx) => {
      await tx.itemComanda.update({ where: { id: itemId }, data: { status } });
      await this.registrar(tx, user, item.comandaId, 'ITEM_STATUS', {
        item: item.nomeProduto,
        de: item.status,
        para: status,
      });
    });
    this.notificar(user.estabelecimentoId);
    return { ok: true };
  }

  async cancelarItem(user: JwtPayload, itemId: string, motivo: string) {
    const item = await this.prisma.itemComanda.findFirst({
      where: { id: itemId, estabelecimentoId: user.estabelecimentoId },
      include: { comanda: { select: { status: true } } },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.comanda.status !== 'ABERTA') throw new BadRequestException('Comanda já fechada');
    if (item.status === 'CANCELADO') throw new BadRequestException('Item já cancelado');

    await this.prisma.$transaction(async (tx) => {
      await tx.itemComanda.update({ where: { id: itemId }, data: { status: 'CANCELADO' } });
      await this.registrar(tx, user, item.comandaId, 'ITEM_CANCELADO', {
        item: item.nomeProduto,
        quantidade: item.quantidade,
        statusAnterior: item.status,
        motivo,
      });
    });
    this.notificar(user.estabelecimentoId);
    return { ok: true };
  }
}
