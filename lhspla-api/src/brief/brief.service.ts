import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, StockStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekMeta {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  weekReference: string;
}

interface StockRow {
  denomination: string;
  programme: string;
  sousCategorie: string;
  statutStock: StockStatus;
  stockCentralMsd: any;
  stockCentrale: bigint | null;
  stockPeripherique: bigint | null;
  stockNational: bigint | null;
  cmm: any;
  datePeremptionCentrale: string | null;
  datePeremptionPeripherie: string | null;
  commentaire: string | null;
  dateEtatStock: Date | null;
}

interface ActivityRow {
  title: string;
  objectives: string;
  location: string;
  dates: string;
  startDate: Date | null;
  endDate: Date | null;
  recommendations: string;
}

interface PlannedActivityRow {
  title: string;
  location: string;
  plannedDates: string;
  startDate: Date | null;
  endDate: Date | null;
  dosParticipation: string | null;
  observations: string;
}

interface RiskPointRow {
  entityCode: string;
  theme: string;
  category: string;
  description: string;
  criticality: string | null;
  expectedAction: string;
}

interface SubmissionData {
  entityCode: string;
  activities: ActivityRow[];
  plannedActivities: PlannedActivityRow[];
  riskPoints: RiskPointRow[];
}

interface BriefData {
  week: WeekMeta;
  stocks: StockRow[];
  stockGrouped: Record<string, Record<string, StockRow[]>>;
  dateEtatStock: Date | null;
  submissions: SubmissionData[];
  riskPoints: RiskPointRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

type DisplayStatut = 'RUPTURE_PAYS' | 'RUPTURE_CENTRALE' | 'PEREMPTION_PROCHE' | 'RISQUE_ELEVE' | 'BON_STOCKAGE' | 'SURSTOCK';

const DISPLAY_LABELS: Record<DisplayStatut, string> = {
  RUPTURE_PAYS:      'RUPTURE PAYS',
  RUPTURE_CENTRALE:  'Rupture centrale',
  PEREMPTION_PROCHE: 'PÉREMPTION < 3 M',
  RISQUE_ELEVE:      'Risque élevé',
  BON_STOCKAGE:      'Bon stockage',
  SURSTOCK:          'Surstock',
};

const DISPLAY_STYLES: Record<DisplayStatut, { bg: string; font: string }> = {
  RUPTURE_PAYS:      { bg: 'C00000', font: 'FFFFFF' },
  RUPTURE_CENTRALE:  { bg: 'C00000', font: 'FFFFFF' },
  PEREMPTION_PROCHE: { bg: 'FFC000', font: '7B3F00' },
  RISQUE_ELEVE:      { bg: 'FFCC00', font: '7B5E00' },
  BON_STOCKAGE:      { bg: 'E2EFDA', font: '375623' },
  SURSTOCK:          { bg: 'EDEDED', font: '595959' },
};

const PROG_LABELS: Record<string, string> = {
  PNLS:  'Programme National de Lutte contre le SIDA',
  PNLP:  'Programme National de Lutte contre le Paludisme',
  PNSME: 'Programme National Santé Mère et Enfant',
};

const ENTITY_LABELS: Record<string, string> = {
  CAD: "Chaîne d'Approvisionnement Décentralisée",
  CAC: "Chaîne d'Approvisionnement Communautaire",
  QAD: 'Quantification, Achat & Distribution',
  PMO: 'Gestion de Projet',
  SE:  'Suivi & Évaluation (MEL)',
  SI:  "Système d'Information",
};

const CRITICALITY_LABELS: Record<string, string> = {
  critique: 'CRITIQUE',
  eleve: 'ÉLEVÉ',
  modere: 'MODÉRÉ',
  faible: 'FAIBLE',
};

const CRITICALITY_COLORS: Record<string, string> = {
  critique: 'C00000',
  eleve:    'E97132',
  modere:   'FFC000',
  faible:   '70AD47',
};

const CRITICALITY_ORDER: Record<string, number> = {
  critique: 4, eleve: 3, modere: 2, faible: 1,
};

const FR_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const FR_MONTHS_LONG  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'briefs');

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtNum(n: bigint | number | null | undefined): string {
  if (n == null) return '—';
  const num = typeof n === 'bigint' ? Number(n) : Number(n);
  if (isNaN(num)) return '—';
  if (num === 0) return '0';
  return num.toLocaleString('fr-FR');
}

function fmtMsd(n: any): string {
  if (n == null) return '—';
  const num = typeof n === 'object' ? parseFloat(n.toString()) : Number(n);
  if (isNaN(num)) return '—';
  return num.toFixed(1);
}

function toMsdFloat(n: any): number | null {
  if (n == null) return null;
  const v = typeof n === 'object' ? parseFloat(n.toString()) : Number(n);
  return isNaN(v) ? null : v;
}

function computeSdu(e: StockRow): string {
  const centrale = e.stockCentrale != null ? Number(e.stockCentrale) : null;
  const peri = e.stockPeripherique != null ? Number(e.stockPeripherique) : null;
  if (centrale !== null && centrale > 0) return fmtNum(centrale);
  if (peri !== null && peri > 0) return `${fmtNum(peri)} (périph.)`;
  return '—';
}

function buildSemaineLabel(start: Date, end: Date): string {
  const dS = start.getDate();
  const dE = end.getDate();
  const mS = start.toLocaleDateString('fr-FR', { month: 'long' });
  const mE = end.toLocaleDateString('fr-FR', { month: 'long' });
  const y  = start.getFullYear();
  return mS === mE ? `${dS} au ${dE} ${mS} ${y}` : `${dS} ${mS} au ${dE} ${mE} ${y}`;
}

