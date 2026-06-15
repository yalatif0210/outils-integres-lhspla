#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_pptx.py
Extrait les données de stock depuis un fichier PPTX LHSPLA et les retourne en JSON.

Usage:
  python parse_pptx.py <chemin_vers_fichier.pptx>

Sortie (stdout): JSON array d'objets StockEntry prêts à insérer.
Erreurs (stderr): messages de diagnostic.
"""
import io
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

# Forcer UTF-8 sur stdout/stderr (Windows peut utiliser cp1252 par défaut)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'

FRENCH_MONTHS = {
    'janvier': '01', 'fevrier': '02', 'février': '02', 'mars': '03',
    'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07',
    'aout': '08', 'août': '08', 'septembre': '09', 'octobre': '10',
    'novembre': '11', 'decembre': '12', 'décembre': '12',
}

STATUT_MAP = {
    'RUPTURE_PAYS': 'RUPTURE_PAYS',
    'RUPTURE_CENTRALE': 'RUPTURE_CENTRALE',
    'RUPTURE_IMMINENTE': 'RUPTURE_IMMINENTE',
    'RISQUE': 'RISQUE',
    'BON_STOCKAGE': 'BON_STOCKAGE',
    'SURSTOCK': 'SURSTOCK',
    'RISQUE_PEREMPTION': 'RISQUE_PEREMPTION',
}


def cell_text(tc):
    """Concatène tous les runs de texte d'une cellule de tableau PPTX."""
    parts = []
    for t in tc.iter('{%s}t' % NS_A):
        if t.text:
            parts.append(t.text)
    return ' '.join(parts).strip()


def normalize_number(s: str):
    """Normalise un nombre PPTX (espaces insécables, virgule décimale) → float ou None."""
    if not s or not s.strip():
        return None
    # Supprimer tous types d'espaces (insécable, fine, normale) utilisés comme séparateurs de milliers
    cleaned = re.sub(r'[   \s]', '', s.strip())
    cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return None


def get_monday_of_week(date_str: str) -> str:
    """Retourne le lundi de la semaine contenant date_str (YYYY-MM-DD)."""
    from datetime import datetime, timedelta
    d = datetime.strptime(date_str, '%Y-%m-%d')
    day = d.weekday()  # 0=lundi
    monday = d - timedelta(days=day)
    return monday.strftime('%Y-%m-%d')


def extract_date_from_title(title: str) -> str | None:
    """
    Extrait une date depuis le titre de la slide 1.
    Ex: 'ETAT DU STOCK AU 29 MAI 2026' → '2026-05-26' (lundi de la semaine).
    """
    m = re.search(r'(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})', title)
    if not m:
        return None
    day, month_fr, year = m.group(1), m.group(2).lower(), m.group(3)
    month_num = FRENCH_MONTHS.get(month_fr)
    if not month_num:
        return None
    date_str = f'{year}-{month_num}-{int(day):02d}'
    try:
        return get_monday_of_week(date_str)
    except ValueError:
        return None


def compute_statut(msd) -> str:
    """Calcule le statut depuis le MSD (identique à la logique NestJS)."""
    if msd is None or msd == 0:
        return 'RUPTURE_CENTRALE'
    if msd < 3:
        return 'RUPTURE_IMMINENTE'
    if msd < 5:
        return 'RISQUE'
    if msd <= 12:
        return 'BON_STOCKAGE'
    return 'SURSTOCK'


def get_programme_from_slide(root) -> str | None:
    """Retourne PNLS/PNLP/PNSME depuis les formes hors tableau."""
    def walk(node):
        if node.tag == '{%s}tbl' % NS_A:
            return None
        if node.tag == '{%s}t' % NS_A and node.text:
            val = node.text.strip().upper()
            if val in ('PNLS', 'PNLP', 'PNSME'):
                return val
        for child in node:
            result = walk(child)
            if result:
                return result
        return None
    return walk(root)


