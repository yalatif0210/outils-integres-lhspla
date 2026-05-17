import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(user: any, search?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    unreadCount(user: any): Promise<{
        count: number;
    }>;
    markRead(user: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllRead(user: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
