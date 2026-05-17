import { PrismaService } from '../prisma/prisma.service';
export declare class CreatePersonnelDto {
    fullName: string;
    service: string;
    function: string;
    waveNumber?: string;
    email?: string;
    order?: number;
}
export declare class UpdatePersonnelDto {
    fullName?: string;
    service?: string;
    function?: string;
    waveNumber?: string;
    email?: string;
    isActive?: boolean;
    order?: number;
}
export declare class PersonnelService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(includeInactive?: boolean): import("@prisma/client").Prisma.PrismaPromise<{
        function: string;
        email: string | null;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        fullName: string;
        service: string;
        waveNumber: string | null;
    }[]>;
    create(dto: CreatePersonnelDto): import("@prisma/client").Prisma.Prisma__PersonnelClient<{
        function: string;
        email: string | null;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        fullName: string;
        service: string;
        waveNumber: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdatePersonnelDto): Promise<{
        function: string;
        email: string | null;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        fullName: string;
        service: string;
        waveNumber: string | null;
    }>;
    remove(id: string): Promise<{
        function: string;
        email: string | null;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        fullName: string;
        service: string;
        waveNumber: string | null;
    }>;
    reorder(ids: string[]): Promise<{
        function: string;
        email: string | null;
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        order: number;
        fullName: string;
        service: string;
        waveNumber: string | null;
    }[]>;
    seed(): Promise<{
        skipped: boolean;
        existing: number;
        seeded?: undefined;
    } | {
        seeded: number;
        skipped?: undefined;
        existing?: undefined;
    }>;
}
