import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ CORS - Ajoute ton IP mobile
  app.enableCors({
    origin: [
      'http://localhost:5173',        // Frontend web
      'http://localhost:3001',        
      'http://10.70.194.85:3000',    // Ton backend depuis mobile
      '*'                             // Accepte toutes les origines (dev seulement)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

  const port = process.env.PORT || 3000;
  
  // ✅ IMPORTANT : Écoute sur TOUTES les interfaces réseau (0.0.0.0)
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`📱 Mobile access: http://10.70.194.85:${port}`);
  console.log(`🔒 QR Codes sécurisés (API uniquement)`);
}

bootstrap();