import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload, Papel } from '@bar/shared';

export const ROLES_KEY = 'roles';
/** Papéis permitidos na rota. ADMIN sempre passa. */
export const Roles = (...papeis: Papel[]) => SetMetadata(ROLES_KEY, papeis);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as JwtPayload,
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      req.user = this.jwt.verify<JwtPayload>(header.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Papel[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest().user as JwtPayload;
    if (user.papel === 'ADMIN' || roles.includes(user.papel)) return true;
    throw new ForbiddenException('Sem permissão para esta ação');
  }
}
