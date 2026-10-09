import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { EventosModule } from './eventos/eventos.module';
import { AuthModule } from './auth/auth.module';
import { CardapioModule } from './cardapio/cardapio.module';
import { MesasModule } from './mesas/mesas.module';
import { ComandasModule } from './comandas/comandas.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '12h' },
    }),
    PrismaModule,
    EventosModule,
    AuthModule,
    CardapioModule,
    MesasModule,
    ComandasModule,
  ],
})
export class AppModule {}
