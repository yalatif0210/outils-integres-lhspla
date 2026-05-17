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
exports.PersonnelService = exports.UpdatePersonnelDto = exports.CreatePersonnelDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreatePersonnelDto {
    fullName;
    service;
    function;
    waveNumber;
    email;
    order;
}
exports.CreatePersonnelDto = CreatePersonnelDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePersonnelDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePersonnelDto.prototype, "service", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePersonnelDto.prototype, "function", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePersonnelDto.prototype, "waveNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePersonnelDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreatePersonnelDto.prototype, "order", void 0);
class UpdatePersonnelDto {
    fullName;
    service;
    function;
    waveNumber;
    email;
    isActive;
    order;
}
exports.UpdatePersonnelDto = UpdatePersonnelDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePersonnelDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePersonnelDto.prototype, "service", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePersonnelDto.prototype, "function", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePersonnelDto.prototype, "waveNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePersonnelDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePersonnelDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdatePersonnelDto.prototype, "order", void 0);
let PersonnelService = class PersonnelService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(includeInactive = false) {
        return this.prisma.personnel.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: [{ order: 'asc' }, { fullName: 'asc' }],
        });
    }
    create(dto) {
        return this.prisma.personnel.create({
            data: {
                fullName: dto.fullName,
                service: dto.service,
                function: dto.function,
                waveNumber: dto.waveNumber,
                email: dto.email,
                order: dto.order ?? 0,
            },
        });
    }
    async update(id, dto) {
        const p = await this.prisma.personnel.findUnique({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException();
        return this.prisma.personnel.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const p = await this.prisma.personnel.findUnique({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException();
        return this.prisma.personnel.update({ where: { id }, data: { isActive: false } });
    }
    async reorder(ids) {
        await Promise.all(ids.map((id, index) => this.prisma.personnel.updateMany({ where: { id }, data: { order: index } })));
        return this.findAll(true);
    }
    async seed() {
        const agents = [
            { service: 'Directrice', fullName: 'Dr CODO Carine Epse ODI', function: 'Directrice Projet LHSPLA', waveNumber: '0556999660', email: 'carine.codo@npsp.ci', order: 0 },
            { service: 'MTP', fullName: 'Dr DJE Kouakou', function: 'Manager Technique de Projet', waveNumber: '0759594458', email: 'k.dje@npsp.ci', order: 1 },
            { service: 'QAD', fullName: 'Dr ZILLE Romain Cyrille', function: 'Conseiller Technique en Quantification et Prévision des Produits', waveNumber: '0707196455', email: 'r.zille@npsp.ci', order: 2 },
            { service: 'QAD', fullName: 'M. GNAMIAN Kacou Jean Stéphane', function: 'Responsable Achat et Approvisionnement', waveNumber: '0554687342', email: 's.gnamian@npsp.ci', order: 3 },
            { service: 'CAC', fullName: 'M. AYEMON Florent', function: 'Spécialiste en Chaine d\'Approvisionnement Communautaire', waveNumber: '0708004634', email: 'f.ayemon@npsp.ci', order: 4 },
            { service: 'QAD', fullName: 'M. KANGA AKAYA Benjamin', function: 'Spécialiste Chargé des Produits de Laboratoire', waveNumber: '0707707647', email: 'b.kanga@npsp.ci', order: 5 },
            { service: 'SE', fullName: 'M. LEBRI Charles Oscar', function: 'Responsable Suivi Evaluation et Formation', waveNumber: '0586758421', email: 'charles.lebri@npsp.ci', order: 6 },
            { service: 'SE', fullName: 'M. KOUAHO Kouaho Franck', function: 'Analyste de données', waveNumber: '0789441075', email: 'f.kouaho@npsp.ci', order: 7 },
            { service: 'SE', fullName: 'M. SEKOUA Roger Martial', function: 'Analyste de données', waveNumber: '0757285956', email: 'r.sekoua@npsp.ci', order: 8 },
            { service: 'Finance', fullName: 'M. YAPO Arnaud Joel', function: 'Responsable du Suivi Financier et Comptable', waveNumber: '0594228950', email: 'a.yapo@npsp.ci', order: 9 },
            { service: 'Finance', fullName: 'Mme GNANGNAN Clarisse', function: 'Assistante Administrative', waveNumber: '0707184845', email: 'c.gnangnan@npsp.ci', order: 10 },
            { service: 'Finance', fullName: 'Mme KOFFI Marie Pauline Epse TRA', function: 'Gestionnaire de tresorerie', waveNumber: '0708099246', email: 'p.koffi@npsp.ci', order: 11 },
            { service: 'Finance', fullName: 'M. LOPES Fabrice Elie', function: 'Assistant Administratif et Financier', waveNumber: '0778294101', email: 'f.lopes@npsp.ci', order: 12 },
            { service: 'Finance', fullName: 'M. KONE Cheikh Oumar', function: 'Assistant Financier', waveNumber: '0709994078', email: 'c.kone@npsp.ci', order: 13 },
            { service: 'SI', fullName: 'Mme KOUAKOU Abliman Epse DJEREKE', function: 'Responsable Système d\'Information', waveNumber: '0708425278', email: 'a.djereke@npsp.ci', order: 14 },
            { service: 'SI', fullName: 'M. TEKI Joel Fabien Achi', function: 'Technicien Helpdesk eSIGL et mSupply', waveNumber: '0777829700', email: 'j.teki@npsp.ci', order: 15 },
            { service: 'SI', fullName: 'Mme SIE Nina Aman', function: 'Technicien Helpdesk eSIGL et mSupply', waveNumber: '0747989549', email: 'n.sie@npsp.ci', order: 16 },
            { service: 'SI', fullName: 'Mme GONCALVES Jessica Roseline', function: 'Technicienne Support', waveNumber: '0789313348', email: 'j.goncalves@npsp.ci', order: 17 },
            { service: 'CAD_Abidjan', fullName: 'M. FOFANA Abdul Khader', function: 'Conseiller Chaine d\'Approvisionnement', waveNumber: '0586758415', email: 'k.fofana@npsp.ci', order: 18 },
            { service: 'CAD_Abidjan', fullName: 'M. APPIA Charles Ellou', function: 'Spécialiste Chaine d\'Approvisionnement Décentralisée', waveNumber: '0565297332', email: 'c.appia@npsp.ci', order: 19 },
            { service: 'CAD_Abidjan', fullName: 'M. GUEI Christian Desgueyes', function: 'Spécialiste Chaine d\'Approvisionnement Décentralisée', waveNumber: '0709812783', email: 'c.guei@npsp.ci', order: 20 },
            { service: 'CAD_Abidjan', fullName: 'Mme SEREBOH Liaddet Mariette Raoul', function: 'Assistante Chaine d\'Approvisionnement Décentralisée', waveNumber: '0576048346', email: 'm.sereboh@npsp.ci', order: 21 },
            { service: 'CAD_Bouaké', fullName: 'M. KOUADIO Parfait Kouamé', function: 'Conseiller Chaine d\'Approvisionnement', waveNumber: '0584821710', email: 'p.kouadio@npsp.ci', order: 22 },
            { service: 'CAD_Bouaké', fullName: 'M. LOUKOU N\'Goran', function: 'Spécialiste Chaine d\'Approvisionnement Décentralisée', waveNumber: '0586758430', email: 'n.loukou@npsp.ci', order: 23 },
            { service: 'CAD_Bouaké', fullName: 'M. CAMARA Katia IGNACE', function: 'Spécialiste Chaine d\'Approvisionnement Décentralisée', waveNumber: '0584260989', email: 'ka.camara@npsp.ci', order: 24 },
            { service: 'CAD_Bouaké', fullName: 'M. KHOPOIN Anoux Julien', function: 'Spécialiste Chaine d\'Approvisionnement Décentralisée', waveNumber: '0102015107', email: 'a.khopoin@npsp.ci', order: 25 },
            { service: 'Driver', fullName: 'M. BROU Aimé Ohou', function: 'Conducteur', waveNumber: '0566662409', email: 'a.brou@npsp.ci', order: 26 },
            { service: 'Driver', fullName: 'M. ELLO Abel Krahibouet', function: 'Conducteur', waveNumber: '0757677295', email: 'a.ello@npsp.ci', order: 27 },
            { service: 'QAD', fullName: 'Mme BALLO Leilah Gnélé', function: 'Assistante Chargée du Suivi des Stocks', waveNumber: '0789206321', email: 'balloleilah@gmail.com', order: 28 },
            { service: 'Driver', fullName: 'M. DIAH Jonas Yao', function: 'Conducteur', waveNumber: '0758047679', email: 'j.diah@npsp.ci', order: 29 },
        ];
        const existing = await this.prisma.personnel.count();
        if (existing > 0)
            return { skipped: true, existing };
        await this.prisma.personnel.createMany({ data: agents });
        return { seeded: agents.length };
    }
};
exports.PersonnelService = PersonnelService;
exports.PersonnelService = PersonnelService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PersonnelService);
//# sourceMappingURL=personnel.service.js.map