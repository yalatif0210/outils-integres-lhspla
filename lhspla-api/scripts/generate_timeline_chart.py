"""
generate_timeline_chart.py
Génère le diagramme timeline "Risque de rupture nationale" du Weekly Operations Brief LHSPLA.

Usage :
    python generate_timeline_chart.py [brief_json_models.json]

Produit : timeline_chart.png dans le dossier courant.
"""

import json, re, sys, calendar
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch
import matplotlib.patheffects as pe
from datetime import datetime, timedelta
from pathlib import Path

# ─── Constantes couleurs ──────────────────────────────────────────────────────

C_CENTRALE  = '#1B3A5C'   # stock central (bleu marine foncé)
C_PERIPH    = '#4472C4'   # stock périphérique (bleu)
C_RUPTURE   = '#C00000'   # zone rupture (rouge)
C_BG        = '#F8F8F8'   # fond des lignes impaires
C_TODAY     = '#D06000'   # ligne verticale "aujourd'hui"
C_GRID      = '#DDDDDD'   # grilles mensuelles
C_GROUP_BG  = '#EAF0FB'   # fond entête groupe

BADGE_COLORS = {
    'PNLS':  '#2E75B6',
    'PNLP':  '#70AD47',
    'PNSME': '#ED7D31',
}

MARKER_COLORS = {
    'vert':   '#375623',
    'orange': '#7B3F00',
    'rouge':  '#C00000',
}
MARKER_BG = {
    'vert':   '#70AD47',
    'orange': '#FFC000',
    'rouge':  '#FF6666',
}

FR_MONTHS = {
    'janvier':1,'février':2,'mars':3,'avril':4,'mai':5,'juin':6,
    'juillet':7,'août':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,
    'jan':1,'fév':2,'fev':2,'mar':3,'avr':4,'jun':6,
    'juil':7,'jui':7,'aoû':8,'aou':8,'aout':8,'sep':9,'oct':10,'nov':11,'déc':12,'dec':12,
}
FR_MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

# ─── Parsing livraisons ───────────────────────────────────────────────────────

# Clauses qui éliminent une livraison
_DISQUALIFY = [
    r"recherche de fournisseurs?",
    r"sans financement",
    r"en attente de la documentation du fournisseur",
    r"en cours de sourcing",
    r"sourcing en cours",
    r"pas de fournisseurs? avec amm",
    # "ne pas être en mesure de livrer/fournir" = commande annulée (pas "de rapprocher" = juste non-avancée)
    r"ne pas être en mesure de (livrer|fournir|honorer)",
]

# Verbes d'engagement fort → livraison confirmée (triangle plein ▼)
_QUALIFY_CONFIRMED = [
    r"expédi[ée]{1,2}s?",
    r"livr[ée]{1,2}s?",
    r"attendu[ée]{0,2}s?",
]

# Verbes d'engagement faible → date estimée, non confirmée (triangle contour ▽)
_QUALIFY_ESTIMATED = [
    r"commandé[ée]{0,2}s?",
    r"annoncé[ée]{0,2}s?",
    r"planifi[ée]{1,2}s?",
]

# Bailleurs reconnus (GOVCI/BGE = État CI ; USG/MOU USG/PEPFAR = US Gov ; CHAI = Clinton HAI)
_BAILLEURS = ['FM', 'USG', 'PEPFAR', 'GOVCI', 'BGE', 'UNFPA', 'MOU USG', 'MCH', 'CHAI']

def _parse_delivery_date(month_str: str, year: int, position: str | None = None) -> datetime | None:
    """Retourne la date de livraison selon le qualificatif de position.
    début    → 5   | mi / (rien) → 15 (conservateur)
    fin / courant → 25  (évite d'utiliser le dernier jour exact)
    """
    mo = FR_MONTHS.get(month_str.lower().rstrip('.'))
    if mo is None:
        return None
    pos = (position or '').lower().strip()
    if 'fin' in pos or 'courant' in pos:
        day = 25
    elif 'mi' in pos:
        day = 15
    elif 'début' in pos or 'debut' in pos:
        day = 5
    else:  # sans qualificatif → conservateur
        day = 15
    try:
        return datetime(year, mo, day)
    except ValueError:
        return None

