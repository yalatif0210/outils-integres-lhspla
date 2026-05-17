import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('N8N_WEBHOOK_BASE_URL', 'http://localhost:5678/webhook');
  }

  private async emit(event: string, payload: Record<string, any>): Promise<void> {
    const message = this.buildMessage(event, payload);
    const url = `${this.baseUrl}/sms-dispatch`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: payload.phone, event, message }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err: any) {
      this.logger.warn(`n8n sms [${event}] failed: ${err?.message}`);
    }
  }

  private buildMessage(event: string, p: Record<string, any>): string {
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

  // ── Budget ────────────────────────────────────────────────────────────────

  async onBudgetSubmitted(payload: {
    phone: string; firstName: string; budgetTitle: string; entityCode: string;
  }) { await this.emit('budget-submitted', payload); }

  async onBudgetFinanceReviewed(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('budget-finance-reviewed', payload); }

  async onBudgetTpmApproved(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('budget-tpm-approved', payload); }

  async onBudgetApproved(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('budget-approved', payload); }

  async onBudgetRejected(payload: {
    phone: string; firstName: string; budgetTitle: string; reason: string;
  }) { await this.emit('budget-rejected', payload); }

  // ── Rappels ───────────────────────────────────────────────────────────────

  async onRecallCreated(payload: {
    phone: string; firstName: string; budgetTitle: string; entityCode: string;
  }) { await this.emit('recall-created', payload); }

  async onRecallClosed(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('recall-closed', payload); }

  async onRecallRejected(payload: {
    phone: string; firstName: string; budgetTitle: string; reason: string;
  }) { await this.emit('recall-rejected', payload); }

  // ── Missions ──────────────────────────────────────────────────────────────

  async onMissionSubmitted(payload: {
    phone: string; firstName: string; missionTitle: string;
  }) { await this.emit('mission-submitted', payload); }

  async onMissionTpmApproved(payload: {
    phone: string; firstName: string; missionTitle: string;
  }) { await this.emit('mission-tpm-approved', payload); }

  async onMissionTpmRejected(payload: {
    phone: string; firstName: string; missionTitle: string; reason: string;
  }) { await this.emit('mission-tpm-rejected', payload); }

  async onMissionCopApproved(payload: {
    phone: string; firstName: string; missionTitle: string;
  }) { await this.emit('mission-cop-approved', payload); }

  async onMissionRejected(payload: {
    phone: string; firstName: string; missionTitle: string; reason: string;
  }) { await this.emit('mission-rejected', payload); }

  async onMissionDgValidated(payload: {
    phone: string; firstName: string; missionTitle: string;
  }) { await this.emit('mission-dg-validated', payload); }

  // ── Demandes de paiement ──────────────────────────────────────────────────

  async onPaymentRequestUploaded(payload: {
    phone: string; firstName: string; budgetTitle: string; entityCode: string;
  }) { await this.emit('payment-request-uploaded', payload); }

  async onPaymentRequestValidated(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('payment-request-validated', payload); }

  async onPaymentRequestRejected(payload: {
    phone: string; firstName: string; budgetTitle: string; reason: string;
  }) { await this.emit('payment-request-rejected', payload); }

  async onPaymentProofUploaded(payload: {
    phone: string; firstName: string; budgetTitle: string;
  }) { await this.emit('payment-proof-uploaded', payload); }

  async onBudgetMemoAdded(payload: {
    phone: string; firstName: string; budgetTitle: string; category: string;
  }) { await this.emit('budget-memo-added', payload); }

  async onBudgetMemoApproved(payload: {
    phone: string; firstName: string; budgetTitle: string; category: string;
  }) { await this.emit('budget-memo-approved', payload); }

  async onBudgetMemoRejected(payload: {
    phone: string; firstName: string; budgetTitle: string; category: string; reason: string;
  }) { await this.emit('budget-memo-rejected', payload); }
}
