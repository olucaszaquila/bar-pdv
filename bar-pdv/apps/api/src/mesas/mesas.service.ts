import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENTOS, calcularTotais, type MesaAnotacaoDto } from '@bar/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';

@Injectable()
export class MesasService {
  constructor(private prisma: PrismaService, private eventos: EventosGateway) {}

  async listar(estabelecimentoId: string) {
    const mesas = await this.prisma.mesa.findMany({
      where: { estabelecimentoId },
      orderBy: { numero: 'asc' },
      include: { comandas: { where: { status: 'ABERTA' }, include: { itens: true } } },
    });
    return mesas.map((m) => {
      const c = m.comandas[0];
      return {
        id: m.id,
        numero: m.numero,
        anotacao: m.anotacao,
        comanda: c
          ? {
              id: c.id,
              nomeCliente: c.nomeCliente,
              abertaEm: c.abertaEm,
              total: calcularTotais(c.itens, c.taxaServicoPct).total,
            }
          : null,
      };
    });
  }

  async criar(estabelecimentoId: string) {
    const ultima = await this.prisma.mesa.aggregate({ where: { estabelecimentoId }, _max: { numero: true } });
    return this.prisma.mesa.create({ data: { estabelecimentoId, numero: (ultima._max.numero ?? 0) + 1 } });
  }

  async atualizarAnotacao(estabelecimentoId: string, id: string, dto: MesaAnotacaoDto) {
    const mesa = await this.prisma.mesa.findFirst({ where: { id, estabelecimentoId } });
    if (!mesa) throw new NotFoundException('Mesa não encontrada');

    const atualizada = await this.prisma.mesa.update({
      where: { id },
      data: { anotacao: dto.anotacao.trim() || null },
    });
    this.eventos.emitir(estabelecimentoId, EVENTOS.MESAS);
    return atualizada;
  }

}
