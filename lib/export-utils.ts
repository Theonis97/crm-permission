/**
 * Utilitaires d'export PDF et Excel (CSV) pour la comptabilité
 * Export côté client, sans dépendances externes
 */

// ============================================================================
// EXPORT EXCEL (CSV avec BOM UTF-8 pour compatibilité Excel)
// ============================================================================

interface ExcelColumn {
  header: string
  key: string
  format?: "currency" | "date" | "text" | "number"
}

interface ExcelExportOptions {
  filename: string
  title: string
  subtitle?: string
  columns: ExcelColumn[]
  data: Record<string, any>[]
  totals?: Record<string, number>
}

export function exportToExcel({
  filename,
  title,
  subtitle,
  columns,
  data,
  totals,
}: ExcelExportOptions) {
  const formatValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return ""
    switch (format) {
      case "currency":
        return typeof value === "number" ? value.toLocaleString("fr-FR") : String(value)
      case "date":
        try {
          return new Date(value).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        } catch {
          return String(value)
        }
      case "number":
        return typeof value === "number" ? value.toLocaleString("fr-FR") : String(value)
      default:
        return String(value).replace(/;/g, ",")
    }
  }

  const separator = ";"
  const lines: string[] = []

  // Titre
  lines.push(title)
  if (subtitle) lines.push(subtitle)
  lines.push("")

  // En-têtes
  lines.push(columns.map((c) => c.header).join(separator))

  // Données
  data.forEach((row) => {
    const values = columns.map((col) => formatValue(row[col.key], col.format))
    lines.push(values.join(separator))
  })

  // Totaux
  if (totals) {
    lines.push("")
    const totalRow = columns.map((col) => {
      if (col.key === columns[0].key) return "TOTAL"
      if (totals[col.key] !== undefined) return formatValue(totals[col.key], col.format || "currency")
      return ""
    })
    lines.push(totalRow.join(separator))
  }

  // BOM UTF-8 pour Excel
  const BOM = "\uFEFF"
  const csvContent = BOM + lines.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// EXPORT PDF (via fenêtre d'impression du navigateur)
// ============================================================================

interface PdfColumn {
  header: string
  key: string
  align?: "left" | "center" | "right"
  format?: "currency" | "date" | "text" | "number"
}

interface PdfExportOptions {
  filename: string
  title: string
  subtitle?: string
  period?: string
  filters?: string
  columns: PdfColumn[]
  data: Record<string, any>[]
  totals?: Record<string, number>
  orientation?: "portrait" | "landscape"
}

export function exportToPdf({
  title,
  subtitle,
  period,
  filters,
  columns,
  data,
  totals,
  orientation = "portrait",
}: PdfExportOptions) {
  const formatValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return "—"
    switch (format) {
      case "currency":
        return typeof value === "number"
          ? new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA"
          : String(value)
      case "date":
        try {
          return new Date(value).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        } catch {
          return String(value)
        }
      case "number":
        return typeof value === "number" ? value.toLocaleString("fr-FR") : String(value)
      default:
        return String(value)
    }
  }

  const getAlign = (align?: string) => {
    switch (align) {
      case "right": return "text-align: right;"
      case "center": return "text-align: center;"
      default: return "text-align: left;"
    }
  }

  const tableRows = data
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (col) =>
              `<td style="${getAlign(col.align)} padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${formatValue(row[col.key], col.format)}</td>`
          )
          .join("")}</tr>`
    )
    .join("")

  const totalRow = totals
    ? `<tr style="background: #f3f4f6; font-weight: bold;">
        ${columns
          .map((col, i) => {
            const val = i === 0 ? "TOTAL" : totals[col.key] !== undefined ? formatValue(totals[col.key], col.format || "currency") : ""
            return `<td style="${getAlign(col.align)} padding: 10px; border-top: 2px solid #374151; font-size: 12px;">${val}</td>`
          })
          .join("")}
       </tr>`
    : ""

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; padding: 20mm; }
        .header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #4f46e5; }
        .header h1 { font-size: 22px; color: #1e1b4b; margin-bottom: 4px; }
        .header p { font-size: 12px; color: #6b7280; }
        .meta { display: flex; gap: 20px; margin-bottom: 20px; }
        .meta-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 14px; font-size: 11px; }
        .meta-item strong { color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        thead th { background: #4f46e5; color: white; padding: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
        .print-btn { position: fixed; top: 15px; right: 15px; background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; z-index: 1000; box-shadow: 0 2px 8px rgba(79,70,229,0.3); }
        .print-btn:hover { background: #4338ca; }
        @media print {
          .print-btn { display: none; }
          body { padding: 10mm; }
          @page { size: ${orientation === "landscape" ? "A4 landscape" : "A4"}; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>
      <div class="header">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      <div class="meta">
        ${period ? `<div class="meta-item"><strong>Période :</strong> ${period}</div>` : ""}
        ${filters ? `<div class="meta-item"><strong>Filtres :</strong> ${filters}</div>` : ""}
        <div class="meta-item"><strong>Lignes :</strong> ${data.length}</div>
        <div class="meta-item"><strong>Généré le :</strong> ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <table>
        <thead>
          <tr>${columns.map((col) => `<th style="${getAlign(col.align)}">${col.header}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableRows}
          ${totalRow}
        </tbody>
      </table>
      <div class="footer">
        <p>Document généré automatiquement — ${title}</p>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
