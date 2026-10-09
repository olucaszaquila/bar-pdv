import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}`);
}
bootstrap();
