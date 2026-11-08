import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { validateEnv } from 'src/config/env.validation';
import { FoodRecognitionModule } from './food-recognition/food-recognition.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { FoodAnalysisModule } from './food-analysis/food-analysis.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Configuración validada al arrancar la app
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Config del rate limiting: máx. 10 requests por minuto (por usuario o IP).
    // El guard que lo aplica vive en AuthModule (UserThrottlerGuard).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    // Cliente de Supabase (global): lo usan los repositorios de cada dominio
    SupabaseModule,
    // Guards globales: JwtAuthGuard (deja request.user) y UserThrottlerGuard
    AuthModule,
    FoodRecognitionModule,
    NutritionModule,
    FoodAnalysisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
