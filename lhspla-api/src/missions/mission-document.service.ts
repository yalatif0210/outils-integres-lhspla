import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require('docxtemplater');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require('pizzip');

// En dev (nest start --watch) __dirname → dist/missions ; les .docx sont dans src/missions/templates
// nest-cli.json (assets) copie les .docx vers dist/missions/templates en watch/build
// Fallback sur src/ pour le premier démarrage avant que les assets soient copiés
const _tplDist = path.join(__dirname, 'templates');
const _tplSrc  = path.join(process.cwd(), 'src', 'missions', 'templates');
// fs est importé ligne 2 — on l'utilise ici (top-level sync, exécuté une seule fois au chargement)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TEMPLATES_DIR: string = require('fs').existsSync(_tplDist) ? _tplDist : _tplSrc;

const MISSION_MAIN_FOUND = 'Projet LHSPLA';
const ODM_FILE_NAME = 'ODM.docx';
const DM_FILE_NAME  = 'DM.docx';
const DM_TEMPLATE   = 'DM_ready.docx';
const ODM_TEMPLATE  = 'ODM_ready.docx';
const COMPANY_NAME = 'NOUVELLE PSPCI';

const GENERATED_DOCS8TYPES = 'nodebuffer'; // 'nodebuffer' pour Buffer, 'base64' pour string base64, etc. Voir doc de docxtemplater
const GENERATED_DOCS_COMPRESSION_MODE = 'DEFLATE'; // Compression recommandée pour les fichiers docx (zip)

const UPLOADS_DIR = 'uploads';
const MISSIONS_UPLOADS_SUB_DIR = 'missions';

const JOURS = ['DIMANCHE','LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const MOIS  = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];

function dateFr(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function dateLetters(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

@Injectable()
export class MissionDocumentService {

  async generateDocuments(mission: any): Promise<{ dmPath: string; odmPath: string }> {
    const outDir = path.join(process.cwd(), UPLOADS_DIR, MISSIONS_UPLOADS_SUB_DIR, mission.id);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const participants = (mission.participants ?? []).map((mp: any) => mp.personnel ?? mp);
    const depDate = new Date(mission.departureDate);
    const retDate = new Date(mission.returnDate);
    const resDate = new Date(mission.resumeDate);

    const imputation = mission.fund   ? `${mission.fund.name}` : MISSION_MAIN_FOUND;
    const participantList = participants.map((p: any) => ({
      fullName: (p.fullName ?? '—').toUpperCase(),
      fonction: (p.function ?? '—').toUpperCase(),
      service:  (p.service  ?? COMPANY_NAME).toUpperCase(),
      wave:      p.waveNumber ?? '—',
    }));

    // DM : dates en chiffres (dd/MM/yyyy)
    const dmData = {
      objet:        mission.object,
      destination:  mission.location,
      dateDepart:   dateFr(depDate),
      dateRetour:   dateFr(retDate),
      requestDate:  dateFr(new Date()),
      imputation,
      participants: participantList,
    };

    // ODM : dates en lettres (LUNDI 17 NOVEMBRE 2025)
    const odmData = {
      objet:           mission.object.toUpperCase(),
      destination:     mission.location.toUpperCase(),
      dateDepart:      dateLetters(depDate),
      dateRetour:      dateLetters(retDate),
      dateReprise:     dateLetters(resDate),
      moyenTransport:  mission.transportMode ? mission.transportMode.toUpperCase() : '',
      imputation:      imputation.toUpperCase(),
      participants:    participantList,
    };

    const [dmBuf, odmBuf] = await Promise.all([
      this.fillTemplate(DM_TEMPLATE,  dmData),
      this.fillTemplate(ODM_TEMPLATE, odmData),
    ]);

    const dmPath  = path.join(outDir, DM_FILE_NAME);
    const odmPath = path.join(outDir, ODM_FILE_NAME);
    fs.writeFileSync(dmPath,  dmBuf);
    fs.writeFileSync(odmPath, odmBuf);

    return {
      dmPath:  `${MISSIONS_UPLOADS_SUB_DIR}/${mission.id}/${DM_FILE_NAME}`,
      odmPath: `${MISSIONS_UPLOADS_SUB_DIR}/${mission.id}/${ODM_FILE_NAME}`,
    };
  }

  private fillTemplate(templateName: string, data: any): Buffer {
    const tplPath = path.join(TEMPLATES_DIR, templateName);
    if (!fs.existsSync(tplPath)) {
      throw new Error(`Template introuvable : ${templateName}`);
    }
    const content = fs.readFileSync(tplPath);
    const zip = new PizZip(content);

    // Supprimer les paramètres MailMerge résiduels (OLEDB/Excel) pour éviter que Word exécute du SQL à l'ouverture
    if (zip.files['word/settings.xml']) {
      const clean = zip.files['word/settings.xml'].asText().replace(/<w:mailMerge>[\s\S]*?<\/w:mailMerge>/g, '');
      zip.file('word/settings.xml', clean);
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
      nullGetter: (part: any) => {
        if (!part.module) return '';
        return '';
      },
    });
    try {
      doc.render(data);
    } catch (err: any) {
      const detail = err?.properties?.errors?.map((e: any) => e.message).join('; ') ?? err.message ?? String(err);
      throw new Error(`Erreur rendu template ${templateName} : ${detail}`);
    }
    return doc.getZip().generate({ type: GENERATED_DOCS8TYPES, compression: GENERATED_DOCS_COMPRESSION_MODE });
  }
}
