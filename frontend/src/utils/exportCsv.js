/**
 * Export an array of objects to a CSV file and trigger download.
 * @param {string} filename — e.g. "bookings.csv"
 * @param {string[]} headers — column headers
 * @param {string[][]} rows — 2D array of cell values
 */
export function exportCsv(filename, headers, rows) {
  const escape = (val) => {
    let str = String(val ?? '');
    // CSV injection protection: prefix dangerous characters that spreadsheets
    // interpret as formulas (=, +, -, @, \t, \r) with a single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
