import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Programme,
  StockStatus,
  SourceReapprovisionnement,
  Role,
} from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import * as XLSX from 'xlsx';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ─── DTOs ───────────────────────────────────────────────────────────────────

export class CreateStockEntryDto {
  @IsDateString() semaine: string;
  @IsOptional() @IsDateString() dateEtatStock?: string | null;
  @IsEnum(Programme) programme: Programme;
  @IsString() sousCategorie: string;
  @IsString() denomination: string;
  @IsOptional() @IsString() denominationId?: string;
  @IsOptional() @IsNumber() stockCentrale?: number | null;
  @IsOptional() @IsNumber() stockCentralMsd?: number | null;
  @IsOptional() @IsNumber() stockNational?: number | null;
  @IsOptional() @IsNumber() cmm?: number | null;
  @IsOptional() @IsString() datePeremptionCentrale?: string | null;
  @IsOptional() @IsString() datePeremptionPeripherie?: string | null;
  @IsOptional() @IsEnum(StockStatus) statutStock?: StockStatus;
  @IsOptional() @IsBoolean() statutOverride?: boolean;
  @IsOptional() @IsNumber() stockPeripherique?: number;
  @IsOptional() @IsEnum(SourceReapprovisionnement) sourceReapprovisionnement?: SourceReapprovisionnement;
  @IsOptional() @IsNumber() quantiteAttendue?: number;
  @IsOptional() @IsDateString() dateLivraisonPrevue?: string | null;
  @IsOptional() @IsString() commentaire?: string;
}

export class UpdateStockEntryDto {
  @IsOptional() @IsNumber() stockCentrale?: number | null;
  @IsOptional() @IsNumber() stockCentralMsd?: number | null;
  @IsOptional() @IsNumber() stockNational?: number | null;
  @IsOptional() @IsNumber() cmm?: number | null;
  @IsOptional() @IsString() datePeremptionCentrale?: string | null;
  @IsOptional() @IsString() datePeremptionPeripherie?: string | null;
  @IsOptional() @IsEnum(StockStatus) statutStock?: StockStatus;
  @IsOptional() @IsBoolean() statutOverride?: boolean;
  @IsOptional() @IsNumber() stockPeripherique?: number;
  @IsOptional() @IsEnum(SourceReapprovisionnement) sourceReapprovisionnement?: SourceReapprovisionnement;
  @IsOptional() @IsNumber() quantiteAttendue?: number;
  @IsOptional() @IsDateString() dateLivraisonPrevue?: string | null;
  @IsOptional() @IsString() commentaire?: string;
}

