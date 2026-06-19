import { Injectable, BadRequestException, Logger } from '@nestjs/common';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LlmActivity {
  title: string;
  objectives: string;
  location: string;
  dates: string;
  startDate: Date | null;
  endDate: Date | null;
  recommendations: string;
}

export interface LlmPlannedActivity {
  title: string;
  location: string;
  plannedDates: string;
  startDate: Date | null;
  endDate: Date | null;
  dosParticipation: string | null;
  observations: string;
}

function fmtDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return '';
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end)!);
}

export interface LlmRiskPoint {
  entityCode: string;
  theme: string;
  category: string;
  description: string;
  criticality: string | null;
  expectedAction: string;
}

export interface LlmSubmission {
  entityCode: string;
  activities: LlmActivity[];
  plannedActivities: LlmPlannedActivity[];
}

export interface BriefLlmInput {
  semaineLabel: string;
  submissions: LlmSubmission[];
  riskPoints: LlmRiskPoint[];
}

export interface BriefSections {
  sectionB: string;
  sectionC: string;
  sectionD: string;
  llmModel: string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
//
// Fichier source du few-shot : src/brief/templates/few_shot_sections.txt
// Modèle DOCX de référence  : src/brief/templates/modele_brief_25mai2026.docx
// Pour mettre à jour l'exemple, éditer few_shot_sections.txt et répercuter ici.

const SYSTEM_PROMPT = `Tu es rédacteur du Weekly Operations Brief LHSPLA (Local Health Supplies Procurement and Logistics Activity, Côte d'Ivoire).

Tu reçois des données brutes issues du système de rapportage hebdomadaire et tu dois produire trois sections rédigées avec rigueur analytique, dans un style journalistique professionnel en français.

## Règles de rédaction
- Langue : français professionnel, registre institutionnel
- Style : synthétique, factuel, chiffres clés mis en avant, phrases courtes
- NE PAS inclure les codes d'activité (ex: "1.3-2.4 :") dans le texte
- NE PAS reproduire verbatim les objectifs complets — synthétiser
- Utiliser le champ "recommendations" (réalisations) comme source principale pour la Section B
- Structure par composante (CAD, CAC, QAD, PMO, SE, SI…)
- Le nom complet de la composante suit le code : "CAD — Chaîne d'Approvisionnement Décentralisée"

## Format de sortie
Réponds UNIQUEMENT avec un objet JSON valide :
{
  "sectionB": "<texte section B>",
  "sectionC": "<texte section C>",
  "sectionD": "<texte section D>"
}

## RÈGLE ABSOLUE
Tu dois analyser EXCLUSIVEMENT les données réelles soumises dans le message utilisateur.
Ne reproduis JAMAIS les noms, dates, lieux, activités ou risques de l'exemple de référence ci-dessous dans ta réponse.
L'exemple illustre uniquement le FORMAT et le STYLE attendus — pas le contenu.
Si une composante n'a pas d'activités, ne la mentionne pas.
Si la Section D ne contient aucun point de vigilance, indique simplement : "Aucun point de vigilance signalé cette semaine."

---

## Exemple de référence — FORMAT ET STYLE UNIQUEMENT (semaine 25-29 mai 2026)

{
  "sectionB": "CAD — Chaîne d'Approvisionnement Décentralisée\\nOrientation logistique départementale & Formation\\nRencontre d'orientation logistique au DS APA (26 mai) — 14 acteurs des ESPC sensibilisés sur le respect des délais RM, qualité des données rapportées, Système d'Alerte Précoce et gestion des produits iCCM. Suivi exécution plans de redéploiement (semaine précédente, 5 régions) : taux 100% pour Worodougou, Bélier et Haut-Sassandra ; 80% pour Lôh-Djiboua, Gôh et Agnéby-Tiassa. 1 nouveau plan élaboré en cours de réalisation. Suivi complétude mSupply — relances dans les groupes WhatsApp districts zones Bouaké. Formation de 15 acteurs (ESPC et districts) à Yamoussoukro (27-31 mai) — optimisation gestion des stocks, entreposage, prise en main mSupply, SAP et assistance technique ; progression significative aux pré/post-tests.\\n\\nCAC — Chaîne d'Approvisionnement Communautaire\\nSupervision iCCM & Inventaire Agence Programme\\nMission de suivi des recommandations EUV et coaching ASC/ASS — DS Tiassalé (28-29 mai) : 2 ESPC visités, coaching registre ASC et Weekly Report Communautaire ; coaching au rapportage et remplissage e-SIGL.\\n\\nQAD — Quantification, Achat & Distribution\\nSuivi stocks, approvisionnement et orientation charge virale\\nRéunion de suivi mensuel des stocks PNS (26 mai, en ligne) — recommandations NPSP : fournir date livraison reliquat ARV 1L BGE ; retirer amikacine injectable d'eSIGL ; retarder commande Bedaquiline 20 mg (surstock central et périphérique — report fin septembre 2026). Transmission des observations sur le document d'exonération des acquisitions planifiées sur budget du Gouvernement américain. Renforcement des capacités de 18 agents (pharmacie et laboratoire) sur la gestion des produits mPima et consommables labo généraux (28 mai, Abidjan). Finalisation de la correspondance désignations/codes QAT–Sage X3 pour le fichier de suivi intégré de réception des produits. Démarrage de l'inventaire tournant des produits traceurs — Agence Abidjan (30 mai-03 juin). Inventaire physique tournant — Agence Programme (16-20 mai) : réalisé ; finalisation de la justification des écarts et rédaction du rapport en cours.",

  "sectionC": "ACTIVITÉS AVEC PARTICIPATION DoS\\nQAD — Atelier de pré-quantification médicaments PNSME — Bassam, 01-04 juin 2026\\nQAD — Atelier de quantification médicaments PNSME — Yamoussoukro, 15-20 juin 2026\\n\\nCAD — Chaîne d'Approvisionnement Décentralisée\\nRéunions régionales d'analyse et mise à niveau des stocks — Gbôklê, N'Zi, Grands Ponts (08-12 juin) ; orientations logistiques DS Divo, Dabou, Doropo, Alépé (01-12 juin). Orientations logistiques départementales — 20 DS zone Bouaké, 08-19 juin. Formation 30 acteurs (APGP, IDE, SFDE) — Yamoussoukro, 01-06 juin ; visites AT Abidjan 2 (01-05 juin) ; orientation pharmaciens management CA — Yamoussoukro, 08-12 juin. Visites de sites à faibles résultats — zone Bouaké, 15-25 juin.\\n\\nPMO — Gestion de Projet\\nCompilation et transmission ORCHESTRA — Abidjan, 04-05 juin. Réunion mensuelle bilan de performance juin 2026 — Abidjan, 09 juin.\\n\\nQAD — Quantification, Achat & Distribution\\n4 sessions d'orientation acteurs gestion logistique charge virale/EID — Abidjan, 01-04 juin. Supervision laboratoires CV — Korhogo/Bouaké/Daloa (07-13 juin) et Abengourou (17-19 juin). Suivi hebdomadaire entrées machine, réapprovisionnements, écarts inventaires — Abidjan, 25-31 mai. Réunion quinzomadaire Agence Programme (25 mai-07 juin).\\n\\nSE — Suivi & Évaluation (MEL)\\nAppui mise en œuvre recommandations EUV 2025 — 10 DS, 27 mai-10 juin. Déploiement SNGFA File Active — 6 régions, 07-18 juin ; puis 6 régions supplémentaires, 21 juin-03 juillet.\\n\\nSI — Système d'Information\\nData Quality Assessment — 10 DS cibles, 08-12 juin ; monitoring distant DQA, 15-27 juin. Cartographie et priorisation des bugs mSupply (01-30 juin) ; développement guides utilisateurs simplifiés ; acquisition 37 ordinateurs (14 en cours, 23 restants).",

  "sectionD": "MODÉRÉ — Restructuration du prestataire du logiciel ORCHESTRA nécessitant une révision du contrat — aucune avancée sur le paiement de la maintenance, risque de bugs lors d'utilisation.\\n→ Action requise : Approche du Département Juridique pour une accélération du traitement du dossier.\\n\\nÉLEVÉ — Faible disponibilité de plusieurs consommables de laboratoire sur budget ÉTAT au niveau central (DBS, Tubes EDTA, Tubes rouge/gris, Pastilles de chloramine).\\n→ Action requise : Procéder à des acquisitions de dépannage pour garantir la continuité des services ; procéder au paiement des fournisseurs pour la livraison des kits DBS.\\n\\nÉLEVÉ — Refus de libération des colis arrivés en douane — exonération des produits financés par le Gouvernement américain expirée. La douane réclame un document officiel attestant la poursuite des activités LHSPLA sous couvert du Département d'État américain.\\n→ Action requise : Obtenir un délai additionnel auprès de la DGD pour la libération des colis ; fournir une note officielle DoS à la douane."
}`;

const CRITICALITY_ORDER: Record<string, number> = {
  faible: 1, modere: 2, modéré: 2, eleve: 3, élevé: 3, critique: 4,
};

function buildUserMessage(input: BriefLlmInput): string {
  const lines: string[] = [
    `Semaine : ${input.semaineLabel}`,
    '',
    '## Données Section B & C — Activités par composante',
  ];

  for (const sub of input.submissions) {
    if (sub.activities.length === 0 && sub.plannedActivities.length === 0) continue;
    lines.push(`\n### Composante : ${sub.entityCode}`);

    if (sub.activities.length > 0) {
      lines.push('#### Activités réalisées (Section B) :');
      for (const a of sub.activities) {
        lines.push(`- Titre : ${a.title}`);
        if (a.location)        lines.push(`  Lieu : ${a.location}`);
        const dateStr = fmtDateRange(a.startDate, a.endDate) || a.dates;
        if (dateStr)           lines.push(`  Dates : ${dateStr}`);
        if (a.objectives)      lines.push(`  Objectifs : ${a.objectives}`);
        if (a.recommendations) lines.push(`  Réalisations/Recommandations : ${a.recommendations}`);
      }
    }

    if (sub.plannedActivities.length > 0) {
      lines.push('#### Activités planifiées (Section C) :');
      for (const a of sub.plannedActivities) {
        lines.push(`- Titre : ${a.title}`);
        if (a.location)         lines.push(`  Lieu : ${a.location}`);
        const plannedDateStr = fmtDateRange(a.startDate, a.endDate) || a.plannedDates;
        if (plannedDateStr)     lines.push(`  Dates prévues : ${plannedDateStr}`);
        if (a.dosParticipation === 'oui') lines.push(`  Participation DoS : OUI`);
        if (a.observations)     lines.push(`  Observations : ${a.observations}`);
      }
    }
  }

  // Section D — Risques triés criticité croissante
  const sorted = [...input.riskPoints].sort((a, b) => {
    const ca = CRITICALITY_ORDER[(a.criticality ?? 'faible').toLowerCase()] ?? 0;
    const cb = CRITICALITY_ORDER[(b.criticality ?? 'faible').toLowerCase()] ?? 0;
    return ca - cb;
  });

  lines.push('\n## Données Section D — Points de vigilance');
  for (const r of sorted) {
    lines.push(`- Criticité : ${(r.criticality ?? 'faible').toUpperCase()}`);
    lines.push(`  Composante : ${r.entityCode} | Thème : ${r.theme} | Catégorie : ${r.category}`);
    lines.push(`  Description : ${r.description}`);
    lines.push(`  Action requise : ${r.expectedAction}`);
  }

  lines.push('\nAnalyse UNIQUEMENT les données ci-dessus et génère les sections B, C et D en JSON. Ne mentionne aucune activité, date, lieu ou risque absent de ces données.');
  return lines.join('\n');
}

function parseJsonResponse(raw: string): { sectionB: string; sectionC: string; sectionD: string } {
  // Extraire le JSON même si le modèle ajoute du texte autour
  const match = raw.match(/\{[\s\S]*"sectionB"[\s\S]*"sectionC"[\s\S]*"sectionD"[\s\S]*\}/);
  if (!match) throw new Error('Réponse LLM invalide — JSON non trouvé');
  return JSON.parse(match[0]);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BriefLlmService {
  private readonly logger = new Logger(BriefLlmService.name);

  async generateSections(input: BriefLlmInput): Promise<BriefSections> {
    const hasSubmissionData = input.submissions.some(
      s => s.activities.length > 0 || s.plannedActivities.length > 0,
    );
    if (!hasSubmissionData && input.riskPoints.length === 0) {
      throw new BadRequestException(
        'Aucune donnée hebdomadaire disponible (activités ou points de vigilance) — brief non générable',
      );
    }

    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasMistral   = !!process.env.MISTRAL_API_KEY;

    if (hasAnthropic) {
      this.logger.log('[BriefLLM] Utilisation de Claude (Anthropic)');
      return this.callClaude(input);
    }
    if (hasMistral) {
      this.logger.log('[BriefLLM] Utilisation de Mistral (fallback)');
      return this.callMistral(input);
    }
    throw new BadRequestException(
      'Aucune clé API LLM configurée — définissez ANTHROPIC_API_KEY ou MISTRAL_API_KEY dans .env'
    );
  }

  // ── Claude (primaire) ──────────────────────────────────────────────────────

  private async callClaude(input: BriefLlmInput): Promise<BriefSections> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: Anthropic } = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMsg = buildUserMessage(input);
    const MODEL   = 'claude-sonnet-4-6';

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // prompt caching sur system + few-shot
        },
      ],
      messages: [{ role: 'user', content: userMsg }],
    });

    const raw = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    this.logger.log(`[BriefLLM] Claude — input_tokens=${response.usage?.input_tokens} output_tokens=${response.usage?.output_tokens}`);

    const parsed = parseJsonResponse(raw);
    return { ...parsed, llmModel: MODEL };
  }

  // ── Mistral (fallback) ─────────────────────────────────────────────────────

  private async callMistral(input: BriefLlmInput): Promise<BriefSections> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Mistral } = require('@mistralai/mistralai');
    const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

    const MODEL   = 'mistral-large-latest';
    const userMsg = buildUserMessage(input);

    const response = await client.chat.complete({
      model: MODEL,
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          // cache_control sur le system prompt + few-shot (stable d'un appel à l'autre)
          content: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ] as any,
        },
        { role: 'user', content: userMsg },
      ],
    });

    const raw = response.choices?.[0]?.message?.content ?? '';
    this.logger.log(
      `[BriefLLM] Mistral — tokens=${response.usage?.totalTokens ?? '?'}` +
      (response.usage?.promptCacheHitTokens ? ` (cache_hit=${response.usage.promptCacheHitTokens})` : '')
    );

    const parsed = parseJsonResponse(typeof raw === 'string' ? raw : JSON.stringify(raw));
    return { ...parsed, llmModel: MODEL };
  }
}