def parse_deliveries(commentaire: str, date_ref: datetime) -> list[dict]:
    """Retourne une liste triée (max 2) de livraisons {date, sentence, confirmed}.
    confirmed=True  → verbe fort (expédiées, planifiées, attendues, livrées)
    confirmed=False → verbe estimé (commandées, annoncées) — date non garantie
    """
    if not commentaire:
        return []

    sentences = re.split(
        r'\)\s+(?=\d)|(?<=\))\s+(?=[A-Z\d])',
        commentaire
    )
    if len(sentences) < 2:
        sentences = [commentaire]

    results = []
    seen = set()

    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue

        if any(re.search(p, sent, re.IGNORECASE) for p in _DISQUALIFY):
            continue

        # Déterminer le niveau de confirmation
        is_confirmed = any(re.search(p, sent, re.IGNORECASE) for p in _QUALIFY_CONFIRMED)
        is_estimated = any(re.search(p, sent, re.IGNORECASE) for p in _QUALIFY_ESTIMATED)
        if not is_confirmed and not is_estimated:
            continue

        if not any(b in sent for b in _BAILLEURS):
            continue

        confirmed = is_confirmed  # True si verbe fort, False si estimé

        # Chercher date exacte JJ/MM
        exact = re.search(r'(\d{1,2})/(\d{2})(?:/(\d{4}))?', sent)
        if exact:
            try:
                d = datetime(
                    int(exact.group(3)) if exact.group(3) else date_ref.year,
                    int(exact.group(2)),
                    int(exact.group(1))
                )
                if d >= date_ref and d not in seen:
                    seen.add(d)
                    results.append({'date': d, 'sentence': sent[:60], 'confirmed': confirmed})
                continue
            except ValueError:
                pass

        # Chercher mois + position + année optionnelle
        # "courant" ajouté comme qualificatif → 25 du mois (même que "fin")
        pat = (
            r'(début\s+|mi[-\s]|fin\s+|courant\s+)?'
            r'(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre'
            r'|jan|fév|fev|mar|avr|juil?|aout|aoû?|aou|sep|oct|nov|déc|dec)\.?'
            r'\s*(\d{4})?'
        )
        for m in re.finditer(pat, sent, re.IGNORECASE):
            month_str  = m.group(2)
            year_str   = m.group(3)
            position   = m.group(1)   # début / mi / fin / courant / None
            year       = int(year_str) if year_str else date_ref.year

            d = _parse_delivery_date(month_str, year, position)
            if d and d < date_ref and not year_str:
                try:
                    d = d.replace(year=d.year + 1)
                except ValueError:
                    d = None
            if d and d >= date_ref and d not in seen:
                seen.add(d)
                results.append({'date': d, 'sentence': sent[:60], 'confirmed': confirmed})
                break

    results.sort(key=lambda x: x['date'])
    return results[:2]

# ─── Classification A / B ─────────────────────────────────────────────────────

CRITICAL = {'RUPTURE_PAYS', 'RUPTURE_CENTRALE', 'RISQUE_ELEVE', 'PEREMPTION_PROCHE'}
HORIZON_DAYS = 6 * 30.44
# Seuil MSD pour inclure un RISQUE_ELEVE dans la timeline rupture
MSD_RISQUE_SEUIL = 2.0

