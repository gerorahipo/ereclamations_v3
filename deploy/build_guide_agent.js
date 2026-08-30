const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, LevelFormat, VerticalAlign,
  PageBreak, Header, Footer, PageNumber, NumberFormat, ImageRun
} = require("docx");
const fs = require("fs");
const path = require("path");
const sizeOf = (() => {
  // Minimal PNG dimension reader (avoids extra dependency)
  return function (filePath) {
    const buf = fs.readFileSync(filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  };
})();

const SHOTS_DIR = path.join(__dirname, "shots");
function screenshot(filename, caption, targetWidth = 560) {
  const filePath = path.join(SHOTS_DIR, filename);
  const buf = fs.readFileSync(filePath);
  const { width, height } = sizeOf(filePath);
  const targetHeight = Math.round((height / width) * targetWidth);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" } },
      children: [new ImageRun({ data: buf, transformation: { width: targetWidth, height: targetHeight }, type: "png" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, italics: true, size: 16, color: "6B7280" })]
    })
  ];
}

const NAVY = "1B2A4A";
const ORANGE = "F2861D";
const GRAY = "6B7280";
const LIGHT = "F3F4F6";

const REF = "PRO-MO-ERC-01";
const VERSION = "01";
const TITRE_PROFIL = "AGENT ACCUEIL ET RELATIONS CLIENT";
const TOTAL_PAGES = 10;

function pageRefCell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.w || 3000, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text, bold: !!opts.bold, size: opts.size || 16, color: opts.color })]
    })]
  });
}

// ---------------------------------------------------------------
// En-tete institutionnel (identique dans l'esprit au modele fourni)
// ---------------------------------------------------------------
function headerTable() {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 4680, 2340],
    rows: [
      new TableRow({
        children: [
          pageRefCell("CNPS", { w: 2340, bold: true, align: AlignmentType.CENTER, size: 20 }),
          pageRefCell("MODE OPERATOIRE", { w: 4680, bold: true, align: AlignmentType.CENTER, size: 22 }),
          pageRefCell(`Réf : ${REF}\nVersion : ${VERSION}\nPage : 1 / ${TOTAL_PAGES}`, { w: 2340, align: AlignmentType.CENTER, size: 16 }),
        ]
      }),
      new TableRow({
        children: [
          pageRefCell("", { w: 2340 }),
          pageRefCell(`MANUEL D'UTILISATION DE L'APPLICATION E-RECLAMATIONS (PROFIL : ${TITRE_PROFIL})`, { w: 4680, bold: true, align: AlignmentType.CENTER, size: 18 }),
          pageRefCell(`Réf : ${REF}\nVersion : ${VERSION}\nPage : 1 / ${TOTAL_PAGES}`, { w: 2340, align: AlignmentType.CENTER, size: 16 }),
        ]
      }),
    ]
  });
}

// ---------------------------------------------------------------
// Tableau de suivi des modifications
// ---------------------------------------------------------------
function suiviTable() {
  const head = ["Date de mise à jour", "Numéro de version", "Parties modifiées", "Nature de la mise à jour"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: head.map(t => pageRefCell(t, { w: 2340, bold: true, align: AlignmentType.CENTER, shade: NAVY, color: "FFFFFF" }))
  });
  const dataRow = new TableRow({
    children: [
      pageRefCell("30/08/2026", { w: 2340, align: AlignmentType.CENTER }),
      pageRefCell(VERSION, { w: 2340, align: AlignmentType.CENTER }),
      pageRefCell("-", { w: 2340, align: AlignmentType.CENTER }),
      pageRefCell("Création", { w: 2340, align: AlignmentType.CENTER }),
    ]
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [headerRow, dataRow]
  });
}

