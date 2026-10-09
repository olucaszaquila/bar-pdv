import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { JwtPayload } from '@bar/shared';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
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

}