export class CreateRefDenominationDto {
  @IsEnum(Programme) programme: Programme;
  @IsString() sousCategorie: string;
  @IsString() denomination: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SAISIE_ROLES: Role[] = [Role.super_admin, Role.admin_system, Role.entity_member];

function computeStatut(msd: number | null | undefined): StockStatus {
  if (msd == null || msd === 0) return StockStatus.RUPTURE_CENTRALE;
  if (msd < 3) return StockStatus.RUPTURE_IMMINENTE;
  if (msd < 5) return StockStatus.RISQUE;
  if (msd <= 12) return StockStatus.BON_STOCKAGE;
  return StockStatus.SURSTOCK;
}

function getMondayOfWeek(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TEMPLATE_VERSION = '2.0';

const SOURCE_VALUES = ['GOVCI', 'FM', 'PEPFAR', 'UNFPA', 'USG', 'MOU_USG', 'AUTRE'];
const STATUT_VALUES = ['RUPTURE_PAYS', 'RUPTURE_CENTRALE', 'RUPTURE_IMMINENTE', 'RISQUE', 'BON_STOCKAGE', 'SURSTOCK', 'RISQUE_PEREMPTION'];
const PROGRAMME_VALUES = ['PNLS', 'PNLP', 'PNSME'];

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private checkSaisieRole(roles: Role[], entityCode: string | null) {
    const adminRoles: Role[] = [Role.super_admin, Role.admin_system, Role.admin_finance];
    const isAdmin = roles.some(r => adminRoles.includes(r));
    const isQad = roles.includes(Role.entity_member) && entityCode === 'QAD';
    if (!isAdmin && !isQad) throw new ForbiddenException('Accès réservé à QAD et aux administrateurs');
  }

  // ── RefDenomination ──────────────────────────────────────────────────────

  async getRefDenominations(programme?: Programme) {
    return this.prisma.refDenomination.findMany({
      where: { isActive: true, ...(programme ? { programme } : {}) },
      orderBy: [{ programme: 'asc' }, { sousCategorie: 'asc' }, { order: 'asc' }],
    });
  }

  async createRefDenomination(dto: CreateRefDenominationDto, roles: Role[], entityCode: string | null) {
    this.checkSaisieRole(roles, entityCode);
    const existing = await this.prisma.refDenomination.findFirst({
      where: { denomination: dto.denomination, programme: dto.programme },
    });
    if (existing) throw new BadRequestException('Cette dénomination existe déjà pour ce programme');
    return this.prisma.refDenomination.create({ data: dto });
  }

  async updateRefDenomination(id: string, data: Partial<CreateRefDenominationDto>, roles: Role[], entityCode: string | null) {
    this.checkSaisieRole(roles, entityCode);
    const ref = await this.prisma.refDenomination.findUnique({ where: { id } });
    if (!ref) throw new NotFoundException('Dénomination introuvable');
    // Incrémenter version si denomination change
    const update: any = { ...data };
    if (data.denomination) update.version = { increment: 1 };
    return this.prisma.refDenomination.update({ where: { id }, data: update });
  }

  // ── StockEntry CRUD ──────────────────────────────────────────────────────

  async findAll(semaine?: string, programme?: Programme, statut?: StockStatus) {
    const where: any = {};
    if (semaine) where.semaine = getMondayOfWeek(semaine);
    if (programme) where.programme = programme;
    if (statut) where.statutStock = statut;
    return this.prisma.stockEntry.findMany({
      where,
      orderBy: [{ programme: 'asc' }, { sousCategorie: 'asc' }, { denomination: 'asc' }],
      include: { saisieUser: { select: { firstName: true, lastName: true } } },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.stockEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrée stock introuvable');
    return entry;
  }

  async create(dto: CreateStockEntryDto, userId: string, roles: Role[], entityCode: string | null) {
    this.checkSaisieRole(roles, entityCode);
    const semaine = getMondayOfWeek(dto.semaine);
    const existingForWeek = await this.prisma.stockEntry.findFirst({
      where: { semaine, denomination: dto.denomination, programme: dto.programme },
    });
    if (existingForWeek) throw new BadRequestException(
      `Une entrée existe déjà pour "${dto.denomination}" (${dto.programme}) semaine ${semaine.toISOString().slice(0, 10)}. Utilisez la modification.`
    );
    const msd = dto.stockCentralMsd ?? null;
    const statut = dto.statutOverride && dto.statutStock ? dto.statutStock : computeStatut(msd ? Number(msd) : null);
    return this.prisma.stockEntry.create({
      data: {
        semaine,
        dateEtatStock: dto.dateEtatStock ? new Date(dto.dateEtatStock) : null,
        programme: dto.programme,
        sousCategorie: dto.sousCategorie,
        denomination: dto.denomination,
        denominationId: dto.denominationId ?? null,
        stockCentrale: dto.stockCentrale != null ? BigInt(Math.round(Number(dto.stockCentrale))) : null,
        stockCentralMsd: msd,
        stockNational: dto.stockNational != null ? BigInt(Math.round(Number(dto.stockNational))) : null,
        cmm: dto.cmm ?? null,
        datePeremptionCentrale: dto.datePeremptionCentrale ?? null,
        datePeremptionPeripherie: dto.datePeremptionPeripherie ?? null,
        statutStock: statut,
        statutOverride: dto.statutOverride ?? false,
        stockPeripherique: dto.stockPeripherique ?? 0,
        sourceReapprovisionnement: dto.sourceReapprovisionnement ?? null,
        quantiteAttendue: dto.quantiteAttendue ?? 0,
        dateLivraisonPrevue: dto.dateLivraisonPrevue ? new Date(dto.dateLivraisonPrevue) : null,
        commentaire: dto.commentaire ?? '',
        saisiePar: userId,
      },
    });
  }

  async update(id: string, dto: UpdateStockEntryDto, roles: Role[], entityCode: string | null) {
    this.checkSaisieRole(roles, entityCode);
    await this.findOne(id);
    const msd = dto.stockCentralMsd !== undefined ? dto.stockCentralMsd : undefined;
    let statut = dto.statutStock;
    if (msd !== undefined && !dto.statutOverride) {
      statut = computeStatut(msd !== null ? Number(msd) : null);
    }
    return this.prisma.stockEntry.update({
      where: { id },
      data: {
        ...(dto.stockCentrale !== undefined ? { stockCentrale: dto.stockCentrale != null ? BigInt(Math.round(Number(dto.stockCentrale))) : null } : {}),
        ...(msd !== undefined ? { stockCentralMsd: msd } : {}),
        ...(dto.stockNational !== undefined ? { stockNational: dto.stockNational != null ? BigInt(Math.round(Number(dto.stockNational))) : null } : {}),
        ...(dto.cmm !== undefined ? { cmm: dto.cmm } : {}),
        ...(dto.datePeremptionCentrale !== undefined ? { datePeremptionCentrale: dto.datePeremptionCentrale } : {}),
        ...(dto.datePeremptionPeripherie !== undefined ? { datePeremptionPeripherie: dto.datePeremptionPeripherie } : {}),
        ...(statut ? { statutStock: statut } : {}),
        ...(dto.statutOverride !== undefined ? { statutOverride: dto.statutOverride } : {}),
        ...(dto.stockPeripherique !== undefined ? { stockPeripherique: dto.stockPeripherique } : {}),
        ...(dto.sourceReapprovisionnement !== undefined ? { sourceReapprovisionnement: dto.sourceReapprovisionnement } : {}),
        ...(dto.quantiteAttendue !== undefined ? { quantiteAttendue: dto.quantiteAttendue } : {}),
        ...(dto.dateLivraisonPrevue !== undefined ? { dateLivraisonPrevue: dto.dateLivraisonPrevue ? new Date(dto.dateLivraisonPrevue) : null } : {}),
        ...(dto.commentaire !== undefined ? { commentaire: dto.commentaire } : {}),
      },
    });
  }

  async remove(id: string, roles: Role[], entityCode: string | null) {
    this.checkSaisieRole(roles, entityCode);
    await this.findOne(id);
    await this.prisma.stockEntry.delete({ where: { id } });
    return { message: 'Supprimé' };
  }

  // ── Annexe A (pour le brief) ─────────────────────────────────────────────

  async getAnnexeA(semaine: string, critiquesOnly = false) {
    const semaineDate = getMondayOfWeek(semaine);
    const criticalStatuts: StockStatus[] = [
      StockStatus.RUPTURE_PAYS,
      StockStatus.RUPTURE_CENTRALE,
      StockStatus.RUPTURE_IMMINENTE,
      StockStatus.RISQUE,
    ];
    const entries = await this.prisma.stockEntry.findMany({
      where: {
        semaine: semaineDate,
        ...(critiquesOnly ? { statutStock: { in: criticalStatuts } } : {}),
      },
      orderBy: [{ programme: 'asc' }, { sousCategorie: 'asc' }, { denomination: 'asc' }],
    });
    // Group par programme > sous_categorie
    const grouped: Record<string, Record<string, any[]>> = {};
    for (const e of entries) {
      if (!grouped[e.programme]) grouped[e.programme] = {};
      if (!grouped[e.programme][e.sousCategorie]) grouped[e.programme][e.sousCategorie] = [];
      grouped[e.programme][e.sousCategorie].push(e);
    }
    return { semaine: semaineDate, entries, grouped };
  }

  // ── Template Excel ───────────────────────────────────────────────────────

  async generateTemplate(): Promise<Buffer> {
    const wb = XLSX.utils.book_new();

    // Feuille "Référentiel" (masquée) — listes de valeurs
    const refData = [
      ['PROGRAMME', 'STATUT', 'SOURCE'],
      ...Array.from({ length: Math.max(PROGRAMME_VALUES.length, STATUT_VALUES.length, SOURCE_VALUES.length) }, (_, i) => [
        PROGRAMME_VALUES[i] ?? '',
        STATUT_VALUES[i] ?? '',
        SOURCE_VALUES[i] ?? '',
      ]),
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    XLSX.utils.book_append_sheet(wb, wsRef, 'Référentiel');

    // Feuille "Notice"
    const noticeData = [
      ['Modèle Import Stock Hebdomadaire — LHSPLA'],
      ['Version', TEMPLATE_VERSION],
      [],
      ['COLONNE', 'DESCRIPTION', 'OBLIGATOIRE', 'FORMAT / VALEURS ACCEPTÉES'],
      ['semaine', 'Date du lundi de la semaine de référence', 'OUI', 'JJ/MM/YYYY'],
      ['programme', 'Programme de santé', 'OUI', 'PNLS | PNLP | PNSME'],
      ['sous_categorie', 'Sous-catégorie du produit', 'OUI', 'Texte libre'],
      ['denomination', 'Dénomination (nom du produit)', 'OUI', 'Texte libre'],
      ['stock_centrale', 'Stock à la Centrale d\'achat (unités)', 'NON', 'Nombre entier'],
      ['stock_central_msd', 'Mois de Stock Disponible (MSD)', 'NON', 'Nombre décimal (ex: 3.5)'],
      ['stock_peripherique', 'Stock périphérique (unités)', 'NON', 'Nombre entier'],
      ['stock_national', 'Stock national = centrale + périphérique', 'NON', 'Nombre entier'],
      ['cmm', 'Consommation Mensuelle Moyenne', 'NON', 'Nombre décimal'],
      ['date_peremption_centrale', 'Date de péremption à la centrale', 'NON', 'Texte libre (ex: Février 2027)'],
      ['date_peremption_peripherie', 'Date de péremption à la périphérie', 'NON', 'Texte libre'],
      ['statut', 'Statut stock', 'OUI si MSD absent', 'RUPTURE_PAYS | RUPTURE_CENTRALE | RUPTURE_IMMINENTE | RISQUE | BON_STOCKAGE | SURSTOCK | RISQUE_PEREMPTION'],
      ['source', 'Source de réapprovisionnement', 'NON', 'GOVCI | FM | PEPFAR | UNFPA | USG | MOU_USG | AUTRE'],
      ['quantite_attendue', 'Quantité attendue en réapprovisionnement', 'NON', 'Nombre entier'],
      ['date_livraison_prevue', 'Date prévue de livraison', 'NON', 'JJ/MM/YYYY'],
      ['commentaire', 'Commentaire libre', 'NON', 'Texte libre'],
    ];
    const wsNotice = XLSX.utils.aoa_to_sheet(noticeData);
    XLSX.utils.book_append_sheet(wb, wsNotice, 'Notice');

    // Feuille "Saisie" — colonnes alignées sur le PowerPoint (source de vérité)
    const headers = [
      'semaine', 'programme', 'sous_categorie', 'denomination',
      'stock_centrale', 'stock_central_msd', 'stock_peripherique', 'stock_national', 'cmm',
      'date_peremption_centrale', 'date_peremption_peripherie',
      'statut', 'source', 'quantite_attendue', 'date_livraison_prevue', 'commentaire',
    ];
    const wsSaisie = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, wsSaisie, 'Saisie');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ── Import Excel ─────────────────────────────────────────────────────────

  async importExcel(
    buffer: Buffer,
    userId: string,
    roles: Role[],
    entityCode: string | null,
    semaineOverride?: string,
    dateEtatStockStr?: string,
  ): Promise<{ imported: number; errors: any[]; duplicates: number; report: any[] }> {
    this.checkSaisieRole(roles, entityCode);
    const dateEtatStock = dateEtatStockStr ? new Date(dateEtatStockStr) : null;
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    // Vérifier version
    const noticeSheet = wb.Sheets['Notice'];
    if (noticeSheet) {
      const noticeData = XLSX.utils.sheet_to_json<any[]>(noticeSheet, { header: 1 });
      const versionCell = noticeData[1]?.[1];
      if (versionCell && String(versionCell) !== TEMPLATE_VERSION) {
        throw new BadRequestException(
          `Version du modèle incompatible (attendu: ${TEMPLATE_VERSION}, reçu: ${versionCell}). Téléchargez le dernier modèle.`
        );
      }
    }

    const saisieSheet = wb.Sheets['Saisie'];
    if (!saisieSheet) throw new BadRequestException('Feuille "Saisie" introuvable dans le fichier');

    const rows: any[] = XLSX.utils.sheet_to_json(saisieSheet, { defval: null });
    if (rows.length === 0) throw new BadRequestException('Aucune ligne de données dans la feuille "Saisie"');

    const report: any[] = [];
    const toCreate: any[] = [];
    let duplicates = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;
      const errors: string[] = [];

      const semaine = row['semaine'];
      const programme = row['programme'];
      const sousCategorie = row['sous_categorie'];
      const denomination = row['denomination'];
      const stockCentraleRaw = row['stock_centrale'];
      const msdRaw = row['stock_central_msd'];
      const stockPeri = row['stock_peripherique'];
      const stockNationalRaw = row['stock_national'];
      const cmmRaw = row['cmm'];
      const datePeremCentrale = row['date_peremption_centrale'] ?? null;
      const datePeremPeri = row['date_peremption_peripherie'] ?? null;
      const statutRaw = row['statut'];
      const source = row['source'];
      const qteAttendue = row['quantite_attendue'];
      const dateLiv = row['date_livraison_prevue'];
      const commentaire = row['commentaire'] ?? '';

      if (!semaineOverride && !semaine) errors.push('semaine manquante');
      if (!programme) errors.push('programme manquant');
      else if (!PROGRAMME_VALUES.includes(String(programme).toUpperCase())) errors.push(`programme invalide: ${programme}`);
      if (!sousCategorie) errors.push('sous_categorie manquante');
      if (!denomination) errors.push('denomination manquante');
      if (!msdRaw && !statutRaw) errors.push('stock_central_msd ou statut requis');
      if (statutRaw && !STATUT_VALUES.includes(String(statutRaw).toUpperCase())) errors.push(`statut invalide: ${statutRaw}`);
      if (source && !SOURCE_VALUES.includes(String(source).toUpperCase())) errors.push(`source invalide: ${source}`);

      if (errors.length > 0) {
        report.push({ ligne: lineNum, statut: 'ERREUR', erreurs: errors, denomination });
        continue;
      }

      const semaineDate = semaineOverride
        ? getMondayOfWeek(semaineOverride)
        : getMondayOfWeek(semaine instanceof Date ? semaine.toISOString() : String(semaine));
      const msd = msdRaw !== null ? Number(msdRaw) : null;
      const statut = statutRaw
        ? (String(statutRaw).toUpperCase() as StockStatus)
        : computeStatut(msd);
      const statutOverride = !!statutRaw;

      // Vérifier doublon en base
      const existing = await this.prisma.stockEntry.findFirst({
        where: { semaine: semaineDate, denomination: String(denomination), programme: String(programme).toUpperCase() as Programme },
      });
      if (existing) {
        duplicates++;
        report.push({ ligne: lineNum, statut: 'DOUBLON', denomination, semaine: semaineDate });
        continue;
      }

      toCreate.push({
        semaine: semaineDate,
        dateEtatStock,
        programme: String(programme).toUpperCase() as Programme,
        sousCategorie: String(sousCategorie),
        denomination: String(denomination),
        stockCentrale: stockCentraleRaw != null ? BigInt(Math.round(Number(stockCentraleRaw))) : null,
        stockCentralMsd: msd,
        stockNational: stockNationalRaw != null ? BigInt(Math.round(Number(stockNationalRaw))) : null,
        cmm: cmmRaw != null ? Number(cmmRaw) : null,
        datePeremptionCentrale: datePeremCentrale ? String(datePeremCentrale) : null,
        datePeremptionPeripherie: datePeremPeri ? String(datePeremPeri) : null,
        statutStock: statut,
        statutOverride,
        stockPeripherique: stockPeri ? BigInt(Math.round(Number(stockPeri))) : BigInt(0),
        sourceReapprovisionnement: source ? (String(source).toUpperCase() as SourceReapprovisionnement) : null,
        quantiteAttendue: qteAttendue ? BigInt(Math.round(Number(qteAttendue))) : BigInt(0),
        dateLivraisonPrevue: dateLiv ? (dateLiv instanceof Date ? dateLiv : new Date(String(dateLiv))) : null,
        commentaire: String(commentaire),
        saisiePar: userId,
      });
      report.push({ ligne: lineNum, statut: 'OK', denomination });
    }

    // Vérifier erreurs bloquantes
    const hasErrors = report.some(r => r.statut === 'ERREUR');
    if (hasErrors) {
      await this.prisma.importLog.create({
        data: {
          userId,
          semaine: new Date(),
          nbImported: 0,
          nbErrors: report.filter(r => r.statut === 'ERREUR').length,
          nbDuplicates: duplicates,
          report,
        },
      });
      throw new BadRequestException({
        message: 'Erreurs détectées — aucune ligne importée',
        report,
        nbErrors: report.filter(r => r.statut === 'ERREUR').length,
        duplicates,
      });
    }

    // Tout ou rien
    await this.prisma.$transaction(toCreate.map(data => this.prisma.stockEntry.create({ data })));

    await this.prisma.importLog.create({
      data: {
        userId,
        semaine: toCreate[0]?.semaine ?? new Date(),
        nbImported: toCreate.length,
        nbErrors: 0,
        nbDuplicates: duplicates,
        report,
      },
    });

    return { imported: toCreate.length, errors: [], duplicates, report };
  }

  // ── Import PowerPoint ────────────────────────────────────────────────────

  async importPptx(
    buffer: Buffer,
    userId: string,
    roles: Role[],
    entityCode: string | null,
    semaineOverride?: string,
    dateEtatStockStr?: string,
  ): Promise<{ imported: number; duplicates: number; skipped: number; semaine: string; report: any[] }> {
    this.checkSaisieRole(roles, entityCode);

    // Écrire le buffer dans un fichier temporaire
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-stock-'));
    const tmpFile = path.join(tmpDir, 'upload.pptx');
    fs.writeFileSync(tmpFile, buffer);

    let parsed: { semaine: string; entries: any[] };
    try {
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'parse_pptx.py');
      if (!fs.existsSync(scriptPath)) {
        throw new BadRequestException(`Script introuvable : ${scriptPath}`);
      }

      const stdout = await new Promise<string>((resolve, reject) => {
        const proc = spawn('python', [scriptPath, tmpFile], { windowsHide: true });
        let out = '';
        let err = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString('utf8'); });
        proc.stderr.on('data', (d: Buffer) => { err += d.toString('utf8'); });
        proc.on('close', (code) => {
          if (code === 0) resolve(out);
          else reject(new Error(`parse_pptx.py exited ${code}:\n${err}`));
        });
      });

      parsed = JSON.parse(stdout);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    if (!parsed.entries?.length) {
      throw new BadRequestException('Le fichier PPTX ne contient aucune donnée de stock exploitable');
    }

    const semaine = semaineOverride ?? parsed.semaine;
    const dateEtatStock = dateEtatStockStr
      ? new Date(dateEtatStockStr)
      : (parsed.semaine ? new Date(parsed.semaine) : null);
    const report: any[] = [];
    const toCreate: any[] = [];
    let duplicates = 0;
    let skipped = 0;

    for (const row of parsed.entries) {
      const { programme, denomination, sousCategorie } = row;

      if (!programme || !denomination || !sousCategorie) {
        skipped++;
        report.push({ statut: 'IGNORE', denomination, raison: 'Champs obligatoires manquants' });
        continue;
      }

      const semaineDate = this.getMondayDate(semaine);

      const existing = await this.prisma.stockEntry.findFirst({
        where: { semaine: semaineDate, denomination: String(denomination), programme: programme as Programme },
      });
      if (existing) {
        duplicates++;
        report.push({ statut: 'DOUBLON', denomination, programme });
        continue;
      }

      const msd = row.stockCentralMsd != null ? Number(row.stockCentralMsd) : null;

      toCreate.push({
        semaine: semaineDate,
        dateEtatStock,
        programme: programme as Programme,
        sousCategorie: String(sousCategorie),
        denomination: String(denomination),
        stockCentrale: row.stockCentrale != null ? BigInt(Math.round(Number(row.stockCentrale))) : null,
        stockCentralMsd: msd,
        stockNational: row.stockNational != null ? BigInt(Math.round(Number(row.stockNational))) : null,
        cmm: row.cmm != null ? Number(row.cmm) : null,
        datePeremptionCentrale: row.datePeremptionCentrale ?? null,
        datePeremptionPeripherie: row.datePeremptionPeripherie ?? null,
        statutStock: (row.statutStock as StockStatus) ?? computeStatut(msd),
        statutOverride: false,
        stockPeripherique: row.stockPeripherique != null ? BigInt(Math.round(Number(row.stockPeripherique))) : BigInt(0),
        sourceReapprovisionnement: null,
        quantiteAttendue: BigInt(0),
        dateLivraisonPrevue: null,
        commentaire: row.commentaire ?? '',
        saisiePar: userId,
      });
      report.push({ statut: 'OK', denomination, programme });
    }

    if (toCreate.length > 0) {
      await this.prisma.$transaction(toCreate.map(data => this.prisma.stockEntry.create({ data })));
      await this.prisma.importLog.create({
        data: {
          userId,
          semaine: this.getMondayDate(semaine),
          nbImported: toCreate.length,
          nbErrors: 0,
          nbDuplicates: duplicates,
          report,
        },
      });
    }

    return { imported: toCreate.length, duplicates, skipped, semaine, report };
  }

  private getMondayDate(dateStr: string): Date {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
