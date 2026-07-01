import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
} from 'docx';
import * as ExcelJS from 'exceljs';

const INPUT_TYPE_LABELS: Record<string, string> = {
  activity: 'Activité',
  indicator: 'Indicateur',
  milestone: 'Jalon',
  comment: 'Commentaire',
  risk: 'Risque',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  retained: 'Retenu',
  rejected: 'Rejeté',
};

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  private async loadSectionData(sectionId?: string) {
    const where = sectionId ? { id: sectionId } : undefined;
    return this.prisma.referenceSection.findMany({
      where,
      orderBy: { ordre: 'asc' },
      include: {
        inputs: {
          where: { status: 'retained' },
          include: { entity: true, author: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async exportDocx(sectionId?: string): Promise<Buffer> {
    const sections = await this.loadSectionData(sectionId);
    const children: (Paragraph | Table)[] = [];

    children.push(
      new Paragraph({
        text: 'Module Collecte des Inputs — Proposition NPSP-CI (GHSD)',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Export des inputs retenus — généré le ${new Date().toLocaleDateString('fr-FR')}`,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: '' }),
    );

    for (const section of sections) {
      children.push(
        new Paragraph({ text: section.titre, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Rubrique NOFO : ${section.rubriqueNofo}`, style: 'aside' }),
        new Paragraph({ text: '' }),
      );

      if (section.inputs.length === 0) {
        children.push(new Paragraph({ text: 'Aucun input retenu pour cette section.' }));
      } else {
        for (const input of section.inputs) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${INPUT_TYPE_LABELS[input.type] ?? input.type}] `, bold: true }),
                new TextRun({ text: input.title ?? '' }),
              ],
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Entité : ', bold: true }),
                new TextRun({ text: `${input.entity.code} — ${input.entity.label}` }),
                new TextRun({ text: '   |   Auteur : ', bold: true }),
                new TextRun({ text: input.author.email }),
              ],
            }),
            new Paragraph({ text: input.content }),
          );

          if (input.means) children.push(new Paragraph({ children: [new TextRun({ text: 'Intrant : ', bold: true }), new TextRun({ text: input.means })] }));
          if (input.output) children.push(new Paragraph({ children: [new TextRun({ text: 'Extrant : ', bold: true }), new TextRun({ text: input.output })] }));
          if (input.verificationMethod) children.push(new Paragraph({ children: [new TextRun({ text: 'Vérification : ', bold: true }), new TextRun({ text: input.verificationMethod })] }));
          if (input.targetValue) children.push(new Paragraph({ children: [new TextRun({ text: 'Valeur cible : ', bold: true }), new TextRun({ text: input.targetValue })] }));
          if (input.dueMonth) children.push(new Paragraph({ children: [new TextRun({ text: 'Échéance : ', bold: true }), new TextRun({ text: input.dueMonth })] }));

          children.push(new Paragraph({ text: '' }));
        }
      }
      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }

  async exportXlsx(sectionId?: string): Promise<Buffer> {
    const sections = await this.loadSectionData(sectionId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Collecte NPSP-CI';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inputs retenus');

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
      { header: 'Échéance', key: 'due', width: 12 },
      { header: 'Statut', key: 'status', width: 12 },
      { header: 'Date création', key: 'createdAt', width: 18 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };

    for (const section of sections) {
      for (const input of section.inputs) {
        sheet.addRow({
          section: section.titre,
          rubrique: section.rubriqueNofo,
          type: INPUT_TYPE_LABELS[input.type] ?? input.type,
          title: input.title ?? '',
          content: input.content,
          entity: input.entity.code,
          author: input.author.email,
          means: input.means ?? '',
          output: input.output ?? '',
          verif: input.verificationMethod ?? '',
          target: input.targetValue ?? '',
          due: input.dueMonth ?? '',
          status: STATUS_LABELS[input.status] ?? input.status,
          createdAt: input.createdAt.toLocaleDateString('fr-FR'),
        });
      }
    }

    // Stats par entité
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