// ---------------------------------------------------------------
// Tableau de validation (Pilote / President du comite / Approbateur)
// ---------------------------------------------------------------
function validationTable() {
  const roles = ["Pilote de processus Institutionnel", "Président du Comité de validation", "Approbateur"];
  const roleRow = new TableRow({
    tableHeader: true,
    children: roles.map(t => pageRefCell(t, { w: 3120, bold: true, align: AlignmentType.CENTER, shade: LIGHT }))
  });
  const subRow = new TableRow({
    children: roles.map(() => pageRefCell("Noms et Fonction   |   Date et signature", { w: 3120, align: AlignmentType.CENTER, size: 14 }))
  });
  const blankRow = new TableRow({
    children: roles.map(() => new TableCell({
      width: { size: 3120, type: WidthType.DXA },
      children: [new Paragraph({ text: "" }), new Paragraph({ text: "" })]
    }))
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    rows: [roleRow, subRow, blankRow]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 }, children: [new TextRun({ text, color: NAVY, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, color: ORANGE, bold: true })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text, bold: !!opts.bold, italics: !!opts.italics })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullet-list", level }, spacing: { after: 80 }, children: [new TextRun({ text })] });
}
let numberedListCounter = 0;
let currentNumberedRef = null;
const numberedListRefs = [];
function startNumberedList() {
  numberedListCounter += 1;
  currentNumberedRef = `numbered-list-${numberedListCounter}`;
  numberedListRefs.push(currentNumberedRef);
}
function numbered(text, level = 0) {
  if (!currentNumberedRef) startNumberedList();
  return new Paragraph({ numbering: { reference: currentNumberedRef, level }, spacing: { after: 80 }, children: [new TextRun({ text })] });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 100, after: 160 },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: ORANGE, space: 8 } },
    shading: { type: ShadingType.CLEAR, fill: "FFF4E8" },
    children: [new TextRun({ text: "  " + text, italics: true, color: "7A4A0E" })]
  });
}

// ---------------------------------------------------------------
// Corps du document
// ---------------------------------------------------------------
const children = [];

children.push(headerTable());
children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
children.push(p("Tableau de suivi des modifications", { bold: true }));
children.push(suiviTable());
children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
children.push(validationTable());
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Processus Gestion des Réclamations", italics: true, color: GRAY })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `Mode Opératoire — Manuel d'Utilisation de l'Application e-Réclamations (Profil : ${TITRE_PROFIL}) — version ${VERSION}`, italics: true, color: GRAY })] }));

// 1. Presentation
children.push(h1("1. Présentation du portail e-Réclamations"));

children.push(h2("1.1 Présentation"));
children.push(p("L'application « e-Réclamations » de la CNPS est une application web centralisée de gestion des réclamations des assurés et employeurs. Elle est compatible avec les navigateurs suivants :"));
["Google Chrome (recommandé)", "Mozilla Firefox", "Microsoft Edge", "Safari"].forEach(t => children.push(bullet(t)));
children.push(p("L'application comporte deux espaces distincts : un portail public accessible à tout assuré pour déclarer et suivre une réclamation, et un espace agent réservé au personnel de la CNPS, auquel appartient le profil Agent Accueil et Relations Client."));

children.push(h2("1.2 Connexion à l'espace agent"));
startNumberedList();
children.push(numbered("Ouvrez votre navigateur web et saisissez l'adresse de l'application."));
children.push(numbered("Sur la page d'accueil publique, cliquez sur le bouton « Agent » (cadenas) en haut à droite pour accéder à l'espace agent."));
children.push(numbered("Renseignez votre Matricule ou votre adresse email professionnelle, ainsi que votre mot de passe fourni par votre hiérarchie."));
children.push(numbered("Cliquez sur « Se connecter » pour accéder à votre tableau de bord."));
children.push(...screenshot("home_annotated.png", "Figure 1 — Page d'accueil publique : cliquez sur « Espace agent CNPS » en haut à droite.", 560));
children.push(...screenshot("login.png", "Figure 2 — Page de connexion de l'espace agent.", 560));
children.push(note("À la première connexion, il vous est fortement recommandé de modifier le mot de passe qui vous a été communiqué (voir section 1.4)."));

