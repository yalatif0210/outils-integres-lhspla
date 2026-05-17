import { PrismaService } from '../prisma/prisma.service';
export declare class CreateRiskThemeDto {
    name: string;
    order?: number;
}
export declare class UpdateRiskThemeDto {
    name?: string;
    isActive?: boolean;
    order?: number;
}
export declare class RiskThemesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(activeOnly?: boolean): import("@prisma/client").Prisma.PrismaPromise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
    }[]>;
    create(dto: CreateRiskThemeDto): import("@prisma/client").Prisma.Prisma__RiskThemeClient<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateRiskThemeDto): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
    }>;
    remove(id: string): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
    }>;
    importFromExcel(buffer: Buffer): Promise<{
        themes: {
            created: number;
            existing: number;
        };
        categories: {
            created: number;
            existing: number;
        };
    }>;
}
