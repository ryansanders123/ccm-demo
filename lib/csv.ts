export function csvRow(cols: (string | number | null | undefined)[]): string {
  return cols
    .map((c) => {
      if (c == null) return "";
      const s = String(c);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(",");
}

export const CSV_HEADERS = [
  "date", "donee", "type", "fund", "campaign", "appeal", "amount", "check_number", "reference_id", "note", "voided", "void_reason",
];
