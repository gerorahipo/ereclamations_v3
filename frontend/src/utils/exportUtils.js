import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LOGO_CNPS } from '../assets/logo'

const safeFormatDate = (dateStr, formatStr = 'dd/MM/yyyy HH:mm') => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  try {
    return format(date, formatStr, { locale: fr })
  } catch (e) {
    return '-'
  }
}

/**
 * Exporte une liste de réclamations en Excel
 */
export const exportToExcel = (data, filename = 'reclamations') => {
  if (!data || data.length === 0) return

  try {
    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
      'N° Ticket': item.numero_ticket,
      'Date Création': safeFormatDate(item.created_at),
      'Client': item.nom_client,
      'Téléphone': item.telephone_client,
      'Objet': item.objet_reclamation,
      'Processus': item.processus_libelle,
      'Statut': item.statut.toUpperCase(),
      'Pilote': item.pilote_nom || 'Non assigné',
      'Agence': item.agence_nom,
      'Hors SLA': item.hors_sla ? 'OUI' : 'NON',
      'Echéance SLA': safeFormatDate(item.date_echeance_sla, 'dd/MM/yyyy')
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Réclamations')
    
    // Ajuster la largeur des colonnes
    const wscols = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 40 },
      { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 15 }
    ]
    worksheet['!cols'] = wscols

    XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
  } catch (error) {
    console.error('Error in exportToExcel:', error)
  }
}

/**
 * Exporte une liste de réclamations en PDF
 */
export const exportToPDF = (data, title = 'Rapport des Réclamations') => {
  if (!data || data.length === 0) return

  try {
    const doc = new jsPDF('landscape')
    
    // En-tête
    doc.setFontSize(18)
    doc.setTextColor(40)
    doc.text(title, 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Généré le ${safeFormatDate(new Date())}`, 14, 30)
    
    // Tableau
    const tableColumn = ["N° Ticket", "Date", "Client", "Processus", "Statut", "Pilote", "Agence", "SLA"]
    const tableRows = data.map(item => [
      item.numero_ticket,
      safeFormatDate(item.created_at, 'dd/MM/yy'),
      item.nom_client,
      item.processus_code || item.processus_libelle,
      item.statut.toUpperCase(),
      item.pilote_nom || '-',
      item.agence_nom,
      item.hors_sla ? 'HORS SLA' : 'OK'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 35 },
      styles: { fontSize: 8, cellPadding: 2 }
    })

    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
  } catch (error) {
    console.error('Error in exportToPDF:', error)
  }
}

/**
 * Exporte le rapport de performance (vue "Performance"/"Reporting") en PDF.
 * @param {Object} report
 * @param {Array}  report.kpis       - [{ label, value }] cartes KPI operationnelles
 * @param {Array}  report.agences    - [{ nom, code, total_tickets, avg_resolution_time, sla_rate, current_hors_sla }]
 * @param {Array}  report.processus  - [{ libelle, count }]
 * @param {Array}  report.evolution  - [{ month, total, resolu }]
 * @param {Object} report.meta       - { agenceLabel, roleLabel, generatedBy }
 */
export const exportAnalyticsToPDF = ({ kpis = [], agences = [], processus = [], evolution = [], meta = {} }) => {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // ─── En-tête ────────────────────────────────────────────
    try {
      doc.addImage(LOGO_CNPS, 'PNG', 15, 10, 16, 20)
    } catch (e) {
      doc.setFillColor(0, 68, 124)
      doc.rect(15, 12, 16, 16, 'F')
    }
    doc.setTextColor(0, 68, 124)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Rapport de Performance — e-Réclamations', 36, 20)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Agence : ${meta.agenceLabel || 'Toutes les agences'}`, 36, 27)
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} par ${meta.generatedBy || '-'} (${meta.roleLabel || '-'})`,
      36, 32
    )

    doc.setDrawColor(200)
    doc.line(15, 37, pageWidth - 15, 37)

    let y = 45

    // ─── KPI ────────────────────────────────────────────────
    if (kpis.length) {
      autoTable(doc, {
        head: [['Indicateur', 'Valeur']],
        body: kpis.map(k => [k.label, String(k.value ?? 0)]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [27, 42, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // ─── Performance par agence ───────────────────────────────
    if (agences.length) {
      doc.setFontSize(11)
      doc.setTextColor(40)
      doc.setFont('helvetica', 'bold')
      doc.text('Performance par agence', 15, y)
      y += 4

      autoTable(doc, {
        head: [['Agence', 'Tickets', 'TMR (h)', 'SLA (%)', 'Hors délai actuels']],
        body: agences.map(a => [
          `${a.nom} (${a.code})`,
          String(a.total_tickets ?? 0),
          a.avg_resolution_time ? parseFloat(a.avg_resolution_time).toFixed(1) : '-',
          a.sla_rate !== null && a.sla_rate !== undefined ? `${parseFloat(a.sla_rate).toFixed(1)}%` : '-',
          String(a.current_hors_sla ?? 0),
        ]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [27, 42, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { left: 15, right: 15 },
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // ─── Répartition par processus ────────────────────────────
    if (processus.length) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Répartition par processus', 15, y)
      y += 4

      const totalProcessus = processus.reduce((acc, p) => acc + parseInt(p.count || 0), 0) || 1
      autoTable(doc, {
        head: [['Processus', 'Réclamations', 'Part']],
        body: processus.map(p => [
          p.libelle,
          String(p.count ?? 0),
          `${((parseInt(p.count || 0) / totalProcessus) * 100).toFixed(1)}%`,
        ]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [27, 42, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { left: 15, right: 15 },
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // ─── Évolution mensuelle ──────────────────────────────────
    if (evolution.length) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Évolution du volume (6 derniers mois)', 15, y)
      y += 4

      autoTable(doc, {
        head: [['Mois', 'Reçues', 'Résolues']],
        body: evolution.map(e => [e.month, String(e.total ?? 0), String(e.resolu ?? 0)]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [27, 42, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        margin: { left: 15, right: 15 },
      })
    }

    // ─── Footer sur chaque page ────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const h = doc.internal.pageSize.getHeight()
      doc.setDrawColor(230)
      doc.line(15, h - 15, pageWidth - 15, h - 15)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text('Document généré automatiquement par le système eRéclamations de la CNPS — usage interne.', pageWidth / 2, h - 10, { align: 'center' })
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - 15, h - 10, { align: 'right' })
    }

    doc.save(`rapport_performance_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
  } catch (error) {
    console.error('Error in exportAnalyticsToPDF:', error)
  }
}