def parse_slide(root, programme: str, semaine: str) -> list:
    """Extrait les lignes de données d'une slide tableau (9 ou 8 colonnes)."""
    tables = list(root.iter('{%s}tbl' % NS_A))
    if not tables:
        return []

    tbl = tables[0]
    rows_xml = list(tbl.iter('{%s}tr' % NS_A))
    if len(rows_xml) < 2:
        return []

    header_cells = [cell_text(c) for c in rows_xml[0].iter('{%s}tc' % NS_A)]
    nb_cols = len(header_cells)

    # Ignorer les slides de résumé (3 colonnes: Produits / MSD / Commentaires)
    if nb_cols < 8:
        return []

    sous_cat = header_cells[0].strip()
    # Si le header[0] est le nom du programme lui-même (slides PNLP), utiliser header[0] comme sous_cat
    # et ignorer la valeur (la sous-catégorie sera la valeur réelle ex: "PNLP" → pas utile)
    # On garde quand même la valeur extraite

    # Déterminer si slide 8-col (PNSME, pas de colonne date_perem_peri) ou 9-col
    has_peri_perem = (nb_cols >= 9)

    entries = []
    for row_xml in rows_xml[1:]:
        cells = [cell_text(c) for c in row_xml.iter('{%s}tc' % NS_A)]
        if not cells or not cells[0].strip():
            continue

        denomination = cells[0].strip()

        # Indices colonnes fixes (basés sur la structure PPTX analysée)
        # [0]=denom, [1]=stock_centrale, [2]=stock_peri, [3]=stock_national,
        # [4]=cmm, [5]=msd, [6]=date_perem_centrale, [7]=date_perem_peri (si 9 cols), [8 ou 7]=commentaire

        stock_centrale_raw = cells[1] if len(cells) > 1 else ''
        stock_peri_raw = cells[2] if len(cells) > 2 else ''
        stock_national_raw = cells[3] if len(cells) > 3 else ''
        cmm_raw = cells[4] if len(cells) > 4 else ''
        msd_raw = cells[5] if len(cells) > 5 else ''

        if has_peri_perem:
            date_perem_centrale = cells[6].strip() if len(cells) > 6 else ''
            date_perem_peri = cells[7].strip() if len(cells) > 7 else ''
            commentaire = cells[8].strip() if len(cells) > 8 else ''
        else:
            date_perem_centrale = cells[6].strip() if len(cells) > 6 else ''
            date_perem_peri = ''
            commentaire = cells[7].strip() if len(cells) > 7 else ''

        msd = normalize_number(msd_raw)
        statut = compute_statut(msd)

        entry = {
            'semaine': semaine,
            'programme': programme,
            'sousCategorie': sous_cat,
            'denomination': denomination,
            'stockCentrale': int(normalize_number(stock_centrale_raw)) if normalize_number(stock_centrale_raw) is not None else None,
            'stockCentralMsd': msd,
            'stockPeripherique': int(normalize_number(stock_peri_raw)) if normalize_number(stock_peri_raw) is not None else None,
            'stockNational': int(normalize_number(stock_national_raw)) if normalize_number(stock_national_raw) is not None else None,
            'cmm': normalize_number(cmm_raw),
            'datePeremptionCentrale': date_perem_centrale or None,
            'datePeremptionPeripherie': date_perem_peri or None,
            'statutStock': statut,
            'commentaire': commentaire,
        }
        entries.append(entry)

    return entries


def parse_pptx(filepath: str) -> dict:
    """Parse le fichier PPTX et retourne { semaine, entries }."""
    with zipfile.ZipFile(filepath, 'r') as z:
        slide_names = sorted(
            [n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)],
            key=lambda n: int(re.search(r'\d+', n.split('/')[-1]).group()),
        )

        # Extraire la date depuis le nom de fichier ou les premières slides
        semaine = None

        # 1. Essayer depuis le nom de fichier
        semaine = extract_date_from_title(filepath)

        # 2. Si non trouvé, chercher dans les 3 premières slides
        if not semaine:
            for slide_name in slide_names[:3]:
                slide_data = z.read(slide_name)
                slide_root = ET.fromstring(slide_data)
                all_texts = [t.text for t in slide_root.iter('{%s}t' % NS_A) if t.text]
                semaine = extract_date_from_title(' '.join(all_texts))
                if semaine:
                    break

        if not semaine:
            # Fallback : lundi courant
            from datetime import date, timedelta
            today = date.today()
            monday = today - timedelta(days=today.weekday())
            semaine = monday.strftime('%Y-%m-%d')
            print(f'[WARN] Date non trouvée dans le titre, semaine par défaut: {semaine}', file=sys.stderr)

        all_entries = []

        for slide_name in slide_names[1:]:  # Sauter slide 1 (titre)
            data = z.read(slide_name)
            root = ET.fromstring(data)

            programme = get_programme_from_slide(root)
            if not programme:
                continue  # Slide légende ou sans programme identifié

            entries = parse_slide(root, programme, semaine)
            all_entries.extend(entries)

    return {'semaine': semaine, 'entries': all_entries}


def main():
    if len(sys.argv) < 2:
        print('Usage: python parse_pptx.py <fichier.pptx>', file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    try:
        result = parse_pptx(filepath)
        print(json.dumps(result, ensure_ascii=False, default=str))
    except Exception as e:
        print(f'[ERROR] {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
