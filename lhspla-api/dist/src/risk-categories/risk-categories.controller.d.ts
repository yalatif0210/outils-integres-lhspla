import { RiskCategoriesService, CreateRiskCategoryDto, UpdateRiskCategoryDto } from './risk-categories.service';
export declare class RiskCategoriesController {
    private svc;
    constructor(svc: RiskCategoriesService);
    findAll(all?: string, themeId?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
