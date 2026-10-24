import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { validateEnv } from 'src/config/env.validation';
import { FoodRecognitionModule } from './food-recognition/food-recognition.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { FoodAnalysisModule } from './food-analysis/food-analysis.module';

@Module({
  imports: [
    // Configuración validada al arrancar la app
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Rate limiting global: máx. 10 requests por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    FoodRecognitionModule,
    NutritionModule,
    FoodAnalysisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
