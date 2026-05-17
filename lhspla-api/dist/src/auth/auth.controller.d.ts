import { AuthService } from './auth.service';
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RefreshDto {
    refreshToken: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
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
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
    }>;
    me(user: any): any;
}
