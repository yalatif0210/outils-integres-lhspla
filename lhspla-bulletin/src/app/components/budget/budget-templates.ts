export type RowType = 'item' | 'section_header' | 'sub_header' | 'subtotal' | 'total_section' | 'tax' | 'grand_total';

export interface BudgetRow {
  rowKey: string;
  label: string;
  type: RowType;
  num?: number;
  editDesignation?: boolean;
  formula?: string[];
  taxRate?: number;
  taxRef?: string;
}

// ── ATELIER ───────────────────────────────────────────────────────────────────
export const ATELIER_ROWS: BudgetRow[] = [
  { rowKey: 'hotel_header', label: 'FRAIS D\'HOTEL', type: 'section_header', num: 1 },
  { rowKey: 'hotel_salle', label: 'Salle pour les plénières (-30 Places) + vidéoprojecteur', type: 'item', editDesignation: true },
  { rowKey: 'hotel_cafe_m', label: 'Pause café du Matin', type: 'item', editDesignation: true },
  { rowKey: 'hotel_eau_m', label: 'Eau minérale en Salle du Matin', type: 'item', editDesignation: true },
  { rowKey: 'hotel_dejeuner', label: 'Pause Déjeûner du Midi', type: 'item', editDesignation: true },
  { rowKey: 'hotel_cafe_am', label: 'Pause café de l\'Après-Midi', type: 'item', editDesignation: true },
  { rowKey: 'hotel_eau_am', label: 'Eau minérale en Salle de l\'Après-Midi', type: 'item', editDesignation: true },
  { rowKey: 'hotel_sous_total', label: 'SOUS TOTAL FRAIS D\'HOTEL', type: 'subtotal', formula: ['hotel_salle','hotel_cafe_m','hotel_eau_m','hotel_dejeuner','hotel_cafe_am','hotel_eau_am'] },
  { rowKey: 'hotel_tva', label: 'TVA (18%) / sous total frais d\'hotel', type: 'tax', taxRef: 'hotel_sous_total', taxRate: 0.18 },
  { rowKey: 'hotel_tdt', label: 'TDT (2,5%) / sous total frais d\'hotel', type: 'tax', taxRef: 'hotel_sous_total', taxRate: 0.025 },
  { rowKey: 'hotel_total_tva_tdt', label: 'TOTAL TVA + TDT', type: 'subtotal', formula: ['hotel_tva','hotel_tdt'] },
  { rowKey: 'hotel_total', label: 'TOTAL FRAIS D\'HOTEL', type: 'total_section', formula: ['hotel_sous_total','hotel_total_tva_tdt'] },

  { rowKey: 'vehicule_header', label: 'LOCATION DE VEHICULE', type: 'section_header', num: 2 },
  { rowKey: 'vehicule_loc', label: 'LOCATION DE VEHICULE Type 4x4', type: 'item', editDesignation: true },
  { rowKey: 'vehicule_total', label: 'Total LOCATION DE VEHICULE', type: 'total_section', formula: ['vehicule_loc'] },

  { rowKey: 'perdiems_header', label: 'Full perdiems', type: 'section_header', num: 3 },
  { rowKey: 'perdiems_sub1', label: 'Participants NPSP', type: 'sub_header' },
  { rowKey: 'perdiems_ct1', label: 'Full perdiems participants NPSP / Chefs de Départements & Conseillers Techniques (CT)', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_ct2', label: 'Full perdiems participants NPSP / Chefs de Départements & Conseillers Techniques (CT) 2', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_dir', label: 'Full perdiems participants NPSP / Directrice', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_chef_serv', label: 'Full perdiems participants NPSP / Chefs de Services', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_autres_agents', label: 'Full perdiems participants NPSP / Autres Agents', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_chauffeur', label: 'Full perdiems participants Chauffeur', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_st1', label: 'Sous total 1: Participants NPSP', type: 'subtotal', formula: ['perdiems_ct1','perdiems_ct2','perdiems_dir','perdiems_chef_serv','perdiems_autres_agents','perdiems_chauffeur'] },
  { rowKey: 'perdiems_sub2', label: 'Autres participants', type: 'sub_header' },
  { rowKey: 'perdiems_autres_part', label: 'Full perdiems Autres Participants', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_st2', label: 'Sous total 2: Autres Participants', type: 'subtotal', formula: ['perdiems_autres_part'] },
  { rowKey: 'perdiems_total', label: 'Total Full perdiems', type: 'total_section', formula: ['perdiems_st1','perdiems_st2'] },

  { rowKey: 'forfait_carb_header', label: 'FORFAIT CARBURANT', type: 'section_header', num: 4 },
  { rowKey: 'forfait_carb_sub1', label: 'Autres participants', type: 'sub_header' },
  { rowKey: 'forfait_carb_item', label: 'Forfait carburant', type: 'item', editDesignation: true },
  { rowKey: 'forfait_carb_total', label: 'Total FORFAIT CARBURANT', type: 'total_section', formula: ['forfait_carb_item'] },

  { rowKey: 'carburant_header', label: 'CARBURANT', type: 'section_header', num: 5 },
  { rowKey: 'carburant_peage1', label: 'Péage (A/R) 1', type: 'item', editDesignation: true },
  { rowKey: 'carburant_peage2', label: 'Péage (A/R) 2', type: 'item', editDesignation: true },
  { rowKey: 'carburant_veh1', label: 'Carburant Véhicule 1 (A/R Abj-ykro)', type: 'item', editDesignation: true },
  { rowKey: 'carburant_veh2', label: 'Carburant Véhicule 2 (A/R Bke-ykro)', type: 'item', editDesignation: true },
  { rowKey: 'carburant_total', label: 'Total CARBURANT', type: 'total_section', formula: ['carburant_peage1','carburant_peage2','carburant_veh1','carburant_veh2'] },

  { rowKey: 'transport_header', label: 'TRANSPORT', type: 'section_header', num: 6 },
  { rowKey: 'transport_sub1', label: 'Participants NPSP', type: 'sub_header' },
  { rowKey: 'transport_npsp_100', label: 'Forfait Transport Participants NPSP (moins de 100 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_npsp_100_300', label: 'Forfait Transport Participants NPSP (entre 100 et 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_npsp_300', label: 'Forfait Transport Participants extérieurs (plus de 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_npsp_st1', label: 'Sous total 1: Participants NPSP', type: 'subtotal', formula: ['transport_npsp_100','transport_npsp_100_300','transport_npsp_300'] },
  { rowKey: 'transport_sub2', label: 'Autres Participants', type: 'sub_header' },
  { rowKey: 'transport_ext_100', label: 'Forfait Transport Participants Extérieurs (moins de 100 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_ext_100_300', label: 'Forfait Transport Participants Extérieurs (entre 100 et 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_ext_300', label: 'Forfait Transport Participants extérieurs (plus de 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_ext_st2', label: 'Sous total 2: Autres Participants', type: 'subtotal', formula: ['transport_ext_100','transport_ext_100_300','transport_ext_300'] },
  { rowKey: 'transport_total', label: 'TOTAL FRAIS DE TRANSPORT', type: 'total_section', formula: ['transport_npsp_st1','transport_ext_st2'] },

  { rowKey: 'repas_header', label: 'FORFAIT REPAS', type: 'section_header', num: 7 },
  { rowKey: 'repas_sub1', label: 'Autres Participants', type: 'sub_header' },
  { rowKey: 'repas_item', label: 'Forfait repas', type: 'item', editDesignation: true },
  { rowKey: 'repas_total', label: 'Total FORFAIT REPAS', type: 'total_section', formula: ['repas_item'] },

  { rowKey: 'comm_header', label: 'FRAIS DE COMMUNICATION', type: 'section_header', num: 8 },
  { rowKey: 'comm_flybox', label: 'Forfait Internet Flybox', type: 'item', editDesignation: true },
  { rowKey: 'comm_frais', label: 'Frais de communication', type: 'item', editDesignation: true },
  { rowKey: 'comm_total', label: 'Total FRAIS DE COMMUNICATION', type: 'total_section', formula: ['comm_flybox','comm_frais'] },

  { rowKey: 'transfert_header', label: 'FRAIS DE TRANSFERT DE FONDS', type: 'section_header', num: 9 },
  { rowKey: 'transfert_perdiems', label: 'Frais de transfert de fonds / Full perdiems', type: 'tax', taxRef: 'perdiems_total', taxRate: 0.01 },
  { rowKey: 'transfert_forfait_carburant', label: 'Frais de transfert de fonds / Forfait carburant', type: 'tax', taxRef: 'forfait_carb_total', taxRate: 0.01 },
  { rowKey: 'transfert_carburant', label: 'Frais de transfert de fonds / Carburant et péage', type: 'tax', taxRef: 'carburant_total', taxRate: 0.01 },
  { rowKey: 'transfert_transport', label: 'Frais de transfert de fonds / Forfait transport', type: 'tax', taxRef: 'transport_total', taxRate: 0.01 },
  { rowKey: 'transfert_repas', label: 'Frais de transfert de fonds / Forfait repas', type: 'tax', taxRef: 'repas_total', taxRate: 0.01 },
  { rowKey: 'transfert_comm', label: 'Frais de transfert de fonds / Frais de Communication', type: 'tax', taxRef: 'comm_total', taxRate: 0.01 },
  { rowKey: 'transfert_total', label: 'TOTAL FRAIS TRANSFERT DE FONDS', type: 'total_section', formula: ['transfert_perdiems', 'transfert_forfait_carburant','transfert_carburant','transfert_transport','transfert_repas','transfert_comm'] },

  { rowKey: 'grand_total', label: 'FINANCEMENT GLOBAL DE L\'ACTIVITE', type: 'grand_total',
    formula: ['hotel_total','vehicule_total','perdiems_total','forfait_carb_total','carburant_total','transport_total','repas_total','comm_total','transfert_total'] },
];

// ── ACHAT DE FOURNITURES ──────────────────────────────────────────────────────
export const ACHAT_FOURNITURES_ROWS: BudgetRow[] = [
  { rowKey: 'fournitures_header', label: 'FOURNITURES DE BUREAUX (KITS)', type: 'section_header', num: 5 },
  { rowKey: 'fournitures_papier', label: 'Papier Conférences (Rouleaux de 10)', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_postit', label: 'Post-it', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_ramettes', label: 'Ramettes de Papiers', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_bic_bleu', label: 'Bic crystal - Couleur Bleu', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_bic_rouge', label: 'Bic crystal - Couleur Rouge', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_marq_bleu', label: 'Marqueurs indélibiles - Couleurs Bleu', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_marq_rouge', label: 'Marqueurs indélibiles - Couleurs Rouge', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_marq_noir', label: 'Marqueurs indélibiles - Couleurs Noir', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_chemise', label: 'Chemise à Rabat', type: 'item', editDesignation: true },
  { rowKey: 'fournitures_blocs', label: 'Blocs notes', type: 'item', editDesignation: true },
  { rowKey: 'grand_total', label: 'FINANCEMENT GLOBAL DE L\'ACTIVITE', type: 'grand_total',
    formula: ['fournitures_papier','fournitures_postit','fournitures_ramettes','fournitures_bic_bleu','fournitures_bic_rouge','fournitures_marq_bleu','fournitures_marq_rouge','fournitures_marq_noir','fournitures_chemise','fournitures_blocs'] },
];

// ── MISSION TERRAIN ───────────────────────────────────────────────────────────
export const MISSION_TERRAIN_ROWS: BudgetRow[] = [
  { rowKey: 'vehicule_header', label: 'LOCATION DE VEHICULE', type: 'section_header', num: 1 },
  { rowKey: 'vehicule_loc', label: 'LOCATION DE VEHICULE Type 4x4', type: 'item', editDesignation: true },
  { rowKey: 'vehicule_total', label: 'Total LOCATION DE VEHICULE', type: 'total_section', formula: ['vehicule_loc'] },

  { rowKey: 'perdiems_header', label: 'Full perdiems', type: 'section_header', num: 2 },
  { rowKey: 'perdiems_sub1', label: 'Participants NPSP', type: 'sub_header' },
  { rowKey: 'perdiems_ct1', label: 'Full perdiems participants NPSP / Chefs de Départements & Conseillers Techniques (CT)', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_ct2', label: 'Full perdiems participants NPSP / Chefs de Départements & Conseillers Techniques (CT) 2', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_dir', label: 'Full perdiems participants NPSP / Directrice', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_chef_serv', label: 'Full perdiems participants NPSP / Chefs de Services', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_autres_agents', label: 'Full perdiems participants NPSP / Autres Agents', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_chauffeur', label: 'Full perdiems participants Chauffeur', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_st1', label: 'Sous total 1: Participants NPSP', type: 'subtotal', formula: ['perdiems_ct1','perdiems_ct2','perdiems_dir','perdiems_chef_serv','perdiems_autres_agents','perdiems_chauffeur'] },
  { rowKey: 'perdiems_sub2', label: 'Autres participants', type: 'sub_header' },
  { rowKey: 'perdiems_autres_part', label: 'Full perdiems Autres Participants', type: 'item', editDesignation: true },
  { rowKey: 'perdiems_st2', label: 'Sous total 2: Autres Participants', type: 'subtotal', formula: ['perdiems_autres_part'] },
  { rowKey: 'perdiems_total', label: 'Total Full perdiems', type: 'total_section', formula: ['perdiems_st1','perdiems_st2'] },

  { rowKey: 'forfait_carb_header', label: 'FORFAIT CARBURANT', type: 'section_header', num: 3 },
  { rowKey: 'forfait_carb_sub1', label: 'Autres participants', type: 'sub_header' },
  { rowKey: 'forfait_carb_item', label: 'Forfait carburant', type: 'item', editDesignation: true },
  { rowKey: 'forfait_carb_total', label: 'Total FORFAIT CARBURANT', type: 'total_section', formula: ['forfait_carb_item'] },

  { rowKey: 'carburant_header', label: 'CARBURANT', type: 'section_header', num: 4 },
  { rowKey: 'carburant_peage1', label: 'Péage (A/R) 1', type: 'item', editDesignation: true },
  { rowKey: 'carburant_peage2', label: 'Péage (A/R) 2', type: 'item', editDesignation: true },
  { rowKey: 'carburant_veh1', label: 'Carburant Véhicule 1 (A/R Abj-ykro)', type: 'item', editDesignation: true },
  { rowKey: 'carburant_veh2', label: 'Carburant Véhicule 2 (A/R Bke-ykro)', type: 'item', editDesignation: true },
  { rowKey: 'carburant_total', label: 'Total CARBURANT', type: 'total_section', formula: ['carburant_peage1','carburant_peage2','carburant_veh1','carburant_veh2'] },

  { rowKey: 'transport_header', label: 'TRANSPORT', type: 'section_header', num: 5 },
  { rowKey: 'transport_sub2', label: 'Autres Participants', type: 'sub_header' },
  { rowKey: 'transport_ext_100', label: 'Forfait Transport Participants Extérieurs (moins de 100 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_ext_100_300', label: 'Forfait Transport Participants Extérieurs (entre 100 et 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_ext_300', label: 'Forfait Transport Participants extérieurs (plus de 300 km)', type: 'item', editDesignation: true },
  { rowKey: 'transport_total', label: 'TOTAL FRAIS DE TRANSPORT', type: 'total_section', formula: ['transport_ext_100','transport_ext_100_300','transport_ext_300'] },

  { rowKey: 'repas_header', label: 'FORFAIT REPAS', type: 'section_header', num: 6 },
  { rowKey: 'repas_sub1', label: 'Autres Participants', type: 'sub_header' },
  { rowKey: 'repas_item', label: 'Forfait repas', type: 'item', editDesignation: true },
  { rowKey: 'repas_total', label: 'Total FORFAIT REPAS', type: 'total_section', formula: ['repas_item'] },

  { rowKey: 'comm_header', label: 'FRAIS DE COMMUNICATION', type: 'section_header', num: 7 },
  { rowKey: 'comm_flybox', label: 'Forfait Internet Flybox', type: 'item', editDesignation: true },
  { rowKey: 'comm_frais', label: 'Frais de communication', type: 'item', editDesignation: true },
  { rowKey: 'comm_total', label: 'Total FRAIS DE COMMUNICATION', type: 'total_section', formula: ['comm_flybox','comm_frais'] },

  { rowKey: 'prime_inv_header', label: "PRIME D'INVENTAIRE", type: 'section_header', num: 8 },
  { rowKey: 'prime_inv_dir', label: "Prime d'inventaire Directeur", type: 'item', editDesignation: true },
  { rowKey: 'prime_inv_chef_dept', label: "Prime d'inventaire Chef de département", type: 'item', editDesignation: true },
  { rowKey: 'prime_inv_chef_serv', label: "Prime d'inventaire Chef de service", type: 'item', editDesignation: true },
  { rowKey: 'prime_inv_agent', label: "Prime d'inventaire Agent", type: 'item', editDesignation: true },
  { rowKey: 'prime_inv_total', label: "Total PRIME D'INVENTAIRE", type: 'total_section', formula: ['prime_inv_dir','prime_inv_chef_dept','prime_inv_chef_serv','prime_inv_agent'] },

  { rowKey: 'transfert_header', label: 'FRAIS DE TRANSFERT DE FONDS', type: 'section_header', num: 9 },
  { rowKey: 'transfert_perdiems', label: 'Frais de transfert de fonds / Full perdiems', type: 'tax', taxRef: 'perdiems_total', taxRate: 0.01 },
  { rowKey: 'transfert_forfait_carburant', label: 'Frais de transfert de fonds / Forfait carburant', type: 'tax', taxRef: 'forfait_carb_total', taxRate: 0.01 },
  { rowKey: 'transfert_carburant', label: 'Frais de transfert de fonds / Carburant et péage', type: 'tax', taxRef: 'carburant_total', taxRate: 0.01 },
  { rowKey: 'transfert_transport', label: 'Frais de transfert de fonds / Forfait transport', type: 'tax', taxRef: 'transport_total', taxRate: 0.01 },
  { rowKey: 'transfert_repas', label: 'Frais de transfert de fonds / Forfait repas', type: 'tax', taxRef: 'repas_total', taxRate: 0.01 },
  { rowKey: 'transfert_comm', label: 'Frais de transfert de fonds / Frais de Communication', type: 'tax', taxRef: 'comm_total', taxRate: 0.01 },
  { rowKey: 'transfert_prime', label: "Frais de transfert de fonds / Prime d'inventaire", type: 'tax', taxRef: 'prime_inv_total', taxRate: 0.01 },
  { rowKey: 'transfert_total', label: 'TOTAL FRAIS TRANSFERT DE FONDS', type: 'total_section', formula: ['transfert_perdiems','transfert_forfait_carburant','transfert_carburant','transfert_transport','transfert_repas','transfert_comm','transfert_prime'] },

  { rowKey: 'grand_total', label: "FINANCEMENT GLOBAL DE L'ACTIVITE", type: 'grand_total',
    formula: ['vehicule_total','perdiems_total','forfait_carb_total','carburant_total','transport_total','repas_total','comm_total','prime_inv_total','transfert_total'] },
];

// ── APPUIS ────────────────────────────────────────────────────────────────────
export const APPUIS_ROWS: BudgetRow[] = [
  { rowKey: 'forfait_carb_header', label: 'FORFAIT CARBURANT', type: 'section_header', num: 4 },
  { rowKey: 'forfait_carb_sub1', label: 'Autres participants', type: 'sub_header' },
  { rowKey: 'forfait_carb_item', label: 'Forfait carburant', type: 'item', editDesignation: true },
  { rowKey: 'forfait_carb_total', label: 'Total FORFAIT CARBURANT', type: 'total_section', formula: ['forfait_carb_item'] },

  { rowKey: 'appuis_header', label: 'APPUIS FINANCIERS', type: 'section_header', num: 7 },
  { rowKey: 'appuis_sub1', label: 'Autres Participants', type: 'sub_header' },
  { rowKey: 'appuis_transport', label: 'Forfait transport', type: 'item', editDesignation: true },
  { rowKey: 'appuis_collation', label: 'Forfait collation', type: 'item', editDesignation: true },
  { rowKey: 'appuis_total', label: 'Total APPUIS FINANCIERS', type: 'total_section', formula: ['appuis_transport','appuis_collation'] },

  { rowKey: 'transfert_header', label: 'FRAIS DE TRANSFERT DE FONDS', type: 'section_header', num: 9 },
  { rowKey: 'transfert_appuis', label: 'Frais de transfert de fonds / Appuis financiers', type: 'tax', taxRef: 'appuis_total', taxRate: 0.01 },
  { rowKey: 'transfert_structures', label: 'Transfert de fonds aux structures décentralisées', type: 'tax', taxRef: 'appuis_total', taxRate: 0.0101 },
  { rowKey: 'transfert_forfait_carburant', label: 'Frais de transfert de fonds / Forfait carburant', type: 'tax', taxRef: 'forfait_carb_total', taxRate: 0.01 },
  { rowKey: 'transfert_total', label: 'TOTAL FRAIS TRANSFERT DE FONDS', type: 'total_section', formula: ['transfert_appuis','transfert_structures','transfert_forfait_carburant'] },

  { rowKey: 'grand_total', label: 'FINANCEMENT GLOBAL DE L\'ACTIVITE', type: 'grand_total',
    formula: ['forfait_carb_total','appuis_total','transfert_total'] },
];

// ── CONTRACTUALISATION ─────────────────────────────────────────────────────
// Les frais de transfert (section 6) utilisent type:'tax' avec taxRef dynamique
// et taxRate = transferFeeRate (configurable, défaut 5%)
export const CONTRACTUALISATION_ROWS: BudgetRow[] = [
  { rowKey: 'contrat_header', label: 'CONTRACTUALISATION', type: 'section_header', num: 1 },
  { rowKey: 'contrat_montant', label: 'Montant du contrat', type: 'item', editDesignation: true },
  { rowKey: 'contrat_total', label: 'TOTAL CONTRACTUALISATION', type: 'total_section', formula: ['contrat_montant'] },

  { rowKey: 'transfert_header', label: 'FRAIS DE TRANSFERT DE FONDS', type: 'section_header', num: 6 },
  { rowKey: 'transfert_frais', label: 'Frais de transfert de fonds', type: 'tax', taxRef: 'contrat_total', taxRate: 0.05 },
  { rowKey: 'transfert_total', label: 'TOTAL FRAIS TRANSFERT DE FONDS', type: 'total_section', formula: ['transfert_frais'] },

  { rowKey: 'grand_total', label: 'TOTAL — FINANCEMENT GLOBAL DE L\'ACTIVITÉ', type: 'grand_total', formula: ['contrat_total', 'transfert_total'] },
];

// Maps section_header rowKey → grille nature (used to filter cost-item datalist per section)
export const SECTION_NATURE_MAP: Record<string, string> = {
  hotel_header:        "FRAIS D'HOTEL",
  vehicule_header:     'LOCATION DE VEHICULE',
  perdiems_header:     'FULL PERDIEMS',
  forfait_carb_header: 'FORFAIT CARBURANT',
  carburant_header:    'CARBURANT ET PEAGE',
  transport_header:    'FORFAIT TRANSPORT',
  repas_header:        'FORFAIT REPAS',
  comm_header:         'COMMUNICATION',
  fournitures_header:  'FOURNITURES DE BUREAUX',
  appuis_header:       'APPUIS FINANCIERS',
  prime_inv_header:    "PRIME D'INVENTAIRE",
};

export const BUDGET_TEMPLATES: Record<string, BudgetRow[]> = {
  ATELIER: ATELIER_ROWS,
  ACHAT_FOURNITURES: ACHAT_FOURNITURES_ROWS,
  MISSION_TERRAIN: MISSION_TERRAIN_ROWS,
  APPUIS: APPUIS_ROWS,
  CONTRACTUALISATION: CONTRACTUALISATION_ROWS,
};

export const BUDGET_TYPE_LABELS: Record<string, string> = {
  ATELIER: 'Atelier',
  ACHAT_FOURNITURES: 'Achat de Fournitures',
  MISSION_TERRAIN: 'Mission Terrain',
  APPUIS: 'Appuis',
  CONTRACTUALISATION: 'Contractualisation',
};

export const BUDGET_STATUS_ENUMERATION = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  FINANCE_REVIEWED: 'finance_reviewed',
  TPM_APPROVED: 'tpm_approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
}

