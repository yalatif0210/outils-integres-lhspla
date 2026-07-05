import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInputDto } from './dto/create-input.dto';
import { UpdateInputDto, UpdateStatusDto, UpdatePmoDto, UpsertTranslationDto } from './dto/update-input.dto';
import { TranslationLlmService } from '../translation/translation-llm.service';
import * as ExcelJS from 'exceljs';

const INPUT_INCLUDE = {
  author: { select: { id: true, email: true, entityId: true } },
  entity: { select: { id: true, code: true, label: true } },
  referenceSection: { select: { id: true, titre: true } },
  revisions: {
    orderBy: { createdAt: 'desc' as const },
    include: { editor: { select: { id: true, email: true } } },
  },
  translation: true,
};

type AuthUser = { userId: string; roles: string[]; entityCode: string | null; entityId: string | null };

function isSuperAdmin(user: Pick<AuthUser, 'roles'>): boolean {
  return Array.isArray(user.roles) && user.roles.includes('super_admin');
}
function isPmo(user: Pick<AuthUser, 'entityCode'>): boolean {
  return user.entityCode === 'PMO';
}
function isCop(user: Pick<AuthUser, 'roles'>): boolean {
  return Array.isArray(user.roles) && user.roles.includes('chief_of_party');
}

function buildInputData(dto: Partial<CreateInputDto>) {
  return {
    ...(dto.content !== undefined && { content: dto.content }),
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.means !== undefined && { means: dto.means }),
    ...(dto.output !== undefined && { output: dto.output }),
    ...(dto.verificationMethod !== undefined && { verificationMethod: dto.verificationMethod }),
    ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
    ...(dto.dueMonth !== undefined && { dueMonth: dto.dueMonth }),
    ...(dto.objective !== undefined && { objective: dto.objective }),
    ...(dto.sourceRef !== undefined && { sourceRef: dto.sourceRef }),
    ...(dto.deliverable !== undefined && { deliverable: dto.deliverable }),
    ...(dto.paymentAmountProposed !== undefined && { paymentAmountProposed: dto.paymentAmountProposed }),
    ...(dto.baseline !== undefined && { baseline: dto.baseline }),
    ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
    ...(dto.frequency !== undefined && { frequency: dto.frequency }),
    ...(dto.likelihood !== undefined && { likelihood: dto.likelihood }),
    ...(dto.impact !== undefined && { impact: dto.impact }),
    ...(dto.mitigation !== undefined && { mitigation: dto.mitigation }),
    ...(dto.targetRef !== undefined && { targetRef: dto.targetRef }),
  };
}

function validateTypeRequiredFields(type: string, dto: Partial<CreateInputDto>): void {
  const missing: string[] = [];
  if (type === 'activity') {
    if (!dto.content?.trim()) missing.push('content (description)');
  } else if (type === 'milestone') {
    if (!dto.title?.trim()) missing.push('title (description du jalon)');
    if (!dto.deliverable?.trim()) missing.push('deliverable (livrable attendu)');
    if (!dto.verificationMethod?.trim()) missing.push('verificationMethod (méthode de vérification)');
    if (!dto.dueMonth?.trim()) missing.push('dueMonth (mois d\'échéance)');
  } else if (type === 'indicator') {
    if (!dto.title?.trim()) missing.push('title (intitulé)');
    if (!dto.targetValue?.trim()) missing.push('targetValue (valeur cible)');
    if (!dto.dataSource?.trim()) missing.push('dataSource (source de donnée)');
    if (!dto.frequency?.trim()) missing.push('frequency (fréquence)');
  } else if (type === 'risk') {
    if (!dto.title?.trim()) missing.push('title (description du risque)');
    if (!dto.likelihood?.trim()) missing.push('likelihood (probabilité)');
    if (!dto.impact?.trim()) missing.push('impact');
    if (!dto.mitigation?.trim()) missing.push('mitigation (mesure d\'atténuation)');
  } else if (type === 'comment') {
    if (!dto.content?.trim()) missing.push('content');
  }
  if (missing.length > 0) {
    throw new BadRequestException(`Champs obligatoires manquants pour le type '${type}' : ${missing.join(', ')}`);
  }
}

@Injectable()
export class InputsService {
  constructor(
    private prisma: PrismaService,
    private translationLlm: TranslationLlmService,
  ) {}