def classify(stocks: list, date_ref: datetime) -> tuple[list, list]:
    group_a, group_b = [], []

    for s in stocks:
        statut = s.get('statutAffiche')
        if statut not in CRITICAL:
            continue
        # PEREMPTION_PROCHE : risque différent (péremption, pas rupture) → exclu
        if statut == 'PEREMPTION_PROCHE':
            continue
        # RISQUE_ELEVE : inclure seulement si aucune livraison fiable détectée
        # (si une livraison est planifiée, le risque est géré → exclu de la timeline)
        # La sélection finale se fait dans la boucle après parse_deliveries

        try:
            cmm  = float(s['cmm']) if s['cmm'] else 0
            cen  = float(s['stockCentrale'])     if s['stockCentrale']      is not None else 0
            peri = float(s['stockPeripherique']) if s['stockPeripherique']  is not None else 0
            nat  = float(s['stockNational'])     if s['stockNational']      is not None else 0
            # stockCentralMsd = MSD national total (en mois) — champ pré-calculé du backend
            msd_field = s.get('stockCentralMsd')
        except (ValueError, TypeError):
            continue

        if cmm == 0:
            continue

        # MSD national total en jours (utiliser le champ si disponible, sinon calculer)
        if msd_field is not None:
            try:
                msd_j = float(msd_field) * 30.44
            except (ValueError, TypeError):
                msd_j = nat / cmm * 30.44
        else:
            msd_j = nat / cmm * 30.44

        # Exclure uniquement si stock CENTRAL présent et stock national couvre tout l'horizon
        # (cen>0 = pas de rupture centrale ; si cen=0, le produit reste visible en Groupe B)
        if cen > 0 and msd_j >= HORIZON_DAYS:
            continue

        msd_cen_j  = cen  / cmm * 30.44   # portion bleu foncé
        msd_peri_j = msd_j - msd_cen_j    # portion bleu clair

        deliveries = parse_deliveries(s.get('commentaire', ''), date_ref)
        # Seules les livraisons CONFIRMÉES pilotent la classification et le calcul du buffer.
        # Les livraisons estimées (commandées/annoncées) sont affichées (triangle ▽) mais
        # ne modifient pas le groupe ni les hachures — règle COP : "date estimée, à noter".
        first_confirmed = next((d for d in deliveries if d['confirmed']), None)

        entry = dict(s)
        entry['deliveries']  = deliveries          # tous niveaux → affichage triangles
        entry['msd_j']       = msd_j
        entry['msd_cen_j']   = msd_cen_j
        entry['msd_peri_j']  = msd_peri_j

        if cen == 0 and peri > 0:
            # ── GROUPE B : centrale vide, périphérique assure la couverture ──────
            entry['groupe'] = 'B'
            if first_confirmed is not None:
                delai_j  = (first_confirmed['date'] - date_ref).days
                buffer_j = msd_j - delai_j
                entry['delai_j']  = delai_j
                entry['buffer_j'] = buffer_j
                entry['hatches']  = False
                entry['urgent']   = False
            else:
                hatches = msd_j < HORIZON_DAYS
                entry['hatches'] = hatches
                entry['urgent']  = hatches and 0 < msd_j <= 30
            group_b.append(entry)

        elif first_confirmed is None:
            # ── GROUPE A hachures : aucune livraison confirmée ────────────────────
            entry['hatches'] = True
            entry['urgent']  = 0 < msd_j <= 30
            entry['groupe']  = 'A'
            group_a.append(entry)
        else:
            delai_j  = (first_confirmed['date'] - date_ref).days
            buffer_j = msd_j - delai_j
            entry['delai_j']  = delai_j
            entry['buffer_j'] = buffer_j
            entry['hatches']  = False
            entry['urgent']   = False
            if buffer_j < 0 or nat == 0:
                # Groupe A plein : rupture confirmée avant livraison
                entry['groupe'] = 'A'
                group_a.append(entry)
            # Sinon : cen>0, buffer>=0 → stock national couvre la livraison → hors scope

    group_a.sort(key=lambda e: e['msd_j'])
    group_b.sort(key=lambda e: e.get('buffer_j', float('inf')))
    return group_a, group_b

# ─── Dessin d'une ligne produit ───────────────────────────────────────────────

NAME_W  = 110   # largeur colonne nom en "jours" (unités axe X)
BADGE_W = 28
BAR_H   = 0.55
TRI_SZ  = 9     # taille triangle (points)

