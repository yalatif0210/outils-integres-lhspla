"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const os_1 = require("os");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const missions_service_1 = require("./missions.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let MissionsController = class MissionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAll(req, entityCode) {
        return this.svc.findAll(req.user.roles, entityCode ?? req.user.entityCode, req.user.id, req.user.isEntityResponsible);
    }
    missionDashboard() {
        return this.svc.getDashboard();
    }
    create(req, dto) {
        return this.svc.create(dto, req.user.id, req.user.roles);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    update(req, id, dto) {
        return this.svc.update(id, dto, req.user.id);
    }
    submit(req, id) {
        return this.svc.submit(id, req.user.id, req.user.roles);
    }
    tpmReview(req, id, dto) {
        return this.svc.tpmReview(id, dto, req.user.id);
    }
    copReview(req, id, dto) {
        return this.svc.copReview(id, dto, req.user.id);
    }
    generateDocs(req, id) {
        return this.svc.generateDocs(id, req.user.id);
    }
    validateDg(req, id) {
        return this.svc.validateDg(id, req.user.id);
    }
    updateDashboard(id, dto) {
        return this.svc.updateDashboardFields(id, dto);
    }
    cancel(req, id) {
        return this.svc.cancel(id, req.user.id, req.user.roles);
    }
    download(id, docType, res) {
        const filename = docType === 'odm' ? 'ODM.docx' : 'DM.docx';
        const label = docType === 'odm' ? 'ODM' : 'DM';
        const filePath = path.join(process.cwd(), 'uploads', 'missions', id, filename);
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException(`Document ${label} introuvable — générez d\'abord les documents`);
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filePath);
    }
    uploadSignedDoc(req, id, file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant');
        return this.svc.uploadSignedDoc(id, file, req.user.id, req.user.roles);
    }
    async downloadSignedDoc(id, res) {
        const { filePath, ext } = await this.svc.getSignedDocPath(id);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Fichier introuvable sur le serveur');
        const mimeMap = {
            pdf: 'application/pdf',
            jpeg: 'image/jpeg',
            jpg: 'image/jpeg',
            png: 'image/png',
        };
        res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="signed.${ext}"`);
        res.sendFile(filePath);
    }
};
exports.MissionsController = MissionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('entityCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, roles_decorator_1.Roles)(client_1.Role.super_admin, client_1.Role.admin_tpm, client_1.Role.chief_of_party, client_1.Role.assistant_direction),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "missionDashboard", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, missions_service_1.CreateMissionDto]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, missions_service_1.UpdateMissionDto]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, roles_decorator_1.Roles)(client_1.Role.entity_member, client_1.Role.chief_of_party, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/tpm-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_tpm, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "tpmReview", null);
__decorate([
    (0, common_1.Post)(':id/cop-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.chief_of_party, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, missions_service_1.CopReviewDto]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "copReview", null);
__decorate([
    (0, common_1.Post)(':id/generate-docs'),
    (0, roles_decorator_1.Roles)(client_1.Role.assistant_direction, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "generateDocs", null);
__decorate([
    (0, common_1.Post)(':id/validate-dg'),
    (0, roles_decorator_1.Roles)(client_1.Role.assistant_direction, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "validateDg", null);
__decorate([
    (0, common_1.Patch)(':id/dashboard'),
    (0, roles_decorator_1.Roles)(client_1.Role.assistant_direction, client_1.Role.super_admin),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "updateDashboard", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)(':id/download/:docType'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('docType')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "download", null);
__decorate([
    (0, common_1.Post)(':id/upload-signed-doc'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (0, os_1.tmpdir)(),
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
                cb(null, `signed_tmp_${Date.now()}${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = /\.(pdf|jpeg|jpg|png)$/i;
            if (allowed.test(file.originalname)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Format non supporté — PDF, JPEG, PNG ou JPG uniquement'), false);
            }
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MissionsController.prototype, "uploadSignedDoc", null);
__decorate([
    (0, common_1.Get)(':id/download-signed-doc'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MissionsController.prototype, "downloadSignedDoc", null);
exports.MissionsController = MissionsController = __decorate([
    (0, common_1.Controller)('missions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [missions_service_1.MissionsService])
], MissionsController);
//# sourceMappingURL=missions.controller.js.map