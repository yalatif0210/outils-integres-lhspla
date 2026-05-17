import { ActivityReferencesService, CreateActivityReferenceDto, UpdateActivityReferenceDto } from './activity-references.service';
export declare class ActivityReferencesController {
    private svc;
    constructor(svc: ActivityReferencesService);
    find(entityCode?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
    importExcel(file: Express.Multer.File): Promise<{
        created: number;
        skipped: number;
    }>;
}
