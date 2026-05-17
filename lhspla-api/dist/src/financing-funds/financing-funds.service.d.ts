import { PrismaService } from '../prisma/prisma.service';
export declare class CreateFundDto {
    name: string;
    code: string;
    order?: number;
}
export declare class UpdateFundDto {
    name?: string;
    code?: string;
    isActive?: boolean;
    order?: number;
}
export declare class FinancingFundsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(activeOnly?: boolean): import("@prisma/client").Prisma.PrismaPromise<{
        isActive: boolean;
        id: string;
        name: string;
        code: string;
        order: number;
    }[]>;
    create(dto: CreateFundDto): import("@prisma/client").Prisma.Prisma__FinancingFundClient<{
        isActive: boolean;
        id: string;
        name: string;
        code: string;
        order: number;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateFundDto): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        code: string;
        order: number;
    }>;
    remove(id: string): Promise<{
        isActive: boolean;
        id: string;
        name: string;
        code: string;
        order: number;
    }>;
}
