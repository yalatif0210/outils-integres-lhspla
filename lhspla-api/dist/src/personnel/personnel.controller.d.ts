import { PersonnelService, CreatePersonnelDto, UpdatePersonnelDto } from './personnel.service';
export declare class PersonnelController {
    private svc;
    constructor(svc: PersonnelService);
    findAll(includeInactive?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
    reorder(body: {
        ids: string[];
    }): Promise<{
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
