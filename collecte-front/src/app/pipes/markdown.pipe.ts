import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

function inline(text: string): string {
  return text
    .replace(/—/g, '-')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderTable(lines: string[]): string {
  const parseRow = (line: string) =>
    line.split('|').slice(1, -1).map(c => c.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).filter(l => l.trim()).map(parseRow);

  const thead = `<thead><tr>${headers.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;

  return `<table class="md-table">${thead}${tbody}</table>`;
}

function parseBlocks(text: string): string {
  const blocks = text.replace(/—/g, '-').split(/\n{2,}/);

  return blocks
    .map(block => {
      const lines = block.trim().split('\n').filter(l => l !== undefined);
      if (!lines.length) return '';

      // Table : au moins 2 lignes, la 2e est un séparateur |---|
      if (
        lines.length >= 2 &&
        lines[0].startsWith('|') &&
        /^\|[\s\-:|]+\|/.test(lines[1])
      ) {
        return renderTable(lines);
      }

      // Titres ## / # / ###
      const h = lines[0].match(/^(#{1,4})\s+(.+)/);
      if (h) {
        const lvl = Math.min(h[1].length, 4);
        return `<h${lvl}>${inline(h[2])}</h${lvl}>`;
      }

      // Liste non ordonnée
      if (lines.every(l => /^[-*]\s/.test(l))) {
        const items = lines.map(l => `<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`).join('');
        return `<ul>${items}</ul>`;
      }

      // Liste ordonnée
      if (lines.every(l => /^\d+[.)]\s/.test(l))) {
        const items = lines.map(l => `<li>${inline(l.replace(/^\d+[.)]\s/, ''))}</li>`).join('');
        return `<ol>${items}</ol>`;
      }

      // Paragraphe ordinaire
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    return this.sanitizer.bypassSecurityTrustHtml(parseBlocks(value));
  }
}

/** Extrait le texte brut d'un HTML : supprime les balises ET décode les entités HTML */
export function htmlToText(html: string, maxLen = 150): string {
  if (!html) return '';
  // DOMParser gère les entités (&amp; &nbsp; &lt; &#39; etc.) nativement
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}
