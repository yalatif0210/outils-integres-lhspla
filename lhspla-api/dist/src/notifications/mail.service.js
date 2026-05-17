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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    transporter;
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: this.config.get('MAIL_HOST'),
            port: this.config.get('MAIL_PORT', 587),
            secure: false,
            auth: {
                user: this.config.get('MAIL_USER'),
                pass: this.config.get('MAIL_PASS'),
            },
        });
    }
    async sendMail(to, subject, html) {
        try {
            await this.transporter.sendMail({
                from: this.config.get('MAIL_FROM', 'LHSPLA Bulletin <noreply@npsp.ci>'),
                to: Array.isArray(to) ? to.join(',') : to,
                subject,
                html,
            });
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        }
    }
    buildReminderHtml(entityCode, weekReference) {
        return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1F4E79;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">⚠️ Rappel — Bulletin Hebdomadaire LHSPLA-TA</h2>
        </div>
        <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd">
          <p>Bonjour,</p>
          <p>Le bulletin de l'entité <strong>${entityCode}</strong> pour la semaine <strong>${weekReference}</strong> n'a pas encore été soumis.</p>
          <p>La deadline est <strong>le lundi à 9h00</strong>.</p>
          <p>Merci de soumettre votre saisie dès que possible.</p>
          <hr/>
          <small style="color:#999">LHSPLA-TA | NPSP-CI | FY2026</small>
        </div>
      </div>
    `;
    }
    buildCriticalRiskHtml(entityCode, count, weekId) {
        return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#9E0000;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">🔴 Alerte Risque Critique — ${entityCode}</h2>
        </div>
        <div style="background:#fff5f5;padding:20px;border:1px solid #ffcccc">
          <p>L'entité <strong>${entityCode}</strong> a signalé <strong>${count} risque(s) critique(s)</strong> dans sa dernière saisie.</p>
          <p>Une décision ou action urgente peut être requise.</p>
          <hr/>
          <small style="color:#999">LHSPLA-TA | NPSP-CI | FY2026</small>
        </div>
      </div>
    `;
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map