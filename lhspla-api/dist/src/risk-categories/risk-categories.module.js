"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskCategoriesModule = void 0;
const common_1 = require("@nestjs/common");
const risk_categories_controller_1 = require("./risk-categories.controller");
const risk_categories_service_1 = require("./risk-categories.service");
const prisma_module_1 = require("../prisma/prisma.module");
let RiskCategoriesModule = class RiskCategoriesModule {
};
exports.RiskCategoriesModule = RiskCategoriesModule;
exports.RiskCategoriesModule = RiskCategoriesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [risk_categories_controller_1.RiskCategoriesController],
        providers: [risk_categories_service_1.RiskCategoriesService],
    })
], RiskCategoriesModule);
//# sourceMappingURL=risk-categories.module.js.map