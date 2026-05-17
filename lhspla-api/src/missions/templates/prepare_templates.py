"""
Prépare DM_ready.docx et ODM_ready.docx pour docxtemplater.
Exécuter une seule fois : python prepare_templates.py
"""

import zipfile, shutil, re, os, sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── HELPERS ────────────────────────────────────────────────────────────────

def load_docx(path: str):
    with zipfile.ZipFile(path, 'r') as z:
        return {n: z.read(n) for n in z.namelist()}

def save_docx(path: str, files: dict):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)


# ─── DM : remplacement MERGEFIELD ───────────────────────────────────────────

DM_FIELD_MAP = {
    'Objet_de_la_Mission':    'objet',
    'Destination':            'destination',
    'Date_de_départ':    'dateDepart',
    'Date_de_retour':         'dateRetour',
    'Imputation_budgetaire':  'imputation',
    'Nom__Prénoms':      'fullName',
    'Fonction':               'fonction',
    'Numéro_Wave':       'wave',
}

# Variantes d'apostrophe dans les noms de champs
DM_FIELD_MAP_ALIASES = {
    "Date_de_d’part":    'dateDepart',
    "Date_de_d'part":         'dateDepart',
    "Nom__Pr’noms":      'fullName',
    "Nom__Pr'noms":           'fullName',
    "Numéro_Wave":       'wave',
    "Num\xe9ro_Wave":         'wave',
}
DM_FIELD_MAP.update(DM_FIELD_MAP_ALIASES)

PARTICIPANT_FIELDS = {'fullName', 'fonction', 'wave'}


def replace_dm_mergefields(xml: str) -> str:
    """
    Remplace chaque complexe MERGEFIELD par un run simple <w:r><w:t>{var}</w:t></w:r>.
    Préserve les rPr du premier run du complexe.
    """
    pattern = (
        r'(<w:r\b(?:(?!<w:r\b).)*?'
        r'<w:fldChar\s[^/]*fldCharType=["\']begin["\'][^/]*/>'
        r'(?:(?!<w:r\b).)*?</w:r>'
        r'(?:(?!<w:fldChar\s[^/]*fldCharType=["\']end["\']).)*)'
        r'(<w:r\b(?:(?!<w:r\b).)*?'
        r'<w:fldChar\s[^/]*fldCharType=["\']end["\'][^/]*/>'
        r'(?:(?!<w:r\b).)*?</w:r>)'
    )

    def replacer(m):
        full = m.group(1) + m.group(2)
        instr = re.search(r'<w:instrText[^>]*>([^<]+)</w:instrText>', full)
        if not instr:
            return full
        field = re.match(r'\s*MERGEFIELD\s+"?([^"\s\\]+)', instr.group(1))
        if not field:
            return full
        fname = field.group(1).strip()
        var = DM_FIELD_MAP.get(fname)
        if not var:
            return full
        rpr = re.search(r'<w:rPr>(.*?)</w:rPr>', full, re.DOTALL)
        rpr_str = f'<w:rPr>{rpr.group(1)}</w:rPr>' if rpr else ''
        return f'<w:r>{rpr_str}<w:t xml:space="preserve">{{{var}}}</w:t></w:r>'

    return re.sub(pattern, replacer, xml, flags=re.DOTALL)


def add_dm_participant_loop(xml: str) -> str:
    """Enveloppe la ligne participants dans la boucle {#participants}...{/participants}."""
    def wrap_row(m):
        row = m.group(0)
        if '{fullName}' not in row:
            return row
        cells = re.findall(r'(<w:tc\b.*?</w:tc>)', row, re.DOTALL)
        if not cells:
            return row
        first = cells[0].replace('{fullName}', '{#participants}{fullName}', 1)
        last  = cells[-1].replace('{wave}', '{wave}{/participants}', 1)
        result = row.replace(cells[0], first, 1)
        idx = result.rfind(cells[-1])
        if idx >= 0 and len(cells) > 1:
            result = result[:idx] + last + result[idx + len(cells[-1]):]
        return result
    return re.sub(r'<w:tr\b.*?</w:tr>', wrap_row, xml, flags=re.DOTALL)


