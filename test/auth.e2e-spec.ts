import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Tests funcionales e2e de la autenticación (JwtAuthGuard global).
 *
 * Aquí NO se sobreescribe el guard: comprobamos que las rutas protegidas
 * rechazan peticiones sin token o con token inválido, y que las rutas
 * marcadas con @Public() siguen abiertas.
 *
 * Los tokens usados son malformados a propósito: jose los rechaza antes de
 * intentar descargar el JWKS, así que el test no toca la red.
 */
describe('Auth (e2e)', () => {
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

  it('GET / es pública y responde 200 sin token', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });

  it('POST /food-analysis sin cabecera Authorization → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'missing or malformed token',
      path: '/food-analysis',
    });
  });

  it('POST /food-analysis con token inválido → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .set('Authorization', 'Bearer no-es-un-jwt')
      .expect(401);

    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid token or expired token',
    });
  });

  it('POST /food-analysis con esquema distinto de Bearer → 401', async () => {
    await request(app.getHttpServer())
      .post('/food-analysis')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .expect(401);
  });

  it('GET /nutrition/search también está protegida → 401', async () => {
    await request(app.getHttpServer())
      .get('/nutrition/search?foodName=chicken')
      .expect(401);
  });

  it('el guard corre antes que la validación del body (401, no 400)', async () => {
    // Sin token y sin imagen: debe ganar el 401 del guard
    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .expect(401);

    expect(res.body).not.toMatchObject({ message: 'Image is required' });
  });
});
