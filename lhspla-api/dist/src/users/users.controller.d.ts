import { UsersService, CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
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
    create(req: any, dto: CreateUserDto): Promise<{
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
    update(req: any, id: string, dto: UpdateUserDto): Promise<{
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
    setResponsible(id: string): Promise<{
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
    changePassword(user: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    findOne(id: string): Promise<{
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
}
