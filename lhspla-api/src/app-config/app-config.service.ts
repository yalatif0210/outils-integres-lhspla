import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, { value: string; label: string }> = {
  banner_subtitle: {
    value: 'NPSP-CI · Projet financé par USAID · FY2026',
    label: "Sous-titre de la bannière d'accueil",
  },
  compilation_footer: {
    value: 'LHSPLA-TA | NPSP-CI | Compilé par Charles Oscar LEBRI, MEL Manager | FY2026',
    label: 'Pied de page de la compilation',
  },
  exchange_rate: {
    value: '655',
    label: 'Taux de change (1 USD en FCFA)',
  },
  tva_rate: {
    value: '0.18',
    label: 'Taux TVA (ex: 0.18 = 18%)',
  },
  tdt_rate: {
    value: '0.025',
    label: 'Taux TDT (ex: 0.025 = 2.5%)',
  },
  transfer_fee_rate: {
    value: '0.05',
    label: 'Frais de transfert Contractualisation (ex: 0.05 = 5%)',
  },
  fiscal_year_tag: {
    value: 'FY2026',
    label: "Tag de l'année fiscale (ex: FY2026) — numérotation des budgets et TDR",
  },
  memo_enabled: {
    value: 'false',
    label: 'Activer la gestion des MEMOs budgétaires (true/false) — super_admin uniquement',
  },
};

@Injectable()
export class AppConfigService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<{ key: string; value: string; label: string }[]> {
    const rows = await this.prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
    const stored = Object.fromEntries(rows.map(r => [r.key, r]));

    return Object.entries(DEFAULTS).map(([key, def]) => ({
      key,
      label: def.label,
      value: stored[key]?.value ?? def.value,
    }));
  }

  async getMap(): Promise<Record<string, string>> {
    const list = await this.getAll();
    return Object.fromEntries(list.map(c => [c.key, c.value]));
  }

  async upsert(key: string, value: string): Promise<{ key: string; value: string }> {
    const label = DEFAULTS[key]?.label ?? key;
    return this.prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, label },
    });
  }
}
