import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert logo to Base64
const logoPath = path.join(__dirname, 'public/logo-cnps.png');
let logoBase64 = '';
try {
  logoBase64 = fs.readFileSync(logoPath).toString('base64');
} catch (e) {
  console.error("Erreur lors de la lecture du logo CNPS:", e);
}

// ─── TEMPLATE MS WORD HTML (OFFICE DOCUMENT COMPATIBLE) ─────────────────────
const getBaseHtmlForWord = (title, subtitle, badgeText, content) => `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm; /* A4 */
      margin: 2.5cm 2.0cm 2.5cm 2.0cm; /* top, right, bottom, left */
      mso-header: h1;
      mso-footer: f1;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
    }
    div.Section1 { page: Section1; }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #334155;
    }
    
    /* Headers & Footers style */
    p.MsoHeader, li.MsoHeader, div.MsoHeader {
      margin: 0in;
      margin-bottom: .0001pt;
      mso-pagination: widow-orphan;
      tab-stops: center 3.0in right 6.0in;
      font-size: 8.5pt;
      font-family: "Arial", sans-serif;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    p.MsoFooter, li.MsoFooter, div.MsoFooter {
      margin: 0in;
      margin-bottom: .0001pt;
      mso-pagination: widow-orphan;
      tab-stops: center 3.0in right 6.0in;
      font-size: 8.5pt;
      font-family: "Arial", sans-serif;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
    }
    
    h1 {
      font-family: 'Arial', sans-serif;
      font-size: 24pt;
      color: #0f592f;
      margin-top: 30px;
      margin-bottom: 12px;
      font-weight: bold;
    }
    h2 {
      font-family: 'Arial', sans-serif;
      font-size: 18pt;
      color: #0f592f;
      border-bottom: 2px solid #0f592f;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      font-weight: bold;
      page-break-after: avoid;
    }
    h3 {
      font-family: 'Arial', sans-serif;
      font-size: 14pt;
      color: #1e293b;
      margin-top: 20px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    h4 {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      color: #0f592f;
      margin-top: 14px;
      margin-bottom: 8px;
      font-weight: bold;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    ul, ol {
      margin-bottom: 12px;
      padding-left: 20px;
    }
    li {
      margin-bottom: 6px;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
      color: #0f592f;
      padding: 2px 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 18px;
    }
    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: bold;
      border: 1px solid #cbd5e1;
      padding: 8px;
      text-align: left;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      text-align: left;
    }
    .callout {
      background-color: #f8fafc;
      border-left: 4px solid #0f592f;
      padding: 12px;
      margin-bottom: 16px;
    }
    .callout-warning {
      background-color: #fffbeb;
      border-left: 4px solid #c8963e;
      padding: 12px;
      margin-bottom: 16px;
      color: #78350f;
    }
    .page-break {
      page-break-before: always;
    }
    .bg-slate-50 {
      background-color: #f8fafc;
      padding: 16px;
      border: 1px solid #e2e8f0;
      margin-bottom: 18px;
    }
    .bg-violet-50 {
      background-color: #f5f3ff;
      padding: 16px;
      border: 1px solid #ddd6fe;
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- Page de garde -->
    <div style="padding: 40px; border: 12px solid #0f592f; background-color: #f8fafc; min-height: 600px; margin-bottom: 50px;">
      <table style="width: 100%; border: none;">
        <tr style="border: none;">
          <td style="border: none; width: 60%;">
            <p style="font-size: 11pt; font-weight: bold; color: #0f592f; text-transform: uppercase; margin: 0;">Caisse Nationale de Prévoyance Sociale</p>
            <p style="font-size: 9pt; color: #64748b; text-transform: uppercase; margin: 0;">République de Côte d'Ivoire</p>
          </td>
          <td style="border: none; width: 40%; text-align: right;">
            ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo CNPS" width="90" />` : ''}
          </td>
        </tr>
      </table>
      
      <div style="margin-top: 100px; margin-bottom: 100px;">
        <p style="display: inline-block; background-color: #0f592f; color: white; padding: 4px 10px; font-size: 9pt; font-weight: bold; text-transform: uppercase; border-radius: 4px; margin-bottom: 15px;">
          ${badgeText}
        </p>
        <p style="font-size: 20pt; font-weight: bold; color: #334155; margin-top: 10px; margin-bottom: 5px;">GUIDE D'UTILISATION</p>
        <h1 style="font-size: 28pt; font-weight: 900; color: #0f592f; margin-top: 0; text-transform: uppercase; margin-bottom: 15px;">${title}</h1>
        <div style="width: 80px; height: 4px; background-color: #c8963e; margin-bottom: 20px;"></div>
        <p style="font-size: 14pt; color: #64748b; font-weight: 500; text-align: left;">${subtitle}</p>
      </div>
      
      <div style="margin-top: 120px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
        <table style="width: 100%; border: none;">
          <tr style="border: none;">
            <td style="border: none; font-size: 9pt; color: #64748b; padding: 0;">
              <strong>Application eRéclamations</strong><br/>
              © 2026 CNPS Côte d'Ivoire. Tous droits réservés.
            </td>
            <td style="border: none; font-size: 9pt; color: #64748b; text-align: right; padding: 0;">
              <strong>Version 1.0 (Production)</strong><br/>
              Date d'édition : Mai 2026
            </td>
          </tr>
        </table>
      </div>
    </div>

    <br style="page-break-before: always;" />

    <!-- Contenu du document -->
    <div>
      ${content}
    </div>
  </div>

  <!-- Header Content -->
  <div style="mso-element:header" id="h1">
    <p class="MsoHeader">
      <span style="font-weight: bold; text-transform: uppercase;">eRéclamations CNPS — Guide Utilisateur</span>
      <span style="float: right;">Caisse Nationale de Prévoyance Sociale</span>
    </p>
  </div>

  <!-- Footer Content -->
  <div style="mso-element:footer" id="f1">
    <p class="MsoFooter">
      <span>Caisse Nationale de Prévoyance Sociale (Côte d'Ivoire)</span>
      <span style="float: right;">Page <span style="mso-field-code:' PAGE '"></span> sur <span style="mso-field-code:' NUMPAGES '"></span></span>
    </p>
  </div>
</body>
</html>
`;

// ─── CONTENUS DES GUIDES ─────────────────────────────────────────────────────
const agentContent = `
  <h2 class="page-break">Table des Matières</h2>
  <ul>
    <li>1. Introduction &amp; Authentification</li>
    <li>2. Saisie d'une Nouvelle Réclamation</li>
    <li>3. Suivi &amp; Tableau de Bord personnel ("Mes Saisies")</li>
    <li>4. Qualification des dossiers (Agence Digitale)</li>
    <li>5. Base de connaissances &amp; FAQ</li>
  </ul>

  <h2 class="page-break">1. Introduction &amp; Authentification</h2>
  <p>
    En tant qu'<strong>Agent d'Accueil et de Saisie</strong>, vous êtes le premier maillon de la chaîne de gestion des réclamations de la CNPS. Votre rôle est crucial : c'est vous qui accueillez le réclamant (partenaire), qualifiez sa demande initiale, enregistrez ses informations avec précision, et lui remettez son reçu de dépôt.
  </p>

  <div class="callout">
    <strong>Accéder à l'application</strong><br/>
    1. Ouvrez votre navigateur web et saisissez l'adresse de l'application : <code>http://ereclamations.cnps.ci</code>.<br/>
    2. Renseignez votre adresse email professionnelle et votre mot de passe fourni par la hiérarchie.<br/>
    3. Cliquez sur <strong>Se connecter</strong> pour accéder à votre espace de travail.
  </div>

  <div class="bg-slate-50">
    <strong>Votre écran d'accueil</strong><br/>
    Une fois connecté, vous arrivez sur votre tableau de bord personnel. La barre latérale vous donne accès aux modules principaux :
    <ul>
      <li><strong>Saisie :</strong> Enregistrer une nouvelle réclamation pour un partenaire.</li>
      <li><strong>Mes Saisies :</strong> Suivre l'état d'avancement des dossiers que vous avez créés.</li>
      <li><strong>Base de Connaissances :</strong> Consulter les articles d'aide et les fiches de procédures.</li>
      <li><strong>Mon Profil :</strong> Consulter vos informations personnelles et modifier votre mot de passe.</li>
    </ul>
  </div>

  <h2 class="page-break">2. Saisie d'une Nouvelle Réclamation</h2>
  <p>
    Pour enregistrer une nouvelle réclamation, cliquez sur <strong>"Nouvelle Réclamation"</strong>. Remplissez le formulaire en suivant rigoureusement ces étapes :
  </p>

  <ol>
    <li><strong>Choix du Régime et Type de Client :</strong> Sélectionnez d'abord le Régime (ex: <em>Régime Général</em>, <em>Régime des Indépendants RSTI</em>) et le Type de client (<em>Travailleur</em>, <em>Employeur</em>, <em>Sinistré</em>).</li>
    <li><strong>Identification du Partenaire :</strong> Saisissez le N° d'identification (CNPS ou Matricule). Le système recherchera automatiquement les informations en base de données. Si besoin, complétez le Nom, Prénom, Téléphone et Email du partenaire réclamant.</li>
  </ol>

  <div class="callout-warning">
    <strong>ATTENTION :</strong> Le numéro de téléphone du partenaire est <strong>obligatoire</strong> et doit être valide afin qu'il puisse recevoir les SMS de notification de traitement.
  </div>

  <ol start="3">
    <li><strong>Description &amp; Pièces Jointes :</strong> Rédigez un résumé clair de l'objet de la réclamation dans la zone "Description détaillée". Joignez les pièces justificatives numérisées fournies par le client en cliquant sur la zone de dépôt de fichiers.</li>
  </ol>

  <h2 class="page-break">3. Suivi &amp; Tableau de Bord personnel</h2>
  <p>
    Votre tableau de bord central vous permet de suivre en temps réel la vie des réclamations que vous avez enregistrées :
  </p>
  <ul>
    <li><strong>Nouveau :</strong> En attente de prise en charge.</li>
    <li><strong>En Cours :</strong> En cours de traitement par un pilote d'agence.</li>
    <li><strong>Validé :</strong> Résolu définitivement par le coordonnateur.</li>
  </ul>

  <div class="bg-slate-50">
    <strong>Recherche et consultation des dossiers</strong><br/>
    1. Utilisez la barre de recherche en haut de l'écran pour retrouver une réclamation en saisissant le numéro de ticket (ex: <code>REC-2026-XXXX</code>) ou le nom du partenaire.<br/>
    2. Cliquez sur la ligne d'un dossier pour ouvrir sa Fiche de Traitement et voir l'historique des actions entreprises.<br/>
    3. Pour tout dossier validé, vous pouvez télécharger et réimprimer le reçu officiel en cliquant sur le bouton "Télécharger Reçu" en haut de la fiche.
  </div>

  <h2 class="page-break">4. Qualification des Dossiers (Agence Digitale)</h2>
  <div class="bg-violet-50">
    <strong>Spécifique Agence Digitale</strong><br/>
    Les réclamations saisies en ligne par les usagers atterrissent en état "Non Qualifié" (NQ). Votre mission est d'étudier ces dossiers et de les qualifier pour qu'ils soient orientés vers le bon processus de traitement.
  </div>

  <p><strong>Procédure de Qualification pas-à-pas :</strong></p>
  <ol>
    <li>Dans la barre latérale, allez dans <strong>"Non qualifiées"</strong>. Sélectionnez le ticket. Lisez la description écrite par l'usager et analysez sa demande.</li>
    <li>Dans l'encadré de qualification violet en haut de la fiche, renseignez obligatoirement :
      <ul>
        <li><strong>Processus concerné</strong> (ex: <em>Prestations Familiales</em>, <em>Retraite</em>, <em>RSTI</em>)</li>
        <li><strong>Objet Principal (Motif)</strong> (ex: <em>Non-paiement</em>, <em>Calcul erroné</em>)</li>
        <li><strong>Précision (Sous-motif)</strong> (ex: <em>Indemnités journalières</em>)</li>
      </ul>
    </li>
    <li>Ajoutez si besoin un commentaire interne pour le pilote, puis cliquez sur <strong>"Valider la qualification"</strong>. Le ticket sera immédiatement orienté vers l'agence locale compétente.</li>
  </ol>

  <h2 class="page-break">5. Base de Connaissances &amp; FAQ</h2>
  <p>
    Pour vous aider à répondre aux questions des usagers ou à qualifier correctement un dossier complexe, vous disposez d'une <strong>Base de Connaissances</strong> intégrée.
  </p>
  <div class="callout">
    <strong>Comment l'utiliser ?</strong><br/>
    - Cliquez sur "Base de Connaissances" dans la barre latérale.<br/>
    - Saisissez un mot-clé (ex: <em>maternité</em>, <em>RSTI</em>) dans la barre de recherche en haut.<br/>
    - Consultez l'article d'explication. Vous y trouverez la réglementation en vigueur, les pièces obligatoires à demander au partenaire, et la structure interne de la CNPS chargée de résoudre ce type de demande.
  </div>
`;

const piloteContent = `
  <h2 class="page-break">Table des Matières</h2>
  <ul>
    <li>1. Présentation &amp; Rôle du Pilote</li>
    <li>2. Prise en charge d'une Réclamation</li>
    <li>3. Analyse de cause &amp; Base de Connaissances</li>
    <li>4. Création et Clôture des Actions</li>
    <li>5. Escalade &amp; Soumission à la Validation</li>
  </ul>

  <h2 class="page-break">1. Présentation &amp; Rôle du Pilote</h2>
  <p>
    Le <strong>Pilote de Traitement</strong> est le technicien chargé de résoudre concrètement le problème du partenaire. Son périmètre d'action s'exerce au niveau de son agence de rattachement. Le pilote mène l'investigation, réalise les corrections informatiques ou de dossier, suit les échéances (SLA) et propose la clôture de la réclamation à son Manager (Coordonnateur).
  </p>

  <div class="bg-slate-50">
    <strong>Vos indicateurs de performance clés (KPI)</strong><br/>
    Sur votre tableau de bord, vous devez surveiller quotidiennement deux indicateurs essentiels :
    <ul>
      <li><strong>🚨 Tickets Dépassés (SLA) :</strong> Le nombre de dossiers en cours dont la date limite réglementaire est dépassée. À traiter en priorité absolue !</li>
      <li><strong>⚠️ Dossiers Retournés :</strong> Dossiers soumis au manager mais retournés avec des remarques pour correction. Vous devez les corriger rapidement.</li>
    </ul>
  </div>

  <h2 class="page-break">2. Prise en charge d'une Réclamation</h2>
  <p>
    Dès qu'une réclamation qualifiée concerne votre agence, elle apparaît dans votre liste de tâches à l'état <strong>"Nouveau"</strong>.
  </p>

  <ol>
    <li><strong>Prendre en Charge :</strong> Ouvrez la fiche de la réclamation à l'état "Nouveau". Cliquez sur le bouton vert <strong>"Prendre en charge"</strong> en haut de l'écran. Cette action vous assigne officiellement le dossier et change le statut du ticket en <strong>"En Cours"</strong>. Le partenaire reçoit alors un SMS de notification de prise en charge.</li>
    <li><strong>Examiner les Informations :</strong> Prenez connaissance de la Description saisie par l'agent ou le client. Consultez l'historique du client situé au bas de la fiche pour vérifier s'il a déjà déposé d'autres réclamations par le passé.</li>
  </ol>

  <h2 class="page-break">3. Analyse de cause &amp; Base de Connaissances</h2>
  <p>
    Tout dossier résolu doit faire l'objet d'une <strong>analyse technique de cause</strong>. C'est une obligation légale pour le pilotage qualité de la CNPS.
  </p>

  <div class="callout">
    <strong>Comment renseigner l'analyse :</strong><br/>
    Rendez-vous dans la section "Analyse Technique" de la Fiche de Traitement :
    <ul>
      <li><strong>Catégorie de cause :</strong> Sélectionnez la catégorie principale (ex: <em>Dysfonctionnement applicatif</em>, <em>Erreur de saisie</em>).</li>
      <li><strong>Cause précise :</strong> Choisissez la cause exacte dans la liste déroulante associée.</li>
      <li><strong>Commentaire d'analyse :</strong> Rédigez une brève explication technique des raisons du problème constaté.</li>
    </ul>
  </div>

  <div class="bg-violet-50">
    <strong>💡 Booster l'analyse via la Base de Connaissances</strong><br/>
    Si votre ticket est qualifié sur un sous-motif courant, cliquez sur <strong>"Consulter les suggestions"</strong> dans l'analyse. Le système recherchera dans la base de connaissances :
    <br/>1. L'analyse type pré-rédigée pour ce motif.
    <br/>2. Les actions correctives standard préconisées.
    <br/>
    Cliquez sur <strong>"Importer la suggestion"</strong> : cela remplira automatiquement votre champ d'analyse et créera d'un seul coup les actions types à mener. Un gain de temps considérable !
  </div>

  <h2 class="page-break">4. Création et Clôture des Actions</h2>
  <p>
    Une réclamation ne peut être résolue sans qu'une ou plusieurs actions de correction concrètes n'aient été enregistrées et validées.
  </p>

  <ol>
    <li><strong>Ajouter une Action :</strong> Dans la section "Liste des corrections", cliquez sur "Ajouter une action". Indiquez le libellé de la tâche (ex: <em>Mettre à jour le salaire du trimestre T4-2025</em>), et éventuellement la structure ou personne sollicitée.</li>
    <li><strong>Clôturer une Action :</strong> Une fois l'action réalisée, cliquez sur l'icône verte coche de validation (✓) en bout de ligne de l'action. Renseignez obligatoirement le commentaire de réalisation (ex: <em>Calcul révisé, virement ordonné ce jour</em>) et validez. L'action passe à l'état "Terminé".</li>
  </ol>

  <div class="callout-warning">
    <strong>RÈGLE ADMINISTRATIVE STRICTE :</strong> Le système refusera de soumettre la réclamation au coordonnateur si au moins une action de correction reste en état "En Cours". Toutes les actions créées doivent impérativement être marquées comme réalisées.
  </div>

  <h2 class="page-break">5. Escalade &amp; Soumission à la Validation</h2>
  <h3>Option A : L'Escalade (Transfert d'agence)</h3>
  <p>
    Si après étude, le dossier relève de la compétence d'une autre agence (ex: géré par Yamoussoukro alors que le ticket a été affecté à Marcory), vous pouvez escalader le dossier :
    <br/>1. Cliquez sur <strong>"Escalader"</strong> en haut de la fiche.
    <br/>2. Sélectionnez l'<strong>Agence cible</strong> compétente.
    <br/>3. Saisissez un <strong>Commentaire justificatif</strong> expliquant les raisons du transfert et validez.
  </p>

  <h3>Option B : Soumettre pour Validation (Résolution)</h3>
  <p>
    Lorsque vous avez terminé vos corrections, rempli l'analyse technique et clôturé toutes les actions :
    <br/>1. Le bouton <strong>"Soumettre pour validation"</strong> devient cliquable en haut à droite.
    <br/>2. Cliquez dessus. Le statut du ticket passe à <strong>"A Valider"</strong>.
    <br/>3. Le dossier est maintenant envoyé dans la file d'attente de votre Coordonnateur.
  </p>

  <div class="callout">
    <strong>Cas de retour :</strong> Si votre Coordonnateur estime que le problème n'est pas résolu, il vous retournera le dossier. Un bandeau orange apparaîtra sur la fiche contenant ses instructions de correction (dans le champ 'remarques_coordination').
  </div>
