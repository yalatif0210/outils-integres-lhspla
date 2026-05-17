import { AppConfigService } from './app-config.service';
export declare class AppConfigController {
    private service;
    constructor(service: AppConfigService);
    getAll(): Promise<Record<string, string>>;
    getFull(): Promise<{
        key: string;
        value: string;
        label: string;
    }[]>;
    update(key: string, value: string): Promise<{
        key: string;
        value: string;
    }>;
}
