import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Test funcional e2e del rate limiting global (@nestjs/throttler):
 * límite de 10 requests por minuto por IP configurado en AppModule.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('permite 10 requests y bloquea las siguientes con 429', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer()).get('/');
      statuses.push(res.status);
    }

    expect(statuses.filter((status) => status === 200)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(2);
  });
});
