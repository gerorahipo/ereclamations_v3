const { Document, Paragraph, TextRun, PageBreak, AlignmentType } = require("docx");
const path = require("path");
const { makeHelpers, buildDocument } = require("./guide_common");

const REF = "PRO-MO-ERC-02";
const VERSION = "01";
const TITRE_PROFIL = "PILOTE";
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
children.push(p("En tant que Pilote, vous intervenez sur l'espace agent, réservé au personnel de la CNPS."));

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
children.push(p("En tant que Pilote, vous êtes chargé du traitement des réclamations affectées à votre agence : vous en prenez la charge, analysez le problème, enregistrez les actions correctives, puis soumettez le dossier pour validation par votre manager. Vous pouvez également escalader un dossier complexe."));
children.push(p("Votre menu latéral se présente comme suit :"));
children.push(bullet("Tableau de bord : vue d'ensemble de votre charge de travail."));
children.push(bullet("Nouvelle réclamation : saisie directe si besoin."));
children.push(bullet("Base de connaissances : articles d'aide et procédures."));
children.push(bullet("Administration & Profil : vos informations personnelles."));
children.push(p("Corbeilles de traitement :"));
["Vue globale", "Non affectées", "En cours", "À clôturer", "Résolu", "Hors délai", "Escaladées"].forEach(t => children.push(bullet(t)));
children.push(...screenshot("dashboard_pilote.png", "Tableau de bord du Pilote : charge de travail et corbeilles de traitement.", 620));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Prendre en charge
children.push(h1("3. Prendre en charge une réclamation"));
children.push(p("Les réclamations affectées à votre agence et pas encore traitées apparaissent dans la corbeille « Non affectées »."));
startNumberedList();
children.push(numbered("Ouvrez la corbeille « Non affectées »."));
children.push(numbered("Cliquez sur le dossier à traiter."));
children.push(numbered("Cliquez sur « Prendre en charge ». Le dossier passe au statut « En cours » et vous en devenez responsable."));
children.push(note("Seul un Pilote de votre agence peut prendre en charge un dossier « Nouveau » de cette même agence."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Traiter le dossier
children.push(h1("4. Traiter un dossier"));
children.push(p("Dans l'onglet « Traitement » de la fiche, vous disposez de deux zones : l'Analyse du problème, et la Liste des corrections (actions)."));
children.push(...screenshot("traitement_pilote.png", "Onglet Traitement : Analyse du problème et Liste des corrections.", 620));

children.push(h2("4.1 Renseigner l'analyse"));
startNumberedList();
children.push(numbered("Sélectionnez la Catégorie de la cause (Cause Client ou Cause CNPS)."));
children.push(numbered("Précisez la Cause si la liste le permet, et détaillez votre analyse dans le champ Commentaire."));
children.push(numbered("Cliquez sur « Enregistrer »."));

children.push(h2("4.2 Enregistrer une action corrective"));
startNumberedList();
children.push(numbered("Cliquez sur « Ajouter une action »."));
children.push(numbered("Renseignez le Libellé de l'action, la Structure sollicitée si besoin, et des Observations."));
children.push(numbered("Cliquez sur « Ajouter l'action »."));
children.push(numbered("Une fois l'action effectivement réalisée, cliquez sur l'icône ✓ de la ligne correspondante, ajoutez un commentaire de réalisation si besoin, puis « Confirmer la réalisation »."));
children.push(note("La soumission du dossier est bloquée tant que l'analyse n'est pas complétée et qu'aucune action n'est marquée comme réalisée."));

children.push(h2("4.3 Escalader un dossier"));
children.push(p("Pour un dossier complexe nécessitant l'intervention d'un niveau supérieur, cliquez sur « Escalader le dossier » en haut de la fiche."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Soumettre
children.push(h1("5. Soumettre un dossier pour validation"));
children.push(p("Une fois l'analyse complétée et au moins une action réalisée, le bouton « Soumettre » devient disponible."));
startNumberedList();
children.push(numbered("Vérifiez l'ensemble des informations du dossier (onglet Vue d'ensemble)."));
children.push(numbered("Cliquez sur « Soumettre ». Le dossier passe au statut « À clôturer » et attend la validation de votre manager."));
children.push(note("Une fois soumis, vous ne pouvez plus modifier le dossier directement ; seul un manager ou un superviseur peut le valider ou le retourner."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 6. Notifications
children.push(h1("6. Notifications et Base de connaissances"));
children.push(h2("6.1 Centre de notifications"));
children.push(p("La cloche en haut de l'écran vous alerte lors d'une nouvelle affectation, d'un retour de dossier par le manager, ou d'un commentaire."));
children.push(h2("6.2 Base de connaissances"));
children.push(p("Consultez la Base de connaissances pour retrouver la réglementation, les pièces à demander au client et le service compétent, avant de finaliser votre analyse."));

buildDocument({
  ref: REF, version: VERSION, titreProfil: TITRE_PROFIL, totalPages: TOTAL_PAGES,
  children, numberedListRefs: H.numberedListRefs,
  outFile: path.join(__dirname, "..", "guides", "guide_pilote_v2.docx")
});
