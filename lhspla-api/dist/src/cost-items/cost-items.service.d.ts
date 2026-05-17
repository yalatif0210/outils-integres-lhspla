import { PrismaService } from '../prisma/prisma.service';
export declare class CreateCostItemDto {
    nature: string;
    designation: string;
    unitCost: number;
    justificatif?: string;
    order?: number;
}
export declare class UpdateCostItemDto {
    nature?: string;
    designation?: string;
    unitCost?: number;
    justificatif?: string;
    isActive?: boolean;
    order?: number;
}
export declare class CostItemsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(activeOnly?: boolean): import("@prisma/client").Prisma.PrismaPromise<{
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
