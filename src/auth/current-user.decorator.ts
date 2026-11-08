import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from './auth.types';

/** Lee el usuario que JwtAuthGuard dejó en la petición. */
export function extractCurrentUser(ctx: ExecutionContext): AuthUser {
  const request = ctx
    .switchToHttp()
    .getRequest<Request & { user?: AuthUser }>();
  if (!request.user) {
    throw new Error('CurrentUser used on a route without JwtAuthGuard');
  }
  return request.user;
}

// se inyecta en el controller el usuario del guard en la petición
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => extractCurrentUser(ctx),
);