function getFinMoisPrecedent(dateRef: Date): string {
  const prev = new Date(dateRef.getFullYear(), dateRef.getMonth() - 1, 1);
  return `${FR_MONTHS_LONG[prev.getMonth()]} ${prev.getFullYear()}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return '';
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end)!);
}

// Lit largeur/hauteur en pixels depuis l'en-tête PNG (octets 16-23, big-endian)
function getPngDimensions(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function monthsUntilExpiry(expiryStr: string | null, dateRef: Date): number | null {
  if (!expiryStr) return null;
  const expiry = new Date(expiryStr);
  if (isNaN(expiry.getTime())) return null;
  return (expiry.getTime() - dateRef.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function computeDisplayStatut(e: StockRow, dateRef?: Date | null): DisplayStatut {
  const centrale = e.stockCentrale != null ? Number(e.stockCentrale) : null;
  const peri     = e.stockPeripherique != null ? Number(e.stockPeripherique) : null;
  const national = e.stockNational != null ? Number(e.stockNational) : null;
  const msd      = toMsdFloat(e.stockCentralMsd);

  const stockNat = national ?? ((centrale ?? 0) + (peri ?? 0));

  // 1. Rupture pays : stock national nul
  if (stockNat === 0) return 'RUPTURE_PAYS';
  // 2. Rupture centrale : stock central = 0, périphérique > 0
  if (centrale !== null && centrale === 0 && (peri ?? 0) > 0) return 'RUPTURE_CENTRALE';

  // 3. Péremption < 3 mois (absolue)
  if (dateRef != null) {
    const expiryMonths = [
      monthsUntilExpiry(e.datePeremptionCentrale, dateRef),
      monthsUntilExpiry(e.datePeremptionPeripherie, dateRef),
    ].filter((m): m is number => m !== null);
    if (expiryMonths.length > 0 && Math.min(...expiryMonths) < 3) return 'PEREMPTION_PROCHE';
  }

  // 4. Risque élevé : MSD ≤ 5
  if (msd !== null && msd <= 5) return 'RISQUE_ELEVE';

  // 5. Surstock : MSD > 12
  if (msd !== null && msd > 12) return 'SURSTOCK';

  // 6. Bon stockage : 5 < MSD ≤ 12
  return 'BON_STOCKAGE';
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class BriefService {
  private readonly logger = new Logger(BriefService.name);

  constructor(private prisma: PrismaService) {}

  private checkRole(roles: Role[]) {
    const allowed: Role[] = [Role.super_admin, Role.admin_system, Role.chief_of_party];
    if (!roles.some(r => allowed.includes(r))) {
      throw new ForbiddenException('Génération réservée au COP et aux administrateurs');
    }
  }

  // ── Data consolidation ──────────────────────────────────────────────────────

  async consolidate(semaineId: string): Promise<BriefData> {
    const week = await this.prisma.week.findUnique({ where: { id: semaineId } });
    if (!week) throw new NotFoundException(`Semaine introuvable : ${semaineId}`);

    const weekStart = new Date(week.weekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(week.weekEnd);
    weekEnd.setHours(23, 59, 59, 999);

    // Stock (linked by weekStart date)
    const stocks = await this.prisma.stockEntry.findMany({
      where: { semaine: weekStart },
      orderBy: [{ programme: 'asc' }, { sousCategorie: 'asc' }, { denomination: 'asc' }],
    });

    if (stocks.length === 0) {
      throw new NotFoundException(
        `Aucun état de stock trouvé pour la semaine ${week.weekReference}. ` +
        `Importez d'abord l'état de stock via la page "Importer État de stock".`
      );
    }
    this.logger.log(`[Brief] Stock: ${stocks.length} entrées — semaine ${week.weekReference}`);

    // dateEtatStock = max dateEtatStock des entrées
    const dateEtatStock = (stocks as any[]).reduce((max: Date | null, e: any) => {
      if (!e.dateEtatStock) return max;
      const d = new Date(e.dateEtatStock);
      return !max || d > max ? d : max;
    }, null) as Date | null;

    // Group stock by programme > sousCategorie
    const stockGrouped: Record<string, Record<string, StockRow[]>> = {};
    for (const e of stocks as any[]) {
      if (!stockGrouped[e.programme]) stockGrouped[e.programme] = {};
      if (!stockGrouped[e.programme][e.sousCategorie]) stockGrouped[e.programme][e.sousCategorie] = [];
      stockGrouped[e.programme][e.sousCategorie].push(e);
    }

    // Submissions
    const subs = await this.prisma.entitySubmission.findMany({
      where: { weekId: semaineId, status: 'submitted' },
      include: {
        activities:        { orderBy: { orderIndex: 'asc' } },
        plannedActivities: { orderBy: { orderIndex: 'asc' } },
        riskPoints:        { orderBy: [{ criticality: 'desc' }, { orderIndex: 'asc' }] },
      },
    });
    this.logger.log(`[Brief] Submissions: ${subs.length} entités soumises`);

    const submissions: SubmissionData[] = subs.map(s => ({
      entityCode: s.entityCode,
      activities: s.activities.map(a => ({
        title:           a.title,
        objectives:      a.objectives,
        location:        a.location,
        dates:           a.dates,
        startDate:       a.startDate,
        endDate:         a.endDate,
        recommendations: a.recommendations,
      })),
      plannedActivities: s.plannedActivities.map(a => ({
        title:            a.title,
        location:         a.location,
        plannedDates:     a.plannedDates,
        startDate:        a.startDate,
        endDate:          a.endDate,
        dosParticipation: a.dosParticipation as string | null,
        observations:     a.observations,
      })),
      riskPoints: s.riskPoints.map(r => ({
        entityCode:     s.entityCode,
        theme:          r.theme,
        category:       r.category,
        description:    r.description,
        criticality:    r.criticality as string | null,
        expectedAction: r.expectedAction,
      })),
    }));

    const riskPoints: RiskPointRow[] = submissions
      .flatMap(s => s.riskPoints)
      .sort((a, b) =>
        (CRITICALITY_ORDER[b.criticality ?? 'faible'] ?? 0) -
        (CRITICALITY_ORDER[a.criticality ?? 'faible'] ?? 0)
      );

    this.logger.log(`[Brief] Activités B: ${submissions.reduce((n, s) => n + s.activities.length, 0)}`);
    this.logger.log(`[Brief] Activités C: ${submissions.reduce((n, s) => n + s.plannedActivities.length, 0)}`);
    this.logger.log(`[Brief] Risques D: ${riskPoints.length}`);

    return {
      week: { id: week.id, weekStart, weekEnd, weekReference: week.weekReference },
      stocks:       stocks as any,
      stockGrouped,
      dateEtatStock,
      submissions,
      riskPoints,
    };
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  async preview(semaineId: string): Promise<any> {
    const data = await this.consolidate(semaineId);
    return {
      semaineId,
      semaineLabel: buildSemaineLabel(data.week.weekStart, data.week.weekEnd),
      completness: {
        sectionA: { count: data.stocks.length, ok: data.stocks.length > 0 },
        sectionB: {
          count: data.submissions.reduce((n, s) => n + s.activities.filter(a => a.objectives || a.recommendations).length, 0),
          composantes: data.submissions.filter(s => s.activities.some(a => a.objectives || a.recommendations)).length,
          ok: data.submissions.some(s => s.activities.some(a => a.objectives || a.recommendations)),
        },
        sectionC: {
          count: data.submissions.reduce((n, s) => n + s.plannedActivities.length, 0),
          composantes: data.submissions.filter(s => s.plannedActivities.length > 0).length,
          ok: data.submissions.some(s => s.plannedActivities.length > 0),
        },
        sectionD: {
          count: data.riskPoints.length,
          eleve: data.riskPoints.filter(r => ['critique', 'eleve'].includes(r.criticality ?? '')).length,
          ok: true,
        },
      },
      data: {
        sectionA: {
          dateEtatStock: data.dateEtatStock ?? data.week.weekEnd,
          stocks: (data.stocks as any[]).map(e => ({
            id:                       e.id,
            programme:                e.programme,
            sousCategorie:            e.sousCategorie,
            denomination:             e.denomination,
            stockCentrale:            e.stockCentrale,
            stockPeripherique:        e.stockPeripherique,
            stockNational:            e.stockNational,
            stockCentralMsd:          e.stockCentralMsd,
            cmm:                      e.cmm,
            datePeremptionCentrale:   e.datePeremptionCentrale,
            datePeremptionPeripherie: e.datePeremptionPeripherie,
            commentaire:              e.commentaire,
            statutStock:              e.statutStock,
            statutAffiche:            computeDisplayStatut(e, data.dateEtatStock ?? data.week.weekEnd),
          })),
        },
        sectionB: {
          composantes: data.submissions
            .filter(s => s.activities.some(a => a.recommendations?.trim()))
            .map(s => ({
              code: s.entityCode,
              activities: s.activities
                .filter(a => a.recommendations?.trim())
                .map(a => ({
                  title:           a.title,
                  location:        a.location,
                  startDate:       a.startDate,
                  endDate:         a.endDate,
                  recommendations: a.recommendations,
                })),
            })),
        },
        sectionC: {
          dosRequired: data.submissions.some(s => s.plannedActivities.some(a => a.dosParticipation === 'oui')),
          composantes: data.submissions
            .filter(s => s.plannedActivities.length > 0)
            .map(s => ({
              code: s.entityCode,
              activities: s.plannedActivities.map(a => ({
                title:            a.title,
                location:         a.location,
                startDate:        a.startDate,
                endDate:          a.endDate,
                dosParticipation: a.dosParticipation,
                observations:     a.observations,
              })),
            })),
        },
        sectionD: {
          alerts: data.riskPoints.map(r => ({
            entityCode:     r.entityCode,
            theme:          r.theme,
            category:       r.category,
            description:    r.description,
            criticality:    r.criticality,
            expectedAction: r.expectedAction,
          })),
        },
      },
    };
  }

  // ── Generate DOCX ────────────────────────────────────────────────────────────

  async generateDocx(semaineId: string, userId: string, roles: Role[]): Promise<Buffer> {
    this.checkRole(roles);
    const data = await this.consolidate(semaineId);

    // Charger le draft LLM
    const draft = await this.prisma.briefDraft.findFirst({
      where: { semaineId },
      orderBy: { generatedAt: 'desc' },
    });

    // Si le draft est validé et qu'un brief non archivé existe déjà pour cette semaine
    // → retourner le fichier existant sans régénérer (idempotence)
    const existingEntry = await this.prisma.briefHistory.findFirst({
      where: { semaineRapportage: data.week.weekStart, archived: false },
      orderBy: { dateGeneration: 'desc' },
    });
    if (draft?.validated && existingEntry && fs.existsSync(existingEntry.cheminFichier)) {
      this.logger.log('[Brief] Draft validé — retour du brief existant sans régénération');
      return fs.readFileSync(existingEntry.cheminFichier);
    }

    if (draft) {
      this.logger.log(`[Brief] Draft LLM chargé (${draft.llmModel}, validé=${draft.validated})`);
    } else {
      this.logger.log('[Brief] Aucun draft LLM — sections B/C/D déterministes');
    }

    let timelinePng: Buffer | undefined;
    try {
      timelinePng = await this.buildTimelinePng(data);
      this.logger.log('[Brief] Timeline PNG généré');
    } catch (err) {
      this.logger.warn(`[Brief] Timeline PNG ignoré (fallback table texte) : ${err.message}`);
    }

    const buffer = await this.buildDocx(data, timelinePng, draft);

    // Archiver l'entrée précédente si elle existe
    if (existingEntry) {
      await this.prisma.briefHistory.update({ where: { id: existingEntry.id }, data: { archived: true } });
    }

    // Sauvegarder le DOCX et créer l'entrée d'historique
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const fileName = `brief_${data.week.weekStart.toISOString().slice(0, 10)}_${Date.now()}.docx`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    await this.prisma.briefHistory.create({
      data: {
        semaineRapportage: data.week.weekStart,
        generePar:         userId,
        hashContenu:       hash,
        cheminFichier:     filePath,
      },
    });

    this.logger.log(`[Brief] DOCX généré et archivé — ${data.stocks.length} produits, semaine ${data.week.weekReference}`);
    return buffer;
  }

  // ── Generate PDF (for history) ────────────────────────────────────────────────

  async generatePdf(semaineId: string, userId: string, roles: Role[], force = false): Promise<Buffer> {
    this.checkRole(roles);
    const data = await this.consolidate(semaineId);

    const existing = await this.prisma.briefHistory.findFirst({
      where: { semaineRapportage: data.week.weekStart, archived: false },
    });
    if (existing && !force) {
      throw new BadRequestException(
        `Un brief existe déjà pour la semaine ${data.week.weekReference}. Confirmez avec ?force=true`
      );
    }
    if (existing) {
      await this.prisma.briefHistory.update({ where: { id: existing.id }, data: { archived: true } });
    }

    const pdfBuffer = await this.buildPdf(data);

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const fileName = `brief_${data.week.weekStart.toISOString().slice(0, 10)}_${Date.now()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    await this.prisma.briefHistory.create({
      data: {
        semaineRapportage: data.week.weekStart,
        generePar:         userId,
        hashContenu:       hash,
        cheminFichier:     filePath,
      },
    });
    return pdfBuffer;
  }

  async getHistory() {
    const histories = await this.prisma.briefHistory.findMany({
      orderBy: { semaineRapportage: 'desc' },
      include: { genereParUser: { select: { firstName: true, lastName: true } } },
    });
    return histories.map(h => ({
      ...h,
      format: h.cheminFichier.endsWith('.docx') ? 'docx' : 'pdf',
    }));
  }

  async downloadBriefFile(id: string): Promise<{ buffer: Buffer; filename: string; mime: string }> {
    const h = await this.prisma.briefHistory.findUnique({ where: { id } });
    if (!h) throw new NotFoundException('Brief introuvable');
    if (!fs.existsSync(h.cheminFichier)) throw new NotFoundException('Fichier introuvable sur le serveur');
    const isDocx = h.cheminFichier.endsWith('.docx');
    return {
      buffer:   fs.readFileSync(h.cheminFichier),
      filename: path.basename(h.cheminFichier),
      mime:     isDocx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    };
  }

  // ── LLM Section Generation ────────────────────────────────────────────────

  async generateLlmSections(
    semaineId: string,
    userId: string,
    roles: Role[],
    llmService: any,
  ) {
    this.checkRole(roles);
    const data = await this.consolidate(semaineId);

    const input = {
      semaineLabel: buildSemaineLabel(data.week.weekStart, data.week.weekEnd),
      submissions: data.submissions.map(s => ({
        entityCode: s.entityCode,
        activities: s.activities,
        plannedActivities: s.plannedActivities,
      })),
      riskPoints: data.riskPoints,
    };

    const sections = await llmService.generateSections(input);

    // Archiver le draft précédent si existant
    const existing = await this.prisma.briefDraft.findFirst({
      where: { semaineId },
    });
    if (existing) {
      await this.prisma.briefDraft.delete({ where: { id: existing.id } });
    }

    return this.prisma.briefDraft.create({
      data: {
        semaineId,
        sectionB:    sections.sectionB,
        sectionC:    sections.sectionC,
        sectionD:    sections.sectionD,
        llmModel:    sections.llmModel,
        generatedBy: userId,
        validated:   false,
      },
    });
  }

  async getDraft(semaineId: string) {
    return this.prisma.briefDraft.findFirst({
      where: { semaineId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async updateDraft(id: string, body: { sectionB?: string; sectionC?: string; sectionD?: string; validated?: boolean }) {
    return this.prisma.briefDraft.update({
      where: { id },
      data: body,
    });
  }

  // ── Timeline PNG (Python subprocess) ────────────────────────────────────────

  async generateTimelinePng(semaineId: string): Promise<Buffer> {
    const data = await this.consolidate(semaineId);
    return this.buildTimelinePng(data);
  }

  private async buildTimelinePng(data: BriefData): Promise<Buffer> {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_timeline_chart.py');
    if (!fs.existsSync(scriptPath)) {
      throw new BadRequestException(`Script introuvable : ${scriptPath}`);
    }

    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-'));
    const jsonPath = path.join(tmpDir, 'brief_data.json');
    const pngPath  = path.join(tmpDir, 'timeline.png');

    // Construire le payload JSON identique au format attendu par le script Python
    const payload = {
      semaineLabel: buildSemaineLabel(data.week.weekStart, data.week.weekEnd),
      data: {
        sectionA: {
          dateEtatStock: (data.dateEtatStock ?? data.week.weekEnd).toISOString(),
          stocks: (data.stocks as any[]).map(e => ({
            denomination:      e.denomination,
            programme:         e.programme,
            sousCategorie:     e.sousCategorie,
            statutAffiche:     computeDisplayStatut(e, data.dateEtatStock ?? data.week.weekEnd),
            cmm:               e.cmm != null ? parseFloat(e.cmm.toString()) : null,
            stockCentrale:     e.stockCentrale != null ? Number(e.stockCentrale) : null,
            stockPeripherique: e.stockPeripherique != null ? Number(e.stockPeripherique) : null,
            stockNational:     e.stockNational != null ? Number(e.stockNational) : null,
            stockCentralMsd:   e.stockCentralMsd != null ? parseFloat(e.stockCentralMsd.toString()) : null,
            commentaire:       e.commentaire ?? null,
          })),
        },
      },
    };

    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', [scriptPath, jsonPath, '--out', pngPath], {
        windowsHide: true,
      });
      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`generate_timeline_chart.py exited ${code}:\n${stderr}`));
      });
    });

    if (!fs.existsSync(pngPath)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw new BadRequestException('Le script Python n\'a produit aucun fichier PNG');
    }

    const pngBuffer = fs.readFileSync(pngPath);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return pngBuffer;
  }

  // ── DOCX Builder ─────────────────────────────────────────────────────────────

  private async buildDocx(data: BriefData, timelinePng?: Buffer, draft?: { sectionB: string; sectionC: string; sectionD: string } | null): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const D = require('docx');
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      Header, Footer, AlignmentType, ShadingType, WidthType, BorderStyle,
      PageBreak, PageNumber, UnderlineType,
    } = D;

    const semaineLabel   = buildSemaineLabel(data.week.weekStart, data.week.weekEnd);
    const dateEtat       = data.dateEtatStock ?? data.week.weekEnd;
    const dateEtatStr    = fmtDate(dateEtat);
    const finMoisPrec    = getFinMoisPrecedent(dateEtat);

    // Layout constants (twips, 1 twip = 1/1440 in)
    // A4 portrait: 11906 × 16838 twips — margins 2cm/2.5cm → inner width 9072 twips
    const PW = 9072;

    // ── micro helpers ───────────────────────────────────────────────────────

    const pt  = (n: number) => n * 2;   // half-points
    const cm  = (c: number) => Math.round(c * 567); // twips

    const noFill   = { fill: 'auto', type: ShadingType.CLEAR, color: 'auto' };
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
    const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' };
    const stdBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    const headerBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    const spacer = (b = 80, a = 80) => new Paragraph({ text: '', spacing: { before: b, after: a } });

    function mkCell(
      text: string,
      opts: {
        fill?: string; bold?: boolean; color?: string; size?: number; width?: number;
        align?: any; italic?: boolean; borders?: any; vMerge?: boolean; rowSpan?: number;
      } = {}
    ): any {
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: text ?? '—',
            bold: !!opts.bold,
            italics: !!opts.italic,
            color: opts.color ?? '000000',
            size: opts.size ?? pt(9),
            font: 'Calibri',
          })],
          alignment: opts.align ?? AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
        })],
        shading: opts.fill
          ? { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' }
          : noFill,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        margins: { top: 50, bottom: 50, left: 80, right: 80 },
        borders: opts.borders ?? stdBorders,
      });
    }

    function hCell(text: string, width?: number, align = AlignmentType.CENTER): any {
      return mkCell(text, {
        fill: 'D9D9D9', bold: true, size: pt(9), width, align, borders: headerBorders,
      });
    }

    // Section banner (A, B, C, D)
    function sectionBanner(letter: string, title: string): any {
      return new Paragraph({
        children: [new TextRun({
          text: `${letter}. ${title}`,
          bold: true,
          color: '1F4E79',
          size: pt(14),
          font: 'Calibri',
          allCaps: true,
        })],
        spacing: { before: 320, after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F4E79' },
        },
      });
    }

    // Entity title (Section B/C)
    function entityTitle(code: string): any {
      const fullName = ENTITY_LABELS[code] ?? code;
      return new Paragraph({
        children: [new TextRun({
          text: `${code} — ${fullName}`,
          bold: true, size: pt(12), font: 'Calibri', color: '1F4E79',
        })],
        spacing: { before: 200, after: 80 },
      });
    }

    function bullet(text: string): any {
      return new Paragraph({
        children: [new TextRun({ text: text.trim(), size: pt(10), font: 'Calibri' })],
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      });
    }

    // ── Tableau de bord (résumé programme × statut) ───────────────────────

    const SUMMARY_DISPLAY_COLS: Array<{ label: string; key: DisplayStatut }> = [
      { label: 'Rupture pays',     key: 'RUPTURE_PAYS' },
      { label: 'Rupture centrale', key: 'RUPTURE_CENTRALE' },
      { label: 'Risque élevé',     key: 'RISQUE_ELEVE' },
      { label: 'Bon stockage',     key: 'BON_STOCKAGE' },
      { label: 'Surstock',         key: 'SURSTOCK' },
    ];

    function buildSummaryTable(): any {
      const programmes = Object.keys(data.stockGrouped).sort();
      const COL_PROG = cm(3);
      const COL_STAT = Math.floor((PW - COL_PROG) / (SUMMARY_DISPLAY_COLS.length + 1));

      // Count by programme and computed display statut
      // PEREMPTION_PROCHE regroupe sous RISQUE_ELEVE dans le tableau de bord (légende: "Risque élevé = MSD ≤ 5 ou péremption < 3 mois")
      const raw: Record<string, Record<string, number>> = { TOTAL: {} };
      for (const prog of programmes) raw[prog] = {};
      for (const e of data.stocks as any[]) {
        const p = e.programme as string;
        const ds = computeDisplayStatut(e, dateEtat);
        const dsCount: DisplayStatut = ds === 'PEREMPTION_PROCHE' ? 'RISQUE_ELEVE' : ds;
        raw[p][dsCount] = (raw[p][dsCount] ?? 0) + 1;
        raw['TOTAL'][dsCount] = (raw['TOTAL'][dsCount] ?? 0) + 1;
      }

      const headerRow = new TableRow({
        children: [
          hCell('Programme', COL_PROG, AlignmentType.LEFT),
          ...SUMMARY_DISPLAY_COLS.map(c => hCell(c.label, COL_STAT)),
          hCell('Total', COL_STAT),
        ],
        tableHeader: true,
      });

      const makeRow = (key: string, label: string, isTotal = false) => {
        const bg = isTotal ? 'F2F2F2' : 'FFFFFF';
        const bucket = raw[key] ?? {};
        const rowTotal = Object.values(bucket).reduce((s, v) => s + v, 0);
        return new TableRow({
          children: [
            mkCell(label, { fill: bg, bold: isTotal, size: pt(9), width: COL_PROG }),
            ...SUMMARY_DISPLAY_COLS.map(col => {
              const v = bucket[col.key] ?? 0;
              return mkCell(v > 0 ? String(v) : '—', {
                fill: bg, bold: isTotal, size: pt(9), width: COL_STAT, align: AlignmentType.CENTER,
              });
            }),
            mkCell(String(rowTotal), {
              fill: bg, bold: true, size: pt(9), width: COL_STAT, align: AlignmentType.CENTER,
            }),
          ],
        });
      };

      return new Table({
        width: { size: PW, type: WidthType.DXA },
        rows: [
          headerRow,
          ...programmes.map(p => makeRow(p, p)),
          makeRow('TOTAL', 'TOTAL', true),
        ],
      });
    }

    // ── Timeline Gantt ────────────────────────────────────────────────────

    function buildTimeline(): any[] {
      const criticals = (data.stocks as any[]).filter(e =>
        ['RUPTURE_PAYS', 'RUPTURE_CENTRALE', 'PEREMPTION_PROCHE', 'RISQUE_ELEVE'].includes(computeDisplayStatut(e, dateEtat))
      );
      if (criticals.length === 0) return [];

      // 6-month horizon: month AFTER dateEtatStock
      const horizonMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(dateEtat.getFullYear(), dateEtat.getMonth() + 1 + i, 1);
        return {
          month:  d.getMonth(),
          year:   d.getFullYear(),
          label:  `${capitalize(FR_MONTHS_SHORT[d.getMonth()])} ${d.getFullYear()}`,
          longLabel: FR_MONTHS_LONG[d.getMonth()],
        };
      });

      const moisDebut = capitalize(FR_MONTHS_LONG[horizonMonths[0].month]);
      const moisFin   = capitalize(FR_MONTHS_LONG[horizonMonths[5].month]);
      const annee     = horizonMonths[0].year;

      const PROD_W  = cm(5.5);
      const MONTH_W = Math.floor((PW - PROD_W) / 6);

      function timelineColor(msd: number | null, monthsAhead: number): string {
        if (msd === null) return 'EDEDED';
        const residual = msd - monthsAhead;
        if (residual < 2) return 'C00000';
        if (residual <= 5) return 'FFCC00';
        return 'E2EFDA';
      }

      function hasDeliveryInMonth(commentaire: string | null, monthLong: string): boolean {
        if (!commentaire) return false;
        return new RegExp(monthLong, 'i').test(commentaire);
      }

      // Build rows grouped by programme
      const rows: any[] = [];
      const headerRow = new TableRow({
        children: [
          hCell('Produit', PROD_W, AlignmentType.LEFT),
          ...horizonMonths.map(m => hCell(m.label, MONTH_W)),
        ],
        tableHeader: true,
      });
      rows.push(headerRow);

      const byProg: Record<string, StockRow[]> = {};
      for (const e of criticals) {
        if (!byProg[e.programme]) byProg[e.programme] = [];
        byProg[e.programme].push(e);
      }

      for (const [prog, entries] of Object.entries(byProg)) {
        // Programme separator
        rows.push(new TableRow({
          children: [new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: `${prog} — ${PROG_LABELS[prog] ?? prog}`,
                bold: true, size: pt(8), font: 'Calibri', color: '1F4E79',
              })],
              spacing: { before: 40, after: 40 },
            })],
            columnSpan: 7,
            shading: { fill: 'D9D9D9', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            borders: noBorders,
          })],
        }));

        for (const e of entries) {
          const msd = toMsdFloat(e.stockCentralMsd);
          const monthCells = horizonMonths.map((hm, i) => {
            const bg = timelineColor(msd, i + 1);
            const delivery = hasDeliveryInMonth(e.commentaire, hm.longLabel);
            const symbol = delivery ? '↑' : '';
            const textColor = bg === 'C00000' ? 'FFFFFF'
              : bg === 'FFCC00' ? '7B5E00'
              : bg === 'E2EFDA' ? '375623'
              : '595959';
            return mkCell(symbol, {
              fill: bg, color: textColor, size: pt(9), width: MONTH_W,
              align: AlignmentType.CENTER,
            });
          });
          rows.push(new TableRow({
            children: [
              mkCell(e.denomination, { size: pt(8), width: PROD_W }),
              ...monthCells,
            ],
          }));
        }
      }

      return [
        new Paragraph({
          children: [new TextRun({
            text: 'Timeline du risque de rupture nationale — Stock central + Stock périphérique',
            bold: true, size: pt(11), font: 'Calibri', color: '1F4E79',
          })],
          spacing: { before: 200, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({
            text: `Horizon ${moisDebut}–${moisFin} ${annee}  |  ▌ = ${dateEtatStr}  |  Stock périphérique = fin ${finMoisPrec}`,
            italics: true, size: pt(9), font: 'Calibri', color: '595959',
          })],
          spacing: { before: 0, after: 80 },
        }),
        new Table({ width: { size: PW, type: WidthType.DXA }, rows }),
      ];
    }

    // ── Stock detail table ───────────────────────────────────────────────

    function buildStockTable(entries: StockRow[]): any {
      const W = [cm(3.5), cm(3), cm(1.5), cm(2.5), cm(2.5)];
      const wComment = Math.max(PW - W.reduce((s, w) => s + w, 0), cm(2));

      const headerRow = new TableRow({
        children: [
          'Produit', 'Statut', 'MSD', 'SDU', 'DMM/CMM', 'Prochaine entrée / commentaires',
        ].map((h, i) => hCell(h, i < 5 ? W[i] : wComment)),
        tableHeader: true,
      });

      const dataRows = entries.map((e, idx) => {
        const alt = idx % 2 === 1;
        const bg  = alt ? 'F5F9FF' : 'FFFFFF';
        const ds  = computeDisplayStatut(e, dateEtat);
        const sc  = DISPLAY_STYLES[ds];
        const lbl = DISPLAY_LABELS[ds];
        const cmm = e.cmm != null
          ? parseFloat(e.cmm.toString()).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
          : '—';

        return new TableRow({
          children: [
            mkCell(e.denomination,        { fill: bg, size: pt(9), width: W[0] }),
            mkCell(lbl, { fill: sc.bg, color: sc.font, bold: true, size: pt(9), width: W[1], align: AlignmentType.CENTER }),
            mkCell(fmtMsd(e.stockCentralMsd), { fill: bg, size: pt(9), width: W[2], align: AlignmentType.CENTER }),
            mkCell(computeSdu(e),         { fill: bg, size: pt(9), width: W[3], align: AlignmentType.RIGHT }),
            mkCell(cmm,                   { fill: bg, size: pt(9), width: W[4], align: AlignmentType.CENTER }),
            mkCell(e.commentaire || '—',  { fill: bg, size: pt(8), width: wComment }),
          ],
        });
      });

      return new Table({ width: { size: PW, type: WidthType.DXA }, rows: [headerRow, ...dataRows] });
    }

    function stockNote(): any {
      return new Paragraph({
        children: [new TextRun({
          text: 'SDU = Stock Disponible et Utilisable  |  DMM = Dose Mensuelle Moyenne  |  ' +
                'MSD = Mois de Stock Disponible  |  Stock périphérique = fin mois précédent',
          italics: true, size: pt(8), font: 'Calibri', color: '595959',
        })],
        spacing: { before: 40, after: 100 },
      });
    }

    // ── Programme header ─────────────────────────────────────────────────

    function progHeader(prog: string, counts: Record<string, number>): any {
      const parts = [
        counts['RUPTURE_PAYS']     ? `${counts['RUPTURE_PAYS']} Rupture${counts['RUPTURE_PAYS'] > 1 ? 's' : ''} pays` : '',
        counts['RUPTURE_CENTRALE'] ? `${counts['RUPTURE_CENTRALE']} Rupture${counts['RUPTURE_CENTRALE'] > 1 ? 's' : ''} centrale` : '',
        counts['RISQUE_ELEVE']     ? `${counts['RISQUE_ELEVE']} Risque${counts['RISQUE_ELEVE'] > 1 ? 's' : ''} élevé` : '',
        counts['BON_STOCKAGE']     ? `${counts['BON_STOCKAGE']} Bon stockage` : '',
        counts['SURSTOCK']         ? `${counts['SURSTOCK']} Surstock` : '',
      ].filter(Boolean).join('   ');

      return new Table({
        width: { size: PW, type: WidthType.DXA },
        rows: [new TableRow({ children: [new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({
                text: `${prog} — ${PROG_LABELS[prog] ?? prog}`,
                bold: true, size: pt(13), font: 'Calibri', color: '1F4E79',
              })],
              spacing: { before: 40, after: 20 },
            }),
            ...(parts ? [new Paragraph({
              children: [new TextRun({ text: parts, size: pt(9), font: 'Calibri', color: '595959' })],
              spacing: { before: 0, after: 40 },
            })] : []),
          ],
          shading: { fill: 'D9D9D9', type: ShadingType.CLEAR, color: 'auto' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          borders: noBorders,
        })] })],
        borders: noBorders,
        spacing: { before: 200, after: 60 },
      });
    }

    // ── LLM text → DOCX paragraphs ──────────────────────────────────────

    const CRIT_COLORS: Record<string, string> = {
      'CRITIQUE': 'C00000', 'ÉLEVÉ': 'E97132', 'ELEVE': 'E97132',
      'MODÉRÉ': 'FFC000',  'MODERE': 'FFC000', 'FAIBLE': '70AD47',
    };

    function buildLlmSection(text: string, isD = false): any[] {
      const out: any[] = [];
      // Blocs séparés par double saut de ligne
      const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Sous-titre spécial DoS (Section C)
          if (line.startsWith('ACTIVITÉS AVEC PARTICIPATION')) {
            out.push(new Paragraph({
              children: [new TextRun({
                text: line, bold: true, size: pt(11), font: 'Calibri', color: '1565C0',
              })],
              spacing: { before: 160, after: 80 },
            }));
            continue;
          }

          // En-tête de composante — ligne courte de forme "XXX — Nom complet"
          const isEntityHeader = i === 0 && !isD && /^[A-Z]{2,4}\s*—/.test(line);
          if (isEntityHeader) {
            out.push(new Paragraph({
              children: [new TextRun({
                text: line, bold: true, size: pt(12), font: 'Calibri', color: '1F4E79',
              })],
              spacing: { before: 200, after: 60 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1F4E79' } },
            }));
            continue;
          }

          // Ligne de criticité (Section D) : "ÉLEVÉ — description"
          const critMatch = isD && line.match(/^(CRITIQUE|ÉLEVÉ|ELEVE|MODÉRÉ|MODERE|FAIBLE)\s*—\s*(.+)/i);
          if (critMatch) {
            const lvl = critMatch[1].toUpperCase().normalize('NFD').replace(/\p{M}/gu, '');
            const col = CRIT_COLORS[critMatch[1].toUpperCase()] ?? '333333';
            out.push(new Paragraph({
              children: [
                new TextRun({ text: `${critMatch[1].toUpperCase()} — `, bold: true, color: col, size: pt(11), font: 'Calibri' }),
                new TextRun({ text: critMatch[2], size: pt(10), font: 'Calibri' }),
              ],
              spacing: { before: 120, after: 40 },
            }));
            continue;
          }

          // Ligne action requise : "→ Action requise : ..."
          if (line.startsWith('→')) {
            out.push(new Paragraph({
              children: [new TextRun({
                text: line, size: pt(10), font: 'Calibri', color: '333333', italics: true,
              })],
              indent: { left: 360 },
              spacing: { before: 20, after: 100 },
            }));
            continue;
          }

          // Ligne normale (narration, activité, bullet)
          out.push(new Paragraph({
            children: [new TextRun({ text: line, size: pt(10), font: 'Calibri' })],
            spacing: { before: 40, after: 40 },
          }));
        }
      }
      return out;
    }

    // ── Document content ─────────────────────────────────────────────────

    const children: any[] = [];

    // TITLE BLOCK
    children.push(new Paragraph({
      children: [new TextRun({
        text: 'LHSPLA — LOCAL HEALTH SUPPLIES PROCUREMENT AND LOGISTICS ACTIVITY',
        bold: true, size: pt(16), font: 'Calibri', color: '1F4E79',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'WEEKLY OPERATIONS BRIEF', bold: true, size: pt(14), font: 'Calibri', color: '1F4E79' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `Semaine du ${semaineLabel}`, italics: true, size: pt(11), font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: 'DoS  |  Nouvelle PSP-CI  |  Accord de coopération N° 72062418CA00005',
        size: pt(10), font: 'Calibri', color: '595959',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
    }));

    // ── SECTION A ───────────────────────────────────────────────────────
    children.push(sectionBanner('A', `ÉTAT DU STOCK — ${dateEtatStr}`));
    children.push(new Paragraph({
      children: [new TextRun({
        text: `Situation au ${dateEtatStr}  |  Source : Nouvelle PSP-CI / DPAS`,
        italics: true, size: pt(9), font: 'Calibri', color: '595959',
      })],
      spacing: { before: 40, after: 120 },
    }));

    // Tableau de bord
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Tableau de bord par programme', bold: true, size: pt(10), font: 'Calibri' })],
      spacing: { before: 0, after: 60 },
    }));
    children.push(buildSummaryTable());
    children.push(new Paragraph({
      children: [new TextRun({
        text: 'Légende : RUPTURE PAYS = stock national nul  |  Rupture centrale = stock central = 0, périphérique > 0  |  Risque élevé = MSD ≤ 5 ou péremption < 3 mois',
        italics: true, size: pt(8), font: 'Calibri', color: '595959',
      })],
      spacing: { before: 60, after: 160 },
    }));

    // Timeline — PNG généré par Python si disponible, sinon table texte fallback
    if (timelinePng && timelinePng.length > 0) {
      const { width: pxW, height: pxH } = getPngDimensions(timelinePng);
      const docWidthPx = 605; // ~6.3 pouces à 96 DPI = largeur page A4 moins marges
      const docHeightPx = Math.round((docWidthPx / pxW) * pxH);
      children.push(new Paragraph({
        children: [new D.ImageRun({
          data: timelinePng,
          transformation: { width: docWidthPx, height: docHeightPx },
          type: 'png',
        })],
        spacing: { before: 120, after: 120 },
      }));
    } else {
      children.push(...buildTimeline());
    }
    children.push(spacer(80, 80));

    // Tableaux détaillés
    const progOrder = ['PNLS', 'PNLP', 'PNSME'];
    const sortedProgs = [
      ...progOrder.filter(p => data.stockGrouped[p]),
      ...Object.keys(data.stockGrouped).filter(p => !progOrder.includes(p)).sort(),
    ];

    for (const prog of sortedProgs) {
      const sousCategories = data.stockGrouped[prog];
      const progEntries = data.stocks as any[];
      const progCounts: Record<string, number> = {};
      for (const e of progEntries.filter(e => e.programme === prog)) {
        const ds = computeDisplayStatut(e, dateEtat);
        const dsCount: DisplayStatut = ds === 'PEREMPTION_PROCHE' ? 'RISQUE_ELEVE' : ds;
        progCounts[dsCount] = (progCounts[dsCount] ?? 0) + 1;
      }

      children.push(progHeader(prog, progCounts));

      for (const [sousCat, entries] of Object.entries(sousCategories)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: sousCat, bold: true, size: pt(11), font: 'Calibri' })],
          spacing: { before: 120, after: 60 },
        }));
        children.push(buildStockTable(entries));
        children.push(stockNote());
      }
    }

    // ── SECTION B ───────────────────────────────────────────────────────
    children.push(sectionBanner('B', `ACTIVITÉS RÉALISÉES — SEMAINE DU ${semaineLabel.toUpperCase()}`));

    if (draft?.sectionB?.trim()) {
      // Source LLM
      children.push(...buildLlmSection(draft.sectionB));
    } else {
      // Fallback déterministe
      const sectionBSubs = data.submissions.filter(s =>
        s.activities.some(a => a.recommendations?.trim())
      );
      if (sectionBSubs.length === 0) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: 'Aucune activité réalisée soumise pour cette semaine.',
            italics: true, size: pt(10), font: 'Calibri', color: '595959',
          })],
        }));
      } else {
        for (const sub of sectionBSubs) {
          children.push(entityTitle(sub.entityCode));
          for (const act of sub.activities) {
            if (!act.recommendations?.trim()) continue;
            if (act.title) {
              const dateStr = fmtDateRange(act.startDate, act.endDate);
              const locDate = [act.location, dateStr].filter(Boolean).join(' — ');
              const titleText = locDate ? `${act.title}  (${locDate})` : act.title;
              children.push(new Paragraph({
                children: [new TextRun({ text: titleText, bold: true, italics: true, size: pt(11), font: 'Calibri' })],
                spacing: { before: 80, after: 40 },
              }));
            }
            const lines = act.recommendations.split('\n').filter(l => l.trim());
            for (const line of lines) children.push(bullet(line));
          }
        }
      }
    }

    // ── SECTION C ───────────────────────────────────────────────────────
    children.push(sectionBanner('C', 'ACTIVITÉS PLANIFIÉES — MOIS GLISSANT'));

    if (draft?.sectionC?.trim()) {
      // Source LLM
      children.push(...buildLlmSection(draft.sectionC));
    } else {
      // Fallback déterministe
      const dosItems: Array<{ code: string; act: PlannedActivityRow }> = [];
      for (const sub of data.submissions) {
        for (const act of sub.plannedActivities) {
          if (act.dosParticipation === 'oui') dosItems.push({ code: sub.entityCode, act });
        }
      }
      if (dosItems.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: 'ACTIVITÉS AVEC PARTICIPATION DoS',
            bold: true, size: pt(11), font: 'Calibri', color: '1565C0',
            underline: { type: UnderlineType?.SINGLE ?? 'single' },
          })],
          spacing: { before: 120, after: 80 },
        }));
        for (const { code, act } of dosItems) {
          const parts = [code, act.title, act.location, fmtDateRange(act.startDate, act.endDate)].filter(Boolean).join(' — ');
          children.push(bullet(parts));
        }
      }
      const sectionCSubs = data.submissions.filter(s => s.plannedActivities.length > 0);
      if (sectionCSubs.length === 0) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: 'Aucune activité planifiée soumise pour cette période.',
            italics: true, size: pt(10), font: 'Calibri', color: '595959',
          })],
        }));
      } else {
        for (const sub of sectionCSubs) {
          children.push(entityTitle(sub.entityCode));
          for (const act of sub.plannedActivities) {
            const parts = [act.title, act.location, fmtDateRange(act.startDate, act.endDate), act.observations].filter(Boolean).join('  —  ');
            children.push(bullet(parts));
          }
        }
      }
    }

    // ── SECTION D ───────────────────────────────────────────────────────
    children.push(sectionBanner('D', 'POINTS DE VIGILANCE'));

    if (draft?.sectionD?.trim()) {
      // Source LLM
      children.push(...buildLlmSection(draft.sectionD, true));
    } else {
      // Fallback déterministe
      if (data.riskPoints.length === 0) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: 'Aucun point de vigilance signalé pour cette semaine.',
            italics: true, size: pt(10), font: 'Calibri', color: '595959',
          })],
        }));
      } else {
        for (const r of data.riskPoints) {
          const lvl = r.criticality ? (CRITICALITY_LABELS[r.criticality] ?? r.criticality.toUpperCase()) : '?';
          const col = r.criticality ? (CRITICALITY_COLORS[r.criticality] ?? '333333') : '333333';
          const contextParts = [r.entityCode, r.theme, r.category].filter(Boolean).join(' / ');
          children.push(new Paragraph({
            children: [new TextRun({ text: contextParts, bold: true, size: pt(10), font: 'Calibri', color: '595959' })],
            spacing: { before: 120, after: 20 },
          }));
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${lvl} — `, bold: true, color: col, size: pt(11), font: 'Calibri' }),
              new TextRun({ text: r.description, size: pt(10), font: 'Calibri' }),
            ],
            spacing: { before: 0, after: 40 },
            indent: { left: 180 },
          }));
          if (r.expectedAction) {
            children.push(new Paragraph({
              children: [new TextRun({ text: `→ Action requise : ${r.expectedAction}`, size: pt(10), font: 'Calibri', color: '333333' })],
              indent: { left: 360 },
              spacing: { before: 40, after: 100 },
            }));
          }
        }
      }
    }

    // ── Document assembly ────────────────────────────────────────────────

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1417, right: 1417, header: 709, footer: 709 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [
                new TextRun({ text: 'LHSPLA — Weekly Operations Brief', bold: true, size: pt(9), font: 'Calibri', color: '1F4E79' }),
                new TextRun({ text: `  |  DoS  |  Semaine du ${semaineLabel}`, size: pt(9), font: 'Calibri', color: '595959' }),
              ],
              alignment: AlignmentType.RIGHT,
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new TextRun({
                  text: `LHSPLA-TA  |  Nouvelle PSP-CI  |  Accord DoS N° 72062418CA00005  |  Semaine du ${semaineLabel}  |  Page `,
                  size: pt(9), font: 'Calibri', color: '595959',
                }),
                new TextRun({ children: [PageNumber.CURRENT], size: pt(9), font: 'Calibri', color: '595959' }),
                new TextRun({ text: ' / ', size: pt(9), font: 'Calibri', color: '595959' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: pt(9), font: 'Calibri', color: '595959' }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(buffer);
  }

  // ── PDF Builder (simplified — kept for history compatibility) ─────────────────

  private async buildPdf(data: BriefData): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfMake = require('pdfmake/build/pdfmake');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

    const semaineLabel = buildSemaineLabel(data.week.weekStart, data.week.weekEnd);
    const dateEtatStr  = fmtDate(data.dateEtatStock ?? data.week.weekEnd);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 50],
      content: [
        { text: 'LHSPLA — WEEKLY OPERATIONS BRIEF', style: 'title', alignment: 'center' },
        { text: `Semaine du ${semaineLabel}`, alignment: 'center', fontSize: 10, margin: [0, 6, 0, 4] },
        { text: `État du stock au ${dateEtatStr}`, alignment: 'center', fontSize: 9, color: '#555', margin: [0, 0, 0, 20] },
        { text: `Produits : ${data.stocks.length}  |  Entités : ${data.submissions.length}  |  Alertes : ${data.riskPoints.length}`, fontSize: 8, color: '#888' },
        { text: '\n[Générer le DOCX pour le rapport complet conforme]', italics: true, fontSize: 8, color: '#aaa' },
      ],
      styles: { title: { fontSize: 14, bold: true, color: '#1F4E79' } },
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).getBuffer((buf: Buffer) => resolve(buf));
      } catch (err) { reject(err); }
    });
  }
}