children.push(h2("1.3 Espace de travail"));
children.push(p("Une fois connecté, vous accédez à votre Tableau de bord. L'écran se compose de :"));
children.push(bullet("Un bandeau supérieur : nom de l'agence, compteur de tickets ouverts (nouveau, en cours, hors délai), icône de notifications (cloche) et bouton d'actualisation."));
children.push(bullet("Un menu latéral gauche : accès aux modules principaux et aux corbeilles de traitement."));
children.push(bullet("Une zone centrale : cartes d'indicateurs (KPI) et liste des réclamations selon la corbeille sélectionnée."));
children.push(bullet("Un bloc utilisateur en bas du menu : votre nom, votre fonction, votre agence, et le bouton de déconnexion."));
children.push(...screenshot("dashboard.png", "Figure 3 — Tableau de bord : menu latéral, indicateurs KPI et corbeilles de traitement.", 620));
children.push(p("La cloche de notifications signale en temps réel les événements qui vous concernent (affectation d'un dossier, commentaire, escalade). Cliquez dessus pour consulter la liste ; un badge indique le nombre de notifications non lues."));

children.push(h2("1.4 Modifier votre mot de passe"));
startNumberedList();
children.push(numbered("Cliquez sur votre nom dans le bloc utilisateur, en bas du menu latéral."));
children.push(numbered("Sélectionnez « Administration & Profil » puis l'onglet « Mon Profil »."));
children.push(numbered("Renseignez votre ancien mot de passe, votre nouveau mot de passe, puis sa confirmation."));
children.push(numbered("Cliquez sur « Enregistrer ». Déconnectez-vous puis reconnectez-vous avec votre nouveau mot de passe."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 2. Presentation du menu general
children.push(h1("2. Présentation du menu général"));
children.push(p("En tant qu'Agent Accueil et Relations Client, vous êtes le premier maillon de la chaîne de traitement des réclamations de la CNPS. C'est vous qui accueillez l'assuré ou l'employeur, qualifiez sa demande, enregistrez ses informations avec précision et assurez le suivi de ses dossiers."));
children.push(p("Votre menu latéral se présente comme suit :"));
children.push(bullet("Tableau de bord : vue d'ensemble de l'activité de votre agence."));
children.push(bullet("Nouvelle réclamation : formulaire de saisie d'une réclamation pour un assuré ou un employeur reçu au guichet ou par téléphone."));
children.push(bullet("Base de connaissances : articles d'aide et fiches de procédure pour répondre correctement aux usagers."));
children.push(bullet("Administration & Profil : vos informations personnelles et vos préférences."));
children.push(p("En dessous, la rubrique « Corbeilles de traitement » regroupe les différentes vues filtrées de votre file de travail :"));
["Vue globale", "Non affectées", "En cours", "À clôturer", "Résolu", "Hors délai", "Non qualifiées"].forEach(t => children.push(bullet(t)));
children.push(note("La corbeille « Non qualifiées » n'apparaît que pour les agents rattachés à l'Agence Digitale : elle contient les réclamations déposées directement par les usagers sur le portail public, qui doivent être qualifiées avant d'être orientées vers l'agence compétente (voir section 5)."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Menu detaille
children.push(h1("3. Menu détaillé — les corbeilles de traitement"));
children.push(p("Chaque corbeille affiche la liste des réclamations correspondant à son filtre. Cliquez sur une ligne pour ouvrir la fiche complète du dossier."));

const corbeilles = [
  ["Vue globale", "Toutes les réclamations de votre agence, tous statuts confondus."],
  ["Non affectées", "Réclamations créées mais pas encore prises en charge par un pilote."],
  ["En cours", "Réclamations en cours de traitement par un pilote de l'agence."],
  ["À clôturer", "Réclamations traitées, en attente de validation finale."],
  ["Résolu", "Réclamations closes et résolues."],
  ["Hors délai", "Réclamations ayant dépassé leur échéance SLA de traitement."],
  ["Non qualifiées", "Réclamations issues du portail public en attente de qualification (Agence Digitale)."],
];
corbeilles.forEach(([nom, desc]) => {
  children.push(bullet(nom + " : ", 0));
  children.push(new Paragraph({ indent: { left: 720 }, spacing: { after: 120 }, children: [new TextRun({ text: desc })] }));
});
children.push(p("Sur chaque liste, une barre d'outils permet de rechercher un dossier par numéro de ticket ou nom du client, de filtrer par statut ou par processus, et d'exporter la liste au format Excel ou PDF."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Saisie d'une nouvelle reclamation
children.push(h1("4. Saisie d'une nouvelle réclamation"));
children.push(p("Pour enregistrer une réclamation reçue au guichet, par téléphone ou par courrier, cliquez sur « Nouvelle réclamation » dans le menu latéral. Le formulaire se déroule en deux étapes."));
children.push(...screenshot("nouvelle_reclamation.png", "Figure 4 — Formulaire de saisie : références du client, avec le contrôle « Client immatriculé à la CNPS ».", 560));

children.push(h2("4.1 Étape 1 — Informations du client"));
startNumberedList();
children.push(numbered("Régime et Type de client : sélectionnez le Régime (Régime Général des salariés, RSTI pour les travailleurs indépendants) puis le Type de client (Assuré Social, Employeur, Retraité)."));
children.push(numbered("Client immatriculé à la CNPS : indiquez « Oui » ou « Non ». Si « Non » est sélectionné, le Numéro CNPS n'est pas demandé."));
children.push(numbered("Numéro CNPS : si le client est immatriculé, saisissez son numéro. Le format est contrôlé automatiquement par le serveur :"));
children.push(bullet("Travailleur du Régime Général : exactement 12 chiffres.", 1));
children.push(bullet("Travailleur indépendant (RSTI) : exactement 14 chiffres.", 1));
children.push(bullet("Employeur : entre 1 et 6 chiffres.", 1));
children.push(numbered("Nom et prénoms, Sexe, et selon le type de client, les champs complémentaires (nom de l'employeur, etc.)."));
children.push(numbered("Coordonnées : téléphone (obligatoire, requis pour les notifications SMS) et email (facultatif)."));
children.push(note("Un numéro CNPS ne respectant pas le format attendu est rejeté immédiatement avec un message d'erreur explicite. Vérifiez toujours l'information avec le client avant de continuer."));

children.push(h2("4.2 Étape 2 — Réclamation"));
startNumberedList();
children.push(numbered("Objet principal (Motif) : sélectionnez la catégorie de la réclamation."));
children.push(numbered("Précision (Sous-motif) : sélectionnez la précision liée au motif choisi ; le délai de traitement réglementaire associé s'affiche automatiquement."));
children.push(numbered("Description détaillée : rédigez un résumé clair et complet des faits, dates et montants évoqués par le client."));
children.push(numbered("Pièces jointes (facultatif) : joignez les documents justificatifs numérisés. Chaque fichier est limité à 5 Mo ; un fichier trop volumineux ou dans un format non autorisé est signalé et n'est pas joint, sans bloquer l'enregistrement du reste du dossier."));
children.push(numbered("Cliquez sur « Envoyer ma déclaration ». Un numéro de ticket (ex. REC-2026-000123) est généré : communiquez-le au client pour qu'il puisse suivre l'avancement de son dossier."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Qualification NQ
children.push(h1("5. Qualification des dossiers non qualifiés (Agence Digitale)"));
children.push(p("Les réclamations saisies en ligne par les usagers depuis le portail public arrivent automatiquement dans la corbeille « Non qualifiées ». Votre mission, si vous êtes rattaché à l'Agence Digitale, est d'étudier ces dossiers et de les orienter vers le bon processus de traitement."));
children.push(h2("5.1 Procédure de qualification"));
startNumberedList();
children.push(numbered("Dans le menu latéral, ouvrez la corbeille « Non qualifiées »."));
children.push(numbered("Cliquez sur le dossier à traiter pour ouvrir sa fiche. Lisez la description rédigée par l'usager."));
children.push(numbered("Dans l'onglet « Traitement », renseignez le Processus concerné, le Motif et le Sous-motif adaptés à la demande réelle du client."));
children.push(numbered("Ajoutez si besoin un commentaire interne à l'intention du pilote qui prendra le dossier en charge."));
children.push(numbered("Validez la qualification. Le dossier quitte la corbeille « Non qualifiées » et est orienté vers l'agence compétente."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 6. Fiche de traitement
children.push(h1("6. Consulter et corriger une réclamation"));
children.push(p("En ouvrant un dossier depuis n'importe quelle corbeille, la fiche de traitement s'affiche, organisée en quatre onglets :"));
children.push(bullet("Vue d'ensemble : identité du client, numéro CNPS, agence, processus, motif, sous-motif, échéance et description."));
children.push(bullet("Traitement : qualification, analyse et actions menées sur le dossier."));
children.push(bullet("Documents : pièces jointes du dossier, consultables et téléchargeables."));
children.push(bullet("Historique : chronologie complète de toutes les actions et modifications apportées au dossier."));
children.push(...screenshot("fiche_traitement_annotated.png", "Figure 5 — Fiche de traitement : les quatre onglets (Vue d'ensemble / Traitement / Documents / Historique).", 620));

children.push(h2("6.1 Corriger les informations d'un client"));
children.push(p("Si une information saisie initialement s'avère erronée (numéro CNPS, téléphone, nom...), cliquez sur « Corriger » dans la carte Client de l'onglet Vue d'ensemble, modifiez les champs nécessaires, puis « Enregistrer la correction »."));
children.push(note("Chaque modification est horodatée et attribuée à votre nom dans l'historique du dossier, avec le détail exact de ce qui a changé (ancienne valeur → nouvelle valeur). Cette traçabilité est permanente et ne peut pas être désactivée."));

children.push(h2("6.2 Télécharger une pièce jointe"));
children.push(p("Dans l'onglet Documents, cliquez sur le nom du fichier pour l'ouvrir, ou sur l'icône de téléchargement pour l'enregistrer. L'accès aux pièces jointes est limité aux dossiers de votre propre agence."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 7. Notifications et base de connaissances
children.push(h1("7. Notifications et Base de connaissances"));
children.push(h2("7.1 Centre de notifications"));
children.push(p("L'icône en forme de cloche, en haut de l'écran, vous informe des événements liés aux dossiers que vous suivez (affectation, commentaire, escalade). Cliquez dessus pour afficher la liste et marquer les notifications comme lues."));
children.push(h2("7.2 Base de connaissances"));
children.push(p("Pour vous aider à répondre aux questions des usagers ou à qualifier correctement un dossier complexe, vous disposez d'une Base de connaissances intégrée."));
startNumberedList();
children.push(numbered("Cliquez sur « Base de connaissances » dans le menu latéral."));
children.push(numbered("Saisissez un mot-clé (ex. « maternité », « RSTI ») dans la barre de recherche."));
children.push(numbered("Consultez l'article correspondant : réglementation en vigueur, pièces à demander au client, et service interne compétent pour ce type de demande."));

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 960, hanging: 260 } } } },
        ]
      },
      ...numberedListRefs.map(ref => ({
        reference: ref,
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 300 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 960, hanging: 260 } } } },
        ]
      }))
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `${REF} — v${VERSION}`, size: 14, color: GRAY })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "CNPS Côte d'Ivoire — Guide Utilisateur e-Réclamations — Page ", size: 14, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 14, color: GRAY }),
            new TextRun({ text: " / ", size: 14, color: GRAY }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: GRAY }),
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("C:\\laragon\\www\\ereclamations\\guides\\guide_agent_accueil_relations_client.docx", buf);
  console.log("OK: guide_agent_accueil_relations_client.docx genere");
});
