const { Paragraph, TextRun, PageBreak, AlignmentType } = require("docx");
const path = require("path");
const { makeHelpers, buildDocument } = require("./guide_common");

const REF = "PRO-MO-ERC-04";
const VERSION = "01";
const TITRE_PROFIL = "SUPERVISEUR";
const TOTAL_PAGES = 9;
const SHOTS_DIR = path.join(__dirname, "shots");

const H = makeHelpers({ ref: REF, version: VERSION, titreProfil: TITRE_PROFIL, totalPages: TOTAL_PAGES, shotsDir: SHOTS_DIR });
const { headerTable, suiviTable, validationTable, h1, h2, p, bullet, numbered, startNumberedList, note, screenshot } = H;

const children = [];

children.push(headerTable());
children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
children.push(p("Tableau de suivi des modifications"));
children.push(suiviTable());
children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
children.push(validationTable());
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Processus Gestion des Réclamations", italics: true, color: "6B7280" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `Mode Opératoire — Manuel d'Utilisation de l'Application e-Réclamations (Profil : ${TITRE_PROFIL}) — version ${VERSION}`, italics: true, color: "6B7280" })] }));

// 1. Présentation
children.push(h1("1. Présentation du portail e-Réclamations"));
children.push(h2("1.1 Présentation"));
children.push(p("L'application « e-Réclamations » de la CNPS est une application web centralisée de gestion des réclamations des assurés et employeurs. Elle est compatible avec Google Chrome (recommandé), Mozilla Firefox, Microsoft Edge et Safari."));

children.push(h2("1.2 Connexion à l'espace agent"));
startNumberedList();
children.push(numbered("Ouvrez votre navigateur et saisissez l'adresse de l'application."));
children.push(numbered("Sur la page d'accueil publique, cliquez sur « Espace agent CNPS » en haut à droite."));
children.push(numbered("Renseignez votre Matricule ou votre email professionnel, ainsi que votre mot de passe."));
children.push(numbered("Cliquez sur « Se connecter »."));
children.push(...screenshot("home_annotated.png", "Page d'accueil publique : cliquez sur « Espace agent CNPS » en haut à droite.", 560));
children.push(...screenshot("login.png", "Page de connexion de l'espace agent.", 560));

children.push(h2("1.3 Modifier votre mot de passe"));
startNumberedList();
children.push(numbered("Cliquez sur votre nom en bas du menu latéral, puis « Administration & Profil »."));
children.push(numbered("Dans l'onglet « Mon Profil », renseignez ancien mot de passe, nouveau mot de passe et confirmation."));
children.push(numbered("Cliquez sur « Enregistrer », puis reconnectez-vous."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 2. Menu général
children.push(h1("2. Présentation du menu général"));
children.push(p("En tant que Superviseur, vous disposez d'une vision transversale sur l'ensemble des agences de la CNPS. Vous pouvez consulter, valider ou retourner un dossier de n'importe quelle agence, et suivre la performance globale du dispositif de traitement des réclamations."));
children.push(p("Votre menu latéral se présente comme suit :"));
children.push(bullet("Tableau de bord : reporting global et vue opérationnelle multi-agences."));
children.push(bullet("Nouvelle réclamation : saisie directe si besoin."));
children.push(bullet("Base de connaissances : articles d'aide et procédures."));
children.push(bullet("Administration & Profil : vos informations personnelles (onglet « Mon Profil »)."));
children.push(p("Corbeilles de traitement :"));
["Vue globale", "Non affectées", "En cours", "À clôturer", "Résolu", "Hors délai", "Escaladées"].forEach(t => children.push(bullet(t)));
children.push(note("Les modules avancés de paramétrage (processus, motifs, régimes, objectifs SLA, gestion des utilisateurs...) sont réservés aux profils Administrateur fonctionnel et Administrateur système. Votre accès à « Administration & Profil » se limite à la gestion de votre propre compte."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Tableau de bord Reporting / Opérations
children.push(h1("3. Tableau de bord : Reporting et Opérations"));
children.push(p("Le tableau de bord Superviseur propose deux vues, accessibles via les boutons en haut à droite : « Reporting » (analyse chiffrée) et « Opérations » (liste de travail)."));
children.push(...screenshot("dashboard_superviseur.png", "Tableau de bord Superviseur — vue Reporting : cartes KPI, charge par pilote, répartitions.", 620));

children.push(h2("3.1 Vue Reporting"));
children.push(bullet("Cartes KPI de l'agence sélectionnée : total, non affectés, à analyser, en cours, à clôturer, hors délai, qualifiés, résolus."));
children.push(bullet("Tickets créés, qualifiés et non qualifiés sur la période."));
children.push(bullet("Charge et productivité par pilote : nombre de dossiers à affecter, en cours, résolus et hors délai pour chaque pilote de l'agence."));
children.push(bullet("Répartitions par statut, par processus métier et top motifs de réclamation."));

children.push(h2("3.2 Vue Opérations"));
children.push(p("Bascule vers une liste de travail identique à celle des autres profils : recherche, filtres par statut et par processus, export Excel/PDF, accès direct aux fiches."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Validation et escalades
children.push(h1("4. Validation et suivi des escalades"));
children.push(h2("4.1 Valider ou retourner un dossier, toutes agences"));
children.push(p("Comme le Manager, vous pouvez ouvrir un dossier « À Valider » depuis la corbeille « À clôturer » et cliquer sur « Clôturer » ou « Retourner ». À la différence du Manager, ce droit ne se limite pas à votre agence de rattachement : vous pouvez valider un dossier de n'importe quelle agence du réseau."));
startNumberedList();
children.push(numbered("Ouvrez la corbeille « À clôturer »."));
children.push(numbered("Sélectionnez le dossier à examiner, quelle que soit son agence d'origine."));
children.push(numbered("Consultez l'onglet Traitement (analyse et actions du Pilote)."));
children.push(numbered("Cliquez sur « Clôturer » pour valider, ou « Retourner » avec un motif pour renvoyer le dossier au Pilote."));

children.push(h2("4.2 Dossiers escaladés"));
children.push(p("La corbeille « Escaladées » regroupe les dossiers qu'un Pilote a jugé nécessaire de faire remonter à un niveau supérieur. En tant que Superviseur, examinez-les en priorité et coordonnez, si besoin, l'intervention d'autres services."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Notifications
children.push(h1("5. Notifications et Base de connaissances"));
children.push(h2("5.1 Centre de notifications"));
children.push(p("La cloche en haut de l'écran vous alerte lors d'une escalade, d'une soumission en attente de validation, ou d'un dossier resté hors délai."));
children.push(h2("5.2 Base de connaissances"));
children.push(p("Consultez la Base de connaissances pour arbitrer un dossier complexe ou vérifier la conformité réglementaire d'un traitement avant validation."));

buildDocument({
  ref: REF, version: VERSION, titreProfil: TITRE_PROFIL, totalPages: TOTAL_PAGES,
  children, numberedListRefs: H.numberedListRefs,
  outFile: path.join(__dirname, "..", "guides", "guide_superviseur_v2.docx")
});
