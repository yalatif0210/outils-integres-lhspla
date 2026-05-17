import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { MissionsService } from '../missions/missions.service';
export declare class CronService {
    private prisma;
    private notifications;
    private submissions;
    private missions;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService, submissions: SubmissionsService, missions: MissionsService);
    sendMondayReminders(): Promise<void>;
    cleanupExpiredLocks(): Promise<void>;
    autoCompleteMissions(): Promise<void>;
}
