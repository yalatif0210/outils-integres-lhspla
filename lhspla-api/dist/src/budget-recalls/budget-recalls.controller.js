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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetRecallsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const budget_recalls_service_1 = require("./budget-recalls.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const ALLOWED_MIMES = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'application/zip',
    'application/x-zip-compressed',
];
const ALLOWED_EXTS = /\.(pdf|xls|xlsx|png|jpg|jpeg|zip)$/i;
const MAX_SIZE = 10 * 1024 * 1024;
const recallFileStorage = (0, multer_1.diskStorage)({
    destination: (req, _file, cb) => {
        const recallId = req.params.id;
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'recalls', recallId);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
        cb(null, `${Date.now()}_${safe}`);
    },
});
let BudgetRecallsController = class BudgetRecallsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAll(req) {
        return this.svc.findAll(req.user.roles, req.user.entityCode);
    }
    findByBudget(req, budgetId) {
        return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
    }
    getCoverage(req, id) {
        return this.svc.getCoverage(id, req.user.roles, req.user.entityCode);
    }
    getAudit(req, id) {
        return this.svc.getAuditLog(id, req.user.roles, req.user.entityCode);
    }
    create(req, dto) {
        return this.svc.create(dto, req.user.entityCode, req.user.id);
    }
    addDocument(req, id, dto, file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier requis');
        return this.svc.addDocument(id, dto, file, req.user.entityCode, req.user.id, req.user.roles);
    }
    reviewDocument(req, id, docId, dto) {
        return this.svc.reviewDocument(id, docId, dto, req.user.id);
    }
    deleteDocument(req, id, docId) {
        return this.svc.deleteDocument(id, docId, req.user.entityCode, req.user.id, req.user.roles);
    }
    rejectRecall(req, id, dto) {
        return this.svc.rejectRecall(id, dto, req.user.id);
    }
    cancelRecall(req, id) {
        return this.svc.cancelRecall(id, req.user.entityCode, req.user.id);
    }
    close(req, id) {
        return this.svc.close(id, req.user.id);
    }
    reopen(req, id) {
        return this.svc.reopen(id, req.user.id);
    }
};
exports.BudgetRecallsController = BudgetRecallsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-budget/:budgetId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('budgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "findByBudget", null);
__decorate([
    (0, common_1.Get)(':id/coverage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "getCoverage", null);
__decorate([
    (0, common_1.Get)(':id/audit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "getAudit", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, budget_recalls_service_1.CreateRecallDto]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: recallFileStorage,
        limits: { fileSize: MAX_SIZE },
        fileFilter: (_req, file, cb) => {
            if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTS.test(file.originalname)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Format non supporté. Acceptés : PDF, Excel, PNG, JPG, ZIP'), false);
            }
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_recalls_service_1.AddDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "addDocument", null);
__decorate([
    (0, common_1.Patch)(':id/documents/:docId/review'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('docId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, budget_recalls_service_1.ReviewDocumentDto]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "reviewDocument", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:docId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('docId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_recalls_service_1.RejectRecallDto]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "rejectRecall", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "cancelRecall", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/reopen'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetRecallsController.prototype, "reopen", null);
exports.BudgetRecallsController = BudgetRecallsController = __decorate([
    (0, common_1.Controller)('budget-recalls'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [budget_recalls_service_1.BudgetRecallsService])
], BudgetRecallsController);
//# sourceMappingURL=budget-recalls.controller.js.map