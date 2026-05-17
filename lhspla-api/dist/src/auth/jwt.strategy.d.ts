import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private usersService;
    constructor(config: ConfigService, usersService: UsersService);
    validate(payload: {
        sub: string;
        email: string;
        roles: string[];
        entityCode: string;
    }): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        roles: import("@prisma/client").$Enums.Role[];
        entityCode: string | null;
        phone: string | null;
        isActive: boolean;
        id: string;
        isEntityResponsible: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
