import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserThrottlerGuard } from './user-throttler.guard';

@Module({
    providers: [
        {provide: APP_GUARD, useClass: JwtAuthGuard},
        {provide: APP_GUARD, useClass: UserThrottlerGuard}
    ],
})
export class AuthModule {}