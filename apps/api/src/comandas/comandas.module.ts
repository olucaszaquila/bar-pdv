import { Module } from '@nestjs/common';
import { ComandasController, ItensController } from './comandas.controller';
import { ComandasService } from './comandas.service';

@Module({ controllers: [ComandasController, ItensController], providers: [ComandasService] })
export class ComandasModule {}
