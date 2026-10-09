import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoriaDto, ProdutoDto, ProdutoUpdateDto } from '@bar/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardapioService {
  constructor(private prisma: PrismaService) {}

  listar(estabelecimentoId: string, incluirInativos = false) {
    return this.prisma.categoria.findMany({
      where: { estabelecimentoId },
      orderBy: { ordem: 'asc' },
      include: {
        produtos: { where: incluirInativos ? {} : { ativo: true }, orderBy: { nome: 'asc' } },
      },
    });
  }

  criarCategoria(estabelecimentoId: string, dto: CategoriaDto) {
    return this.prisma.categoria.create({ data: { estabelecimentoId, nome: dto.nome, ordem: dto.ordem ?? 0 } });
  }

  async criarProduto(estabelecimentoId: string, dto: ProdutoDto) {
    const cat = await this.prisma.categoria.findFirst({ where: { id: dto.categoriaId, estabelecimentoId } });
    if (!cat) throw new BadRequestException('Categoria inválida');
    return this.prisma.produto.create({ data: { ...dto, estabelecimentoId } });
  }

  async atualizarProduto(estabelecimentoId: string, id: string, dto: ProdutoUpdateDto) {
    const { categoriaId, ...resto } = dto;
    if (categoriaId) {
      const cat = await this.prisma.categoria.findFirst({ where: { id: categoriaId, estabelecimentoId } });
      if (!cat) throw new BadRequestException('Categoria inválida');
    }
    const r = await this.prisma.produto.updateMany({
      where: { id, estabelecimentoId },
      data: { ...resto, ...(categoriaId ? { categoriaId } : {}) },
    });
    if (!r.count) throw new NotFoundException('Produto não encontrado');
    return this.prisma.produto.findUnique({ where: { id } });
  }
}
