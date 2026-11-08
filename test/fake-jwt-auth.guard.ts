import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from 'src/auth/auth.types';

export const E2E_USER_ID = 'e2e-user';

/**
 * Sustituto de JwtAuthGuard para los e2e que no prueban auth.
 *
 * Deja en `request.user` un usuario de prueba. El id se puede cambiar por
 * petición con la cabecera `x-test-user` (útil para probar límites por
 * usuario). Las pruebas del guard real están en auth.e2e-spec.ts.
 */
export class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const header = request.headers['x-test-user'];
    const id = typeof header === 'string' && header ? header : E2E_USER_ID;
    request.user = { id, email: `${id}@test.com` };
    return true;
  }
}
