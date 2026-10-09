import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  categoriaSchema,
  produtoSchema,
  produtoUpdateSchema,
  type CategoriaDto,
  type JwtPayload,
  type ProdutoDto,
  type ProdutoUpdateDto,
} from '@bar/shared';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { ZodPipe } from '../common/zod.pipe';
import { CardapioService } from './cardapio.service';

@Controller('cardapio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardapioController {
  constructor(private service: CardapioService) {}

  @Get()
  listar(@CurrentUser() u: JwtPayload, @Query('todos') todos?: string) {
    return this.service.listar(u.estabelecimentoId, todos === '1');
  }

  @Post('categorias') @Roles('ADMIN')
  criarCategoria(@CurrentUser() u: JwtPayload, @Body(new ZodPipe(categoriaSchema)) dto: CategoriaDto) {
    return this.service.criarCategoria(u.estabelecimentoId, dto);
  }

  @Post('produtos') @Roles('ADMIN')
  criarProduto(@CurrentUser() u: JwtPayload, @Body(new ZodPipe(produtoSchema)) dto: ProdutoDto) {
    return this.service.criarProduto(u.estabelecimentoId, dto);
  }

  @Patch('produtos/:id') @Roles('ADMIN')
  atualizarProduto(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(produtoUpdateSchema)) dto: ProdutoUpdateDto,
  ) {
    return this.service.atualizarProduto(u.estabelecimentoId, id, dto);
  }
}
