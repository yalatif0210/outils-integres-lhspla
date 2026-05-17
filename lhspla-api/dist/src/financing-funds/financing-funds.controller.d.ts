import { FinancingFundsService, CreateFundDto, UpdateFundDto } from './financing-funds.service';
export declare class FinancingFundsController {
    private svc;
    constructor(svc: FinancingFundsService);
    findAll(all?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
