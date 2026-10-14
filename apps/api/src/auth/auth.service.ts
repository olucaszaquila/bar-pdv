import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { JwtPayload, LoginDto } from '@bar/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login({ email, senha }: LoginDto) {
    const u = await this.prisma.usuario.findUnique({ where: { email } });
    if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const payload: JwtPayload = { sub: u.id, nome: u.nome, estabelecimentoId: u.estabelecimentoId, papel: u.papel };
    return { token: this.jwt.sign(payload), usuario: { id: u.id, nome: u.nome, papel: u.papel } };
  }
}