def prepare_dm():
    src = os.path.join(SCRIPT_DIR, 'DM_source.docx')
    dst = os.path.join(SCRIPT_DIR, 'DM_ready.docx')
    files = load_docx(src)
    xml = files['word/document.xml'].decode('utf-8')
    xml = replace_dm_mergefields(xml)
    xml = add_dm_participant_loop(xml)
    files['word/document.xml'] = xml.encode('utf-8')
    save_docx(dst, files)
    print(f'DM_ready.docx  OK  ({os.path.getsize(dst):,} bytes)')
    # Vérif
    with zipfile.ZipFile(dst) as z:
        x = z.read('word/document.xml').decode('utf-8')
        vars_found = list(dict.fromkeys(re.findall(r'\{[^}]+\}', x)))
        print(f'  Variables: {[v for v in vars_found if not v.startswith("{0") and len(v)<40]}')


# ─── ODM : remplacement ciblé des valeurs ────────────────────────────────────

def rebuild_para_after_colon(para_xml: str, variable: str) -> str:
    """
    Dans un paragraphe XML, supprime tous les runs qui viennent APRÈS le run ':',
    puis ajoute un run contenant {variable}.
    Conserve la mise en forme (rPr) du premier run (label).
    """
    runs = re.findall(r'<w:r\b.*?</w:r>', para_xml, re.DOTALL)
    if not runs:
        return para_xml

    # Trouver le run qui contient ':'
    colon_idx = -1
    for i, r in enumerate(runs):
        texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', r)
        if ':' in ''.join(texts):
            colon_idx = i
            break

    if colon_idx < 0:
        return para_xml

    # Récupérer les rPr du premier run de valeur (après le colon)
    rpr = ''
    if colon_idx + 1 < len(runs):
        rpr_m = re.search(r'<w:rPr>(.*?)</w:rPr>', runs[colon_idx + 1], re.DOTALL)
        if rpr_m:
            rpr = f'<w:rPr>{rpr_m.group(1)}</w:rPr>'

    # Reconstruire: garder runs 0..colon_idx, puis le run variable
    kept = ''.join(runs[:colon_idx + 1])
    new_run = f'<w:r>{rpr}<w:t xml:space="preserve"> {{{variable}}}</w:t></w:r>'

    # Extraire la partie du para hors runs (pPr etc.)
    ppr_m = re.search(r'(<w:pPr\b.*?</w:pPr>)', para_xml, re.DOTALL)
    ppr = ppr_m.group(1) if ppr_m else ''
    tag_m = re.match(r'(<w:p\b[^>]*>)', para_xml)
    open_tag = tag_m.group(1) if tag_m else '<w:p>'

    return f'{open_tag}{ppr}{kept}{new_run}</w:p>'


