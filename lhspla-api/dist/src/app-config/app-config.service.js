"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULTS = {
    banner_subtitle: {
        value: 'NPSP-CI · Projet financé par USAID · FY2026',
        label: "Sous-titre de la bannière d'accueil",
    },
    compilation_footer: {
        value: 'LHSPLA-TA | NPSP-CI | Compilé par Charles Oscar LEBRI, MEL Manager | FY2026',
        label: 'Pied de page de la compilation',
    },
    exchange_rate: {
        value: '655',
        label: 'Taux de change (1 USD en FCFA)',
    },
    tva_rate: {
        value: '0.18',
        label: 'Taux TVA (ex: 0.18 = 18%)',
    },
    tdt_rate: {
        value: '0.025',
        label: 'Taux TDT (ex: 0.025 = 2.5%)',
    },
    transfer_fee_rate: {
        value: '0.05',
        label: 'Frais de transfert Contractualisation (ex: 0.05 = 5%)',
    },
    fiscal_year_tag: {
        value: 'FY2026',
        label: "Tag de l'année fiscale (ex: FY2026) — numérotation des budgets et TDR",
    },
    memo_enabled: {
        value: 'false',
        label: 'Activer la gestion des MEMOs budgétaires (true/false) — super_admin uniquement',
    },
};
let AppConfigService = class AppConfigService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll() {
        const rows = await this.prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
        const stored = Object.fromEntries(rows.map(r => [r.key, r]));
        return Object.entries(DEFAULTS).map(([key, def]) => ({
            key,
            label: def.label,
            value: stored[key]?.value ?? def.value,
        }));
    }
    async getMap() {
        const list = await this.getAll();
        return Object.fromEntries(list.map(c => [c.key, c.value]));
    }
    async upsert(key, value) {
        const label = DEFAULTS[key]?.label ?? key;
        return this.prisma.appConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value, label },
        });
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppConfigService);
//# sourceMappingURL=app-config.service.js.map