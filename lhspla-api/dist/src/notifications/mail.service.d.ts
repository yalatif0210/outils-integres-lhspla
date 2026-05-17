import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    sendMail(to: string | string[], subject: string, html: string): Promise<void>;
    buildReminderHtml(entityCode: string, weekReference: string): string;
    buildCriticalRiskHtml(entityCode: string, count: number, weekId: string): string;
}
