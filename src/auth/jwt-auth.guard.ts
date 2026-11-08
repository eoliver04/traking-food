import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AuthUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);
    private readonly issuer: string;
    private readonly jwks: JWTVerifyGetKey;

    constructor(
        config: ConfigService,
        private readonly reflector: Reflector,
    ) {
        this.issuer = `${config.getOrThrow<string>('SUPABASE_URL')}/auth.v1`;
        //clave publica jose la descarga y la cachea
        this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
        const token = this.extractBearer(request);
        if (!token) {
            throw new UnauthorizedException('missing or malformed token');
        }

        try {
            const { payload } = await jwtVerify(token, this.jwks, {
                issuer: this.issuer,
                audience: 'authenticated',
            });
            if (typeof payload.sub !== 'string') {
                throw new Error('Token without subject');
            }
            request.user = {
                id: payload.sub,
                email: typeof payload.email === 'string' ? payload.email : undefined,
            };
            return true;
        } catch (error) {
            this.logger.warn(
                `Rejected token: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw new UnauthorizedException('Invalid token or expired token');
        }
    }

    private extractBearer(request: Request): string | null {
        const header = request.headers.authorization;
        if (!header) return null;
        const [scheme, token] = header.split(' ');
        return scheme?.toLowerCase() === 'bearer' ? token : null; 
    }
}
