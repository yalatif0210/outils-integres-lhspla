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
exports.BudgetMemosController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const budget_memos_service_1 = require("./budget-memos.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const MEMO_MIMES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
function memoFileFilter(_req, file, cb) {
    if (MEMO_MIMES.includes(file.mimetype) || /\.(pdf|doc|docx)$/i.test(file.originalname)) {
        cb(null, true);
    }
    else {
        cb(new common_1.BadRequestException('Format non supporté — PDF ou Word uniquement'), false);
    }
}
let BudgetMemosController = class BudgetMemosController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findByBudget(req, budgetId) {
        return this.svc.findByBudget(budgetId, req.user.roles, req.user.entityCode);
    }
    create(req, body, file) {
        const dto = {
            category: body.category,
            amount: body.amount ? parseFloat(body.amount) : undefined,
            content: body.content,
        };
        const budgetId = body.budgetId;
        if (!budgetId)
            throw new common_1.BadRequestException('budgetId requis');
        return this.svc.create(budgetId, dto, file, req.user.id, req.user.roles);
    }
    copReview(req, id, dto) {
        return this.svc.copReview(id, dto, req.user.id, req.user.roles);
    }
    delete(req, id) {
        return this.svc.delete(id, req.user.id, req.user.roles);
    }
    async downloadFile(id, res) {
        const { filePath, fileName, fileType } = await this.svc.downloadFile(id);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('Fichier introuvable');
        res.setHeader('Content-Type', fileType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
        res.sendFile(filePath);
    }
};
exports.BudgetMemosController = BudgetMemosController;
__decorate([
    (0, common_1.Get)('by-budget/:budgetId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('budgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetMemosController.prototype, "findByBudget", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'budget-memos');
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
                cb(null, `memo_${Date.now()}.${ext}`);
            },
        }),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: memoFileFilter,
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], BudgetMemosController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/cop-review'),
    (0, roles_decorator_1.Roles)(client_1.Role.chief_of_party, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, budget_memos_service_1.CopReviewMemoDto]),
    __metadata("design:returntype", void 0)
], BudgetMemosController.prototype, "copReview", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.admin_finance, client_1.Role.super_admin),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetMemosController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BudgetMemosController.prototype, "downloadFile", null);
exports.BudgetMemosController = BudgetMemosController = __decorate([
    (0, common_1.Controller)('budget-memos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [budget_memos_service_1.BudgetMemosService])
], BudgetMemosController);
//# sourceMappingURL=budget-memos.controller.js.map