  async findAll(filters: {
    sectionId?: string; entityId?: string; type?: string; status?: string;
  }) {
    return this.prisma.input.findMany({
      where: {
        deletedAt: null,
        ...(filters.sectionId && { referenceSectionId: filters.sectionId }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.type && { type: filters.type as any }),
        ...(filters.status && { status: filters.status as any }),
      } as any,
      include: INPUT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string, filters: {
    sectionId?: string; status?: string; entityCode?: string;
  }) {
    return this.prisma.input.findMany({
      where: {
        deletedAt: null,
        ...(filters.entityCode
          ? { entity: { code: filters.entityCode } }
          : { authorUserId: userId }),
        ...(filters.sectionId && { referenceSectionId: filters.sectionId }),
        ...(filters.status && { status: filters.status as any }),
      } as any,
      include: INPUT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findTrashed() {
    return this.prisma.input.findMany({
      where: { deletedAt: { not: null } } as any,
      include: INPUT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const input = await this.prisma.input.findUnique({ where: { id }, include: INPUT_INCLUDE });
    if (!input) throw new NotFoundException(`Input ${id} introuvable`);
    return input;
  }

  async create(dto: CreateInputDto, user: AuthUser) {
    if (!user.entityId) {
      throw new ForbiddenException("Aucune entité associée à votre compte. Contactez l'administrateur.");
    }

    const section = await this.prisma.referenceSection.findUnique({
      where: { id: dto.referenceSectionId },
    });
    if (!section) throw new NotFoundException(`Section ${dto.referenceSectionId} introuvable`);
    if (section.contributionMode === 'lecture_seule') {
      throw new ForbiddenException('Cette section est en lecture seule.');
    }

    const sectionAny = section as any;
    if (sectionAny.inputTypes?.length > 0 && !sectionAny.inputTypes.includes(dto.type)) {
      throw new BadRequestException(
        `Type '${dto.type}' non autorisé pour cette section. Types acceptés : ${sectionAny.inputTypes.join(', ')}`,
      );
    }

    const input = await this.prisma.input.create({
      data: {
        referenceSectionId: dto.referenceSectionId,
        entityId: user.entityId,
        authorUserId: user.userId,
        type: dto.type as any,
        content: dto.content ?? '',
        ...buildInputData(dto),
      } as any,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: input.id,
        editorUserId: user.userId,
        changeType: 'created',
        snapshot: input as any,
      },
    });

    return input;
  }

  async update(id: string, dto: UpdateInputDto, user: AuthUser) {
    const existing = await this.findOne(id);

    if (existing.status !== 'draft' && !isSuperAdmin(user)) {
      throw new ForbiddenException(
        'Cet input est verrouillé (statut : ' + existing.status + '). Contactez le Super Admin pour le déverrouiller.',
      );
    }

    const updated = await this.prisma.input.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type as any }),
        ...buildInputData(dto),
      },
      include: INPUT_INCLUDE,
    });

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentRevision = await this.prisma.inputRevision.findFirst({
      where: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'updated',
        createdAt: { gte: thirtyMinutesAgo },
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    if (recentRevision) {
      await this.prisma.inputRevision.update({
        where: { id: recentRevision.id },
        data: { snapshot: { before: existing, after: updated } as any },
      });
    } else {
      await this.prisma.inputRevision.create({
        data: {
          inputId: id,
          editorUserId: user.userId,
          changeType: 'updated',
          snapshot: { before: existing, after: updated } as any,
        },
      });
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);
    const pmo = isPmo(user);
    const requested = dto.status;

    if (requested === 'draft') {
      if (!sa) {
        throw new ForbiddenException('Seul le Super Admin peut déverrouiller un input soumis.');
      }
    } else if (requested === 'submitted') {
      if (existing.status !== 'draft') {
        throw new ForbiddenException('Seul un brouillon peut être soumis.');
      }
      if (existing.authorUserId !== user.userId && !sa) {
        throw new ForbiddenException("Seul l'auteur peut soumettre cet input.");
      }
      validateTypeRequiredFields(existing.type, existing as any);
    } else if (requested === 'retained' || requested === 'rejected') {
      if (!pmo && !sa) {
        throw new ForbiddenException('Seul le PMO peut qualifier les contributions.');
      }
    }

    const updated = await this.prisma.input.update({
      where: { id },
      data: { status: requested as any },
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: requested === 'draft' ? 'unlocked' : `status_${requested}`,
        snapshot: { before: existing.status, after: requested } as any,
      },
    });

    return updated;
  }

  async updatePmo(id: string, dto: UpdatePmoDto, user: AuthUser) {
    if (!isPmo(user) && !isSuperAdmin(user)) {
      throw new ForbiddenException('Action réservée au PMO.');
    }

    const existing = await this.findOne(id);

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.paymentAmountFinal !== undefined) data.paymentAmountFinal = dto.paymentAmountFinal;

    const updated = await this.prisma.input.update({
      where: { id },
      data,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'pmo_update',
        snapshot: {
          before: { status: existing.status, paymentAmountFinal: (existing as any).paymentAmountFinal },
          after: data,
        } as any,
      },
    });

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);

