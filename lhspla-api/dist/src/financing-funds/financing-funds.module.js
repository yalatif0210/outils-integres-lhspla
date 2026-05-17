"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancingFundsModule = void 0;
const common_1 = require("@nestjs/common");
const financing_funds_controller_1 = require("./financing-funds.controller");
const financing_funds_service_1 = require("./financing-funds.service");
const prisma_module_1 = require("../prisma/prisma.module");
let FinancingFundsModule = class FinancingFundsModule {
};
exports.FinancingFundsModule = FinancingFundsModule;
exports.FinancingFundsModule = FinancingFundsModule = __decorate([
    (0, common_1.Module)({ imports: [prisma_module_1.PrismaModule], controllers: [financing_funds_controller_1.FinancingFundsController], providers: [financing_funds_service_1.FinancingFundsService] })
], FinancingFundsModule);
//# sourceMappingURL=financing-funds.module.js.map