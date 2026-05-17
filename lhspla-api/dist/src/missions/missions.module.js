"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionsModule = void 0;
const common_1 = require("@nestjs/common");
const missions_controller_1 = require("./missions.controller");
const missions_service_1 = require("./missions.service");
const mission_document_service_1 = require("./mission-document.service");
const prisma_module_1 = require("../prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
const n8n_module_1 = require("../n8n/n8n.module");
let MissionsModule = class MissionsModule {
};
exports.MissionsModule = MissionsModule;
exports.MissionsModule = MissionsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule, n8n_module_1.N8nModule],
        controllers: [missions_controller_1.MissionsController],
        providers: [missions_service_1.MissionsService, mission_document_service_1.MissionDocumentService],
        exports: [missions_service_1.MissionsService],
    })
], MissionsModule);
//# sourceMappingURL=missions.module.js.map