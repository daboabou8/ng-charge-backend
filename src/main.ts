import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔒 SÉCURITÉ : Servir UNIQUEMENT les avatars en public
  app.useStaticAssets(join(__dirname, '..', 'uploads', 'avatars'), {
    prefix: '/uploads/avatars/',
  });

  // ℹ️ Les QR codes sont accessibles UNIQUEMENT via l'API en base64
  // Pas d'accès direct par URL pour plus de sécurité

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`🔒 QR Codes sécurisés (API uniquement)`);
}

bootstrap();