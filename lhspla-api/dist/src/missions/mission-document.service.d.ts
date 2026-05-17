export declare class MissionDocumentService {
    generateDocuments(mission: any): Promise<{
        dmPath: string;
        odmPath: string;
    }>;
    private fillTemplate;
}