`;

const coordonnateurContent = `
  <h2 class="page-break">Table des Matières</h2>
  <ul>
    <li>1. Rôle du Coordonnateur &amp; Suivi Local</li>
    <li>2. Processus de Validation des Dossiers</li>
    <li>3. Retour de Dossier pour Correction</li>
    <li>4. Administration Locale de l'Agence</li>
    <li>5. Paramétrages &amp; Référentiels</li>
  </ul>

  <h2 class="page-break">1. Rôle du Coordonnateur &amp; Suivi Local</h2>
  <p>
    Le <strong>Coordonnateur</strong> est le Manager du Service Accueil des Réclamations au niveau d'une agence. Votre mission est double : 
    <br/>1. **Piloter l'activité locale** en veillant au respect des délais légaux (SLA) par vos agents et pilotes.
    <br/>2. **Garantir la qualité des résolutions** en contrôlant minutieusement chaque dossier avant sa clôture définitive.
  </p>

  <div class="bg-slate-50">
    <strong>Le Tableau de Bord de Pilotage</strong><br/>
    Depuis votre tableau de bord d'agence, suivez en temps réel les indicateurs d'efficacité :
    <ul>
      <li><strong>Taux de respect de la SLA :</strong> pourcentage de dossiers résolus dans les temps impartis.</li>
      <li><strong>File "A Valider" :</strong> le volume de dossiers en attente de votre décision. Elle doit être maintenue au niveau le plus bas possible.</li>
      <li><strong>Alerte Hors SLA :</strong> identifie les dossiers en souffrance pour lesquels vous devez intervenir auprès des pilotes.</li>
    </ul>
  </div>

  <h2 class="page-break">2. Processus de Validation des Dossiers</h2>
  <p>
    Lorsqu'un pilote soumet un dossier traité, ce dernier passe en statut <strong>"A Valider"</strong>. Vous devez mener les vérifications suivantes avant de statuer :
  </p>

  <ol>
    <li><strong>Contrôler l'Analyse de Cause :</strong> Vérifiez que la Catégorie de cause et la Cause précise sélectionnées sont cohérentes par rapport à la réclamation. Lisez le commentaire rédigé par le pilote.</li>
    <li><strong>Examiner les Actions Correctives :</strong> Assurez-vous que les actions menées répondent pleinement et durablement au problème. Vérifiez les pièces justificatives jointes.</li>
    <li><strong>Prononcer la Validation de Clôture :</strong> Si tout est conforme, cliquez sur <strong>"Valider / Retourner"</strong> puis sur <strong>"Confirmer la validation"</strong>. Le statut du dossier devient <strong>"Validé"</strong>. Cela clôture la réclamation en base de données et déclenche l'envoi d'un SMS de satisfaction à l'usager.</li>
  </ol>

  <h2 class="page-break">3. Retour de Dossier pour Correction</h2>
  <p>
    Si vous estimez que l'analyse est incomplète ou que les actions réalisées ne résolvent pas correctement la réclamation, vous devez la rejeter.
  </p>

  <div class="callout-warning">
    <strong>Procédure de Retour pour Correction :</strong><br/>
    1. Sur la fiche de traitement, cliquez sur le bouton <strong>"Valider / Retourner"</strong>.<br/>
    2. Cochez l'option <strong>"Retourner au pilote pour correction"</strong>.<br/>
    3. Rédigez de manière claire et constructive les corrections attendues dans le champ de commentaire (ex : <em>« L'action de mise à jour des salaires est notée réalisée mais aucun justificatif de virement n'est présent. Merci de joindre le bordereau. »</em>).<br/>
    4. Cliquez sur <strong>"Confirmer"</strong>.
  </div>

  <p>
    Le ticket retourne automatiquement à l'état <strong>"En Cours"</strong> dans le portefeuille du pilote assigné. Un bandeau d'alerte orange s'affichera sur sa fiche avec vos remarques d'arbitrage.
  </p>

  <h2 class="page-break">4. Administration Locale de l'Agence</h2>
  <p>
    En tant que gestionnaire local de votre agence, vous disposez d'un onglet <strong>"Administration"</strong> adapté à vos droits managériaux.
  </p>

  <div class="bg-slate-50">
    <strong>Gestion de vos Collaborateurs :</strong><br/>
    Sélectionnez l'onglet "Utilisateurs" dans le panneau d'administration :
    <ul>
      <li><strong>➕ Créer un utilisateur :</strong> Ajoutez un nouvel agent d'accueil ou pilote de traitement rattaché à votre agence. Renseignez ses informations et attribuez-lui le rôle adéquat.</li>
      <li><strong>🔑 Réinitialiser un accès :</strong> En cas de perte de mot de passe d'un collaborateur, modifiez son mot de passe pour lui attribuer un mot de passe temporaire à modifier lors de sa prochaine connexion.</li>
    </ul>
  </div>

  <h2 class="page-break">5. Paramétrages &amp; Référentiels d'Agence</h2>
  <p>
    Votre rôle vous permet également de consulter en lecture seule la structure des référentiels configurés au niveau national :
  </p>
  <ul>
    <li><strong>📂 Processus d'Agence :</strong> Visualisation des processus actifs (Retraite, Prestations, etc.).</li>
    <li><strong>🏷️ Motifs &amp; SLA :</strong> Délai légal (SLA) associé à chaque motif de réclamation.</li>
    <li><strong>🎯 Causes d'Analyse :</strong> Liste des causes standardisées pour l'analyse qualité.</li>
    <li><strong>📍 Affectations :</strong> Règles de routage automatique des dossiers vers votre agence.</li>
  </ul>
