import { PrismaService } from '../prisma/prisma.service';
export declare class CreateActivityReferenceDto {
    entityCode: string;
    os?: string;
    oo?: string;
    activityCode?: string;
    taskId?: string;
    title: string;
    order?: number;
}
export declare class UpdateActivityReferenceDto {
    os?: string;
    oo?: string;
    activityCode?: string;
    taskId?: string;
    title?: string;
    isActive?: boolean;
    order?: number;
}
export declare class ActivityReferencesService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEntity(entityCode: string): import("@prisma/client").Prisma.PrismaPromise<{
        entityCode: string;
        isActive: boolean;
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        os: string;
        oo: string;
        activityCode: string;
        taskId: string;
    }[]>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        entityCode: string;
        isActive: boolean;
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        os: string;
        oo: string;
        activityCode: string;
        taskId: string;
    }[]>;
    create(dto: CreateActivityReferenceDto): import("@prisma/client").Prisma.Prisma__ActivityReferenceClient<{
        entityCode: string;
        isActive: boolean;
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        os: string;
        oo: string;
        activityCode: string;
        taskId: string;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: string, dto: UpdateActivityReferenceDto): Promise<{
        entityCode: string;
        isActive: boolean;
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        os: string;
        oo: string;
        activityCode: string;
        taskId: string;
    }>;
    remove(id: string): Promise<{
        entityCode: string;
        isActive: boolean;
        id: string;
        createdAt: Date;
        title: string;
        order: number;
        os: string;
        oo: string;
        activityCode: string;
        taskId: string;
    }>;
    importFromExcel(buffer: Buffer): Promise<{
        created: number;
        skipped: number;
    }>;
}
