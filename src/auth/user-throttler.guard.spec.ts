import type { Request } from 'express';
import { AuthUser } from './auth.types';
import { UserThrottlerGuard } from './user-throttler.guard';

type TrackedRequest = Request & { user?: AuthUser };

describe('UserThrottlerGuard', () => {
  // getTracker es protected: lo exponemos solo para el test
  const guard = Object.create(UserThrottlerGuard.prototype) as {
    getTracker: (req: TrackedRequest) => Promise<string>;
  };

  it('usa el id del usuario autenticado como clave del límite', async () => {
    const req = { ip: '10.0.0.1', user: { id: 'user-1' } } as TrackedRequest;

    await expect(guard.getTracker(req)).resolves.toBe('user-1');
  });

  it('usa la IP cuando la ruta es pública (sin usuario)', async () => {
    const req = { ip: '10.0.0.1' } as TrackedRequest;

    await expect(guard.getTracker(req)).resolves.toBe('10.0.0.1');
  });

  it('devuelve "unknown" si no hay usuario ni IP', async () => {
    const req = {} as TrackedRequest;

    await expect(guard.getTracker(req)).resolves.toBe('unknown');
  });
});