`;

const superviseurContent = `
  <h2 class="page-break">Table des Matières</h2>
  <ul>
    <li>1. Introduction au Rôle de Superviseur Central</li>
    <li>2. Commutation Multi-Agences &amp; Dashboard Central</li>
    <li>3. Prise en main des Escalades &amp; Réaffectation</li>
    <li>4. Gestion du Référentiel National</li>
    <li>5. Administration des Fichiers Usagers</li>
  </ul>

  <h2 class="page-break">1. Introduction au Rôle de Superviseur Central</h2>
  <p>
    Le <strong>Superviseur Central</strong> est l'autorité métier nationale de l'application eRéclamations. Vous assurez la supervision de l'intégralité du réseau des agences de la CNPS. Vous pilotez la performance nationale, configurez les règles de gestion, arbitrez les conflits d'affectation et gérez les dossiers complexes escaladés par les pilotes en agence.
  </p>

  <div class="bg-slate-50">
    <strong>Vos Responsabilités Principales</strong>
    <ul>
      <li><strong>🌍 Vision Globale :</strong> Superviseur national de toutes les agences CNPS.</li>
      <li><strong>⚡ Arbitrage &amp; Escalades :</strong> Gérer les dossiers escaladés et affecter manuellement des pilotes.</li>
      <li><strong>🛠️ Configuration Métier :</strong> Paramétrer les SLA, motifs et processus.</li>
      <li><strong>📁 Fichiers de Référence :</strong> Gérer les bases nationales des Travailleurs, Employeurs et Sinistres.</li>
    </ul>
  </div>

  <h2 class="page-break">2. Commutation Multi-Agences &amp; Dashboard Central</h2>
  <p>
    Votre tableau de bord intègre une fonctionnalité essentielle : la <strong>commutation dynamique de vue</strong>.
  </p>
  <ol>
    <li><strong>Le Sélecteur d'Agence :</strong> En haut de votre écran d'accueil, cliquez sur la liste déroulante <strong>"Sélectionner l'agence"</strong>. Par défaut sur "Toutes agences", vous pouvez basculer sur n'importe quelle agence physique locale.</li>
    <li><strong>Rapport statistique instantané :</strong> Tout le dashboard se met à jour pour n'afficher que les indicateurs de l'agence sélectionnée (respect des SLA, dossiers en retard, etc.).</li>
  </ol>

  <h2 class="page-break">3. Gestion des Escalades &amp; Réaffectation</h2>
  <p>
    Les pilotes en agence peuvent solliciter une <strong>escalade centrale</strong> lorsque le dossier requiert une expertise métier pointue ou un arbitrage national.
  </p>
  <ol>
    <li><strong>Suivi des Escalades :</strong> Accédez à la file <strong>"Escaladées"</strong> depuis votre menu. Lisez le motif d'escalade rédigé par le pilote d'agence.</li>
    <li><strong>Réaffectation et Affectation de Pilote :</strong> Vous pouvez modifier l'agence cible d'une réclamation ou affecter manuellement un pilote spécifique pour forcer le traitement immédiat.</li>
  </ol>

  <h2 class="page-break">4. Gestion du Référentiel National (Administration)</h2>
  <p>
    Votre profil Superviseur vous octroie l'accès complet à la configuration de la mécanique de l'application via le panneau <strong>"Administration"</strong> :
  </p>
  <ul>
    <li><strong>⚙️ Processus :</strong> Créer et éditer les processus métiers CNPS et leurs codes associés.</li>
    <li><strong>🏷️ Motifs &amp; SLA :</strong> Créer les motifs/sous-motifs, et leur attribuer leur <strong>délai SLA réglementaire en jours</strong>.</li>
    <li><strong>🧩 Causes (Analyse) :</strong> Gérer les catégories de causes de dysfonctionnement et les causes précises pour l'analyse qualité.</li>
    <li><strong>📍 Affectations Automatiques :</strong> Définir les règles de routage automatique par motif et par agence.</li>
  </ul>

  <h2 class="page-break">5. Administration des Fichiers Usagers</h2>
  <p>
    Vous avez la responsabilité de consulter et de tenir à jour les bases de données d'identification des usagers importées dans l'application :
  </p>
  <div class="callout">
    <strong>Les bases de données clés :</strong>
    <ul>
      <li><strong>👷 Travailleurs :</strong> Liste de tous les assurés sociaux (salariés et indépendants RSTI), utile pour vérifier leurs informations de base.</li>
      <li><strong>🏢 Employeurs :</strong> Registre des entreprises cotisantes, numéros CNPS officiels, dénominations et adresses.</li>
      <li><strong>🤕 Sinistres :</strong> Registre national des accidents du travail et maladies professionnelles déclarés, indispensable pour instruire les réclamations liées aux risques professionnels.</li>
    </ul>
  </div>
