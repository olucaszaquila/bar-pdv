import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  abrirComandaSchema,
  cancelarItemSchema,
  fecharComandaSchema,
  lancarItensSchema,
  statusItemSchema,
  transferirMesaSchema,
  type AbrirComandaDto,
  type CancelarItemDto,
  type FecharComandaDto,
  type JwtPayload,
  type LancarItensDto,
  type StatusItemDto,
  type TransferirMesaDto,
} from '@bar/shared';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../common/auth';
import { ZodPipe } from '../common/zod.pipe';
import { ComandasService } from './comandas.service';

@Controller('comandas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComandasController {
  constructor(private service: ComandasService) {}

  @Post() @Roles('GARCOM', 'CAIXA')
  abrir(@CurrentUser() u: JwtPayload, @Body(new ZodPipe(abrirComandaSchema)) dto: AbrirComandaDto) {
    return this.service.abrir(u, dto);
  }

  @Get(':id')
  detalhe(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.service.detalhe(u, id);
  }

  @Post(':id/itens') @Roles('GARCOM', 'CAIXA')
  lancarItens(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(lancarItensSchema)) dto: LancarItensDto,
  ) {
    return this.service.lancarItens(u, id, dto);
  }

  @Patch(':id/mesa') @Roles('GARCOM', 'CAIXA')
  transferir(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(transferirMesaSchema)) dto: TransferirMesaDto,
  ) {
    return this.service.transferirMesa(u, id, dto.mesaId);
  }

  @Post(':id/fechar') @Roles('CAIXA')
  fechar(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(fecharComandaSchema)) dto: FecharComandaDto,
  ) {
    return this.service.fechar(u, id, dto);
  }

  @Get(':id/eventos') @Roles('ADMIN')
  eventos(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.service.eventosDaComanda(u, id);
  }
}

@Controller('itens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItensController {
  constructor(private service: ComandasService) {}

  /** Fila de produção (KDS). Filtra por ?destino=COZINHA|BAR */
  @Get('fila')
  fila(@CurrentUser() u: JwtPayload, @Query('destino') destino?: string) {
    const d = destino === 'COZINHA' || destino === 'BAR' ? destino : undefined;
    return this.service.fila(u, d);
  }

  @Patch(':id/status')
  status(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(statusItemSchema)) dto: StatusItemDto,
  ) {
    return this.service.atualizarStatus(u, id, dto.status);
  }

  @Post(':id/cancelar') @Roles('GARCOM', 'CAIXA')
  cancelar(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodPipe(cancelarItemSchema)) dto: CancelarItemDto,
  ) {
    return this.service.cancelarItem(u, id, dto.motivo);
  }
}
