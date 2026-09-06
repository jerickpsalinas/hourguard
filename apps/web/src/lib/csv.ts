// Lightweight CSV export helper — no dependencies, browser-only.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Guard against CSV formula injection: a cell beginning with = + - @ (or a
  // leading tab/CR) is executed as a formula by Excel/Sheets. Prefixing with a
  // single quote neutralizes it while displaying the original text.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
