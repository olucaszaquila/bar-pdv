import { Injectable } from '@nestjs/common';
import { calcularTotais } from '@bar/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MesasService {
  constructor(private prisma: PrismaService) {}

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

}