/**
 * Exporte le rapport de performance en Excel (classeur multi-feuilles).
 * Memes parametres que exportAnalyticsToPDF.
 */
export const exportAnalyticsToExcel = ({ kpis = [], agences = [], processus = [], evolution = [], meta = {} }) => {
  try {
    const workbook = XLSX.utils.book_new()

    // ─── Feuille Synthèse ───────────────────────────────────
    const syntheseRows = [
      ['Rapport de Performance — e-Réclamations'],
      [`Agence : ${meta.agenceLabel || 'Toutes les agences'}`],
      [`Généré le ${safeFormatDate(new Date())} par ${meta.generatedBy || '-'} (${meta.roleLabel || '-'})`],
      [],
      ['Indicateur', 'Valeur'],
      ...kpis.map(k => [k.label, k.value ?? 0]),
    ]
    const wsSynthese = XLSX.utils.aoa_to_sheet(syntheseRows)
    wsSynthese['!cols'] = [{ wch: 32 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(workbook, wsSynthese, 'Synthèse')

    // ─── Feuille Par agence ─────────────────────────────────
    if (agences.length) {
      const wsAgences = XLSX.utils.json_to_sheet(agences.map(a => ({
        'Agence': a.nom,
        'Code': a.code,
        'Tickets': a.total_tickets ?? 0,
        'TMR (h)': a.avg_resolution_time ? parseFloat(a.avg_resolution_time).toFixed(1) : '-',
        'SLA (%)': a.sla_rate !== null && a.sla_rate !== undefined ? parseFloat(a.sla_rate).toFixed(1) : '-',
        'Hors délai actuels': a.current_hors_sla ?? 0,
      })))
      wsAgences['!cols'] = [{ wch: 26 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(workbook, wsAgences, 'Par agence')
    }

    // ─── Feuille Par processus ──────────────────────────────
    if (processus.length) {
      const totalProcessus = processus.reduce((acc, p) => acc + parseInt(p.count || 0), 0) || 1
      const wsProcessus = XLSX.utils.json_to_sheet(processus.map(p => ({
        'Processus': p.libelle,
        'Réclamations': p.count ?? 0,
        'Part (%)': ((parseInt(p.count || 0) / totalProcessus) * 100).toFixed(1),
      })))
      wsProcessus['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(workbook, wsProcessus, 'Par processus')
    }

    // ─── Feuille Évolution ──────────────────────────────────
    if (evolution.length) {
      const wsEvolution = XLSX.utils.json_to_sheet(evolution.map(e => ({
        'Mois': e.month,
        'Reçues': e.total ?? 0,
        'Résolues': e.resolu ?? 0,
      })))
      wsEvolution['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, wsEvolution, 'Évolution')
    }

    XLSX.writeFile(workbook, `rapport_performance_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
  } catch (error) {
    console.error('Error in exportAnalyticsToExcel:', error)
  }
}
