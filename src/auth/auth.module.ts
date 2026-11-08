import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserThrottlerGuard } from './user-throttler.guard';

/**
 * Guards globales. El orden importa: primero auth (deja request.user),
 * después el throttler (lo usa como clave).
 *
 * Se registran con `useExisting` para que los tests puedan sustituirlos
 * con `overrideProvider(JwtAuthGuard)`: con `useClass` el override no aplica.
 */
@Module({
  providers: [
    JwtAuthGuard,
    UserThrottlerGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: UserThrottlerGuard },
  ],
})
export class AuthModule {}
