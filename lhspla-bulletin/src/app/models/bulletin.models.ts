export type CriticalityLevel = '🔴 Critique' | '🟠 Élevé' | '🟡 Modéré' | '🟢 Faible' | '';
export type DosParticipation = '✅ OUI' | '❌ NON' | '';

export interface Activity {
  id: string;
  title: string;
  objectives: string;
  location: string;
  dates: string;
  startDate: string;
  endDate: string;
  recommendations: string;
}

export interface PlannedActivity {
  id: string;
  title: string;
  objectives: string;
  location: string;
  plannedDates: string;
  startDate: string;
  endDate: string;
  dosParticipation: DosParticipation;
  observations: string;
}

export interface RiskPoint {
  id: string;
  theme: string;
  category: string;
  description: string;
  criticality: CriticalityLevel;
  expectedAction: string;
}

export interface EntitySubmission {
  entityCode: string;
  entityName: string;
  responsible: string;
  weekReference: string;
  weekStart: string;
  weekEnd: string;
  submissionDate: string;
  activities: Activity[];
  plannedActivities: PlannedActivity[];
  riskPoints: RiskPoint[];
  lastSaved?: string;
  status: 'draft' | 'submitted';
}

export interface WeeklyBulletin {
  id: string;
  weekReference: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
  entities: { [code: string]: EntitySubmission };
}

export const ENTITIES: { code: string; name: string; fullName: string }[] = [
  { code: 'CAD', name: 'CAD', fullName: 'Chaîne d\'Approvisionnement Décentralisée' },
  { code: 'CAC', name: 'CAC', fullName: 'Chaîne d\'Approvisionnement Communautaire' },
  { code: 'PMO', name: 'PMO', fullName: 'Gestion de Projet' },
  { code: 'QAD', name: 'QAD', fullName: 'Quantification Achat et Distribution' },
  { code: 'SE',  name: 'SE',  fullName: 'Suivi & Évaluation (MEL)' },
  { code: 'SI',  name: 'SI',  fullName: 'Système d\'Information' },
  { code: 'FINANCES', name: 'FINANCES', fullName: 'Service Finances' },
  { code: 'COM', name: 'COM', fullName: 'Service Communication' },
];

export const CRITICALITY_OPTIONS: CriticalityLevel[] = [
  '🔴 Critique', '🟠 Élevé', '🟡 Modéré', '🟢 Faible'
];

export const DOS_OPTIONS: DosParticipation[] = ['✅ OUI', '❌ NON'];

export function createEmptyActivity(): Activity {
  return { id: crypto.randomUUID(), title: '', objectives: '', location: '', dates: '', startDate: '', endDate: '', recommendations: '' };
}

export function createEmptyPlannedActivity(): PlannedActivity {
  return { id: crypto.randomUUID(), title: '', objectives: '', location: '', plannedDates: '', startDate: '', endDate: '', dosParticipation: '', observations: '' };
}

export function createEmptyRiskPoint(): RiskPoint {
  return { id: crypto.randomUUID(), theme: '', category: '', description: '', criticality: '', expectedAction: '' };
}

export function createEmptySubmission(entityCode: string): EntitySubmission {
  const entity = ENTITIES.find(e => e.code === entityCode)!;
  return {
    entityCode,
    entityName: entity.fullName,
    responsible: '',
    weekReference: '',
    weekStart: '',
    weekEnd: '',
    submissionDate: new Date().toLocaleDateString('fr-FR'),
    activities: [createEmptyActivity()],
    plannedActivities: [createEmptyPlannedActivity()],
    riskPoints: [createEmptyRiskPoint()],
    status: 'draft'
  };
}
