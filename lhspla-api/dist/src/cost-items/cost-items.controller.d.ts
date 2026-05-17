import { CostItemsService, CreateCostItemDto, UpdateCostItemDto } from './cost-items.service';
export declare class CostItemsController {
    private svc;
    constructor(svc: CostItemsService);
    findAll(all?: string): import("@prisma/client").Prisma.PrismaPromise<{
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        designation: string;
        unitCost: number;
        nature: string;
        justificatif: string;
    }[]>;
    findNatures(): import("@prisma/client").Prisma.GetCostItemGroupByPayload<{
        by: "nature"[];
        where: {
            isActive: true;
        };
        orderBy: {
            nature: "asc";
        };
    }>;
    create(dto: CreateCostItemDto): Promise<{
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        designation: string;
        unitCost: number;
        nature: string;
        justificatif: string;
    }>;
    update(id: string, dto: UpdateCostItemDto): Promise<{
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        designation: string;
        unitCost: number;
        nature: string;
        justificatif: string;
    }>;
    remove(id: string): Promise<{
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        designation: string;
        unitCost: number;
        nature: string;
        justificatif: string;
    }>;
}
