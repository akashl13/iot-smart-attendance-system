import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(options: {
  filename: string;
  institution: string;
  title: string;
  subtitle?: string;
  summary?: string;
  head: string[];
  body: (string | number)[][];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFillColor(16, 32, 51);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(options.institution, 36, 28);
  doc.setFontSize(18);
  doc.text(options.title, 36, 50);
  doc.setFontSize(10);
  doc.setTextColor(40, 55, 72);
  let startY = 98;
  if (options.subtitle) {
    doc.text(options.subtitle, 36, startY);
    startY += 16;
  }
  if (options.summary) {
    doc.text(options.summary, 36, startY);
    startY += 12;
  }
  autoTable(doc, {
    startY: startY + 8,
    head: [options.head],
    body: options.body,
    styles: { fontSize: 8, cellPadding: 5, textColor: [16, 32, 51] },
    headStyles: { fillColor: [14, 110, 106], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 244, 238] },
  });
  doc.save(options.filename);
}
