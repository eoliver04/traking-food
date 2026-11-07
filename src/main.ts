import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { parseCorsOrigins } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('HTTP');
  const app = await NestFactory.create(AppModule);

  // CORS solo para los orígenes web listados en CORS_ORIGINS. Los clientes
  // nativos (Expo Go, app compilada) no envían Origin y no les afecta.
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, methods: ['GET', 'POST'] });
    logger.log(`CORS enabled for: ${corsOrigins.join(', ')}`);
  } else {
    logger.log('CORS disabled (CORS_ORIGINS not set)');
  }

  // Traza cada petición: imprescindible para diagnosticar fallos desde el móvil.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt} ms) from ${req.ip}`,
      );
    });
    next();
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on http://0.0.0.0:${port}`);
}
void bootstrap();
