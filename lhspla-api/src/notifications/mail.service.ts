import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string | string[], subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM', 'LHSPLA Bulletin <noreply@npsp.ci>'),
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  buildReminderHtml(entityCode: string, weekReference: string): string {
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

  buildCriticalRiskHtml(entityCode: string, count: number, weekId: string): string {
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
}
