import { Body, Controller, Post } from '@nestjs/common';
import { loginSchema, type LoginDto } from '@bar/shared';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }
}
