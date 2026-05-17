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
var N8nService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let N8nService = N8nService_1 = class N8nService {
    config;
    logger = new common_1.Logger(N8nService_1.name);
    baseUrl;
    constructor(config) {
        this.config = config;
        this.baseUrl = this.config.get('N8N_WEBHOOK_BASE_URL', 'http://localhost:5678/webhook');
    }
    async emit(event, payload) {
        const message = this.buildMessage(event, payload);
        const url = `${this.baseUrl}/sms-dispatch`;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: payload.phone, event, message }),
                signal: AbortSignal.timeout(5000),
            });
        }
        catch (err) {
            this.logger.warn(`n8n sms [${event}] failed: ${err?.message}`);
        }
    }
    buildMessage(event, p) {
        switch (event) {
            case 'budget-submitted':
                return `Bonjour ${p.firstName}, le budget "${p.budgetTitle}" (${p.entityCode}) vient d'être soumis. Il attend votre contrôle Finance.`;
            case 'budget-finance-reviewed':
                return `Bonjour ${p.firstName}, le budget "${p.budgetTitle}" a été validé par la Finance. Il attend votre vérification TPM.`;
            case 'budget-tpm-approved':
                return `Bonjour ${p.firstName}, le budget "${p.budgetTitle}" a été vérifié par le TPM. Il attend votre approbation.`;
            case 'budget-approved':
                return `Bonjour ${p.firstName}, votre budget "${p.budgetTitle}" a été approuvé.`;
            case 'budget-rejected':
                return `Bonjour ${p.firstName}, votre budget "${p.budgetTitle}" a été retourné. Motif : ${p.reason}`;
            case 'recall-created':
                return `Bonjour ${p.firstName}, un rappel a été créé sur le budget "${p.budgetTitle}" (${p.entityCode}). Il attend votre examen.`;
            case 'recall-closed':
                return `Bonjour ${p.firstName}, le rappel sur le budget "${p.budgetTitle}" a été clôturé.`;
            case 'recall-rejected':
                return `Bonjour ${p.firstName}, le rappel sur le budget "${p.budgetTitle}" a été rejeté. Motif : ${p.reason}`;
            case 'mission-submitted':
                return `Bonjour ${p.firstName}, la demande de mission "${p.missionTitle}" est en attente de votre avis.`;
            case 'mission-tpm-approved':
                return `Bonjour ${p.firstName}, la demande de mission "${p.missionTitle}" a été visée par le TPM. Elle attend votre approbation.`;
            case 'mission-tpm-rejected':
                return `Bonjour ${p.firstName}, votre demande de mission "${p.missionTitle}" a été renvoyée pour correction. Motif : ${p.reason}`;
            case 'mission-cop-approved':
                return `Bonjour ${p.firstName}, la demande de mission "${p.missionTitle}" a été approuvée par le COP. Vous pouvez générer les documents.`;
            case 'mission-rejected':
                return `Bonjour ${p.firstName}, la demande de mission "${p.missionTitle}" a été rejetée. Motif : ${p.reason}`;
            case 'mission-dg-validated':
                return `Bonjour ${p.firstName}, votre mission "${p.missionTitle}" a été validée par le DG. La mission est maintenant en cours.`;
            case 'payment-request-uploaded':
                return `Bonjour ${p.firstName}, une demande de paiement a été déposée pour le budget "${p.budgetTitle}" (${p.entityCode}).`;
            case 'payment-request-validated':
                return `Bonjour ${p.firstName}, votre demande de paiement pour le budget "${p.budgetTitle}" a été validée.`;
            case 'payment-request-rejected':
                return `Bonjour ${p.firstName}, votre demande de paiement pour le budget "${p.budgetTitle}" a été rejetée. Motif : ${p.reason}`;
            case 'payment-proof-uploaded':
                return `Bonjour ${p.firstName}, la preuve de paiement pour le budget "${p.budgetTitle}" a été versée. Statut : Payé.`;
            case 'budget-memo-added':
                return `Bonjour ${p.firstName}, un MEMO (${p.category}) a été ajouté au budget "${p.budgetTitle}" et attend votre approbation.`;
            case 'budget-memo-approved':
                return `Bonjour ${p.firstName}, votre MEMO (${p.category}) sur le budget "${p.budgetTitle}" a été approuvé par le COP.`;
            case 'budget-memo-rejected':
                return `Bonjour ${p.firstName}, votre MEMO (${p.category}) sur le budget "${p.budgetTitle}" a été rejeté. Motif : ${p.reason}`;
            default:
                return `Bonjour ${p.firstName}, vous avez une notification sur la plateforme LHSPLA.`;
        }
    }
    async onBudgetSubmitted(payload) { await this.emit('budget-submitted', payload); }
    async onBudgetFinanceReviewed(payload) { await this.emit('budget-finance-reviewed', payload); }
    async onBudgetTpmApproved(payload) { await this.emit('budget-tpm-approved', payload); }
    async onBudgetApproved(payload) { await this.emit('budget-approved', payload); }
    async onBudgetRejected(payload) { await this.emit('budget-rejected', payload); }
    async onRecallCreated(payload) { await this.emit('recall-created', payload); }
    async onRecallClosed(payload) { await this.emit('recall-closed', payload); }
    async onRecallRejected(payload) { await this.emit('recall-rejected', payload); }
    async onMissionSubmitted(payload) { await this.emit('mission-submitted', payload); }
    async onMissionTpmApproved(payload) { await this.emit('mission-tpm-approved', payload); }
    async onMissionTpmRejected(payload) { await this.emit('mission-tpm-rejected', payload); }
    async onMissionCopApproved(payload) { await this.emit('mission-cop-approved', payload); }
    async onMissionRejected(payload) { await this.emit('mission-rejected', payload); }
    async onMissionDgValidated(payload) { await this.emit('mission-dg-validated', payload); }
    async onPaymentRequestUploaded(payload) { await this.emit('payment-request-uploaded', payload); }
    async onPaymentRequestValidated(payload) { await this.emit('payment-request-validated', payload); }
    async onPaymentRequestRejected(payload) { await this.emit('payment-request-rejected', payload); }
    async onPaymentProofUploaded(payload) { await this.emit('payment-proof-uploaded', payload); }
    async onBudgetMemoAdded(payload) { await this.emit('budget-memo-added', payload); }
    async onBudgetMemoApproved(payload) { await this.emit('budget-memo-approved', payload); }
    async onBudgetMemoRejected(payload) { await this.emit('budget-memo-rejected', payload); }
};
exports.N8nService = N8nService;
exports.N8nService = N8nService = N8nService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], N8nService);
//# sourceMappingURL=n8n.service.js.map