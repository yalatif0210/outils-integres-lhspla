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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionDocumentService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const _tplDist = path.join(__dirname, 'templates');
const _tplSrc = path.join(process.cwd(), 'src', 'missions', 'templates');
const TEMPLATES_DIR = require('fs').existsSync(_tplDist) ? _tplDist : _tplSrc;
const MISSION_MAIN_FOUND = 'Projet LHSPLA';
const ODM_FILE_NAME = 'ODM.docx';
const DM_FILE_NAME = 'DM.docx';
const DM_TEMPLATE = 'DM_ready.docx';
const ODM_TEMPLATE = 'ODM_ready.docx';
const COMPANY_NAME = 'NOUVELLE PSPCI';
const GENERATED_DOCS8TYPES = 'nodebuffer';
const GENERATED_DOCS_COMPRESSION_MODE = 'DEFLATE';
const UPLOADS_DIR = 'uploads';
const MISSIONS_UPLOADS_SUB_DIR = 'missions';
const JOURS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
const MOIS = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
function dateFr(d) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function dateLetters(d) {
    return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
let MissionDocumentService = class MissionDocumentService {
    async generateDocuments(mission) {
        const outDir = path.join(process.cwd(), UPLOADS_DIR, MISSIONS_UPLOADS_SUB_DIR, mission.id);
        if (!fs.existsSync(outDir))
            fs.mkdirSync(outDir, { recursive: true });
        const participants = (mission.participants ?? []).map((mp) => mp.personnel ?? mp);
        const depDate = new Date(mission.departureDate);
        const retDate = new Date(mission.returnDate);
        const resDate = new Date(mission.resumeDate);
        const imputation = mission.fund ? `${mission.fund.name}` : MISSION_MAIN_FOUND;
        const participantList = participants.map((p) => ({
            fullName: (p.fullName ?? '—').toUpperCase(),
            fonction: (p.function ?? '—').toUpperCase(),
            service: (p.service ?? COMPANY_NAME).toUpperCase(),
            wave: p.waveNumber ?? '—',
        }));
        const dmData = {
            objet: mission.object,
            destination: mission.location,
            dateDepart: dateFr(depDate),
            dateRetour: dateFr(retDate),
            requestDate: dateFr(new Date()),
            imputation,
            participants: participantList,
        };
        const odmData = {
            objet: mission.object.toUpperCase(),
            destination: mission.location.toUpperCase(),
            dateDepart: dateLetters(depDate),
            dateRetour: dateLetters(retDate),
            dateReprise: dateLetters(resDate),
            imputation: imputation.toUpperCase(),
            participants: participantList,
        };
        const [dmBuf, odmBuf] = await Promise.all([
            this.fillTemplate(DM_TEMPLATE, dmData),
            this.fillTemplate(ODM_TEMPLATE, odmData),
        ]);
        const dmPath = path.join(outDir, DM_FILE_NAME);
        const odmPath = path.join(outDir, ODM_FILE_NAME);
        fs.writeFileSync(dmPath, dmBuf);
        fs.writeFileSync(odmPath, odmBuf);
        return {
            dmPath: `${MISSIONS_UPLOADS_SUB_DIR}/${mission.id}/${DM_FILE_NAME}`,
            odmPath: `${MISSIONS_UPLOADS_SUB_DIR}/${mission.id}/${ODM_FILE_NAME}`,
        };
    }
    fillTemplate(templateName, data) {
        const tplPath = path.join(TEMPLATES_DIR, templateName);
        if (!fs.existsSync(tplPath)) {
            throw new Error(`Template introuvable : ${templateName}`);
        }
        const content = fs.readFileSync(tplPath);
        const zip = new PizZip(content);
        if (zip.files['word/settings.xml']) {
            const clean = zip.files['word/settings.xml'].asText().replace(/<w:mailMerge>[\s\S]*?<\/w:mailMerge>/g, '');
            zip.file('word/settings.xml', clean);
        }
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: (part) => {
                if (!part.module)
                    return '';
                return '';
            },
        });
        try {
            doc.render(data);
        }
        catch (err) {
            const detail = err?.properties?.errors?.map((e) => e.message).join('; ') ?? err.message ?? String(err);
            throw new Error(`Erreur rendu template ${templateName} : ${detail}`);
        }
        return doc.getZip().generate({ type: GENERATED_DOCS8TYPES, compression: GENERATED_DOCS_COMPRESSION_MODE });
    }
};
exports.MissionDocumentService = MissionDocumentService;
exports.MissionDocumentService = MissionDocumentService = __decorate([
    (0, common_1.Injectable)()
], MissionDocumentService);
//# sourceMappingURL=mission-document.service.js.map