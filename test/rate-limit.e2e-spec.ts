import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FakeJwtAuthGuard } from './fake-jwt-auth.guard';

/**
 * Tests funcionales e2e del rate limiting global (UserThrottlerGuard):
 * límite de 10 requests por minuto configurado en AppModule.
 * - Rutas públicas: la clave es la IP.
 * - Rutas autenticadas: la clave es el id del usuario.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // App nueva por test => storage del rate limiter fresco
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('ruta pública: permite 10 requests por IP y bloquea las siguientes con 429', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer()).get('/');
      statuses.push(res.status);
    }

    expect(statuses.filter((status) => status === 200)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(2);
  });

  it('ruta autenticada: el límite es por usuario, no por IP', async () => {
    const statusesFor = async (userId: string): Promise<number[]> => {
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        const res = await request(app.getHttpServer())
          .get('/nutrition/search?foodName=')
          .set('x-test-user', userId);
        statuses.push(res.status);
      }
      return statuses;
    };

    const userA = await statusesFor('user-a');
    // Misma IP, otro usuario: empieza con su propio contador
    const userB = await statusesFor('user-b');

    expect(userA.filter((status) => status === 200)).toHaveLength(10);
    expect(userA.filter((status) => status === 429)).toHaveLength(1);
    expect(userB.filter((status) => status === 200)).toHaveLength(10);
    expect(userB.filter((status) => status === 429)).toHaveLength(1);
  });
});
