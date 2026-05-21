import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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