def _duration_label(days: float) -> str:
    """Format duration: months if >= 15 days, else weeks."""
    if days >= 15:
        return f'{days / 30.44:.1f}M'
    weeks = days / 7
    return f'{weeks:.0f}s'

def _marker_tier(buffer_j: float) -> str:
    if buffer_j >= 30: return 'vert'
    elif buffer_j >= 15: return 'orange'
    else: return 'rouge'

def _label_livraison(delai_j: int) -> str:
    if delai_j < 7:
        return f'+{delai_j}j'
    return f'+{round(delai_j / 7)}s'

def draw_row(ax, entry: dict, y: float, date_ref: datetime, row_idx: int):
    urgent = entry.get('urgent', False)
    # Fond jaune pâle si urgence max (hachures + stock ≤ 1 mois restant)
    bg = '#FFF2CC' if urgent else (C_BG if row_idx % 2 == 0 else 'white')

    msd_j     = entry['msd_j']
    msd_cen_j = entry['msd_cen_j']
    statut    = entry['statutAffiche']
    prog      = entry['programme']
    name      = entry['denomination']
    deliveries = entry['deliveries']

    x0_bars = 0

    # ── Fond de ligne ─────────────────────────────────────────────────────────
    ax.barh(y, HORIZON_DAYS, left=x0_bars, height=BAR_H + 0.15,
            color=bg, zorder=1, linewidth=0)

    # ── Nom du produit ────────────────────────────────────────────────────────
    label = name if len(name) <= 28 else name[:26] + '…'
    if urgent:
        # Préfixe ⚠ en rouge vif pour urgence maximale
        ax.text(-BADGE_W - 4, y, '⚠ ' + label, va='center', ha='right',
                fontsize=7, color='#C00000', fontweight='bold',
                clip_on=False)
    else:
        ax.text(-BADGE_W - 4, y, label, va='center', ha='right',
                fontsize=7, color='#111111', fontweight='bold',
                clip_on=False)

    # ── Badge programme ───────────────────────────────────────────────────────
    badge_col = BADGE_COLORS.get(prog, '#888888')
    ax.text(-BADGE_W / 2, y, prog, va='center', ha='center',
            fontsize=6.5, color='white', fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.25', facecolor=badge_col,
                      edgecolor='none', linewidth=0),
            clip_on=False)

    # ── Barres stock ──────────────────────────────────────────────────────────
    if statut == 'RUPTURE_PAYS':
        # Première livraison disponible (confirmée ou estimée) pour le tracé de la barre
        first_any = deliveries[0] if deliveries else None

        if entry['hatches'] and first_any is None:
            # Aucune livraison du tout → hachures sur tout l'horizon
            ax.barh(y, HORIZON_DAYS, left=0, height=BAR_H,
                    color=C_RUPTURE, hatch='///', edgecolor='white',
                    linewidth=0.3, zorder=2)
        else:
            # Livraison détectée (confirmée ou estimée) : rouge plein jusqu'à la livraison
            delai_j  = (first_any['date'] - date_ref).days if first_any else entry.get('delai_j', HORIZON_DAYS)
            rupt_end = min(delai_j, HORIZON_DAYS)
            ax.barh(y, rupt_end, left=0, height=BAR_H,
                    color=C_RUPTURE, alpha=0.85, zorder=2)
            weeks_rupt = round(delai_j / 7)
            if weeks_rupt > 0 and rupt_end > 12:
                ax.text(rupt_end / 2, y, f'{weeks_rupt}s',
                        va='center', ha='center', fontsize=5.5,
                        color='white', fontweight='bold', zorder=4)
            if rupt_end < HORIZON_DAYS:
                ax.barh(y, HORIZON_DAYS - rupt_end, left=rupt_end,
                        height=BAR_H, color=C_RUPTURE, alpha=0.18, zorder=2)
    else:
        # Stock central (bleu foncé)
        if msd_cen_j > 0:
            cen_width = min(msd_cen_j, HORIZON_DAYS)
            ax.barh(y, cen_width, left=0,
                    height=BAR_H, color=C_CENTRALE, zorder=2)
            lbl_x = cen_width / 2
            ax.text(lbl_x, y, _duration_label(entry['msd_cen_j']),
                    va='center', ha='center', fontsize=6,
                    color='white', fontweight='bold', zorder=4)

        # Stock périphérique (bleu)
        peri_start = msd_cen_j
        peri_end   = min(msd_j, HORIZON_DAYS)
        if peri_end > peri_start:
            ax.barh(y, peri_end - peri_start, left=peri_start,
                    height=BAR_H, color=C_PERIPH, zorder=2)
            lbl_x2 = peri_start + (peri_end - peri_start) / 2
            ax.text(lbl_x2, y, _duration_label(entry['msd_peri_j']),
                    va='center', ha='center', fontsize=6,
                    color='white', fontweight='bold', zorder=4)

        # Zone rupture (rouge / hachuré)
        rupt_start = min(msd_j, HORIZON_DAYS)
        if rupt_start < HORIZON_DAYS:
            if entry['hatches']:
                ax.barh(y, HORIZON_DAYS - rupt_start, left=rupt_start,
                        height=BAR_H, color=C_RUPTURE,
                        hatch='///', edgecolor='white', linewidth=0.3, zorder=2)
            else:
                # Bande rouge pleine entre fin stock national et date livraison
                delai_j = entry.get('delai_j', HORIZON_DAYS)
                rupt_end = min(delai_j, HORIZON_DAYS)
                rupt_w   = rupt_end - rupt_start
                if rupt_w > 0:
                    ax.barh(y, rupt_w, left=rupt_start,
                            height=BAR_H, color=C_RUPTURE, alpha=0.85, zorder=2)
                    # Valeur = semaines de rupture entre épuisement et livraison
                    weeks_rupt = round((delai_j - msd_j) / 7)
                    if weeks_rupt > 0 and rupt_w > 12:
                        ax.text(rupt_start + rupt_w / 2, y,
                                f'{weeks_rupt}s', va='center', ha='center',
                                fontsize=5.5, color='white', fontweight='bold', zorder=4)
                # Zone après livraison (si elle dépasse la livraison)
                if rupt_end < HORIZON_DAYS:
                    ax.barh(y, HORIZON_DAYS - rupt_end, left=rupt_end,
                            height=BAR_H, color=C_RUPTURE, alpha=0.18, zorder=2)

    # ── Triangles livraison ───────────────────────────────────────────────────
    # Pour RUPTURE_PAYS (msd=0) : afficher uniquement la première livraison (la plus proche)
    visible_deliveries = deliveries[:1] if statut == 'RUPTURE_PAYS' else deliveries
    for i, deliv in enumerate(visible_deliveries):
        delai_j  = (deliv['date'] - date_ref).days
        if delai_j > HORIZON_DAYS:
            continue

        # Pour RUPTURE_PAYS (msd=0) : tout délai de livraison est positif (phase de réapprovisionnement)
        # On colorie selon l'urgence : vert si livraison ≤ 30j, orange si ≤ 60j, rouge sinon
        if statut == 'RUPTURE_PAYS' and entry['msd_j'] == 0:
            if delai_j <= 30:   tier = 'vert'
            elif delai_j <= 60: tier = 'orange'
            else:               tier = 'rouge'
        else:
            buf = entry['msd_j'] - delai_j
            tier = _marker_tier(buf)
        mk_bg  = MARKER_BG[tier]
        mk_fg  = MARKER_COLORS[tier]

        confirmed = deliv.get('confirmed', True)
        if confirmed:
            # Triangle plein ▼ — livraison confirmée
            ax.plot(delai_j, y + BAR_H / 2 + 0.08, marker='v',
                    markersize=TRI_SZ, color=mk_bg,
                    markeredgecolor=mk_fg, markeredgewidth=0.8,
                    zorder=6, clip_on=False)
        else:
            # Triangle contour ▽ — date estimée, non confirmée
            ax.plot(delai_j, y + BAR_H / 2 + 0.08, marker='v',
                    markersize=TRI_SZ, color='none',
                    markeredgecolor=mk_fg, markeredgewidth=1.2,
                    linestyle='none', zorder=6, clip_on=False)

        # Label "+Xs" au-dessus du triangle
        lbl = _label_livraison(delai_j)
        ax.text(delai_j, y + BAR_H / 2 + 0.26, lbl,
                va='bottom', ha='center', fontsize=6,
                color=mk_fg, fontweight='bold', zorder=7, clip_on=False)