    if (!sa) {
      if (existing.status !== 'draft') {
        throw new ForbiddenException(
          'Seul un brouillon peut être supprimé. Contactez le Super Admin pour supprimer un input soumis.',
        );
      }
      if (existing.authorUserId !== user.userId) {
        throw new ForbiddenException('Vous ne pouvez supprimer que vos propres brouillons.');
      }
    }

    await this.prisma.input.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.userId } as any,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'soft_deleted',
        snapshot: { status: existing.status } as any,
      },
    });

    return { deleted: id };
  }

  async restore(id: string, user: AuthUser) {
    if (!isSuperAdmin(user)) {
      throw new ForbiddenException('Seul le Super Admin peut restaurer un input supprimé.');
    }

    const existing = await this.prisma.input.findUnique({ where: { id } }) as any;
    if (!existing) throw new NotFoundException(`Input ${id} introuvable`);
    if (!existing.deletedAt) throw new BadRequestException("Cet input n'est pas supprimé.");

    const restored = await this.prisma.input.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null } as any,
      include: INPUT_INCLUDE,
    });

    await this.prisma.inputRevision.create({
      data: {
        inputId: id,
        editorUserId: user.userId,
        changeType: 'restored',
        snapshot: { restoredStatus: restored.status } as any,
      },
    });

    return restored;
  }

  async upsertTranslation(id: string, dto: UpsertTranslationDto, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);
    const pmo = isPmo(user);
    const cop = isCop(user);

    if (!sa && !pmo && !cop) {
      if (existing.status !== 'draft') {
        throw new ForbiddenException('La traduction EN ne peut être modifiée que pour un brouillon.');
      }
      if (existing.authorUserId !== user.userId) {
        throw new ForbiddenException('Vous ne pouvez modifier que la traduction de vos propres inputs.');
      }
    }

    const data = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.means !== undefined && { means: dto.means }),
      ...(dto.output !== undefined && { output: dto.output }),
      ...(dto.verificationMethod !== undefined && { verificationMethod: dto.verificationMethod }),
      ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
      ...(dto.dueMonth !== undefined && { dueMonth: dto.dueMonth }),
      ...(dto.objective !== undefined && { objective: dto.objective }),
      ...(dto.sourceRef !== undefined && { sourceRef: dto.sourceRef }),
      ...(dto.deliverable !== undefined && { deliverable: dto.deliverable }),
      ...(dto.baseline !== undefined && { baseline: dto.baseline }),
      ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
      ...(dto.frequency !== undefined && { frequency: dto.frequency }),
      ...(dto.likelihood !== undefined && { likelihood: dto.likelihood }),
      ...(dto.impact !== undefined && { impact: dto.impact }),
      ...(dto.mitigation !== undefined && { mitigation: dto.mitigation }),
    };

    return (this.prisma as any).inputTranslation.upsert({
      where: { inputId: id },
      create: { inputId: id, ...data },
      update: data,
    });
  }

  async autoTranslate(id: string, user: AuthUser) {
    const existing = await this.findOne(id);
    const sa = isSuperAdmin(user);
    const pmo = isPmo(user);
    const cop = isCop(user);

    if (!sa && !pmo && !cop) {
      if (existing.status !== 'draft') {
        throw new ForbiddenException('La traduction EN ne peut être générée que pour un brouillon.');
      }
      if (existing.authorUserId !== user.userId) {
        throw new ForbiddenException('Vous ne pouvez traduire que vos propres inputs.');
      }
    }

    const translated = await this.translationLlm.translate({
      title: (existing as any).title,
      content: (existing as any).content,
      means: (existing as any).means,
      output: (existing as any).output,
      verificationMethod: (existing as any).verificationMethod,
      targetValue: (existing as any).targetValue,
      dueMonth: (existing as any).dueMonth,
      objective: (existing as any).objective,
      sourceRef: (existing as any).sourceRef,
      deliverable: (existing as any).deliverable,
      baseline: (existing as any).baseline,
      dataSource: (existing as any).dataSource,
      frequency: (existing as any).frequency,
      likelihood: (existing as any).likelihood,
      impact: (existing as any).impact,
      mitigation: (existing as any).mitigation,
    });

    return (this.prisma as any).inputTranslation.upsert({
      where: { inputId: id },
      create: { inputId: id, ...translated },
      update: translated,
    });
  }

  // ── Import Excel ──────────────────────────────────────────────────────────

  private static readonly IMPORT_COLS = [
    { header: 'Entité',                  key: 'entity',               width: 12 },
    { header: 'Type',                    key: 'type',                 width: 14 },
    { header: 'Titre',                   key: 'title',                width: 30 },
    { header: 'Contenu / Description',   key: 'content',              width: 40 },
    { header: 'Intrant',                 key: 'means',                width: 25 },
    { header: 'Extrant',                 key: 'output',               width: 25 },
    { header: 'Livrable',               key: 'deliverable',           width: 25 },
    { header: 'Méthode de vérification', key: 'verificationMethod',   width: 30 },
    { header: 'Valeur cible',            key: 'targetValue',          width: 14 },
    { header: 'Base de référence',       key: 'baseline',             width: 20 },
    { header: 'Source de données',       key: 'dataSource',           width: 20 },
    { header: 'Fréquence',              key: 'frequency',             width: 14 },
    { header: 'Échéance',               key: 'dueMonth',              width: 12 },
    { header: 'Probabilité',            key: 'likelihood',            width: 14 },
    { header: 'Impact',                 key: 'impact',                width: 12 },
    { header: 'Atténuation',            key: 'mitigation',            width: 30 },
    { header: 'Montant proposé',        key: 'paymentAmountProposed', width: 18 },
  ] as const;

  async generateImportTemplate(): Promise<Buffer> {
    const sections = await this.prisma.referenceSection.findMany({ orderBy: { ordre: 'asc' } });
    const entities = await this.prisma.entity.findMany({ orderBy: { code: 'asc' } });
    const entityCodes = entities.map(e => e.code);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Collecte NPSP-CI';
    workbook.created = new Date();

    for (const section of sections) {
      const sheetName = section.titre.substring(0, 31);
      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = InputsService.IMPORT_COLS.map(c => ({ ...c }));

      // En-tête coloré
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 20;

      // Ligne exemple grisée
      const exRow = sheet.addRow({
        entity: entityCodes[0] ?? 'CODE',
        type: 'activité',
        title: 'Exemple — supprimer cette ligne avant import',
        content: 'Description de l\'activité',
        means: 'Intrant exemple',
        output: 'Extrant exemple',
      });
      exRow.font = { italic: true, color: { argb: 'FF9E9E9E' } };
      exRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

      // Validation dropdown Type (colonne 2) à partir de la ligne 2
      const typeFormula = '"activité,indicateur,jalon,risque"';
      for (let r = 2; r <= 500; r++) {
        sheet.getCell(r, 2).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [typeFormula],
          showErrorMessage: true,
          errorTitle: 'Type invalide',
          error: 'Choisissez : activité, indicateur, jalon ou risque',
        };
        if (entityCodes.length > 0) {
          sheet.getCell(r, 1).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`"${entityCodes.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Entité invalide',
            error: `Codes valides : ${entityCodes.join(', ')}`,
          };
        }
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importFromExcel(buffer: Buffer, user: AuthUser): Promise<{
    total: number;
    imported: number;
    errors: { sheet: string; row: number; error: string }[];
  }> {
    if (!isSuperAdmin(user)) throw new ForbiddenException('Réservé au Super Admin.');

    const sections = await this.prisma.referenceSection.findMany();
    const entities  = await this.prisma.entity.findMany();
    const entityByCode = new Map(entities.map(e => [e.code.toLowerCase(), e]));
    const sectionByName = new Map(
      sections.map(s => [s.titre.substring(0, 31).toLowerCase(), s]),
    );

    const TYPE_MAP: Record<string, string> = {
      'activité': 'activity', 'activite': 'activity', 'activity': 'activity',
      'indicateur': 'indicator', 'indicator': 'indicator',
      'jalon': 'milestone', 'milestone': 'milestone',
      'risque': 'risk', 'risk': 'risk',
    };

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    let total = 0;
    let imported = 0;
    const errors: { sheet: string; row: number; error: string }[] = [];

    for (const sheet of workbook.worksheets) {
      const section = sectionByName.get(sheet.name.substring(0, 31).toLowerCase());
      if (!section) {
        errors.push({ sheet: sheet.name, row: 0, error: `Axe "${sheet.name}" non trouvé dans le référentiel` });
        continue;
      }

      const rows: ExcelJS.Row[] = [];
      sheet.eachRow({ includeEmpty: false }, (row, idx) => { if (idx > 1) rows.push(row); });

      for (const row of rows) {
        const rowNum = row.number;
        const cell = (c: number) => {
          const v = row.getCell(c).value;
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text);
          return String(v).trim();
        };

        const entityCode = cell(1);
        const typeRaw    = cell(2);
        const title      = cell(3);
        const content    = cell(4);

        // Ignorer lignes vides et ligne exemple
        if (!entityCode && !typeRaw && !title && !content) continue;
        if (title.toLowerCase().includes('exemple — supprimer')) continue;

        total++;

        const entity = entityByCode.get(entityCode.toLowerCase());
        if (!entity) {
          errors.push({ sheet: sheet.name, row: rowNum, error: `Entité "${entityCode}" inconnue` });
          continue;
        }

        const type = TYPE_MAP[typeRaw.toLowerCase()];
        if (!type) {
          errors.push({ sheet: sheet.name, row: rowNum, error: `Type "${typeRaw}" invalide (activité | indicateur | jalon | risque)` });
          continue;
        }

        const payload: any = {
          referenceSectionId: section.id,
          entityId: entity.id,
          authorUserId: user.userId,
          type,
          content: content || '',
          ...(title      && { title }),
          ...(cell(5)    && { means: cell(5) }),
          ...(cell(6)    && { output: cell(6) }),
          ...(cell(7)    && { deliverable: cell(7) }),
          ...(cell(8)    && { verificationMethod: cell(8) }),
          ...(cell(9)    && { targetValue: cell(9) }),
          ...(cell(10)   && { baseline: cell(10) }),
          ...(cell(11)   && { dataSource: cell(11) }),
          ...(cell(12)   && { frequency: cell(12) }),
          ...(cell(13)   && { dueMonth: cell(13) }),
          ...(cell(14)   && { likelihood: cell(14) }),
          ...(cell(15)   && { impact: cell(15) }),
          ...(cell(16)   && { mitigation: cell(16) }),
          ...(cell(17)   && { paymentAmountProposed: cell(17) }),
        };

        try {
          const created = await this.prisma.input.create({
            data: payload as any,
            select: { id: true },
          });
          await this.prisma.input.update({
            where: { id: created.id },
            data: { status: 'submitted' } as any,
          });
          await this.prisma.inputRevision.create({
            data: {
              inputId: created.id,
              editorUserId: user.userId,
              changeType: 'imported',
              snapshot: payload as any,
            },
          });
          imported++;
        } catch (e: any) {
          errors.push({ sheet: sheet.name, row: rowNum, error: e.message ?? 'Erreur création' });
        }
      }
    }

    return { total, imported, errors };
  }

  async getStats() {
    const bySection = await this.prisma.input.groupBy({
      by: ['referenceSectionId', 'status'],
      where: { deletedAt: null } as any,
      _count: true,
    });
    const byEntity = await this.prisma.input.groupBy({
      by: ['entityId', 'status'],
      where: { deletedAt: null } as any,
      _count: true,
    });
    return { bySection, byEntity };
  }
}
