import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();

    const entityClaimName = process.env.JWT_ENTITY_CLAIM ?? 'entityCode';
    const entityCode: string | null = (payload as any)[entityClaimName] ?? payload.entityCode ?? null;

    // Upsert l'utilisateur dans app_user (miroir léger)
    let entityId: string | null = null;
    if (entityCode) {
      const entity = await this.prisma.entity.findUnique({ where: { code: entityCode } });
      entityId = entity?.id ?? null;
    }

    await this.prisma.appUser.upsert({
      where: { id: payload.sub },
      update: { email: payload.email, entityId },
      create: { id: payload.sub, email: payload.email, entityId },
    });

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      entityCode,
      entityId,
      isEntityResponsible: payload.isEntityResponsible,
    };
  }
}
