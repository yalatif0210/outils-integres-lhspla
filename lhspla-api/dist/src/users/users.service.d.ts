import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    roles: Role[];
    entityCode?: string;
    phone?: string;
    password: string;
}
export declare class UpdateUserDto {
    email?: string;
    firstName?: string;
    lastName?: string;
    roles?: Role[];
    entityCode?: string;
    phone?: string;
    isActive?: boolean;
    password?: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
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
    }[]>;
    findById(id: string): Promise<{
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
    } | null>;
    findByEmail(email: string): Promise<{
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
    } | null>;
    create(dto: CreateUserDto, requestorRoles: Role[]): Promise<{
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
    update(id: string, dto: UpdateUserDto, requestorRoles: Role[]): Promise<{
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
    changePassword(id: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    toggleActive(id: string): Promise<{
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
    setEntityResponsible(id: string): Promise<{
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
