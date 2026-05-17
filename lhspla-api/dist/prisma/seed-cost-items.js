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
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const COST_ITEMS = [
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM AUTRE PARTICIPANT+AGENT", unitCost: 40000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM AUTRE PARTICIPANT+CHEF DE DEPARTEMENT & CHEF DE SERVICE & ASSIMILE", unitCost: 50000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 1 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM AUTRE PARTICIPANT+DIRECTEUR", unitCost: 80000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 2 },
    { nature: "FORFAIT REPAS", designation: "FORFAIT REPAS AGENTS NPSP", unitCost: 12000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+RAPPORT", order: 0 },
    { nature: "FORFAIT REPAS", designation: "FORFAIT REPAS CHEF DE SERVICE & CHEF DE SERVICE & ASSIMILE NPSP", unitCost: 15000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+RAPPORT", order: 1 },
    { nature: "FORFAIT REPAS", designation: "FORFAIT REPAS DIRECTEUR NPSP", unitCost: 24000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+RAPPORT", order: 2 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\"", unitCost: 820.0, justificatif: "RECU DE CARBURANT", order: 0 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+YAKRO (A/R)", unitCost: 82000.0, justificatif: "RECU DE CARBURANT", order: 1 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+BOUAKE (A/R)", unitCost: 116112.0, justificatif: "RECU DE CARBURANT", order: 2 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+BASSAM (A/R)", unitCost: 12136.0, justificatif: "RECU DE CARBURANT", order: 3 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+MAN (A/R)", unitCost: 198768.0, justificatif: "RECU DE CARBURANT", order: 4 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+KORHOGO (A/R)", unitCost: 188928.0, justificatif: "RECU DE CARBURANT", order: 5 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+JACQUEVILLE (A/R)", unitCost: 19680.0, justificatif: "RECU DE CARBURANT", order: 6 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" ABIDJAN+ADIAKE (A/R)", unitCost: 29520.0, justificatif: "RECU DE CARBURANT", order: 7 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+YAKRO (A/R)", unitCost: 34112.0, justificatif: "RECU DE CARBURANT", order: 8 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+BASSAM (A/R)", unitCost: 126608.0, justificatif: "RECU DE CARBURANT", order: 9 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+MAN (A/R)", unitCost: 141040.0, justificatif: "RECU DE CARBURANT", order: 10 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+JACQUEVILLE (A/R)", unitCost: 123328.0, justificatif: "RECU DE CARBURANT", order: 11 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+KORHOGO (A/R)", unitCost: 72816.0, justificatif: "RECU DE CARBURANT", order: 12 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"SUPER\" BOUAKE+ADIAKE (A/R)", unitCost: 37392.0, justificatif: "RECU DE CARBURANT", order: 13 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\"", unitCost: 675.0, justificatif: "RECU DE CARBURANT", order: 14 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" ABIDJAN+YAKRO (A/R)", unitCost: 67500.0, justificatif: "RECU DE CARBURANT", order: 15 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" ABIDJAN+BOUAKE (A/R)", unitCost: 95580.0, justificatif: "RECU DE CARBURANT", order: 16 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" ABIDJAN+BASSAM (A/R)", unitCost: 9990.0, justificatif: "RECU DE CARBURANT", order: 17 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOL\" ABIDJAN+MAN (A/R)", unitCost: 163620.0, justificatif: "RECU DE CARBURANT", order: 18 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" ABIDJAN+ADIAKE (A/R)", unitCost: 24300.0, justificatif: "RECU DE CARBURANT", order: 19 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOL\" ABIDJAN+JACQUEVILLE (A/R)", unitCost: 16200.0, justificatif: "RECU DE CARBURANT", order: 20 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOL\" ABIDJAN+KORHOGO (A/R)", unitCost: 155520.0, justificatif: "RECU DE CARBURANT", order: 21 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+YAKRO (A/R)", unitCost: 31320.0, justificatif: "RECU DE CARBURANT", order: 22 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+BASSAM (A/R)", unitCost: 104220.0, justificatif: "RECU DE CARBURANT", order: 23 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+MAN (A/R)", unitCost: 116100.0, justificatif: "RECU DE CARBURANT", order: 24 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+JACQUEVILLE  (A/R)", unitCost: 101520.0, justificatif: "RECU DE CARBURANT", order: 25 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+KORHOGO  (A/R)", unitCost: 59940.0, justificatif: "RECU DE CARBURANT", order: 26 },
    { nature: "CARBURANT ET PEAGE", designation: "CARBURANT Type \"GAZOIL\" BOUAKE+ADIAKE (A/R)", unitCost: 30780.0, justificatif: "RECU DE CARBURANT", order: 27 },
    { nature: "FORFAIT CARBURANT", designation: "FORFAIT CARBURANT PARTICIPANTS DD, DR, DGS, PREFET, SOUS+PREFET et assimilés)", unitCost: 25000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "EQUIPEMENT", designation: "ACHAT DE MATERIEL DIVERS", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 0 },
    { nature: "EQUIPEMENT", designation: "ACHAT DE MATERIEL INFORMATIQUE", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "EQUIPEMENT", designation: "ACHAT DE MATERIEL DE TRANSPORT", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 2 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM AGENT", unitCost: 55000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 3 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM CHEF DE SERVICE", unitCost: 100000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 4 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM CHEF DE DEPARTEMENT", unitCost: 115000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 5 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM DIRECTEUR", unitCost: 145000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 6 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM DIRECTEUR GENERAL", unitCost: 0.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 7 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL AGENT AFOUEST", unitCost: 100000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 8 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE SERVICE AFOUEST", unitCost: 155000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 9 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE DEPARTEMENT AFOUEST", unitCost: 165000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 10 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR GENERAL AFOUEST", unitCost: 0.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 11 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR AFOUEST", unitCost: 220000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 12 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL AGENT AUTRE AFRIQUE", unitCost: 120000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 13 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE SERVICE AUTRE AFRIQUE", unitCost: 180000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 14 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE DEPARTEMENT AUTRE AFRIQUE", unitCost: 190000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 15 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR GENERAL AUTRE AFRIQUE", unitCost: 0.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 16 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR AUTRE AFRIQUE", unitCost: 245000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 17 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL AGENT EUROPE", unitCost: 170000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 18 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE SERVICE EUROPE", unitCost: 200000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 19 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL CHEF DE DEPARTEMENT EUROPE", unitCost: 250000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 20 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR GENERAL EUROPE", unitCost: 0.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 21 },
    { nature: "FULL PERDIEMS", designation: "FULL PERDIEM INTERNATIONAL DIRECTEUR EUROPE", unitCost: 315000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 22 },
    { nature: "APPUIS FINANCIERS", designation: "FORFAIT COLLATION", unitCost: 10000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "APPUIS FINANCIERS", designation: "FORFAIT COLLATION COMITE MEDICAMENT", unitCost: 25000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 1 },
    { nature: "APPUIS FINANCIERS", designation: "FORFAIT TRANSPORT", unitCost: 10000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 2 },
    { nature: "COMMUNICATION", designation: "FRAIS DE COMMUNICATION", unitCost: 10000.0, justificatif: "RECU DE COMMUNICATION", order: 0 },
    { nature: "COMMUNICATION", designation: "FORFAIT INTERNET VISIO CONFERENCE", unitCost: 3000.0, justificatif: "RECU DE COMMUNICATION", order: 1 },
    { nature: "FORFAIT TRANSPORT", designation: "FORFAIT DE TRANSPORT +100KM", unitCost: 10000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "FORFAIT TRANSPORT", designation: "FORFAIT DE TRANSPORT 100 A 300 KM", unitCost: 20000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 1 },
    { nature: "FORFAIT TRANSPORT", designation: "FORFAIT DE TRANSPORT >300 KM", unitCost: 30000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 2 },
    { nature: "DIVERS", designation: "KITS", unitCost: 0.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "COMMUNICATION", designation: "CONNEXION FLYBOX", unitCost: 30000.0, justificatif: "RECU DE COMMUNICATION", order: 2 },
    { nature: "DIVERS", designation: "FRAIS DIVERS", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "FRAIS D'HOTEL", designation: "FRAIS D'HOTEL", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 0 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre supérieur 1", unitCost: 65000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre supérieur 2", unitCost: 80000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 2 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre supérieur 3", unitCost: 100000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 3 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre standard YAKRO", unitCost: 30000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 4 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (YAKRO)", unitCost: 25000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 5 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café  (YAKRO)", unitCost: 5000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 6 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner  (YAKRO)", unitCost: 10000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 7 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (YAKRO)", unitCost: 100000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 8 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur  (YAKRO)", unitCost: 150000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 9 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur  (YAKRO)", unitCost: 200000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 10 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (YAKRO)", unitCost: 700.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 11 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre BASSAM", unitCost: 50000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 12 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (BASSAM)", unitCost: 25000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 13 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café  (BASSAM)", unitCost: 4000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 14 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner  (BASSAM)", unitCost: 18000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 15 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (BASSAM)", unitCost: 100000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 16 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur  (BASSAM)", unitCost: 150000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 17 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur  (BASSAM)", unitCost: 200000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 18 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (BASSAM)", unitCost: 800.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 19 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (ABIDJAN CLASSE 1 )", unitCost: 25000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 20 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café (ABIDJAN CLASSE 1 )", unitCost: 5000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 21 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner (ABIDJAN CLASSE 1 )", unitCost: 18000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 22 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (ABIDJAN CLASSE 1 )", unitCost: 200000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 23 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur  (ABIDJAN CLASSE 1 )", unitCost: 250000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 24 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur (ABIDJAN CLASSE 1 )", unitCost: 350000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 25 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (ABIDJAN CLASSE 1 )", unitCost: 750.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 26 },
    { nature: "FRAIS D'HOTEL", designation: "Location de chambre standard BOUAKE", unitCost: 85000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 27 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (BOUAKE)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 28 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café  (BOUAKE)", unitCost: 6000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 29 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner  (BOUAKE)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 30 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (BOUAKE)", unitCost: 150000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 31 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur  (BOUAKE)", unitCost: 225000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 32 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur  (BOUAKE)", unitCost: 300000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 33 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (BOUAKE)", unitCost: 800.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 34 },
    { nature: "FRAIS D'HOTEL", designation: "Autres", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 35 },
    { nature: "FRAIS D'HOTEL", designation: "TVA", unitCost: 0.18, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 36 },
    { nature: "FRAIS D'HOTEL", designation: "TDT", unitCost: 0.025, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 37 },
    { nature: "RESTAURATION", designation: "FRAIS DE RESTAURATION PAUSE CAFE MILY'S GOURMET", unitCost: 10000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 0 },
    { nature: "RESTAURATION", designation: "FRAIS DE RESTAURATION PAUSE DEJEUNER MILY'S GOURMET", unitCost: 12500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "FORFAIT TRANSPORT", designation: "FRAIS DE TRANSPORT", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 3 },
    { nature: "HONORAIRE", designation: "HONORAIRE FORMATION", unitCost: 0.0, justificatif: "CONTRAT+ NOTE D'HONORAIRE+RAPPORT", order: 0 },
    { nature: "HONORAIRE", designation: "ASSISTANCE LINGUSTIQUE", unitCost: 0.0, justificatif: "CONTRAT+ NOTE D'HONORAIRE+RAPPORT", order: 1 },
    { nature: "FRAIS D'HOTEL", designation: "Location autre equipement", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 38 },
    { nature: "LOCATION DE VEHICULE", designation: "LOCATION DE VEHICULE Type Berline", unitCost: 50000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 0 },
    { nature: "LOCATION DE VEHICULE", designation: "LOCATION DE VEHICULE Type 4x4 (véhicule de +5 ans)", unitCost: 80000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "LOCATION DE VEHICULE", designation: "LOCATION DE VEHICULE Type 4x4", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 2 },
    { nature: "LOCATION DE VEHICULE", designation: "LOCATION DE VEHICULE Type SUV", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 3 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE ABIDJAN", unitCost: 500.0, justificatif: "RECU DE PEAGE", order: 28 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE ABIDJAN+YAMOUSSOKRO (ATTINGUIE& N'ZIANOUAN)", unitCost: 2000.0, justificatif: "RECU DE PEAGE", order: 29 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE GRAND BASSAM", unitCost: 1000.0, justificatif: "RECU DE PEAGE", order: 30 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE MOAPE", unitCost: 500.0, justificatif: "RECU DE PEAGE", order: 31 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE THOMASSET", unitCost: 500.0, justificatif: "RECU DE PEAGE", order: 32 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE BOUAFLE+DALOA (BONZI & GONATE)", unitCost: 1000.0, justificatif: "RECU DE PEAGE", order: 33 },
    { nature: "CARBURANT ET PEAGE", designation: "PEAGE YAMOUSSOKRO+BOUAKE", unitCost: 2000.0, justificatif: "RECU DE PEAGE", order: 34 },
    { nature: "PERDIEM", designation: "PERDIEMS AGENT", unitCost: 25000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "PERDIEM", designation: "PERDIEMS CHEF DE SERVICE", unitCost: 35000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 1 },
    { nature: "PERDIEM", designation: "PERDIEMS CHEF DE DEPARTEMENT", unitCost: 35000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 2 },
    { nature: "PERDIEM", designation: "PERDIEMS DIRECTEUR", unitCost: 45000.0, justificatif: "OM+EMARGEMENT+LISTE DE PRESENCE+CNI", order: 3 },
    { nature: "PRIME D'INVENTAIRE", designation: "PRIME D'INVENTAIRE DIRECTEUR", unitCost: 40000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 0 },
    { nature: "PRIME D'INVENTAIRE", designation: "PRIME D'INVENTAIRE CHEF DE DEPARTEMENT", unitCost: 35000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 1 },
    { nature: "PRIME D'INVENTAIRE", designation: "PRIME D'INVENTAIRE CHEF DE SERVICE", unitCost: 30000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 2 },
    { nature: "PRIME D'INVENTAIRE", designation: "PRIME D'INVENTAIRE AGENT", unitCost: 30000.0, justificatif: "EMARGEMENT+LISTE DE PRESENCE+CNI", order: 3 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Papier Conférences (Rouleaux de 5)", unitCost: 4500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 0 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Post+it", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 1 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Ramettes de Papiers carton de 5", unitCost: 14000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 2 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Bic crystal+ Couleur Bleu", unitCost: 100.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 3 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Bic crystal+ Couleur Rouge", unitCost: 100.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 4 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Crayon à papier", unitCost: 90.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 5 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Critériums", unitCost: 1000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 6 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Gomme Blanche", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 7 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Marqueurs indelibiles+ Couleurs Bleu", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 8 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Marqueurs indelibiles+ Couleurs Rouge", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 9 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Marqueurs indelibiles+ Couleurs Noir", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 10 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Chemise à Rabat étui de 10", unitCost: 5000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 11 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Chemises cartonnées paquet de 100", unitCost: 6000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 12 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Sous Chemises paquet de 250", unitCost: 4000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 13 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Blocs notes", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 14 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Fluos marqueurs", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 15 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Traceuse", unitCost: 400.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 16 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Enveloppes blanches (Moyen format)", unitCost: 600.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 17 },
    { nature: "FOURNITURES DE BUREAUX", designation: "parapheur", unitCost: 8000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 18 },
    { nature: "FOURNITURES DE BUREAUX", designation: "surligneur", unitCost: 500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 19 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Ruban adhesif (Rouleau)", unitCost: 1500.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 20 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Enveloppes A4 (Paquet de 25)", unitCost: 2000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 21 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M283 MFP Magenta", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 22 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M283 MFP Noir", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 23 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M283 MFP Cyan", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 24 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M283 MFP Yellow", unitCost: 70000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 25 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M282/M285 MFP Noir", unitCost: 75000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 26 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M282/M285 MFP Magenta", unitCost: 75000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 27 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M282/M285 MFP Yellow", unitCost: 75000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 28 },
    { nature: "FOURNITURES DE BUREAUX", designation: "Toner HP Laserjet PRO M282/M285 MFP Cyan", unitCost: 75000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 29 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (YAKRO CLASSE SUPERIEUR)", unitCost: 30000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 39 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café  (YAKRO CLASSE SUPERIEUR)", unitCost: 4000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 40 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner  (YAKRO CLASSE SUPERIEUR)", unitCost: 25000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 41 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (YAKRO CLASSE SUPERIEUR)", unitCost: 200000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 42 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur (YAKRO CLASSE SUPERIEUR)", unitCost: 500000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 43 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur  (YAKRO CLASSE SUPERIEUR)", unitCost: 500000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 44 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (YAKRO CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 45 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  (BOUAKE CLASSE SUPERIEUR)", unitCost: 30000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 46 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café (BOUAKE CLASSE SUPERIEUR)", unitCost: 5000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 47 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner (BOUAKE CLASSE SUPERIEUR)", unitCost: 20000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 48 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur (BOUAKE CLASSE SUPERIEUR)", unitCost: 300000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 49 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur (BOUAKE CLASSE SUPERIEUR)", unitCost: 500000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 50 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur (BOUAKE CLASSE SUPERIEUR)", unitCost: 500000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 51 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle (BOUAKE CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 52 },
    { nature: "FRAIS D'HOTEL", designation: "Location vidéoprojecteur  ( ABIDJAN SUPERIEUR)", unitCost: 30000.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 53 },
    { nature: "FRAIS D'HOTEL", designation: "Pause café ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 54 },
    { nature: "FRAIS D'HOTEL", designation: "Pause Déjeûner ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 55 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (30 Places) + vidéoprojecteur ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 56 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (50 Places) + vidéoprojecteur ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 57 },
    { nature: "FRAIS D'HOTEL", designation: "Salle pour les plénières  (+50 Places) + vidéoprojecteur ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 58 },
    { nature: "FRAIS D'HOTEL", designation: "Eau minérale en Salle ( ABIDJAN CLASSE SUPERIEUR)", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 59 },
    { nature: "FRAIS D'HOTEL", designation: "HEBERGEMENT AGENT", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 60 },
    { nature: "FRAIS D'HOTEL", designation: "HEBERGEMENT CHEF DE SERVICE", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 61 },
    { nature: "FRAIS D'HOTEL", designation: "HEBERGEMENT CHEF DE DEPARTEMENT", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 62 },
    { nature: "FRAIS D'HOTEL", designation: "HEBERGEMENT DIRECTEUR", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 63 },
    { nature: "FRAIS D'HOTEL", designation: "HEBERGEMENT DIRECTEUR GENERAL", unitCost: 0.0, justificatif: "FACTURE + BON DE LIVRAISON SIGNEE", order: 64 },
];
async function main() {
    console.log('Suppression des anciens CostItems...');
    const deleted = await prisma.costItem.deleteMany({});
    console.log(deleted.count + ' items supprimes.');
    console.log('Insertion des nouveaux CostItems (042026)...');
    const result = await prisma.costItem.createMany({
        data: COST_ITEMS.map(item => ({
            nature: item.nature,
            designation: item.designation,
            unitCost: item.unitCost,
            justificatif: item.justificatif,
            order: item.order,
            isActive: true,
        })),
    });
    console.log(result.count + ' items crees.');
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-cost-items.js.map