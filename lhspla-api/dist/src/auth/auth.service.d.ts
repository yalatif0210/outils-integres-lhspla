import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private config;
    constructor(usersService: UsersService, jwtService: JwtService, config: ConfigService);
    validateUser(email: string, password: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        roles: import("@prisma/client").$Enums.Role[];
        entityCode: string | null;
        phone: string | null;
        isActive: boolean;
        id: string;
        isEntityResponsible: boolean;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
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
        };
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
    }>;
}