export const BUDGET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:            { label: 'Brouillon',                  color: '#667085' },
  submitted:        { label: 'Soumis (attente Finance)',    color: '#0277BD' },
  finance_reviewed: { label: 'Contrôlé Finance (attente TPM)', color: '#2E75B6' },
  tpm_approved:     { label: 'Vérifié TPM (attente COP)',   color: '#7B5EA7' },
  approved:         { label: 'Approuvé',                   color: '#1F8A3C' },
  rejected:         { label: 'Rejeté',                     color: '#C00000' },
  archived:         { label: 'Archivé',                    color: '#999' },
};

export function computeAmounts(rows: BudgetRow[], lineData: Record<string, { unitCost?: number | null; quantity?: number | null; frequency?: number | null }>): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const row of rows) {
    if (row.type === 'item') {
      const d = lineData[row.rowKey] ?? {};
      amounts[row.rowKey] = (d.unitCost ?? 0) * (d.quantity ?? 0) * (d.frequency ?? 0);
    } else if (row.type === 'tax') {
      const ref = amounts[row.taxRef!] ?? 0;
      amounts[row.rowKey] = ref * (row.taxRate ?? 0);
    } else if (row.formula) {
      amounts[row.rowKey] = row.formula.reduce((sum, key) => sum + (amounts[key] ?? 0), 0);
    } else {
      amounts[row.rowKey] = 0;
    }
  }
  return amounts;
}

