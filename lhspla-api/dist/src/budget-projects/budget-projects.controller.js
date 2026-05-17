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
exports.BudgetProjectsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const budget_projects_service_1 = require("./budget-projects.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const TDR_MIMES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const TDR_EXTS = /\.(pdf|doc|docx)$/i;
let BudgetProjectsController = class BudgetProjectsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAll(req, entityCode, budgetNumber, createdAt) {
        return this.svc.findAll(req.user.roles, entityCode ?? req.user.entityCode, budgetNumber, createdAt);
    }
    findOne(req, id) {
        return this.svc.findOne(id, req.user.roles, req.user.entityCode);
    }
    create(req, dto) {
        return this.svc.create(dto, req.user.entityCode);
    }
    update(req, id, dto) {
        return this.svc.update(id, dto, req.user.roles, req.user.entityCode);
    }
    submit(req, id) {
        return this.svc.submit(id, req.user.entityCode, req.user.roles);
    }
    financeReview(req, id, dto) {
        return this.svc.financeReview(id, dto, req.user.id);
    }
    tpmReview(req, id, dto) {
        return this.svc.tpmReview(id, dto, req.user.id);
    }
    copReview(req, id, dto) {
        return this.svc.copReview(id, dto, req.user.id);
    }
    remove(req, id) {
        return this.svc.remove(id, req.user.roles, req.user.entityCode);
    }
    uploadTdr(req, id, file) {
        if (!file)
            throw new common_1.BadRequestException('Fichier manquant');
        return this.svc.uploadTdr(id, file, req.user.roles, req.user.entityCode, req.user.id);
    }
    async downloadTdr(id, res) {
        const { filePath, ext } = await this.svc.getTdrPath(id);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Fichier TDR introuvable');
        const mime = ext === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="TDR.${ext}"`);
        res.sendFile(filePath);
    }
};
exports.BudgetProjectsController = BudgetProjectsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('entityCode')),
    __param(2, (0, common_1.Query)('budgetNumber')),
    __param(3, (0, common_1.Query)('createdAt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, budget_projects_service_1.CreateBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_projects_service_1.UpdateBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/finance-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_projects_service_1.FinanceReviewDto]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "financeReview", null);
__decorate([
    (0, common_1.Post)(':id/tpm-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_tpm, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_projects_service_1.ReviewBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "tpmReview", null);
__decorate([
    (0, common_1.Post)(':id/cop-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.chief_of_party, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_projects_service_1.COPReviewBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "copReview", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/upload-tdr'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, _file, cb) => {
                const budgetId = req.params.id;
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'tdr', budgetId);
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
                cb(null, `TDR.${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (TDR_MIMES.includes(file.mimetype) || TDR_EXTS.test(file.originalname)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Format non supporté — PDF ou Word uniquement'), false);
            }
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], BudgetProjectsController.prototype, "uploadTdr", null);
__decorate([
    (0, common_1.Get)(':id/download-tdr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetProjectsController.prototype, "downloadTdr", null);
exports.BudgetProjectsController = BudgetProjectsController = __decorate([
    (0, common_1.Controller)('budget-projects'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [budget_projects_service_1.BudgetProjectsService])
], BudgetProjectsController);
//# sourceMappingURL=budget-projects.controller.js.map