# ─── Fonction principale ──────────────────────────────────────────────────────

def build_chart(json_path: str | Path, out_path: str | Path):
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    semaine_label = data.get('semaineLabel', '')
    date_ref_str  = data['data']['sectionA'].get('dateEtatStock')

    if date_ref_str:
        date_ref = datetime.fromisoformat(date_ref_str.replace('Z', '+00:00')).replace(tzinfo=None)
    else:
        m = re.search(r'au\s+(\d+)\s+(\w+)\s+(\d{4})', semaine_label, re.IGNORECASE)
        if m:
            mo = FR_MONTHS.get(m.group(2).lower(), 5)
            date_ref = datetime(int(m.group(3)), mo, int(m.group(1)))
        else:
            date_ref = datetime.now()

    stocks   = data['data']['sectionA']['stocks']
    group_a, group_b = classify(stocks, date_ref)

    all_products = group_a + group_b
    n = len(all_products)

    # ── Layout figure ─────────────────────────────────────────────────────────
    LEFT_MARGIN = 160   # unités "jours" allouées à gauche (nom + badge + ⚠)
    x_min = -LEFT_MARGIN
    x_max = HORIZON_DAYS + 8

    row_h_in = 0.30
    top_pad  = 1.3   # titre + entête mois
    bot_pad  = 1.2   # légende (légèrement agrandi pour 2 lignes + note)
    group_sep = 0.5  # espace entêtes groupe
    n_groups  = (1 if group_a else 0) + (1 if group_b else 0)

    fig_h = top_pad + n * row_h_in + n_groups * group_sep + bot_pad
    fig_w = 14.0

    fig, ax = plt.subplots(figsize=(fig_w, max(fig_h, 5)))
    ax.set_facecolor('white')
    fig.patch.set_facecolor('white')

    ax.set_xlim(x_min, x_max)
    ax.set_ylim(-1, n + n_groups * 1.5 + 1)
    ax.axis('off')

    # ── Mois horizons ─────────────────────────────────────────────────────────
    month_ticks = []
    for i in range(1, 7):
        mo = date_ref.month + i
        yr = date_ref.year + (mo - 1) // 12
        mo = (mo - 1) % 12 + 1
        d  = datetime(yr, mo, 1)
        x  = (d - date_ref).days
        month_ticks.append((x, FR_MONTH_SHORT[d.month - 1] + '.'))

    top_y = n + n_groups * 1.5 + 0.5
    # Titre
    ax.text((x_max + x_min) / 2, top_y + 0.4,
            'Timeline du risque de rupture nationale — Stock central + Stock périphérique',
            ha='center', va='bottom', fontsize=8, fontweight='bold', color='#1F4E79')
    ax.text(0, top_y + 0.05,
            f'État au {date_ref.strftime("%d/%m/%Y")}  |  ▌ = date état de stock  |  '
            f'Stock périphérique = fin mois précédent  |  (*) Dates estimées = non confirmées (commandées / annoncées)',
            ha='left', va='bottom', fontsize=6.5, color='#595959', style='italic')

    # Lignes verticales et labels mois
    for (mx, mlbl) in month_ticks:
        ax.axvline(x=mx, color=C_GRID, linewidth=0.5, zorder=1)
        ax.text(mx, top_y - 0.15, mlbl,
                ha='center', va='top', fontsize=7, color='#444444')

    # Ligne "aujourd'hui"
    ax.axvline(x=0, color=C_TODAY, linewidth=2, zorder=5)
    ax.text(0, top_y - 0.15, '▌', ha='center', va='top',
            fontsize=9, color=C_TODAY)

    # Séparateur gauche/droite (axe temporel)
    ax.axvline(x=0, color='#BBBBBB', linewidth=0.4, zorder=3)

    # ── Dessin produits ───────────────────────────────────────────────────────
    y = n + n_groups * 1.5 - 1.0
    row_idx = 0

    def draw_group_header(label: str, y_pos: float):
        ax.text(x_min + 2, y_pos, label,
                ha='left', va='center', fontsize=7,
                color='#1F4E79', style='italic',
                bbox=dict(boxstyle='round,pad=0.3', facecolor=C_GROUP_BG,
                          edgecolor='#AABBD0', linewidth=0.5))

    if group_a:
        draw_group_header(
            'A — Risque de rupture nationale réel '
            '(livraison après épuisement national ou sans livraison)', y)
        y -= 0.9
        for s in group_a:
            draw_row(ax, s, y, date_ref, row_idx)
            y -= 1.0
            row_idx += 1
        y -= 0.3

    if group_b:
        draw_group_header(
            'B — Rupture centrale couverte par stock périphérique '
            '(si livraison respectée)', y)
        y -= 0.9
        for s in group_b:
            draw_row(ax, s, y, date_ref, row_idx)
            y -= 1.0
            row_idx += 1

    # ── Légende ───────────────────────────────────────────────────────────────
    leg_y = -0.7
    items = [
        (C_CENTRALE, '▬', 'Stock central'),
        (C_PERIPH,   '▬', 'Tampon stock périphérique'),
        (C_RUPTURE,  '▬', 'Rupture nationale'),
        ('#C00000',  '▧', 'Sans livraison planifiée'),
        (MARKER_BG['vert'],   '▼', 'Livraison confirmée'),
        (MARKER_COLORS['vert'], '▽', 'Livraison estimée (*)'),
    ]
    margin_items = [
        (MARKER_BG['vert'],   '+Xj ≥30j (vert)'),
        (MARKER_BG['orange'], '+Xj ≥15j (orange)'),
        (MARKER_BG['rouge'],  '+Xj <15j (rouge)'),
    ]
    spacing = (x_max - x_min) / (len(items) + 0.5)
    for i, (col, sym, lbl) in enumerate(items):
        xi = x_min + i * spacing + 10
        ax.text(xi, leg_y, sym, ha='left', va='center',
                fontsize=9, color=col)
        ax.text(xi + 8, leg_y, lbl, ha='left', va='center',
                fontsize=6.5, color='#333333')

    leg_y2 = leg_y - 0.55
    ax.text(x_min + 10, leg_y2, 'Marge : ', ha='left', va='center',
            fontsize=6.5, color='#333333', fontweight='bold')
    sx = x_min + 50
    for (col, lbl) in margin_items:
        ax.text(sx, leg_y2, f'◆ {lbl}', ha='left', va='center',
                fontsize=6.5, color=col)
        sx += 65

    ax.text(x_min + 10, leg_y2 - 0.45,
            '⚠ = urgence max (rupture < 1 mois sans livraison confirmée)  |  '
            'MSD national = (Stock central + Stock périph. fin mois préc.) / CMM  |  Source : ETAT_DU_STOCK',
            ha='left', va='center', fontsize=5.5, color='#777777', style='italic')

    plt.tight_layout(pad=0.3)
    plt.savefig(str(out_path), dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close()
    print(f'OK Diagramme genere : {out_path}')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('json_file', nargs='?',
                        default=str(Path(__file__).parent / 'brief_json_models.json'))
    parser.add_argument('--out', default=str(Path(__file__).parent / 'timeline_chart.png'))
    args = parser.parse_args()
    build_chart(args.json_file, args.out)
