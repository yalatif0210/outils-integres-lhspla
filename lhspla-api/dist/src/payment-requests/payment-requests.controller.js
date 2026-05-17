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
exports.PaymentRequestsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const payment_requests_service_1 = require("./payment-requests.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const EXCEL_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];
const PROOF_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
function excelFilter(_req, file, cb) {
    if (EXCEL_MIMES.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
        cb(null, true);
    }
    else {
        cb(new common_1.BadRequestException('Format non supporté — Excel uniquement (.xlsx, .xls)'), false);
    }
}
function proofFilter(_req, file, cb) {
    if (PROOF_MIMES.includes(file.mimetype) || /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname)) {
        cb(null, true);
    }
    else {
        cb(new common_1.BadRequestException('Format non supporté — PDF ou image uniquement'), false);
    }
}
let PaymentRequestsController = class PaymentRequestsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getSummary(budgetId) {
        return this.svc.getSummary(budgetId);
    }
    findByBudget(req, budgetId) {
        return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
    }
    upload(req, budgetId, file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant');
        return this.svc.upload(budgetId, file, req.user.id, req.user.entityCode);
    }
    validate(req, id) {
        return this.svc.validate(id, req.user.id, req.user.roles);
    }
    reject(req, id, dto) {
        return this.svc.reject(id, dto.reason, req.user.id, req.user.roles);
    }
    async download(id, res) {
        const { filePath, fileName } = await this.svc.getFilePath(id);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Fichier introuvable');
        const ext = fileName.split('.').pop()?.toLowerCase() ?? 'xlsx';
        const mime = ext === 'xls'
            ? 'application/vnd.ms-excel'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(filePath);
    }
    uploadProof(req, id, file, amountRaw) {
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant');
        const amount = parseFloat(amountRaw);
        if (!amount || amount <= 0)
            throw new common_1.BadRequestException('Le montant de la preuve est obligatoire et doit être > 0');
        return this.svc.uploadProof(id, file, amount, req.user.id, req.user.roles);
    }
    async downloadProof(proofId, res) {
        const { filePath, fileName, fileType } = await this.svc.getProofPath(proofId);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Fichier introuvable');
        res.setHeader('Content-Type', fileType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(filePath);
    }
    deleteRequest(req, id) {
        return this.svc.deleteRequest(id, req.user.id, req.user.roles, req.user.entityCode);
    }
    deleteProof(req, requestId, proofId) {
        return this.svc.deleteProof(requestId, proofId, req.user.id, req.user.roles);
    }
    uploadTemplate(req, file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant');
        return this.svc.uploadTemplate(file, req.user.id, req.user.roles);
    }
    async downloadTemplate(res) {
        const { filePath, fileName } = await this.svc.getTemplatePath();
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Modèle introuvable');
        const ext = fileName.split('.').pop()?.toLowerCase() ?? 'xlsx';
        const mime = ext === 'xls'
            ? 'application/vnd.ms-excel'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(filePath);
    }
};
exports.PaymentRequestsController = PaymentRequestsController;
__decorate([
    (0, common_1.Get)('payment-requests/budget/:budgetId/summary'),
    __param(0, (0, common_1.Param)('budgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('payment-requests/by-budget/:budgetId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('budgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "findByBudget", null);
__decorate([
    (0, common_1.Post)('payment-requests/:budgetId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'payment-requests', req.params.budgetId);
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'xlsx';
                cb(null, `demande_${Date.now()}.${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: excelFilter,
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('budgetId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('payment-requests/:id/validate'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)('payment-requests/:id/reject'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, payment_requests_service_1.RejectPaymentRequestDto]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)('payment-requests/:id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentRequestsController.prototype, "download", null);
__decorate([
    (0, common_1.Post)('payment-requests/:id/proofs'),
    (0, roles_decorator_1.Roles)(client_1.Role.chargee_tresorerie, client_1.Role.super_admin),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'payment-proofs', req.params.id);
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
                cb(null, `preuve_${Date.now()}.${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: proofFilter,
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "uploadProof", null);
__decorate([
    (0, common_1.Get)('payment-requests/:id/proofs/:proofId/download'),
    __param(0, (0, common_1.Param)('proofId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentRequestsController.prototype, "downloadProof", null);
__decorate([
    (0, common_1.Delete)('payment-requests/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "deleteRequest", null);
__decorate([
    (0, common_1.Delete)('payment-requests/:requestId/proofs/:proofId'),
    (0, roles_decorator_1.Roles)(client_1.Role.chargee_tresorerie, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('requestId')),
    __param(2, (0, common_1.Param)('proofId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "deleteProof", null);
__decorate([
    (0, common_1.Post)('payment-template'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'payment-template');
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'xlsx';
                cb(null, `modele_demande_paiement.${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: excelFilter,
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentRequestsController.prototype, "uploadTemplate", null);
__decorate([
    (0, common_1.Get)('payment-template/download'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentRequestsController.prototype, "downloadTemplate", null);
exports.PaymentRequestsController = PaymentRequestsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [payment_requests_service_1.PaymentRequestsService])
], PaymentRequestsController);
//# sourceMappingURL=payment-requests.controller.js.map