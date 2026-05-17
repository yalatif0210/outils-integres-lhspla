import { PrismaService } from '../prisma/prisma.service';
export declare class CreateRiskCategoryDto {
    name: string;
    themeId?: string;
    order?: number;
}
export declare class UpdateRiskCategoryDto {
    name?: string;
    themeId?: string;
    isActive?: boolean;
    order?: number;
}
export declare class RiskCategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(activeOnly?: boolean, themeId?: string): import("@prisma/client").Prisma.PrismaPromise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
        themeId: string | null;
    }[]>;
    create(dto: CreateRiskCategoryDto): import("@prisma/client").Prisma.Prisma__RiskCategoryClient<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
        themeId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateRiskCategoryDto): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
        themeId: string | null;
    }>;
    remove(id: string): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        order: number;
        themeId: string | null;
    }>;
}
