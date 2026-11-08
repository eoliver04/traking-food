import { ExecutionContext } from '@nestjs/common';
import { extractCurrentUser } from './current-user.decorator';

describe('CurrentUser', () => {
  const contextWith = (request: object): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('devuelve el usuario que dejó el guard en la petición', () => {
    const user = { id: 'user-1', email: 'u@test.com' };

    expect(extractCurrentUser(contextWith({ user }))).toBe(user);
  });

  it('falla si la ruta no pasó por JwtAuthGuard', () => {
    expect(() => extractCurrentUser(contextWith({}))).toThrow(
      'CurrentUser used on a route without JwtAuthGuard',
    );
  });
});
