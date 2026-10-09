import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { mesaAnotacaoSchema, type JwtPayload, type MesaAnotacaoDto } from '@bar/shared';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { ZodPipe } from '../common/zod.pipe';
import { MesasService } from './mesas.service';

@Controller('mesas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MesasController {
  constructor(private service: MesasService) {}

  @Get()
  listar(@CurrentUser() u: JwtPayload) {
    return this.service.listar(u.estabelecimentoId);
  }

  @Post() @Roles('ADMIN')
  criar(@CurrentUser() u: JwtPayload) {
    return this.service.criar(u.estabelecimentoId);
  }

  @Patch(':id/anotacao') @Roles('ADMIN')
  atualizarAnotacao(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(mesaAnotacaoSchema)) dto: MesaAnotacaoDto,
  ) {
    return this.service.atualizarAnotacao(u.estabelecimentoId, id, dto);
  }

}
