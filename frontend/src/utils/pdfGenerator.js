import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { LOGO_CNPS } from '../assets/logo';

/**
 * Génère un document PDF (Accusé ou Lettre de réponse) pour une réclamation
 * @param {Object} ticket - Les données de la réclamation
 * @param {string} type - 'accuse' | 'reponse'
 */
export const generateReclamationPDF = (ticket, type = 'accuse') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // ─── Header ───────────────────────────────────────────────
  // Logo CNPS
  try {
    doc.addImage(LOGO_CNPS, 'PNG', 15, 12, 20, 25);
  } catch (e) {
    // Fallback si l'image échoue
    doc.setFillColor(0, 68, 124);
    doc.rect(15, 15, 20, 20, 'F');
  }
  
  doc.setTextColor(0, 68, 124);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CNPS', 40, 25);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('INSTITUTION DE PRÉVOYANCE SOCIALE', 40, 30);
  doc.text('DIRECTION GÉNÉRALE — RÉPUBLIQUE DE CÔTE D\'IVOIRE', 40, 34);

  doc.setDrawColor(200);
  doc.line(15, 42, pageWidth - 15, 42);

  // ─── Infos Document ───────────────────────────────────────
  const today = format(new Date(), 'dd/MM/yyyy', { locale: fr });
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Abidjan, le ${today}`, pageWidth - 15, 55, { align: 'right' });

  // ─── Destinataire ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.text('À l\'attention de :', 15, 70);
  doc.setFont('helvetica', 'normal');
  let partenaireNom = [ticket.partenaire_nom_prenoms, ticket.partenaire_raison_sociale].filter(Boolean).join(' / ');
  if (!partenaireNom && ticket.partenaire_nom) {
    partenaireNom = ticket.partenaire_nom;
  }
  doc.text(partenaireNom || 'Monsieur / Madame', 15, 76);
  
  let currentY = 82;
  if (ticket.partenaire_identifiant) {
    doc.text(`Identifiant : ${ticket.partenaire_identifiant}`, 15, currentY);
    currentY += 6;
  }
  if (ticket.regime_libelle) {
    doc.text(`Régime : ${ticket.regime_libelle}`, 15, currentY);
    currentY += 6;
  }
  if (ticket.type_client_libelle) {
    doc.text(`Type de client : ${ticket.type_client_libelle}`, 15, currentY);
    currentY += 6;
  }

  // ─── Objet ───────────────────────────────────────────────
  const motif = ticket.motif || ticket.motif_libelle || 'Non spécifié';
  const agence = ticket.agence || ticket.agence_nom || 'Non spécifiée';

  doc.setFont('helvetica', 'bold');
  const objet = type === 'accuse' 
    ? `Objet : Accusé de réception de votre réclamation N° ${ticket.numero_ticket}`
    : `Objet : Réponse à votre réclamation N° ${ticket.numero_ticket}`;
  
  const objetY = Math.max(100, currentY + 10);
  doc.text(objet, 15, objetY);

  // ─── Corps de la lettre ──────────────────────────────────
  doc.setFont('helvetica', 'normal');
  const dateDepot = format(new Date(ticket.date_creation), 'dd MMMM yyyy', { locale: fr });
  
  let content = '';
  if (type === 'accuse') {
    content = `Nous accusons réception de votre réclamation déposée le ${dateDepot} concernant l'objet suivant : "${motif}".\n\n` +
              `Votre dossier a été enregistré sous le numéro ${ticket.numero_ticket} et est actuellement en cours de traitement par nos services compétents (Agence : ${agence}).\n\n` +
              `Nous mettons tout en œuvre pour vous apporter une réponse dans les meilleurs délais (Délai réglementaire : ${ticket.delai_traitement_jours || '...'} jours).\n\n` +
              `Vous pouvez suivre l'avancement de votre dossier sur notre portail en ligne muni de votre numéro de ticket.\n\n` +
              `Veuillez agréer, Monsieur / Madame, l'expression de nos salutations distinguées.`;
  } else {
    const dateResol = ticket.date_resolution ? format(new Date(ticket.date_resolution), 'dd MMMM yyyy', { locale: fr }) : today;
    const isRejete = ticket.statut === 'rejete';
    
    content = `Faisant suite à votre réclamation du ${dateDepot} relative à "${ticket.motif}", nous avons l'honneur de vous informer que l'examen de votre dossier est désormais terminé.\n\n` +
              (isRejete 
                ? `Après analyse approfondie, nous ne sommes malheureusement pas en mesure de donner une suite favorable à votre demande pour le motif suivant : ${ticket.remarques_coordination || 'Non conforme aux procédures en vigueur'}.\n\n`
                : `Nous avons le plaisir de vous informer que votre situation a été régularisée. Les mesures nécessaires ont été prises par nos services en date du ${dateResol}.\n\n`) +
              `Nous restons à votre entière disposition pour tout complément d'information via votre agence de rattachement (${agence}).\n\n` +
              `Veuillez agréer, Monsieur / Madame, l'expression de nos salutations distinguées.`;
  }

  const splitText = doc.splitTextToSize(content, pageWidth - 30);
  doc.text(splitText, 15, objetY + 15);

  // ─── Footer ──────────────────────────────────────────────
  doc.setDrawColor(230);
  doc.line(15, 270, pageWidth - 15, 270);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Ceci est un document officiel généré automatiquement par le système eRéclamations de la CNPS.', pageWidth / 2, 278, { align: 'center' });
  doc.text('Siège Social : Abidjan Plateau - Avenue Marchand | www.cnps.ci', pageWidth / 2, 283, { align: 'center' });

  // ─── Download ────────────────────────────────────────────
  const filename = type === 'accuse' 
    ? `Accuse_Reception_${ticket.numero_ticket}.pdf`
    : `Lettre_Reponse_${ticket.numero_ticket}.pdf`;
    
  doc.save(filename);
};
