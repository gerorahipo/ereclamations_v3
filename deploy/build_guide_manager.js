const { Paragraph, TextRun, PageBreak, AlignmentType } = require("docx");
const path = require("path");
const { makeHelpers, buildDocument } = require("./guide_common");

const REF = "PRO-MO-ERC-03";
const VERSION = "01";
const TITRE_PROFIL = "MANAGER DE SERVICE / SECTION ACCUEIL RECLAMATIONS";
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
children.push(p("En tant que Manager de service/section accueil réclamations, vous supervisez le traitement des réclamations de votre agence. Votre rôle central est de valider ou de retourner les dossiers soumis par les Pilotes de votre agence, une fois leur analyse et leurs actions correctives enregistrées."));
children.push(p("Votre menu latéral se présente comme suit :"));
children.push(bullet("Tableau de bord : indicateurs de performance de votre agence."));
children.push(bullet("Nouvelle réclamation : saisie directe si besoin."));
children.push(bullet("Base de connaissances : articles d'aide et procédures."));
children.push(bullet("Administration & Profil : vos informations personnelles."));
children.push(p("Corbeilles de traitement :"));
["Vue globale", "Non affectées", "En cours", "À clôturer", "Résolu", "Hors délai", "Escaladées"].forEach(t => children.push(bullet(t)));
children.push(note("La corbeille « À clôturer » est votre priorité quotidienne : elle contient tous les dossiers soumis par les Pilotes en attente de votre décision."));
children.push(...screenshot("dashboard_manager.png", "Tableau de bord du Manager : cartes KPI et corbeilles de traitement.", 620));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Valider ou retourner
children.push(h1("3. Valider ou retourner un dossier"));
children.push(p("Lorsqu'un Pilote a terminé son analyse et soumis un dossier, celui-ci apparaît dans la corbeille « À clôturer » avec le statut « À Valider »."));
children.push(...screenshot("validation_manager.png", "Fiche en attente de validation : boutons « Clôturer » et « Retourner ».", 620));

children.push(h2("3.1 Procédure"));
startNumberedList();
children.push(numbered("Ouvrez la corbeille « À clôturer » et cliquez sur le dossier à examiner."));
children.push(numbered("Consultez l'onglet Vue d'ensemble (informations client, motif, échéance) puis l'onglet Traitement (analyse et actions réalisées par le Pilote)."));
children.push(numbered("Si le traitement est satisfaisant, cliquez sur « Clôturer » : le dossier passe au statut Résolu."));
children.push(numbered("Si le traitement est incomplet ou incorrect, cliquez sur « Retourner » et indiquez le motif du retour : le dossier repasse chez le Pilote pour complément."));
children.push(note("Un dossier ne peut être validé ou retourné que par un Manager ou un Superviseur ; un Manager n'intervient que sur les dossiers de sa propre agence, alors qu'un Superviseur peut intervenir sur toutes les agences."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Suivi et pilotage
children.push(h1("4. Suivi et pilotage de l'agence"));
children.push(p("Le tableau de bord vous donne une vision synthétique de l'activité de votre agence :"));
children.push(bullet("Cartes KPI : dossiers non affectés, en cours, à clôturer, résolus, hors délai."));
children.push(bullet("Délai moyen de traitement, taux de réclamations traitées et taux traitées dans les délais, comparés à l'objectif SLA en vigueur (90 % par défaut)."));
children.push(bullet("Répartition par mode de saisine, par type de client et top 5 des motifs de réclamation."));
children.push(p("Utilisez les filtres de recherche (numéro de ticket, client, statut, processus) sur chaque corbeille pour cibler rapidement les dossiers à traiter en priorité, notamment ceux en « Hors délai »."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Notifications
children.push(h1("5. Notifications et Base de connaissances"));
children.push(h2("5.1 Centre de notifications"));
children.push(p("La cloche en haut de l'écran vous alerte lorsqu'un dossier est soumis pour validation, ou lorsqu'un pilote ajoute un commentaire sur un dossier escaladé."));
children.push(h2("5.2 Base de connaissances"));
children.push(p("Consultez la Base de connaissances pour vérifier la conformité du traitement d'un Pilote avant de valider un dossier complexe."));

buildDocument({
  ref: REF, version: VERSION, titreProfil: TITRE_PROFIL, totalPages: TOTAL_PAGES,
  children, numberedListRefs: H.numberedListRefs,
  outFile: path.join(__dirname, "..", "guides", "guide_manager_coordonnateur.docx")
});