def prepare_odm():
    src = os.path.join(SCRIPT_DIR, 'ODM_source.docx')
    dst = os.path.join(SCRIPT_DIR, 'ODM_ready.docx')
    files = load_docx(src)
    xml = files['word/document.xml'].decode('utf-8')

    paras = re.findall(r'<w:p\b.*?</w:p>', xml, re.DOTALL)

    DATA_LABELS = {
        'POUR SE RENDRE A':           'destination',
        'OBJET DE LA MISSION':        'objet',
        'DATE DE DEPART':             'dateDepart',
        'DATE DE RETOUR':             'dateRetour',
        'DATE DE REPRISE DE SERVICE': 'dateReprise',
        'IMPUTATION BUDGETAIRE':      'imputation',
    }

    para_replacements = {}  # index → new para XML
    paras_to_delete = set()

    for i, p in enumerate(paras):
        joined = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)).strip()
        # Check if this para is a data label
        for label, var in DATA_LABELS.items():
            if joined.startswith(label):
                # Rebuild this para to have just label + colon + {var}
                new_p = rebuild_para_after_colon(p, var)
                para_replacements[i] = new_p
                # If the objet spills to next para, delete next para
                if label == 'OBJET DE LA MISSION' and i + 1 < len(paras):
                    next_texts = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[i+1])).strip()
                    if next_texts and not any(next_texts.startswith(l) for l in DATA_LABELS):
                        paras_to_delete.add(i + 1)
                break

    # Handle participant table rows
    # Row 1 (index 1 in rows): header  → keep
    # Row 2 (index 2): participant 1   → become loop row
    # Row 3 (index 3): participant 2   → delete

    rows = re.findall(r'<w:tr\b.*?</w:tr>', xml, re.DOTALL)
    row_replacements = {}
    rows_to_delete = set()

    for i, row in enumerate(rows):
        cells_text = [
            ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', c))
            for c in re.findall(r'<w:tc\b.*?</w:tc>', row, re.DOTALL)
        ]
        joined = ' | '.join(cells_text).strip()

        if 'FOFANA' in joined or 'KHADER' in joined:
            # Transform this row into a template row with loop markers
            cells = re.findall(r'(<w:tc\b.*?</w:tc>)', row, re.DOTALL)
            if len(cells) >= 2:
                # First cell: {#participants}{fullName}
                cell0_xml = re.sub(
                    r'<w:t[^>]*>[^<]*</w:t>',
                    '<w:t xml:space="preserve">{#participants}{fullName}</w:t>',
                    cells[0], count=1
                )
                # Remove extra runs after first text (conserver </w:r> pour XML valide)
                cell0_xml = re.sub(r'</w:t>.*?</w:tc>', '</w:t></w:r></w:p></w:tc>', cell0_xml, flags=re.DOTALL)

                # Second cell: {fonction}{/participants}
                cell1_xml = re.sub(
                    r'<w:t[^>]*>[^<]*</w:t>',
                    '<w:t xml:space="preserve">{fonction}{/participants}</w:t>',
                    cells[1], count=1
                )
                cell1_xml = re.sub(r'</w:t>.*?</w:tc>', '</w:t></w:r></w:p></w:tc>', cell1_xml, flags=re.DOTALL)

                # Rebuild row
                new_row = row
                new_row = new_row.replace(cells[0], cell0_xml, 1)
                idx = new_row.rfind(cells[-1])
                if idx >= 0:
                    new_row = new_row[:idx] + cell1_xml + new_row[idx + len(cells[-1]):]
                row_replacements[i] = new_row

        elif 'APPIA' in joined or 'ASSISTANT CHAINE' in joined:
            rows_to_delete.add(i)

    # Apply row replacements and deletions
    def replace_rows(xml_in):
        for i, row in enumerate(rows):
            if i in rows_to_delete:
                xml_in = xml_in.replace(row, '', 1)
            elif i in row_replacements:
                xml_in = xml_in.replace(row, row_replacements[i], 1)
        return xml_in

    # Apply paragraph replacements and deletions
    def replace_paras(xml_in):
        for i, para in enumerate(paras):
            if i in paras_to_delete:
                xml_in = xml_in.replace(para, '', 1)
            elif i in para_replacements:
                xml_in = xml_in.replace(para, para_replacements[i], 1)
        return xml_in

    xml = replace_rows(xml)
    xml = replace_paras(xml)

    files['word/document.xml'] = xml.encode('utf-8')
    save_docx(dst, files)
    print(f'ODM_ready.docx OK  ({os.path.getsize(dst):,} bytes)')
    with zipfile.ZipFile(dst) as z:
        x = z.read('word/document.xml').decode('utf-8')
        vars_found = list(dict.fromkeys(re.findall(r'\{[^}]+\}', x)))
        print(f'  Variables: {[v for v in vars_found if not v.startswith("{0") and len(v)<40]}')


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('Préparation des templates...')
    prepare_dm()
    prepare_odm()
    print('Terminé.')
