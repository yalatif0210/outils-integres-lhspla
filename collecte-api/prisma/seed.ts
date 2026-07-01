import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENTITIES = [
  { code: 'QAD', label: 'Quantification–Achat–Distribution' },
  { code: 'CAD', label: "Chaîne d'Approvisionnement Décentralisée" },
  { code: 'CAC', label: "Chaîne d'Approvisionnement Communautaire" },
  { code: 'SE',  label: 'Suivi & Évaluation' },
  { code: 'SI',  label: "Systèmes d'Information" },
  { code: 'COM', label: 'Communication' },
  { code: 'PMO', label: 'Project Management Office' },
];

// Mapping des codes du fichier SEED (qui utilise "S&E") vers les codes en base ("SE")
function normalizeEntityCode(code: string): string {
  return code === 'S&E' ? 'SE' : code;
}

const SECTIONS = [
  {
    id: 'proposal-summary',
    titre: 'Résumé de la proposition',
    rubriqueNofo: 'Proposal Summary',
    objectif: 'transversal',
    entites: ['PMO'],
    ordre: 1,
    contributionMode: 'lecture_seule',
    texteReference: `La NPSP-CI propose un programme ciblé de six mois visant à préserver les investissements antérieurs des États-Unis et à accélérer la transition de la Côte d'Ivoire vers une chaîne d'approvisionnement sanitaire résiliente et pilotée par le pays. Conformément à la stratégie « America First Global Health Strategy » (AFGHS), le programme met l'accent sur des résultats mesurables, la responsabilité « dépenses-résultats » et l'utilisation efficace des ressources américaines. Il s'organise autour des quatre objectifs de l'appel : (1) renforcer la gouvernance et la préparation de la chaîne nationale ; (2) coordonner un approvisionnement transparent et traçable et le flux physique des produits vers tous les points de prestation ; (3) déployer et exploiter un écosystème d'information interopérable qui ancre l'usage des données dans la décision de routine à tous les niveaux ; et (4) permettre une transition durable d'une gestion soutenue par les bailleurs vers une gestion pilotée par le pays.

La mise en œuvre est assurée par sept équipes complémentaires : Quantification–Achat–Distribution (QAD), Chaîne d'Approvisionnement Décentralisée (CAD), Chaîne d'Approvisionnement Communautaire (CAC), Suivi & Évaluation (S&E), Systèmes d'Information (SI), Communication (COM) et le bureau de gestion de projet (PMO).

L'essentiel du programme est physique et institutionnel — achat rationnel d'ARV, d'antipaludiques et de produits SMI, dédouanement conforme, entreposage et chaîne du froid aux normes ISO, et distribution du dernier kilomètre vers les 113 districts jusqu'au niveau communautaire — renforcé par des innovations opérationnelles qui rendent la chaîne anticipatrice plutôt que réactive : traçabilité GS1 de bout en bout, analytique prédictive des ruptures et redistribution de stock assistées par IA, première couche d'interopérabilité opérationnelle mSupply–DHIS2, et une ligne de base de maturité numérique qui rend la durabilité mesurable.`,
  },
  {
    id: 'introduction-organisation',
    titre: "Présentation de l'organisation",
    rubriqueNofo: 'Introduction to the Organization',
    objectif: 'transversal',
    entites: ['PMO'],
    ordre: 2,
    contributionMode: 'lecture_seule',
    texteReference: `La NPSP-CI est l'établissement pharmaceutique public central de la Côte d'Ivoire, responsable de l'achat, du stockage et de la distribution des produits de santé essentiels à travers la pyramide sanitaire nationale — des entrepôts centraux aux 113 districts sanitaires, aux pôles régionaux, aux établissements de soins primaires (ESPC) et au niveau communautaire. La NPSP-CI exploite les systèmes logistiques nationaux utilisés quotidiennement dans plus de 2 000 établissements : eSIGL pour la remontée des données de la périphérie vers le niveau central, et mSupply pour la gestion quotidienne des stocks. Elle travaille en étroite collaboration avec les organes de gouvernance cités dans cet appel — la Direction de l'Approvisionnement Pharmaceutique (DAP), la Commission nationale de coordination de la chaîne d'approvisionnement (CNCAM), l'autorité de régulation (AIRP) et le Laboratoire national de santé publique (LNSP) — ainsi qu'avec les programmes de lutte contre la maladie (PNLS, PNLP, PNLT, PNSME).

Dans le cadre de l'accord de coopération LHSPLA financé par le PEPFAR, la NPSP-CI dispose d'un bilan avéré de gestion de bout en bout des produits de santé financés par les bailleurs : achat concurrentiel et gestion des fournisseurs, dédouanement par agents tiers, entreposage central conforme et stockage en chaîne du froid, et distribution programmée vers les magasins de district et les points de prestation. Cette capacité cœur de chaîne d'approvisionnement est complétée par une capacité d'ingénierie numérique interne : méthodologie d'évaluation de la qualité des données (DQA/RDQA), tableaux de bord de production, pipeline ETL, système de connaissances RAG documenté, et application de redistribution de stock assistée par IA. Le programme est mis en œuvre par sept équipes — QAD, CAD, CAC, S&E, SI, COM et le PMO — chacune responsable d'activités et de jalons définis.`,
  },
  {
    id: 'problem-statement',
    titre: 'Exposé du problème',
    rubriqueNofo: 'Problem Statement',
    objectif: 'transversal',
    entites: ['SE', 'SI', 'QAD'],
    ordre: 3,
    contributionMode: 'commentaire',
    texteReference: `La Côte d'Ivoire (≈ 32 millions d'habitants) supporte un fardeau élevé de VIH (prévalence adulte de 1,7 %), de paludisme endémique, de tuberculose et de besoins de santé maternelle et infantile, aggravé par des pénuries de personnel de santé et des infrastructures rurales faibles. Les faiblesses persistantes de l'approvisionnement pharmaceutique et de la distribution du dernier kilomètre entraînent des ruptures évitables de médicaments essentiels, en particulier dans les districts mal desservis. Quatre goulots d'étranglement sont déterminants et directement traitables en six mois :

**Fragmentation des systèmes d'information.** eSIGL (reporting) et mSupply (gestion quotidienne des stocks) fonctionnent en silos, et aucun flux de données n'existe aujourd'hui entre les systèmes logistiques et le DHIS2 national. L'analyse conjointe stock × données de service est donc impossible, privant les décideurs d'une vision intégrée.

**Gestion réactive plutôt qu'anticipatrice.** La signalisation des ruptures intervient après coup plutôt qu'en amont. Les données disponibles sont sous-exploitées : des produits deviennent dormants, périment ou restent en surstock alors que les données nécessaires pour l'éviter existent déjà.

**Traçabilité et assurance qualité limitées.** L'absence de traçabilité produit de bout en bout, fondée sur des standards, limite la transparence, la capacité de rappel et la protection contre les produits sous-standards et falsifiés.

**Données non encore ancrées dans la décision de routine.** Les données sont collectées mais insuffisamment utilisées dans les décisions quotidiennes aux niveaux région, district, ESPC et communautaire — précisément la lacune que ce programme comble, en cohérence avec la stratégie nationale de santé numérique et le plan national de la chaîne d'approvisionnement (PNSCA).`,
  },
  {
    id: 'objectif-1',
    titre: 'Objectif 1 — Gouvernance et préparation de la chaîne nationale',
    rubriqueNofo: 'Project Goal and Objectives',
    objectif: 'obj1',
    entites: ['QAD', 'SE', 'SI'],
    ordre: 4,
    contributionMode: 'commentaire',
    texteReference: `**But général du programme.** Renforcer la résilience, l'efficacité et l'appropriation nationale de la chaîne d'approvisionnement sanitaire de la Côte d'Ivoire afin que les produits essentiels dont la qualité est assurée parviennent aux personnes qui en ont besoin, au moment où elles en ont besoin, avec des réductions mesurables des ruptures et du gaspillage et un basculement démontrable vers une gestion pilotée par l'État.

**Objectif 1 (SMART, ≤ 6 mois).** D'ici la fin du programme, renforcer la gouvernance et la planification prévisionnelle en appuyant la DAP, la CNCAM et les programmes de lutte contre la maladie pour conduire la quantification et la prévision via l'outil QAT vers une précision ≥ 85 % ; exploiter un tableau de bord de performance partagé suivant l'exécution des plans d'approvisionnement, les déficits de financement et le taux de satisfaction des commandes par programme ; et mettre en service une analytique prédictive des ruptures assistée par IA sur les données eSIGL et Open mSupply pour un ajustement proactif des plans.`,
  },
  {
    id: 'objectif-2',
    titre: 'Objectif 2 — Achat coordonné, transparent et chaîne physique de bout en bout',
    rubriqueNofo: 'Project Goal and Objectives',
    objectif: 'obj2',
    entites: ['QAD', 'CAD'],
    ordre: 5,
    contributionMode: 'commentaire',
    texteReference: `**Objectif 2 (SMART, ≤ 6 mois).** D'ici la fin du programme, coordonner l'achat avec les partenaires d'approvisionnement financés par les États-Unis (ex. GF/WAMBO, PSM) selon des processus rationnels, transparents et traçables ; assurer le dédouanement conforme dans les délais, un stockage conforme et une distribution en temps voulu vers les points de prestation désignés à travers les 113 districts ; lancer une traçabilité de bout en bout fondée sur les standards GS1 sur un ensemble de produits prioritaires ; et déployer l'outil interne de redistribution de stock assisté par IA pour rééquilibrer les stocks entre sites selon les règles FEFO/FIFO.`,
  },
  {
    id: 'objectif-3',
    titre: "Objectif 3 — Écosystème d'information interopérable et usage des données ancré",
    rubriqueNofo: 'Project Goal and Objectives',
    objectif: 'obj3',
    entites: ['SI', 'CAD', 'CAC'],
    ordre: 6,
    contributionMode: 'commentaire',
    texteReference: `**Objectif 3 (SMART, ≤ 6 mois).** D'ici la fin du programme, livrer une première couche d'interopérabilité opérationnelle reliant les données mSupply au DHIS2 national sur un périmètre pilote défini, produisant des indicateurs composites stock × service ; ancrer l'usage de routine des données aux cinq niveaux (central, régional, district, ESPC, communautaire) via des tableaux de bord et alertes spécifiques à chaque niveau ; et établir la classification de connectivité et un déploiement pilote « hors-ligne d'abord » d'Open mSupply, en cohérence avec la stratégie nationale de santé numérique.`,
  },
  {
    id: 'objectif-4',
    titre: 'Objectif 4 — Transition durable vers une gestion pilotée par le pays',
    rubriqueNofo: 'Project Goal and Objectives',
    objectif: 'obj4',
    entites: ['PMO', 'QAD', 'SE'],
    ordre: 7,
    contributionMode: 'commentaire',
    texteReference: `**Objectif 4 (SMART, ≤ 6 mois).** D'ici la fin du programme, livrer une ligne de base de maturité numérique et une feuille de route priorisée validée par la DAP ; conduire un cycle structuré de renforcement des capacités et de mentorat STEP pour le personnel de la DAP, de la CNCAM et de la NPSP-CI ; établir une grille d'autonomie institutionnelle pour la DAP et la CNCAM ; et consolider un socle numérique open-source (Open mSupply, DHIS2) qui réduit la dépendance fournisseur et les coûts récurrents — faisant progresser de manière mesurable la transition vers la prise en charge par l'État.`,
  },
  {
    id: 'activites-5-1',
    titre: '5.1 Gouvernance, quantification et planification prévisionnelle',
    rubriqueNofo: 'Project Activities',
    objectif: 'obj1',
    entites: ['QAD', 'SE', 'SI'],
    ordre: 8,
    contributionMode: 'structuree',
    texteReference: `**Quantification et suivi des plans d'approvisionnement (QAD).** Fournir une assistance technique à la DAP, à la CNCAM et aux programmes pour conduire la quantification/prévision dans QAT (VIH/ARV, paludisme, SMI, TB, laboratoire) vers une précision ≥ 85 % ; faciliter les réunions de bilan multipartites mensuelles/trimestrielles ; et tenir un tableau de bord partagé suivant les taux d'exécution des plans, les déficits de financement et la satisfaction des commandes, avec des plans d'approvisionnement prêts à l'achat soumis trimestriellement à l'agent d'approvisionnement désigné par le gouvernement américain.

**Analytique prédictive des ruptures assistée par IA (innovation).** Construire un service d'alerte précoce sur les données eSIGL et mSupply existantes et fiables pour signaler les conditions de pré-rupture, de péremption proche et de surstock, et alimenter les ajustements proactifs des plans par la DAP et la CNCAM. Faisable en six mois précisément parce que les données sont déjà accessibles ; la précision prédictive est présentée comme une cible à valider sur les données nationales, jamais comme un résultat acquis.

**Audit de performance indépendant et recherche opérationnelle (S&E).** Conduire un audit annuel indépendant de la performance de la chaîne nationale et une recherche opérationnelle ciblée sur les goulots d'étranglement, dont les conclusions alimentent les décisions de gouvernance.`,
  },
  {
    id: 'activites-5-2',
    titre: "5.2 Achat, entreposage, traçabilité et distribution du dernier kilomètre",
    rubriqueNofo: 'Project Activities',
    objectif: 'obj2',
    entites: ['QAD', 'CAD', 'SI'],
    ordre: 9,
    contributionMode: 'structuree',
    texteReference: `**Coordination d'un achat transparent (QAD).** Acheter les ARV, antipaludiques, produits SMI/SME et fournitures de laboratoire par des mécanismes concurrentiels, transparents et conformes au FAR ; coordonner avec les partenaires d'approvisionnement financés par les États-Unis ; comparer les prix aux références internationales ; évaluer la performance des fournisseurs ; et assurer un dédouanement conforme dans les délais via des agents tiers.

**Entreposage et chaîne du froid aux normes ISO (QAD).** Moderniser les entrepôts centraux NPSP-CI et PCA vers les normes internationales ISO : renforcer les infrastructures, les équipements de chaîne du froid et les systèmes de surveillance de la température, mettre en œuvre des solutions économes en énergie, et viser une certification ISO progressive.

**Traçabilité GS1 de bout en bout (innovation — QAD avec SI).** Lancer une traçabilité fondée sur les standards (GTIN, lot, péremption encodés en DataMatrix GS1) sur un ensemble de produits prioritaires, s'appuyant sur l'agenda d'harmonisation réglementaire africaine (AMRH) et le « Call to Action » de Lagos.

**Redistribution de stock assistée par IA (innovation, déjà développée — CAD avec SI).** Enrichir et déployer l'application interne de redistribution assistée par IA sur des districts pilotes pour déclencher le rééquilibrage inter-sites selon les règles FEFO/FIFO — y compris la logique de double rôle pour les sites simultanément source et cible.

**Logistique du dernier kilomètre et logistique d'urgence (CAD).** Organiser la distribution en temps voulu vers les ESPC et hôpitaux à travers tous les districts, appuyer le rééquilibrage inter-districts et les 10 Pôles régionaux d'excellence sanitaire (PRES), étendre la couverture aux établissements isolés et militaires (DSASA), et activer des protocoles standardisés de redistribution d'urgence.`,
  },
  {
    id: 'activites-5-3',
    titre: "5.3 Écosystème numérique interopérable et usage des données à tous les niveaux",
    rubriqueNofo: 'Project Activities',
    objectif: 'obj3',
    entites: ['SI', 'CAD', 'CAC'],
    ordre: 10,
    contributionMode: 'structuree',
    texteReference: `**Interopérabilité opérationnelle mSupply–DHIS2 (innovation).** Mettre en place une couche d'interopérabilité fondée sur un médiateur reliant les données mSupply au DHIS2 national sur un périmètre pilote, produisant des indicateurs composites stock × service (ex. ratio charge de cas/consommation, stock sur main, consommation moyenne mensuelle, adéquation des niveaux de stock).

**Usage des données ancré à chaque niveau.** Déployer des tableaux de bord et alertes spécifiques à chaque niveau pour qu'une donnée disponible déclenche une décision documentée : central, région/PRES, district, ESPC et communautaire/ASC.

**Classification de connectivité et déploiement hors-ligne d'abord.** Appliquer un protocole structuré de vérification de la connectivité pour classer les sites web vs hors-ligne, puis déployer et configurer Open mSupply sur un pilote borné.

**Assistant d'assistance et de coaching (innovation).** Déployer un assistant numérique combinant un canal de tickets et un moteur de coaching RAG fondé sur les documents de référence nationaux pour soutenir les gestionnaires de district et de région.`,
  },
  {
    id: 'activites-5-4',
    titre: '5.4 Renforcement des capacités et transition institutionnelle',
    rubriqueNofo: 'Project Activities',
    objectif: 'obj4',
    entites: ['PMO', 'QAD', 'SE'],
    ordre: 11,
    contributionMode: 'structuree',
    texteReference: `**Évaluation de la maturité numérique (innovation, jalon d'amorçage).** Livrer une évaluation structurée de la maturité numérique de la chaîne nationale, établissant une ligne de base chiffrée et une feuille de route priorisée validée par la DAP — l'ancrage qui rend la durabilité mesurable.

**Renforcement des capacités STEP et grille d'autonomie.** Conduire un cycle de mentorat STEP structuré pour le personnel de la DAP, de la CNCAM et de la NPSP-CI et établir une grille d'autonomie institutionnelle pour la DAP et la CNCAM, avec une feuille de route de transition.

**Préparation de la migration Open mSupply (SI).** Piloter une première étape bornée et autonome de la migration mSupply→Open mSupply. La migration nationale intégrale est présentée comme une vision-cible au-delà de cet accord.`,
  },
  {
    id: 'activites-5-5',
    titre: '5.5 Prestation de services communautaires et personnel de première ligne',
    rubriqueNofo: 'Project Activities',
    objectif: 'obj3',
    entites: ['CAC', 'COM', 'PMO'],
    ordre: 12,
    contributionMode: 'structuree',
    texteReference: `**Suivi de la disponibilité des produits communautaires (CAC).** Assurer un suivi mensuel des stocks dans les établissements de soins primaires et les postes d'agents de santé communautaires (ASC), générer des alertes de rupture vers les pharmaciens de district, et suivre la satisfaction des commandes pour les produits communautaires (TPT, iCCM, produits SMI/SME) par rapport à la cible ≥ 90 %.

**Appui au personnel de première ligne (CAC, avec COM).** Fournir un appui en allocations et/ou équipements aux soignants de première ligne, aux volontaires communautaires et aux agents de campagne paludisme/vaccination.

**Mobilisation des parties prenantes et demande (COM).** Coordonner la mobilisation des parties prenantes, la promotion de la santé et les activités d'adoption, et assurer l'identification visuelle (branding) du Département d'État américain sur tous les produits du programme.

**Financement domestique et contrôle (PMO, avec QAD).** Appuyer le gouvernement de la Côte d'Ivoire dans le développement de mécanismes durables de financement domestique des produits de santé et établir un mécanisme de contrôle et d'audit des marchés.`,
  },
  {
    id: 'methods-design',
    titre: 'Méthodes et conception du projet (modèle logique)',
    rubriqueNofo: 'Project Methods and Design',
    objectif: 'transversal',
    entites: ['SI', 'SE', 'PMO'],
    ordre: 13,
    contributionMode: 'commentaire',
    texteReference: `La logique du programme est unique et s'applique à chaque niveau de la pyramide : une donnée disponible est effectivement utilisée, ce qui produit une décision, qui produit un résultat. Cette chaîne « donnée → usage → décision → résultat » est l'épine dorsale de la conception et l'unité de valeur.

**Modèle logique :**
- **Intrants :** produits, entreposage et chaîne du froid ; flotte de distribution et magasins de district ; données eSIGL/mSupply fiables ; outils IA et RAG ; sept équipes (QAD, CAD, CAC, S&E, SI, COM, PMO).
- **Activités :** analytique prédictive ; redistribution ; pilote d'interopérabilité ; traçabilité GS1 ; coaching ; maturité et audit IT ; STEP.
- **Extrants :** tableaux de bord et alertes ; sites pilotes équipés ; indicateurs composites ; ligne de base ; personnel formé.
- **Effets (usage) :** décisions de routine fondées sur la donnée aux niveaux central, régional, district, ESPC et communautaire.
- **Impact :** moins de ruptures ; moins de gaspillage ; transition mesurable vers l'appropriation pays.

**Principes de conception.** On ne retient que des modules dont le livrable est vérifiable en six mois et utile même si un financement ultérieur ne se matérialise pas. Toute performance prédictive est présentée comme une cible à valider. Les dates de début sont séquencées pour suivre la fin des activités USAID « greenlist ».`,
  },
  {
    id: 'milestone-plan',
    titre: 'Plan des étapes clés',
    rubriqueNofo: 'Milestone Plan',
    objectif: 'transversal',
    entites: ['PMO', 'QAD', 'CAD', 'SI'],
    ordre: 14,
    contributionMode: 'structuree',
    texteReference: `Les jalons sont mesurables, vérifiables et directement liés aux objectifs (étape / livrable / méthode de vérification / paiement / échéance).

| Étape | Livrable | Vérification | Échéance |
|---|---|---|---|
| Ligne de base de maturité numérique (Obj.4) | Rapport de maturité + feuille de route priorisée | Document validé par la DAP | M2 |
| Plans d'achat et d'approvisionnement soumis (Obj.2) | Plans trimestriels prêts à l'achat | Plans acceptés par l'agent d'approvisionnement USG | M2 |
| Audit IT indépendant (plan de sécurité) | Évaluation de vulnérabilités + plan de remédiation | Rapport d'audit indépendant remis | M3 |
| Mise à niveau entreposage & chaîne du froid (Obj.2) | Stockage modernisé + surveillance température | Inspection du site ; checklist progrès ISO | M3 |
| Redistribution IA déployée (Obj.2) | App en service sur districts pilotes | Journal des redistributions | M4 |
| Traçabilité GS1 lancée (Obj.2) | Ensemble de produits prioritaires sérialisé | Articles scannés vérifiables dans le système | M4 |
| Cycles de distribution dernier kilomètre (Obj.2) | Livraisons programmées vers 113 districts | Registres de livraison ; taux de ponctualité | M4 |
| Analytique prédictive en service (Obj.1) | Tableau de bord d'alertes opérationnel | Démonstration + usage en revue DAP/CNCAM | M5 |
| Disponibilité & reporting communautaires (Obj.1) | Satisfaction ≥ 90 % / complétude ≥ 95 % suivies | Tableaux de bord communautaires | M5 |
| Bot de coaching/assistance déployé (Obj.3) | Assistant en service pour gestionnaires district | Statistiques d'usage et de résolution | M5 |
| Pilote d'interopérabilité mSupply–DHIS2 (Obj.3) | Flux automatisé + indicateurs composites | Indicateurs consultables sur sites pilotes | M6 |
| Pilote borné Open mSupply (Obj.3/4) | Classification connectivité + sites pilotes en service | Synchronisation effective + utilisateurs formés | M6 |
| Grille d'autonomie institutionnelle (Obj.4) | Grille DAP/CNCAM + feuille de route de transition | Grille validée soumise | M6 |`,
  },
  {
    id: 'monitoring-evaluation',
    titre: 'Plan de suivi et d\'évaluation',
    rubriqueNofo: 'Monitoring and Evaluation Plan',
    objectif: 'obj1',
    entites: ['SE'],
    ordre: 15,
    contributionMode: 'structuree',
    texteReference: `La performance est suivie par rapport à un plan de travail axé sur la performance approuvé par le Département d'État, rapprochant les dépenses des résultats. Les cibles ≥ 95 %, ≥ 90 % et ≥ 85 % sont reprises de la NOFO.

| Indicateur | Base | Cible | Source | Fréq. |
|---|---|---|---|---|
| Ponctualité de la distribution aux districts | à mesurer | taux de livraison à temps | Registres de livraison (CAD) | Mensuel |
| Progrès ISO entreposage/chaîne du froid | base M3 | progression vs base | Checklist d'inspection (QAD) | M3 / fin |
| Complétude des rapports logistiques | à mesurer | ≥ 95 % (NOFO) | eSIGL/Open mSupply | Mensuel |
| Satisfaction des commandes communautaires | à mesurer | ≥ 90 % (NOFO) | Tableau de bord performance | Mensuel |
| Précision de quantification | à mesurer | ≥ 85 % (NOFO) | QAT + données SI | Trimestriel |
| Produits sous alertes prédictives | 0 | ensemble traceur prioritaire | Service prédictif | Mensuel |
| Redistributions déclenchées (app IA) | 0 | documentées sur pilote | Journal de redistribution | Mensuel |
| Produits sérialisés GS1 | 0 | ensemble prioritaire | Système de traçabilité | M4 / fin |
| Indicateurs composites stock×service en service | 0 | sur le périmètre pilote | Interopérabilité/DHIS2 | M6 |
| Usage de l'assistant de coaching | 0 | interactions mensuelles | Logs de l'assistant | Mensuel |
| Score de maturité numérique | base M2 | progression vs base | Évaluation de maturité | M2 / fin |
| Score d'autonomie institutionnelle (DAP/CNCAM) | base M6 | grille établie | Grille d'autonomie | M6 |

Approche de suivi : revue mensuelle des données et revues trimestrielles de performance rapprochant l'avancement des dépenses (dépenses-résultats). Le reporting suit les conditions de l'accord et le 2 CFR 200.`,
  },
  {
    id: 'sustainability',
    titre: 'Financement futur et durabilité',
    rubriqueNofo: 'Future Funding / Sustainability',
    objectif: 'obj4',
    entites: ['PMO', 'QAD'],
    ordre: 16,
    contributionMode: 'commentaire',
    texteReference: `La durabilité est intégrée à la conception plutôt qu'ajoutée a posteriori, conformément à la priorité de l'AFGHS pour des systèmes pilotés par le pays.

**Appropriation par l'usage.** La durabilité repose sur la donnée effectivement utilisée par les homologues nationaux à chaque niveau — non sur les seuls outils. Les tableaux de bord et alertes sont conçus pour la décision de routine locale.

**Socle open-source.** Open mSupply et l'écosystème DHIS2 sont libres, largement éprouvés en contexte africain, et réduisent la dépendance fournisseur et les coûts récurrents.

**Transition mesurable.** La ligne de base de maturité numérique (M2) et la grille d'autonomie institutionnelle (M6) fournissent des points de départ chiffrés qui rendent les progrès démontrables.

**Capacités transférées.** Le mentorat STEP et l'assistant de coaching renforcent l'autonomie nationale d'exploitation, condition d'un retrait progressif de l'appui externe.`,
  },
  {
    id: 'project-partners',
    titre: 'Partenaires du projet',
    rubriqueNofo: 'Project Partners',
    objectif: 'transversal',
    entites: ['PMO', 'COM'],
    ordre: 17,
    contributionMode: 'commentaire',
    texteReference: `La mise en œuvre est conduite par la NPSP-CI en partenariat étroit avec les institutions nationales et les partenaires techniques, alignée sur le Plan stratégique national de santé et coordonnée avec le Fonds mondial et les autres bailleurs.

**Institutions nationales de gouvernance et de régulation :** DAP et CNCAM (gouvernance ; validation de la maturité, de la grille et des tableaux de bord), AIRP (enregistrement, anti-contrefaçon, pharmacovigilance), LNSP (assurance qualité), et programmes PNLS/PNLP/PNLT/PNSME.

**Partenaires de plateformes techniques :** la mSupply Foundation (déploiement d'Open mSupply et calendrier de migration) et la communauté DHIS2/HISP (interopérabilité LMIS–DHIS2).

**Partenaires d'approvisionnement financés par les États-Unis :** coordination avec l'agent d'approvisionnement désigné par le gouvernement américain et des partenaires tels que GF/WAMBO et PSM.

**Tutelle gouvernementale :** le ministère de la Santé, de l'Hygiène publique et de la Couverture maladie universelle, et le ministère de l'Économie et des Finances.`,
  },
  {
    id: 'risk-security',
    titre: 'Analyse des risques et plan de sécurité',
    rubriqueNofo: 'Risk Analysis / Security Plan',
    objectif: 'transversal',
    entites: ['PMO', 'SI'],
    ordre: 18,
    contributionMode: 'structuree',
    texteReference: `Les risques sont évalués par probabilité et impact, avec des actions d'atténuation. Les activités et plateformes en ligne sont couvertes par un audit IT indépendant incluant une évaluation des vulnérabilités.

| Risque | Probab. | Impact | Atténuation |
|---|---|---|---|
| Calendrier de migration Open mSupply incompatible avec 6 mois | Élevée | Élevé | Limiter l'accord à un pilote borné et autonome |
| Connectivité insuffisante sur les sites cibles | Moyenne | Moyen | Classification de connectivité d'abord ; s'appuyer sur la conception hors-ligne d'Open mSupply |
| Qualité/complétude inégale des données | Moyenne | Moyen | Étape de préparation/fiabilisation ; bases S&E mesurées avant fixation des cibles |
| Vulnérabilités des plateformes web | Moyenne | Élevé | Audit IT indépendant (M3) + plan de remédiation priorisé + correctifs critiques |
| Parallélisme/séquencement greenlist non respecté | Faible | Élevé | Aligner les dates de début sur la fin des activités greenlist |
| Retards d'achat/dédouanement | Moyenne | Moyen | Agents de dédouanement tiers ; protocoles de logistique d'urgence |
| Rotation du personnel / déficits de capacités | Moyenne | Moyen | Mentorat STEP ; assistant de coaching ; procédures documentées |`,
  },
];

async function main() {
  console.log('Seeding entities...');
  for (const e of ENTITIES) {
    await prisma.entity.upsert({
      where: { code: e.code },
      update: { label: e.label },
      create: e,
    });
  }

  console.log('Seeding reference sections...');
  for (const s of SECTIONS) {
    const entites = s.entites.map(normalizeEntityCode);
    await prisma.referenceSection.upsert({
      where: { id: s.id },
      update: {
        titre: s.titre,
        rubriqueNofo: s.rubriqueNofo,
        objectif: s.objectif,
        entites,
        ordre: s.ordre,
        contributionMode: s.contributionMode,
        texteReference: s.texteReference,
      },
      create: {
        id: s.id,
        titre: s.titre,
        rubriqueNofo: s.rubriqueNofo,
        objectif: s.objectif,
        entites,
        ordre: s.ordre,
        contributionMode: s.contributionMode,
        texteReference: s.texteReference,
      },
    });
  }

  console.log(`Seeded ${ENTITIES.length} entities and ${SECTIONS.length} sections.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