// Custom row extended with positioning metadata
export interface CustomBudgetRow extends BudgetRow {
  sectionKey: string;       // rowKey of the enclosing total_section / grand_total
  insertBeforeKey: string;  // rowKey of the row before which this custom row is placed
}

// Reconstruct CustomBudgetRow[] from saved API lines (insertBeforeKey falls back to sectionKey)
export function parseCustomRowsFromLines(lines: { rowKey: string }[]): CustomBudgetRow[] {
  const keys = [...new Set(lines.map(l => l.rowKey).filter(k => k?.startsWith('custom_')))].sort();
  return keys.map(key => {
    const lastIdx = key.lastIndexOf('_');
    const sectionKey = key.slice('custom_'.length, lastIdx);
    return { rowKey: key, label: '', type: 'item' as RowType, editDesignation: true, sectionKey, insertBeforeKey: sectionKey };
  });
}

// Insert custom rows BEFORE their anchor, update total/grand_total formulas
export function buildRowsWithCustoms(template: BudgetRow[], customRows: CustomBudgetRow[]): BudgetRow[] {
  if (customRows.length === 0) return template;

  const allRows: BudgetRow[] = [...template];
  for (const custom of customRows) {
    // findIndex suffit : l'ancre se décale à chaque insertion, preservant l'ordre de création
    const idx = allRows.findIndex(r => r.rowKey === custom.insertBeforeKey);
    if (idx >= 0) {
      allRows.splice(idx, 0, custom);
    } else {
      const sIdx = allRows.findIndex(r => r.rowKey === custom.sectionKey);
      if (sIdx >= 0) allRows.splice(sIdx, 0, custom);
      else allRows.push(custom);
    }
  }

  const bySect = new Map<string, CustomBudgetRow[]>();
  for (const c of customRows) {
    if (!bySect.has(c.sectionKey)) bySect.set(c.sectionKey, []);
    bySect.get(c.sectionKey)!.push(c);
  }
  return allRows.map(row => {
    if (row.type === 'subtotal' || row.type === 'total_section' || row.type === 'grand_total') {
      const sc = bySect.get(row.rowKey) ?? [];
      if (sc.length === 0) return row;
      return { ...row, formula: [...(row.formula ?? []), ...sc.map(r => r.rowKey)] };
    }
    return row;
  });
}
