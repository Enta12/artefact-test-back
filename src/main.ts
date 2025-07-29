import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        console.error('Erreur de validation DTO:', errors);
        return new BadRequestException(errors);
      },
    }),
  );

  const port = process.env.PORT || 5000;
  console.log(`Application démarrée sur le port ${port}`);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
