import { RiskThemesService, CreateRiskThemeDto, UpdateRiskThemeDto } from './risk-themes.service';
export declare class RiskThemesController {
    private svc;
    constructor(svc: RiskThemesService);
    findAll(all?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
    importExcel(file: Express.Multer.File): Promise<{
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
