import jsPDF from 'jspdf';
import { DemandeModel, formatDemandeDate } from './demandesService.ts';

// Helper labels
const DOC_TITLES: Record<string, { ar: string; fr: string }> = {
  extrait_naissance: {
    ar: 'نسخة موجزة من رسم الولادة',
    fr: "Extrait d'acte de naissance",
  },
  copie_integrale: {
    ar: 'نسخة كاملة من رسم الولادة',
    fr: 'Copie intégrale de naissance',
  },
  acte_deces: {
    ar: 'شهادة الوفاة',
    fr: 'Acte de décès',
  },
  declaration_naissance: {
    ar: 'التصريح بولادة جديدة',
    fr: 'Déclaration de naissance',
  },
  rectification: {
    ar: 'طلب تصحيح الحالة المدنية',
    fr: "Rectification d'état civil",
  },
};

/**
 * Génère l'Accusé de réception officiel (وصل إيداع الطلب) en PDF
 */
export function generateReceiptPdf(demande: DemandeModel, lang: 'ar' | 'fr' = 'fr'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary palette
  const primaryBlue = [0, 91, 172]; // #005BAC
  const primaryGreen = [25, 135, 84]; // #198754
  const darkSlate = [30, 41, 59];
  const mutedGray = [100, 116, 139];

  // Top header color ribbon
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 6, pageWidth, 3, 'F');

  // Moroccan Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('ROYAUME DU MAROC', 20, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("MINISTÈRE DE L'INTÉRIEUR", 20, 27);
  doc.text('PROVINCE DE TAROUDANT', 20, 31);
  doc.text("COMMUNE D'OULED TEIMA", 20, 35);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text("BUREAU DE L'ÉTAT CIVIL", 20, 39);

  // Arabic Side Header (in Latin-safe standard representation)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('AL-MAMLAKA AL-MAGHRIBIYA', pageWidth - 20, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text('WIQAYAT TAROUDANT', pageWidth - 20, 27, { align: 'right' });
  doc.text('JAMAAT OULED TEIMA', pageWidth - 20, 31, { align: 'right' });
  doc.text('MASLAHAT AL-HALA AL-MADANIYA', pageWidth - 20, 35, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(20, 44, pageWidth - 20, 44);

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 50, pageWidth - 40, 22, 3, 3, 'F');
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(20, 50, pageWidth - 40, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('RÉCÉPISSÉ DE DÉPÔT DE DEMANDE ÉLECTRONIQUE', pageWidth / 2, 59, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text("WASL IDA'A TALAB AL-HALA AL-MADANIYA", pageWidth / 2, 66, { align: 'center' });

  // Big Tracking Number Highlight Box
  doc.setFillColor(238, 246, 255);
  doc.roundedRect(20, 77, pageWidth - 40, 24, 4, 4, 'F');
  doc.setDrawColor(186, 219, 254);
  doc.setLineWidth(1);
  doc.roundedRect(20, 77, pageWidth - 40, 24, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text('NUMÉRO DE SUIVI OFFICIEL / RAQM AT-TATABBOUE', pageWidth / 2, 84, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text(demande.numeroSuivi, pageWidth / 2, 93, { align: 'center' });

  // Information Section
  let y = 110;
  const col1 = 25;
  const col2 = 85;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('INFORMATIONS SUR LA DEMANDE ET LE REQUÉRANT', 20, y);
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.8);
  doc.line(20, y + 2, 110, y + 2);

  y += 10;
  const docTypeLabel = DOC_TITLES[demande.typeDocument]?.fr || demande.typeDocument;

  const infoRows = [
    ['Document demandé', docTypeLabel],
    ['Nombre de copies', `${demande.nombreCopies || 1} exemplaire(s)`],
    ['Nom complet du citoyen', demande.nomComplet || '-'],
    ['Carte Nationale (CIN)', demande.cin || '-'],
    ['N° Acte de naissance / Année', `${demande.numeroActe || '-'} / ${demande.anneeEnregistrement || '-'}`],
    ['Date & Lieu de naissance', `${demande.dateNaissance || '-'} (${demande.lieuNaissance || '-'})`],
    ['Commune d\'enregistrement', demande.communeEnregistrement || "Ouled Teima"],
    ['Téléphone de contact', demande.telephone || '-'],
    ['Adresse de résidence', demande.adresse || '-'],
    ['Date de soumission', formatDemandeDate(demande.createdAt, 'fr')],
    ['Statut initial', demande.statut || 'Nouvelle'],
  ];

  doc.setFontSize(9.5);
  infoRows.forEach(([label, value]) => {
    doc.setFillColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.text(`${label} :`, col1, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(String(value), col2, y);

    y += 7.5;
  });

  // Instructions & Verification Box
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(20, y, pageWidth - 40, 36, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, y, pageWidth - 40, 36, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('CONSIGNES IMPORTANTES ET SUIVI :', 25, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. Conservez soigneusement ce récépissé ou notez votre numéro de suivi.', 25, y + 14);
  doc.text('2. Vous pouvez vérifier l\'état de votre dossier à tout moment sur le portail citoyen.', 25, y + 20);
  doc.text('3. Lors du retrait au bureau de l\'état civil, munissez-vous de votre CIN originale et de ce récépissé.', 25, y + 26);
  doc.text('4. Adresse de retrait : Hôtel de Ville d\'Ouled Teima, Guichet État Civil.', 25, y + 32);

  // Footer / Stamp placeholder
  y += 44;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text(`Document généré électroniquement par le Portail de la Commune d'Ouled Teima le ${new Date().toLocaleDateString('fr-FR')}.`, 20, pageHeight - 14);
  doc.text('Authenticité vérifiable par le numéro de suivi.', pageWidth - 20, pageHeight - 14, { align: 'right' });

  // Save/Download
  doc.save(`recepisse_demande_${demande.numeroSuivi}.pdf`);
}

/**
 * Génère le Document d'État Civil Officiel final (Extrait ou Copie intégrale)
 */
export function generateOfficialCivilDocumentPdf(demande: DemandeModel, lang: 'ar' | 'fr' = 'fr'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Moroccan official border design
  doc.setDrawColor(25, 135, 84); // Moroccan Green
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 91, 172);
  doc.text('ROYAUME DU MAROC', pageWidth / 2, 24, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("MINISTÈRE DE L'INTÉRIEUR", pageWidth / 2, 29, { align: 'center' });
  doc.text('PROVINCE DE TAROUDANT - COMMUNE D\'OULED TEIMA', pageWidth / 2, 34, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(25, 135, 84);
  doc.text("SERVICE DE L'ÉTAT CIVIL", pageWidth / 2, 39, { align: 'center' });

  // Document Type Header
  const docTitle = DOC_TITLES[demande.typeDocument]?.fr?.toUpperCase() || "DOCUMENT D'ÉTAT CIVIL";
  doc.setFillColor(241, 245, 249);
  doc.rect(20, 46, pageWidth - 40, 16, 'F');
  doc.setDrawColor(0, 91, 172);
  doc.setLineWidth(0.8);
  doc.rect(20, 46, pageWidth - 40, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 91, 172);
  doc.text(docTitle, pageWidth / 2, 56, { align: 'center' });

  // Act numbers header
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`ACTE N° : ${demande.numeroActe || '---'}`, 25, 71);
  doc.text(`ANNÉE DU REGISTRE : ${demande.anneeEnregistrement || '---'}`, pageWidth - 25, 71, { align: 'right' });
  doc.text(`COMMUNE D'ENREGISTREMENT : ${demande.communeEnregistrement || "Ouled Teima"}`, 25, 77);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(20, 82, pageWidth - 20, 82);

  // Content body
  let y = 92;
  const labelCol = 25;
  const valCol = 80;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const fields = [
    ['Nom et prénom :', demande.nomComplet],
    ['Carte d\'Identité (CIN) :', demande.cin],
    ['Date de naissance :', demande.dateNaissance],
    ['Lieu de naissance :', demande.lieuNaissance],
    ['Commune :', demande.communeEnregistrement || "Ouled Teima"],
    ['Nombre d\'exemplaires :', `${demande.nombreCopies || 1}`],
    ['Dossier de référence :', demande.numeroSuivi],
  ];

  fields.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, labelCol, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || '-'), valCol, y);
    y += 9;
  });

  // Legal declaration
  y += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Le présent extrait est certifié conforme aux énonciations contenues dans les registres originaux',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  doc.text(
    'de l\'état civil tenus à la Commune d\'Ouled Teima, Province de Taroudant.',
    pageWidth / 2,
    y + 5,
    { align: 'center' }
  );

  // Signatures & Stamp area
  y += 25;
  const stampBoxWidth = 65;
  const stampBoxHeight = 40;

  // Municipal Stamp Box
  doc.setDrawColor(0, 91, 172);
  doc.setLineWidth(0.8);
  doc.roundedRect(25, y, stampBoxWidth, stampBoxHeight, 3, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 91, 172);
  doc.text('SCEAU DE LA COMMUNE', 25 + stampBoxWidth / 2, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OULED TEIMA', 25 + stampBoxWidth / 2, y + 15, { align: 'center' });
  doc.text('SERVICE ÉTAT CIVIL', 25 + stampBoxWidth / 2, y + 22, { align: 'center' });

  // Officer Signature Box
  doc.setDrawColor(25, 135, 84);
  doc.roundedRect(pageWidth - 25 - stampBoxWidth, y, stampBoxWidth, stampBoxHeight, 3, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(25, 135, 84);
  doc.text('L\'OFFICIER DE L\'ÉTAT CIVIL', pageWidth - 25 - stampBoxWidth / 2, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fait à Ouled Teima, le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 25 - stampBoxWidth / 2, y + 15, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.text('Signature & Visa réglementaires', pageWidth - 25 - stampBoxWidth / 2, y + 32, { align: 'center' });

  // Save / Download
  doc.save(`document_officiel_${demande.numeroSuivi}.pdf`);
}
