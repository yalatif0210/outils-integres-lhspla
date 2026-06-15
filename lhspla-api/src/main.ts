import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Prisma returns BigInt for Int8 columns — patch before any JSON serialization
(BigInt.prototype as any).toJSON = function () { return Number(this); };
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Augmenter la limite du body JSON pour permettre l'upload du PDF base64 (~300KB typique)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4201',
    credentials: true,
  });

  // Créer le dossier uploads si absent
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  // Servir /uploads derrière une vérification JWT minimale
  const jwtService = app.get(JwtService);
  app.use('/uploads', (req: any, res: any, next: any) => {
    const auth = req.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Non autorisé' });
    try {
      jwtService.verify(token);
      next();
    } catch {
      return res.status(401).json({ message: 'Token invalide' });
    }
  });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 LHSPLA API running on http://localhost:${port}/api`);
}
bootstrap();
