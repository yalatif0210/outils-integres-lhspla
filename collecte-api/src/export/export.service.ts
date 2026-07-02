import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';
import * as ExcelJS from 'exceljs';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const INPUT_TYPE_LABELS: Record<string, string> = {
  activity: 'Activité',
  indicator: 'Indicateur',
  milestone: 'Jalon',
  comment: 'Commentaire',
  risk: 'Risque',
};

const INPUT_TYPE_LABELS_EN: Record<string, string> = {
  activity: 'Activity',
  indicator: 'Indicator',
  milestone: 'Milestone',
  comment: 'Comment',
  risk: 'Risk',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  retained: 'Retenu',
  rejected: 'Rejeté',
};

const STATUS_LABELS_EN: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  retained: 'Retained',
  rejected: 'Rejected',
};

function getVal(input: any, field: string, lang: 'fr' | 'en'): string {
  if (lang === 'en' && input.translation?.[field]) {
    return input.translation[field];
  }
  return input[field] ?? '';
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  private async loadSectionData(sectionId?: string): Promise<any[]> {
    const where = sectionId ? { id: sectionId } : undefined;
    return (this.prisma as any).referenceSection.findMany({
      where,
      orderBy: { ordre: 'asc' },
      include: {
        inputs: {
          where: { status: 'retained' },
          include: { entity: true, author: true, translation: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async exportDocx(sectionId?: string, lang: 'fr' | 'en' = 'fr'): Promise<Buffer> {
    const sections = await this.loadSectionData(sectionId);
    const children: (Paragraph | Table)[] = [];
    const isEn = lang === 'en';
    const typeLabels = isEn ? INPUT_TYPE_LABELS_EN : INPUT_TYPE_LABELS;

    const l = isEn
      ? {
          title: 'NPSP-CI Proposal — Input Collection Module (GHSD)',
          subtitle: `Export of retained inputs — generated on ${new Date().toLocaleDateString('en-US')}`,
          entity: 'Entity', author: 'Author', content: 'Content',
          means: 'Inputs', output: 'Outputs', deliverable: 'Deliverable',
          verif: 'Verification method', targetValue: 'Target value',
          baseline: 'Baseline', dataSource: 'Data source', frequency: 'Frequency',
          dueMonth: 'Due month', likelihood: 'Likelihood', impact: 'Impact',
          mitigation: 'Mitigation measure', payment: 'Final amount',
          noInput: 'No retained input for this section.',
        }
      : {
          title: 'Module Collecte des Inputs — Proposition NPSP-CI (GHSD)',
          subtitle: `Export des inputs retenus — généré le ${new Date().toLocaleDateString('fr-FR')}`,
          entity: 'Entité', author: 'Auteur', content: 'Contenu',
          means: 'Intrant', output: 'Extrant', deliverable: 'Livrable',
          verif: 'Vérification', targetValue: 'Valeur cible',
          baseline: 'Base de référence', dataSource: 'Source de donnée', frequency: 'Fréquence',
          dueMonth: 'Échéance', likelihood: 'Probabilité', impact: 'Impact',
          mitigation: 'Atténuation', payment: 'Montant retenu',
          noInput: 'Aucun input retenu pour cette section.',
        };

    children.push(
      new Paragraph({
        text: l.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: l.subtitle, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '' }),
    );

    for (const section of sections) {
      children.push(
        new Paragraph({ text: section.titre, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `${isEn ? 'NOFO reference' : 'Rubrique NOFO'} : ${section.rubriqueNofo}`, style: 'aside' }),
        new Paragraph({ text: '' }),
      );

      if (section.inputs.length === 0) {
        children.push(new Paragraph({ text: l.noInput }));
      } else {
        for (const input of section.inputs) {
          const titleVal = getVal(input, 'title', lang);
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${typeLabels[input.type] ?? input.type}] `, bold: true }),
                new TextRun({ text: titleVal, bold: true }),
              ],
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${l.entity} : `, bold: true }),
                new TextRun({ text: `${input.entity.code} — ${input.entity.label}` }),
                new TextRun({ text: `   |   ${l.author} : `, bold: true }),
                new TextRun({ text: input.author.email }),
              ],
            }),
            new Paragraph({ text: stripHtml(getVal(input, 'content', lang)) }),
          );

          const addField = (label: string, field: string) => {
            const val = getVal(input, field, lang);
            if (val) children.push(new Paragraph({ children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun({ text: val })] }));
          };

          addField(l.means, 'means');
          addField(l.output, 'output');
          addField(l.deliverable, 'deliverable');
          addField(l.verif, 'verificationMethod');
          addField(l.targetValue, 'targetValue');
          addField(l.baseline, 'baseline');
          addField(l.dataSource, 'dataSource');
          addField(l.frequency, 'frequency');
          addField(l.dueMonth, 'dueMonth');
          addField(l.likelihood, 'likelihood');
          addField(l.impact, 'impact');
          addField(l.mitigation, 'mitigation');
          addField(l.payment, 'paymentAmountFinal');

          children.push(new Paragraph({ text: '' }));
        }
      }
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }

  async exportXlsx(sectionId?: string, lang: 'fr' | 'en' = 'fr'): Promise<Buffer> {
    const sections = await this.loadSectionData(sectionId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Collecte NPSP-CI';
    workbook.created = new Date();
    const isEn = lang === 'en';
    const typeLabels = isEn ? INPUT_TYPE_LABELS_EN : INPUT_TYPE_LABELS;
    const statusLbl = isEn ? STATUS_LABELS_EN : STATUS_LABELS;

    const sheetName = isEn ? 'Retained inputs' : 'Inputs retenus';
    const sheet = workbook.addWorksheet(sheetName);

    if (isEn) {
      sheet.columns = [
        { header: 'Section', key: 'section', width: 30 },
        { header: 'NOFO reference', key: 'rubrique', width: 25 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Content', key: 'content', width: 50 },
        { header: 'Entity', key: 'entity', width: 12 },
        { header: 'Author', key: 'author', width: 25 },
        { header: 'Inputs', key: 'means', width: 25 },
        { header: 'Outputs', key: 'output', width: 25 },
        { header: 'Verification', key: 'verif', width: 25 },
        { header: 'Target value', key: 'target', width: 14 },
        { header: 'Baseline', key: 'baseline', width: 18 },
        { header: 'Data source', key: 'dataSource', width: 20 },
        { header: 'Frequency', key: 'frequency', width: 14 },
        { header: 'Due month', key: 'due', width: 12 },
        { header: 'Deliverable', key: 'deliverable', width: 25 },
        { header: 'Likelihood', key: 'likelihood', width: 14 },
        { header: 'Impact', key: 'impact', width: 12 },
        { header: 'Mitigation measure', key: 'mitigation', width: 30 },
        { header: 'Final amount', key: 'paymentAmountFinal', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Creation date', key: 'createdAt', width: 18 },
      ];
    } else {
      sheet.columns = [
        { header: 'Section', key: 'section', width: 30 },
        { header: 'Rubrique NOFO', key: 'rubrique', width: 25 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Titre', key: 'title', width: 30 },
        { header: 'Contenu', key: 'content', width: 50 },
        { header: 'Entité', key: 'entity', width: 12 },
        { header: 'Auteur', key: 'author', width: 25 },
        { header: 'Intrant', key: 'means', width: 25 },
        { header: 'Extrant', key: 'output', width: 25 },
        { header: 'Vérification', key: 'verif', width: 25 },
        { header: 'Valeur cible', key: 'target', width: 14 },
        { header: 'Base de référence', key: 'baseline', width: 18 },
        { header: 'Source de donnée', key: 'dataSource', width: 20 },
        { header: 'Fréquence', key: 'frequency', width: 14 },
        { header: 'Échéance', key: 'due', width: 12 },
        { header: 'Livrable', key: 'deliverable', width: 25 },
        { header: 'Probabilité', key: 'likelihood', width: 14 },
        { header: 'Impact', key: 'impact', width: 12 },
        { header: 'Atténuation', key: 'mitigation', width: 30 },
        { header: 'Montant retenu', key: 'paymentAmountFinal', width: 18 },
        { header: 'Statut', key: 'status', width: 12 },
        { header: 'Date création', key: 'createdAt', width: 18 },
      ];
    }

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };

    for (const section of sections) {
      for (const input of section.inputs) {
        sheet.addRow({
          section: section.titre,
          rubrique: section.rubriqueNofo,
          type: typeLabels[input.type] ?? input.type,
          title: getVal(input, 'title', lang),
          content: stripHtml(getVal(input, 'content', lang)),
          entity: input.entity.code,
          author: input.author.email,
          means: getVal(input, 'means', lang),
          output: getVal(input, 'output', lang),
          verif: getVal(input, 'verificationMethod', lang),
          target: getVal(input, 'targetValue', lang),
          baseline: getVal(input, 'baseline', lang),
          dataSource: getVal(input, 'dataSource', lang),
          frequency: getVal(input, 'frequency', lang),
          due: getVal(input, 'dueMonth', lang),
          deliverable: getVal(input, 'deliverable', lang),
          likelihood: getVal(input, 'likelihood', lang),
          impact: getVal(input, 'impact', lang),
          mitigation: stripHtml(getVal(input, 'mitigation', lang)),
          paymentAmountFinal: (input as any).paymentAmountFinal ?? '',
          status: statusLbl[input.status] ?? input.status,
          createdAt: input.createdAt.toLocaleDateString(isEn ? 'en-US' : 'fr-FR'),
        });
      }
    }

    // Stats sheet (always FR labels for simplicity)
    const statsSheet = workbook.addWorksheet('Statistiques');
    statsSheet.columns = [
      { header: 'Section', key: 'section', width: 30 },
      { header: 'Entité', key: 'entity', width: 12 },
      { header: 'Total inputs', key: 'total', width: 14 },
      { header: 'Retenus', key: 'retained', width: 12 },
      { header: 'Soumis', key: 'submitted', width: 12 },
      { header: 'Brouillons', key: 'draft', width: 12 },
    ];
    statsSheet.getRow(1).font = { bold: true };

    const allInputs = await this.prisma.input.findMany({
      where: { deletedAt: null } as any,
      include: { referenceSection: true, entity: true },
    });

    const statsMap = new Map<string, any>();
    for (const i of allInputs) {
      const key = `${i.referenceSectionId}|${i.entityId}`;
      if (!statsMap.has(key)) {
        statsMap.set(key, { section: i.referenceSection.titre, entity: i.entity.code, total: 0, retained: 0, submitted: 0, draft: 0 });
      }
      const s = statsMap.get(key);
      s.total++;
      s[i.status] = (s[i.status] ?? 0) + 1;
    }

    for (const row of statsMap.values()) {
      statsSheet.addRow(row);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportJson(sectionId?: string) {
    const sections = await this.loadSectionData(sectionId);
    return sections.map(s => ({
      id: s.id,
      titre: s.titre,
      rubriqueNofo: s.rubriqueNofo,
      inputs: s.inputs.map(i => ({
        id: i.id,
        type: i.type,
        title: i.title,
        content: i.content,
        entity: i.entity.code,
        author: i.author.email,
        means: i.means,
        output: i.output,
        verificationMethod: i.verificationMethod,
        targetValue: i.targetValue,
        dueMonth: i.dueMonth,
        createdAt: i.createdAt,
      })),
    }));
  }
}
