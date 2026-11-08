import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthUser } from './auth.types';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request & { user?: AuthUser }): Promise<string> {
    return Promise.resolve(req.user?.id ?? req.ip ?? 'unknown');
  }
}