`;

// ─── CONFIGURATION DES DOCUMENTS ─────────────────────────────────────────────
const guides = [
  {
    role: 'agent',
    title: "Profil Agent de Saisie",
    subtitle: "Manuel opératoire complet pour la saisie des réclamations, l'identification des partenaires, l'émission des reçus et la qualification à l'Agence Digitale.",
    badge: "Accueil &amp; Enregistrement",
    content: agentContent
  },
  {
    role: 'pilote',
    title: "Profil Pilote de Traitement",
    subtitle: "Guide technique pour la prise en charge, l'analyse technique des causes, la mise en œuvre d'actions correctives et la soumission pour validation.",
    badge: "Instruction &amp; Résolution",
    content: piloteContent
  },
  {
    role: 'coordonnateur',
    title: "Profil Coordonnateur",
    subtitle: "Guide managérial pour le pilotage de l'activité, la validation finale ou le retour pour correction des dossiers, et la gestion des comptes de l'agence.",
    badge: "Validation &amp; Management",
    content: coordonnateurContent
  },
  {
    role: 'superviseur',
    title: "Profil Superviseur",
    subtitle: "Manuel d'administration centrale pour la supervision multi-agences, la gestion des escalades nationales, la configuration des SLA et des règles de routage.",
    badge: "Supervision Nationale",
    content: superviseurContent
  }
];

async function generateAllDoc() {
  console.log("Démarrage de la génération des guides Word compatibles (.doc)...");
  
  const outputDir = path.join(__dirname, '../guides');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Dossier de sortie créé : ${outputDir}`);
  }

  for (const guide of guides) {
    console.log(`Génération du document Word pour : ${guide.role.toUpperCase()}...`);
    
    const htmlContent = getBaseHtmlForWord(
      guide.title, 
      guide.subtitle, 
      guide.badge, 
      guide.content
    );
    
    const docFilePath = path.join(outputDir, `guide_${guide.role}.doc`);
    fs.writeFileSync(docFilePath, htmlContent, 'utf-8');
    
    console.log(`Guide Word .doc généré : \n - ${docFilePath}`);
  }
  
  console.log("Génération terminée !");
}

generateAllDoc().catch(console.error);
