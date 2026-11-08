import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';
import type { CryptoKey } from 'jose';
import { AuthUser } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

/**
 * Tests unitarios de JwtAuthGuard.
 *
 * Sustituimos el JWKS remoto de Supabase por un par de claves ES256 generado
 * en memoria: así se verifican firmas reales sin tocar la red.
 */
describe('JwtAuthGuard', () => {
  const SUPABASE_URL = 'https://test.supabase.co';
  const ISSUER = `${SUPABASE_URL}/auth/v1`;

  let guard: JwtAuthGuard;
  let privateKey: CryptoKey;

  type TestRequest = {
    headers: { authorization?: string };
    user?: AuthUser;
  };

  const buildContext = (
    request: TestRequest,
    handler: object = () => undefined,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  /** Firma un JWT con el formato que emite Supabase Auth */
  const signToken = (
    overrides: {
      sub?: string | null;
      email?: string;
      iss?: string;
      aud?: string;
      expiresIn?: string;
    } = {},
  ): Promise<string> => {
    const jwt = new SignJWT({
      ...(overrides.email ? { email: overrides.email } : {}),
      role: 'authenticated',
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setIssuer(overrides.iss ?? ISSUER)
      .setAudience(overrides.aud ?? 'authenticated')
      .setExpirationTime(overrides.expiresIn ?? '1h');

    if (overrides.sub !== null) {
      jwt.setSubject(overrides.sub ?? 'user-123');
    }
    return jwt.sign(privateKey);
  };

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;

    guard = new JwtAuthGuard(
      new ConfigService({ SUPABASE_URL }),
      new Reflector(),
    );
    // Inyectamos la clave pública local en lugar del JWKS remoto
    const resolveKey: JWTVerifyGetKey = () => Promise.resolve(pair.publicKey);
    Object.assign(guard, { jwks: resolveKey });
  });

  it('deja pasar rutas marcadas con @Public() sin token', async () => {
    const publicHandler = () => undefined;
    Public()(publicHandler);
    const request: TestRequest = { headers: {} };

    await expect(
      guard.canActivate(buildContext(request, publicHandler)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('rechaza (401) si no hay cabecera Authorization', async () => {
    await expect(
      guard.canActivate(buildContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ['Basic abc', 'esquema distinto de Bearer'],
    ['Bearer', 'Bearer sin token'],
    ['Bearer ', 'Bearer con token vacío'],
    ['Bearer no-es-un-jwt', 'token malformado'],
  ])('rechaza (401) la cabecera "%s" (%s)', async (authorization) => {
    await expect(
      guard.canActivate(buildContext({ headers: { authorization } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('acepta un token válido y deja el usuario en la petición', async () => {
    const token = await signToken({ email: 'ana@test.com' });
    const request: TestRequest = {
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-123', email: 'ana@test.com' });
  });

  it('acepta "bearer" en minúsculas', async () => {
    const token = await signToken();
    const request: TestRequest = {
      headers: { authorization: `bearer ${token}` },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user?.id).toBe('user-123');
  });

  it('deja email undefined si el token no lo incluye', async () => {
    const token = await signToken();
    const request: TestRequest = {
      headers: { authorization: `Bearer ${token}` },
    };

    await guard.canActivate(buildContext(request));

    expect(request.user).toEqual({ id: 'user-123', email: undefined });
  });

  it('rechaza (401) un token expirado', async () => {
    const token = await signToken({ expiresIn: '-10s' });

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) un token de otro issuer', async () => {
    const token = await signToken({ iss: 'https://otro.supabase.co/auth/v1' });

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) un token con audience distinta de "authenticated"', async () => {
    const token = await signToken({ aud: 'anon' });

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) un token sin sub', async () => {
    const token = await signToken({ sub: null });

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) un token firmado con otra clave', async () => {
    const otherPair = await generateKeyPair('ES256');
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject('user-123')
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(otherPair.privateKey);

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('no filtra el motivo interno del rechazo al cliente', async () => {
    const token = await signToken({ expiresIn: '-10s' });

    await expect(
      guard.canActivate(
        buildContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow('Invalid token or expired token');
  });

  it('construye el issuer y la URL del JWKS a partir de SUPABASE_URL', () => {
    const fresh = new JwtAuthGuard(
      new ConfigService({ SUPABASE_URL }),
      new Reflector(),
    );

    expect(fresh).toMatchObject({ issuer: ISSUER });
  });

  it('falla al arrancar si falta SUPABASE_URL', () => {
    expect(
      () => new JwtAuthGuard(new ConfigService({}), new Reflector()),
    ).toThrow();
  });
});
