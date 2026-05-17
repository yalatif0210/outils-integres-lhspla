import { PrismaService } from '../prisma/prisma.service';
export declare class AppConfigService {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(): Promise<{
        key: string;
        value: string;
        label: string;
    }[]>;
    getMap(): Promise<Record<string, string>>;
    upsert(key: string, value: string): Promise<{
        key: string;
        value: string;
    }>;
}
