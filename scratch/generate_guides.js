import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert logo to Base64
const logoPath = path.join(__dirname, '../frontend/public/logo-cnps.png');
let logoBase64 = '';
try {
  logoBase64 = fs.readFileSync(logoPath).toString('base64');
} catch (e) {
  console.error("Erreur lors de la lecture du logo CNPS:", e);
}
const logoUrl = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';

// ─── TEMPLATE HTML PRINCIPAL ────────────────────────────────────────────────
const getBaseHtml = (title, subtitle, badgeText, content, color = '#0f592f', accentColor = '#c8963e') => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            cnps: {
              800: '${color}',
              50: '#f0f7f3',
              accent: '${accentColor}'
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    body {
      font-family: 'Outfit', sans-serif;
      color: #334155;
    }
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
    .callout {
      border-left: 4px solid ${color};
      background-color: #f8fafc;
    }
    .callout-warning {
      border-left: 4px solid ${accentColor};
      background-color: #fffbeb;
    }
    .step-number {
      background-color: ${color};
      color: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
  </style>
</head>
<body class="bg-white text-slate-700 antialiased leading-relaxed text-sm">

  <!-- ─── PAGE DE COUVERTURE ────────────────────────────────────────── -->
  <div class="h-[235mm] flex flex-col justify-between p-12 border-[12px] border-cnps-800 relative bg-slate-50/50">
    <!-- Top Bar decoration -->
    <div class="absolute top-0 left-0 right-0 h-3 bg-cnps-accent"></div>
    
    <!-- Logo CNPS -->
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-xs font-black tracking-widest text-cnps-800 uppercase">Caisse Nationale de Prévoyance Sociale</h3>
        <p class="text-[10px] text-slate-400 font-bold uppercase">République de Côte d'Ivoire</p>
      </div>
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo CNPS" class="h-16 object-contain" />` : '<div class="h-16 w-16 bg-slate-200"></div>'}
    </div>

    <!-- Main Title -->
    <div class="my-auto space-y-6">
      <div class="inline-block px-3.5 py-1 bg-cnps-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">
        ${badgeText}
      </div>
      <div class="space-y-3">
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
          GUIDE D'UTILISATION
        </h1>
        <h2 class="text-4xl font-black tracking-tight text-cnps-800 leading-none uppercase">
          ${title}
        </h2>
        <div class="w-24 h-1.5 bg-cnps-accent rounded-full mt-3"></div>
      </div>
      <p class="text-base text-slate-500 font-medium max-w-xl">
        ${subtitle}
      </p>
    </div>

    <!-- Footer of Cover -->
    <div class="border-t border-slate-200 pt-6 flex justify-between items-end">
      <div class="space-y-1">
        <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Application eRéclamations</p>
        <p class="text-[10px] text-slate-500 font-medium">© 2026 CNPS Côte d'Ivoire. Tous droits réservés.</p>
      </div>
      <div class="text-right space-y-1">
        <p class="text-xs text-slate-700 font-black">Version 1.0 (Production)</p>
        <p class="text-[10px] text-slate-400 font-medium">Date d'édition : Mai 2026</p>
      </div>
    </div>
  </div>

  <!-- ─── CONTENU PRINCIPAL ────────────────────────────────────────── -->
  <div class="p-16 space-y-8">
    ${content}
  </div>

</body>
</html>
`;

// ─── CONTENU DU GUIDE DE L'AGENT ─────────────────────────────────────────────
const agentContent = `
  <!-- SOMMAIRE -->
  <div class="page-break avoid-break">
    <h2 class="text-2xl font-black text-cnps-800 border-b-2 border-cnps-800 pb-2 mb-6 uppercase">Table des Matières</h2>
    <ul class="space-y-4 font-semibold text-slate-700">
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">1</span>
          1. Introduction & Authentification
        </span>
        <span class="text-slate-400">Page 3</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">2</span>
          2. Saisie d'une Nouvelle Réclamation
        </span>
        <span class="text-slate-400">Page 4</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">3</span>
          3. Suivi & Tableau de Bord personnel ("Mes Saisies")
        </span>
        <span class="text-slate-400">Page 5</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">4</span>
          4. Qualification des dossiers (Agence Digitale)
        </span>
        <span class="text-slate-400">Page 6</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">5</span>
          5. Base de connaissances & FAQ
        </span>
        <span class="text-slate-400">Page 7</span>
      </li>
    </ul>
  </div>

  <!-- SECTION 1 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">1</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Introduction & Authentification</h2>
    </div>
    
    <p class="text-slate-600">
      En tant qu'**Agent d'Accueil et de Saisie**, vous êtes le premier maillon de la chaîne de gestion des réclamations de la CNPS. Votre rôle est crucial : c'est vous qui accueillez le réclamant (partenaire), qualifiez sa demande initiale, enregistrez ses informations avec précision, et lui remettez son reçu de dépôt.
    </p>

    <div class="callout p-5 rounded-xl space-y-2">
      <h4 class="font-extrabold text-cnps-800 uppercase text-xs tracking-wider">Accéder à l'application</h4>
      <p class="text-xs text-slate-500 leading-relaxed">
        1. Ouvrez votre navigateur web et saisissez l'adresse de l'application : <code class="font-mono bg-white px-1.5 py-0.5 rounded border text-cnps-800 font-bold">http://ereclamations.cnps.ci</code>.<br/>
        2. Renseignez votre adresse email professionnelle et votre mot de passe fourni par la hiérarchie.<br/>
        3. Cliquez sur **Se connecter** pour accéder à votre espace de travail.
      </p>
    </div>

    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3 avoid-break">
      <h3 class="font-extrabold text-slate-800 text-base">Votre écran d'accueil</h3>
      <p class="text-xs text-slate-500">
        Une fois connecté, vous arrivez sur votre tableau de bord personnel. La barre latérale vous donne accès aux modules principaux :
      </p>
      <div class="grid grid-cols-2 gap-4 text-xs">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">📝 Saisie</span>
          Enregistrer une nouvelle réclamation pour un partenaire.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">📊 Mes Saisies</span>
          Suivre l'état d'avancement des dossiers que vous avez créés.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">📖 Base de Connaissances</span>
          Consulter les articles d'aide et les fiches de procédures.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">⚙️ Mon Profil</span>
          Consulter vos informations personnelles et modifier votre mot de passe.
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">2</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Saisie d'une Nouvelle Réclamation</h2>
    </div>

    <p class="text-slate-600">
      Pour enregistrer une nouvelle réclamation, cliquez sur **"Nouvelle Réclamation"** (ou sur l'icône de saisie 📝 dans le menu). Remplissez le formulaire en suivant rigoureusement ces étapes :
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Choix du Régime et Type de Client</h4>
          <p class="text-xs text-slate-500 mt-1">
            Sélectionnez d'abord le **Régime** (ex: *Régime Général*, *Régime des Indépendants RSTI*, *Régime Complémentaire*) et le **Type de client** (*Travailleur*, *Employeur*, *Sinistré*). Cela adaptera dynamiquement la suite du formulaire.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Identification du Partenaire</h4>
          <p class="text-xs text-slate-500 mt-1">
            Saisissez le **N° d'identification** (CNPS, RSTI ou Matricule). Le système recherchera automatiquement les informations en base de données. Si les données n'existent pas ou si des champs sont vides, complétez le Nom, Prénom, Téléphone et Email du partenaire réclamant.
          </p>
          <div class="callout-warning p-4 rounded-xl text-xs text-amber-900 mt-2">
            ⚠️ **ATTENTION** : Le numéro de téléphone du partenaire est **obligatoire** et doit être valide afin qu'il puisse recevoir les SMS de notification de traitement.
          </div>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">3</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Description & Pièces Jointes</h4>
          <p class="text-xs text-slate-500 mt-1">
            Rédigez un résumé clair de l'objet de la réclamation dans la zone **"Description détaillée"**. Joignez les pièces justificatives numérisées fournies par le client (pièce d'identité, reçu de versement, courrier de réclamation, etc.) en cliquant sur la zone de dépôt de fichiers.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">3</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Suivi & Tableau de Bord personnel</h2>
    </div>

    <p class="text-slate-600">
      Votre tableau de bord central vous permet de suivre en temps réel la vie des réclamations que vous avez enregistrées.
    </p>

    <div class="grid grid-cols-3 gap-4 avoid-break">
      <div class="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center">
        <span class="text-2xl font-extrabold text-sky-800">Nouveau</span>
        <p class="text-[10px] text-sky-600 font-bold uppercase mt-1">En attente de prise en charge</p>
      </div>
      <div class="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
        <span class="text-2xl font-extrabold text-amber-800">En Cours</span>
        <p class="text-[10px] text-amber-600 font-bold uppercase mt-1">En cours de traitement</p>
      </div>
      <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
        <span class="text-2xl font-extrabold text-emerald-800">Validé</span>
        <p class="text-[10px] text-emerald-600 font-bold uppercase mt-1">Résolu définitivement</p>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="font-extrabold text-slate-800 text-base">Recherche et consultation des dossiers</h3>
      <p class="text-xs text-slate-500">
        1. Utilisez la **barre de recherche** en haut de l'écran pour retrouver une réclamation en saisissant le numéro de ticket (ex: <code class="bg-slate-100 px-1 rounded font-mono font-bold text-cnps-800">REC-2026-XXXX</code>) ou le nom du partenaire.<br/>
        2. Cliquez sur la ligne d'un dossier pour ouvrir sa **Fiche de Traitement** et voir l'historique des actions entreprises.<br/>
        3. Pour tout dossier validé, vous pouvez télécharger et réimprimer le **reçu officiel** en cliquant sur le bouton **"Télécharger Reçu"** en haut de la fiche.
      </p>
    </div>
  </div>

  <!-- SECTION 4 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">4</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Qualification des Dossiers (Agence Digitale)</h2>
    </div>

    <div class="bg-violet-50 p-4 rounded-xl border border-violet-100/50 flex gap-3 items-start">
      <span class="px-2 py-1 bg-violet-600 text-white text-[9px] font-black uppercase rounded mt-1">Spécifique</span>
      <div>
        <h4 class="font-extrabold text-violet-950 text-sm uppercase">Cette section s'applique uniquement aux agents de l'Agence Digitale</h4>
        <p class="text-xs text-violet-900 mt-1">
          Les réclamations saisies en ligne par les usagers atterrissent en état **"Non Qualifié"** (NQ). Votre mission est d'étudier ces dossiers et de les qualifier pour qu'ils soient orientés vers le bon processus de traitement.
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="font-extrabold text-slate-800 text-base">Procédure de Qualification pas-à-pas :</h3>
      
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Ouvrir la réclamation NQ</h4>
          <p class="text-xs text-slate-500 mt-1">
            Dans la barre latérale, allez dans **"Non qualifiées"**. Sélectionnez le ticket. Lisez la description écrite par l'usager et analysez sa demande.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Renseigner le bloc de Qualification</h4>
          <p class="text-xs text-slate-500 mt-1">
            Un encadré violet apparaît en haut de la fiche. Renseignez obligatoirement les trois champs suivants :
          </p>
          <ul class="list-disc list-inside text-xs text-slate-500 pl-4 mt-1.5 space-y-1">
            <li>**Processus concerné** (ex: *Prestations Familiales*, *Retraite*, *RSTI*, etc.)</li>
            <li>**Objet Principal (Motif)** (ex: *Non-paiement*, *Calcul erroné*, *Retard de virement*)</li>
            <li>**Précision (Sous-motif)** (ex: *Indemnités journalières*, *Pension de réversion*)</li>
          </ul>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">3</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Valider la Qualification</h4>
          <p class="text-xs text-slate-500 mt-1">
            Ajoutez si besoin un commentaire interne pour le pilote de traitement, puis cliquez sur **"Valider la qualification"**. Le ticket sera immédiatement orienté vers l'agence locale du partenaire ou vers le service compétent pour traitement.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">5</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Base de Connaissances & FAQ</h2>
    </div>

    <p class="text-slate-600">
      Pour vous aider à répondre aux questions des usagers ou à qualifier correctement un dossier complexe, vous disposez d'une **Base de Connaissances** intégrée.
    </p>

    <div class="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3 avoid-break">
      <h4 class="font-extrabold text-slate-800 text-sm">Comment l'utiliser ?</h4>
      <p class="text-xs text-slate-500 leading-relaxed">
        - Cliquez sur **"Base de Connaissances"** dans la barre latérale.<br/>
        - Saisissez un mot-clé (ex: *maternité*, *calcul pension*, *RSTI*) dans la barre de recherche en haut.<br/>
        - Consultez l'article d'explication. Vous y trouverez la réglementation en vigueur, les pièces obligatoires à demander au partenaire, et la structure interne de la CNPS chargée de résoudre ce type de demande.
      </p>
    </div>

    <div class="callout p-4 rounded-xl text-xs text-slate-600">
      💡 **ASTUCE** : N'hésitez pas à ouvrir la Base de Connaissances dans un deuxième onglet de votre navigateur pour l'avoir en permanence sous les yeux pendant que vous accueillez un usager !
    </div>
  </div>
`;

// ─── CONTENU DU GUIDE DU PILOTE ──────────────────────────────────────────────
const piloteContent = `
  <!-- SOMMAIRE -->
  <div class="page-break avoid-break">
    <h2 class="text-2xl font-black text-cnps-800 border-b-2 border-cnps-800 pb-2 mb-6 uppercase">Table des Matières</h2>
    <ul class="space-y-4 font-semibold text-slate-700">
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">1</span>
          1. Présentation & Rôle du Pilote
        </span>
        <span class="text-slate-400">Page 3</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">2</span>
          2. Prise en charge d'une Réclamation
        </span>
        <span class="text-slate-400">Page 4</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">3</span>
          3. Analyse de cause & Base de Connaissances
        </span>
        <span class="text-slate-400">Page 5</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">4</span>
          4. Création et Clôture des Actions
        </span>
        <span class="text-slate-400">Page 6</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">5</span>
          5. Escalade & Soumission à la Validation
        </span>
        <span class="text-slate-400">Page 7</span>
      </li>
    </ul>
  </div>

  <!-- SECTION 1 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">1</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Présentation & Rôle du Pilote</h2>
    </div>

    <p class="text-slate-600">
      Le **Pilote de Traitement** est le technicien chargé de résoudre concrètement le problème du partenaire. Son périmètre d'action s'exerce au niveau de son agence de rattachement. Le pilote mène l'investigation, réalise les corrections informatiques ou de dossier, suit les échéances (SLA) et propose la clôture de la réclamation à son Manager (Coordonnateur).
    </p>

    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 avoid-break">
      <h3 class="font-extrabold text-slate-800 text-base">Vos indicateurs de performance clés (KPI)</h3>
      <p class="text-xs text-slate-500">
        Sur votre tableau de bord, vous devez surveiller quotidiennement deux indicateurs essentiels :
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm space-y-1">
          <span class="text-xs font-black text-red-600 uppercase tracking-wider block">🚨 Tickets Dépassés (SLA)</span>
          <p class="text-[11px] text-slate-500 leading-snug">
            Le nombre de dossiers en cours dont la date limite réglementaire est dépassée. À traiter en priorité absolue !
          </p>
        </div>
        <div class="bg-white p-4 rounded-xl border-l-4 border-l-violet-500 shadow-sm space-y-1">
          <span class="text-xs font-black text-violet-600 uppercase tracking-wider block">⚠️ Dossiers Retournés</span>
          <p class="text-[11px] text-slate-500 leading-snug">
            Dossiers soumis au manager mais retournés avec des remarques pour correction. Vous devez les corriger rapidement.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">2</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Prise en charge d'une Réclamation</h2>
    </div>

    <p class="text-slate-600">
      Dès qu'une réclamation qualifiée concerne votre agence, elle apparaît dans votre liste de tâches à l'état **"Nouveau"**.
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Prendre en Charge</h4>
          <p class="text-xs text-slate-500 mt-1">
            Ouvrez la fiche de la réclamation à l'état "Nouveau". Cliquez sur le bouton vert **"Prendre en charge"** en haut de l'écran. Cette action vous assigne officiellement le dossier et change le statut du ticket en **"En Cours"**. Le partenaire reçoit alors un SMS de notification indiquant que son dossier est en cours d'instruction.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Examiner les Informations</h4>
          <p class="text-xs text-slate-500 mt-1">
            Prenez connaissance de la **Description** saisie par l'agent ou le client, ainsi que du **Commentaire Interne de l'Agent**. Consultez l'**Historique du Client** situé au bas de la fiche pour vérifier s'il a déjà déposé d'autres réclamations par le passé (ce qui vous donnera de précieux indices).
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">3</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Analyse de cause & Base de Connaissances</h2>
    </div>

    <p class="text-slate-600">
      Tout dossier résolu doit faire l'objet d'une **analyse technique de cause**. C'est une obligation légale pour le pilotage qualité de la CNPS.
    </p>

    <div class="space-y-4">
      <h3 class="font-extrabold text-slate-800 text-base">Comment renseigner l'analyse :</h3>
      <p class="text-xs text-slate-500">
        Rendez-vous dans la section **"Analyse Technique"** de la Fiche de Traitement :
      </p>
      <ul class="list-disc list-inside text-xs text-slate-500 pl-4 space-y-2">
        <li>**Catégorie de cause** : Sélectionnez la catégorie principale (ex: *Dysfonctionnement applicatif*, *Erreur de saisie*, *Retard de traitement*).</li>
        <li>**Cause précise** : Choisissez la cause exacte dans la liste déroulante associée.</li>
        <li>**Commentaire d'analyse** : Rédigez une brève explication technique des raisons du problème constaté.</li>
      </ul>

      <div class="bg-violet-50 p-5 rounded-2xl border border-violet-100 space-y-3 avoid-break">
        <h4 class="font-extrabold text-violet-950 text-sm uppercase">💡 Booster l'analyse via la Base de Connaissances</h4>
        <p class="text-xs text-violet-900 leading-relaxed">
          Si votre ticket est qualifié sur un sous-motif courant, cliquez sur **"Consulter les suggestions"** dans l'analyse. Le système recherchera dans la base de connaissances :
          <br/>1. L'analyse type pré-rédigée pour ce motif.
          <br/>2. Les actions correctives standard préconisées.
          <br/>
          Cliquez sur **"Importer la suggestion"** : cela remplira automatiquement votre champ d'analyse et créera d'un seul coup les actions types à mener. Un gain de temps considérable !
        </p>
      </div>
    </div>
  </div>

  <!-- SECTION 4 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">4</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Création et Clôture des Actions</h2>
    </div>

    <p class="text-slate-600">
      Une réclamation ne peut être résolue sans qu'une ou plusieurs actions de correction concrètes n'aient été enregistrées et validées.
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Ajouter une Action</h4>
          <p class="text-xs text-slate-500 mt-1">
            Dans la section **"Liste des corrections"**, cliquez sur **"Ajouter une action"**. Indiquez le libellé de la tâche (ex: *Mettre à jour le salaire du trimestre T4-2025*), et éventuellement la structure ou personne interne sollicitée.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Clôturer une Action</h4>
          <p class="text-xs text-slate-500 mt-1">
            Une fois l'action réalisée, cliquez sur l'icône verte coche de validation (✓) en bout de ligne de l'action. Renseignez obligatoirement le commentaire de réalisation (ex: *Calcul révisé, virement ordonné ce jour*) et validez. L'action passe à l'état **"Terminé"**.
          </p>
        </div>
      </div>

      <div class="callout-warning p-4 rounded-xl text-xs text-amber-900 avoid-break">
        ⚠️ **RÈGLE ADMINISTRATIVE STRICTE** : Le système refusera de soumettre la réclamation au coordonnateur si au moins une action de correction reste en état "En Cours". Toutes les actions créées doivent impérativement être marquées comme réalisées.
      </div>
    </div>
  </div>

  <!-- SECTION 5 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">5</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Escalade & Soumission à la Validation</h2>
    </div>

    <div class="space-y-4">
      <h3 class="font-extrabold text-slate-800 text-base">Option A : L'Escalade (Transfert d'agence)</h3>
      <p class="text-xs text-slate-500">
        Si après étude, le dossier relève de la compétence d'une autre agence (ex: le dossier de retraite de l'usager est géré par l'agence de Yamoussoukro alors que le ticket a été affecté à l'agence de Marcory), vous pouvez **escalader** le dossier :
        <br/>1. Cliquez sur **"Escalader"** en haut de la fiche.
        <br/>2. Sélectionnez l'**Agence cible** compétente.
        <br/>3. Saisissez un **Commentaire justificatif** expliquant les raisons du transfert.
        <br/>4. Validez. Le ticket disparaît de votre portefeuille et est transféré dans le tableau de bord de l'agence cible.
      </p>

      <h3 class="font-extrabold text-slate-800 text-base">Option B : Soumettre pour Validation (Résolution)</h3>
      <p class="text-xs text-slate-500">
        Lorsque vous avez terminé vos corrections, rempli l'analyse technique et clôturé toutes les actions :
        <br/>1. Le bouton **"Soumettre pour validation"** devient cliquable en haut à droite.
        <br/>2. Cliquez dessus. Le statut du ticket passe à **"A Valider"**.
        <br/>3. Le dossier est maintenant envoyé dans la file d'attente de votre Coordonnateur pour vérification et signature de clôture.
      </p>

      <div class="callout p-4 rounded-xl text-xs text-slate-600 avoid-break">
        ⚠️ **Cas de retour** : Si votre Coordonnateur estime que le problème n'est pas résolu, il vous retournera le dossier. Un bandeau orange apparaîtra sur la fiche contenant ses instructions de correction (dans le champ 'remarques_coordination'). Vous devrez ré-exécuter une correction et soumettre à nouveau.
      </div>
    </div>
  </div>
`;

// ─── CONTENU DU GUIDE DU COORDONNATEUR ───────────────────────────────────────
const coordonnateurContent = `
  <!-- SOMMAIRE -->
  <div class="page-break avoid-break">
    <h2 class="text-2xl font-black text-cnps-800 border-b-2 border-cnps-800 pb-2 mb-6 uppercase">Table des Matières</h2>
    <ul class="space-y-4 font-semibold text-slate-700">
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">1</span>
          1. Rôle du Coordonnateur & Suivi Local
        </span>
        <span class="text-slate-400">Page 3</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">2</span>
          2. Processus de Validation des Dossiers
        </span>
        <span class="text-slate-400">Page 4</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">3</span>
          3. Retour de Dossier pour Correction
        </span>
        <span class="text-slate-400">Page 5</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">4</span>
          4. Administration Locale de l'Agence
        </span>
        <span class="text-slate-400">Page 6</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">5</span>
          5. Paramétrages & Référentiels
        </span>
        <span class="text-slate-400">Page 7</span>
      </li>
    </ul>
  </div>

  <!-- SECTION 1 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">1</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Rôle du Coordonnateur & Suivi Local</h2>
    </div>

    <p class="text-slate-600">
      Le **Coordonnateur** est le Manager du Service Accueil des Réclamations au niveau d'une agence. Votre mission est double : 
      <br/>1. **Piloter l'activité locale** en veillant au respect des délais légaux (SLA) par vos agents et pilotes.
      <br/>2. **Garantir la qualité des résolutions** en contrôlant minutieusement chaque dossier avant sa clôture définitive.
    </p>

    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 avoid-break">
      <h3 class="font-extrabold text-slate-800 text-sm">Le Tableau de Bord de Pilotage</h3>
      <p class="text-xs text-slate-500">
        Depuis votre tableau de bord d'agence, suivez en temps réel les indicateurs d'efficacité :
      </p>
      <ul class="list-disc list-inside text-xs text-slate-500 pl-4 space-y-1.5">
        <li>**Taux de respect de la SLA** : pourcentage de dossiers résolus dans les temps impartis.</li>
        <li>**File "A Valider"** : le volume de dossiers en attente de votre décision. Elle doit être maintenue au niveau le plus bas possible.</li>
        <li>**Alerte Hors SLA** : identifie les dossiers en souffrance pour lesquels vous devez intervenir auprès des pilotes.</li>
      </ul>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">2</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Processus de Validation des Dossiers</h2>
    </div>

    <p class="text-slate-600">
      Lorsqu'un pilote soumet un dossier traité, ce dernier passe en statut **"A Valider"** (signalé par une pastille violette distincte). Vous devez mener les vérifications suivantes avant de statuer :
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Contrôler l'Analyse de Cause</h4>
          <p class="text-xs text-slate-500 mt-1">
            Vérifiez que la **Catégorie de cause** et la **Cause précise** sélectionnées sont cohérentes par rapport à la réclamation formulée par l'usager. Lisez le commentaire rédigé par le pilote.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Examiner les Actions Correctives</h4>
          <p class="text-xs text-slate-500 mt-1">
            Assurez-vous que les actions menées répondent pleinement et durablement au problème. Vérifiez les pièces justificatives éventuellement jointes par le pilote ou l'agent.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">3</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Prononcer la Validation de Clôture</h4>
          <p class="text-xs text-slate-500 mt-1">
            Si tout est conforme, cliquez sur **"Valider / Retourner"** puis sur **"Confirmer la validation"**. Le statut du dossier devient **"Validé"** (pastille verte). Cela clôture la réclamation en base de données et déclenche instantanément l'envoi d'un SMS de satisfaction au partenaire réclamant.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">3</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Retour de Dossier pour Correction</h2>
    </div>

    <p class="text-slate-600">
      Si vous estimez que l'analyse est incomplète ou que les actions réalisées ne résolvent pas correctement la réclamation, vous devez la rejeter.
    </p>

    <div class="space-y-4">
      <div class="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-3 avoid-break">
        <h4 class="font-extrabold text-amber-900 text-sm uppercase">Procédure de Retour pour Correction :</h4>
        <p class="text-xs text-amber-800 leading-relaxed">
          1. Sur la fiche de traitement, cliquez sur le bouton **"Valider / Retourner"**.<br/>
          2. Cochez l'option **"Retourner au pilote pour correction"**.<br/>
          3. Rédigez de manière claire, concise et constructive les motifs du refus et les corrections précises attendues dans le champ de commentaire (ex : *« L'action de mise à jour des salaires est notée réalisée mais aucun justificatif de virement n'est présent en pièce jointe. Merci de joindre le bordereau. »*).<br/>
          4. Cliquez sur **"Confirmer"**.
        </p>
      </div>

      <p class="text-slate-500 text-xs">
        Le ticket retourne automatiquement à l'état **"En Cours"** dans le portefeuille du pilote assigné. Un bandeau d'alerte orange s'affichera sur sa fiche de traitement contenant vos remarques d'arbitrage. Il devra obligatoirement y répondre avant de pouvoir vous soumettre à nouveau le ticket.
      </p>
    </div>
  </div>

  <!-- SECTION 4 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">4</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Administration Locale de l'Agence</h2>
    </div>

    <p class="text-slate-600">
      En tant que gestionnaire local de votre agence, vous disposez d'un onglet **"Administration"** adapté à vos droits managériaux.
    </p>

    <div class="space-y-4">
      <h3 class="font-extrabold text-slate-800 text-base">Gestion de vos Collaborateurs :</h3>
      <p class="text-xs text-slate-500">
        Sélectionnez l'onglet **"Utilisateurs"** dans le panneau d'administration :
      </p>
      <div class="grid grid-cols-2 gap-4 avoid-break">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-1">
          <span class="text-xs font-black text-cnps-800 uppercase tracking-wider block">➕ Créer un utilisateur</span>
          <p class="text-[11px] text-slate-500 leading-snug">
            Ajoutez un nouvel agent d'accueil ou pilote de traitement rattaché à votre agence. Indiquez son matricule, nom, prénom, email professionnel et attribuez-lui le rôle adéquat.
          </p>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-1">
          <span class="text-xs font-black text-cnps-800 uppercase tracking-wider block">🔑 Réinitialiser un accès</span>
          <p class="text-[11px] text-slate-500 leading-snug">
            En cas de perte de mot de passe d'un de vos collaborateurs, ouvrez sa fiche utilisateur, modifiez son mot de passe pour lui attribuer un mot de passe temporaire à modifier lors de sa prochaine connexion.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">5</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Paramétrages & Référentiels d'Agence</h2>
    </div>

    <p class="text-slate-600">
      Votre rôle vous permet également de consulter en lecture seule la structure des référentiels configurés au niveau national :
    </p>

    <div class="space-y-3 text-xs avoid-break">
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
        <span class="font-extrabold text-slate-800">📂 Processus d'Agence</span>
        <span class="text-slate-500 text-[11px]">Visualisation des processus actifs (Retraite, Prestations, etc.)</span>
      </div>
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
        <span class="font-extrabold text-slate-800">🏷️ Motifs & SLA</span>
        <span class="text-slate-500 text-[11px]">Délai légal (SLA) associé à chaque motif de réclamation</span>
      </div>
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
        <span class="font-extrabold text-slate-800">🎯 Causes d'Analyse</span>
        <span class="text-slate-500 text-[11px]">Liste des causes standardisées pour l'analyse qualité</span>
      </div>
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/50">
        <span class="font-extrabold text-slate-800">📍 Affectations</span>
        <span class="text-slate-500 text-[11px]">Règles de routage automatique des dossiers vers votre agence</span>
      </div>
    </div>
  </div>
`;

// ─── CONTENU DU GUIDE DU SUPERVISEUR ─────────────────────────────────────────
const superviseurContent = `
  <!-- SOMMAIRE -->
  <div class="page-break avoid-break">
    <h2 class="text-2xl font-black text-cnps-800 border-b-2 border-cnps-800 pb-2 mb-6 uppercase">Table des Matières</h2>
    <ul class="space-y-4 font-semibold text-slate-700">
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">1</span>
          1. Introduction au Rôle de Superviseur Central
        </span>
        <span class="text-slate-400">Page 3</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">2</span>
          2. Commutation Multi-Agences & Dashboard Central
        </span>
        <span class="text-slate-400">Page 4</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">3</span>
          3. Prise en main des Escalades & Réaffectation
        </span>
        <span class="text-slate-400">Page 5</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">4</span>
          4. Gestion du Référentiel National
        </span>
        <span class="text-slate-400">Page 6</span>
      </li>
      <li class="flex justify-between items-center border-b border-slate-100 pb-2">
        <span class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full bg-cnps-50 text-cnps-800 flex items-center justify-center text-xs font-black">5</span>
          5. Administration des Fichiers Usagers
        </span>
        <span class="text-slate-400">Page 7</span>
      </li>
    </ul>
  </div>

  <!-- SECTION 1 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">1</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Introduction au Rôle de Superviseur Central</h2>
    </div>

    <p class="text-slate-600">
      Le **Superviseur Central** est l'autorité métier nationale de l'application eRéclamations. Vous assurez la supervision de l'intégralité du réseau des agences de la CNPS. Vous pilotez la performance nationale, configurez les règles de gestion, arbitrez les conflits d'affectation et gérez les dossiers complexes escaladés par les pilotes en agence.
    </p>

    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 avoid-break">
      <h3 class="font-extrabold text-slate-800 text-base">Vos Responsabilités Principales</h3>
      <div class="grid grid-cols-2 gap-4 text-xs">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">🌍 Vision Globale</span>
          Superviser les indicateurs de performance de toutes les agences de la CNPS en temps réel.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">⚡ Arbitrage & Escalades</span>
          Réaffecter les tickets, attribuer de nouveaux pilotes et traiter les réclamations sensibles.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">🛠️ Configuration Métier</span>
          Réguler les SLA, créer les motifs et configurer les règles de routage automatique.
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span class="font-black text-cnps-800 uppercase tracking-wide block mb-1">📁 Fichiers de Référence</span>
          Consulter et modifier les bases des Travailleurs, Employeurs et Sinistres de Côte d'Ivoire.
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">2</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Commutation Multi-Agences & Dashboard Central</h2>
    </div>

    <p class="text-slate-600">
      Votre tableau de bord intègre une fonctionnalité essentielle : la **commutation dynamique de vue**.
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Le Sélecteur d'Agence</h4>
          <p class="text-xs text-slate-500 mt-1">
            En haut de votre écran d'accueil, cliquez sur la liste déroulante **"Sélectionner l'agence"**. Par défaut, vous êtes positionné sur la vue globale "Toutes agences". Sélectionnez une agence physique spécifique (ex: *Marcory, Yamoussoukro, Bouaké*).
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Rapport statistique instantané</h4>
          <p class="text-xs text-slate-500 mt-1">
            Une fois l'agence sélectionnée, l'ensemble du tableau de bord se met à jour instantanément pour n'afficher que les indicateurs de cette agence. Vous pouvez analyser son taux de respect de la SLA, voir ses dossiers en souffrance, ou lister ses agents actifs.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">3</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestion des Escalades & Réaffectation</h2>
    </div>

    <p class="text-slate-600">
      Les pilotes en agence peuvent solliciter une **escalade centrale** lorsque le dossier requiert une expertise métier pointue ou un arbitrage national.
    </p>

    <div class="space-y-4">
      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Suivi des Escalades</h4>
          <p class="text-xs text-slate-500 mt-1">
            Accédez à la file **"Escaladées"** depuis votre menu. Lisez le motif d'escalade rédigé par le pilote d'agence et examinez le dossier historique.
          </p>
        </div>
      </div>

      <div class="flex gap-4 items-start avoid-break">
        <span class="w-6 h-6 rounded-full bg-cnps-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">2</span>
        <div>
          <h4 class="font-extrabold text-slate-800 text-sm">Réaffectation et Affectation de Pilote</h4>
          <p class="text-xs text-slate-500 mt-1">
            En tant que Superviseur, vous pouvez **modifier l'agence cible** d'une réclamation pour la renvoyer vers la bonne entité, ou **affecter manuellement un pilote** spécifique pour forcer la prise en charge immédiate.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 4 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">4</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestion du Référentiel National (Administration)</h2>
    </div>

    <p class="text-slate-600">
      Votre profil Superviseur vous octroie l'accès complet à la configuration de la mécanique de l'application via le panneau **"Administration"** :
    </p>

    <div class="bg-slate-50 p-5 rounded-xl border border-slate-200/50 space-y-3 avoid-break">
      <h4 class="font-extrabold text-slate-800 text-sm uppercase">Vos Onglets d'Administration Métier :</h4>
      <div class="grid grid-cols-2 gap-4 text-xs">
        <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
          <span class="font-extrabold text-cnps-800 block mb-1">⚙️ Processus</span>
          Créer et éditer les processus métiers CNPS et leurs codes associés.
        </div>
        <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
          <span class="font-extrabold text-cnps-800 block mb-1">🏷️ Motifs & SLA</span>
          Créer les motifs et sous-motifs, et leur attribuer leur **délai SLA réglementaire en jours**.
        </div>
        <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
          <span class="font-extrabold text-cnps-800 block mb-1">🧩 Causes (Analyse)</span>
          Gérer les catégories de causes de dysfonctionnement et les causes précises pour l'analyse.
        </div>
        <div class="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
          <span class="font-extrabold text-cnps-800 block mb-1">📍 Affectations Automatiques</span>
          Définir les règles de routage : vers quelle agence doit être dirigée automatiquement une réclamation sur tel motif.
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 5 -->
  <div class="page-break space-y-6">
    <div class="flex items-center gap-3 border-b-2 border-cnps-800 pb-3">
      <div class="w-8 h-8 rounded-xl bg-cnps-800 text-white flex items-center justify-center text-lg font-black">5</div>
      <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Administration des Fichiers Usagers</h2>
    </div>

    <p class="text-slate-600">
      Vous avez la responsabilité de consulter et de tenir à jour les bases de données d'identification des usagers importées dans l'application :
    </p>

    <div class="space-y-4 text-xs avoid-break">
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex gap-4">
        <div class="font-extrabold text-slate-800 uppercase shrink-0 w-24">👷 Travailleurs</div>
        <div class="text-slate-500">Consulter la liste de tous les assurés sociaux (travailleurs salariés, indépendants RSTI), vérifier leurs matricules, adresses, et corriger leurs données d'identification de base.</div>
      </div>
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex gap-4">
        <div class="font-extrabold text-slate-800 uppercase shrink-0 w-24">🏢 Employeurs</div>
        <div class="text-slate-500">Consulter et mettre à jour la liste des entreprises cotisantes, leurs numéros CNPS officiels, dénominations sociales et adresses.</div>
      </div>
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex gap-4">
        <div class="font-extrabold text-slate-800 uppercase shrink-0 w-24">🤕 Sinistres</div>
        <div class="text-slate-500">Consulter le registre national des accidents du travail et maladies professionnelles déclarés, ainsi que les assurés concernés, indispensable pour l'instruction des réclamations liées aux risques professionnels.</div>
      </div>
    </div>
  </div>
`;

// ─── GENERATION DES PDF AVEC PUPPETEER ───────────────────────────────────────
const guides = [
  {
    role: 'agent',
    title: "Profil Agent de Saisie",
    subtitle: "Manuel opératoire complet pour la saisie des réclamations, l'identification des partenaires, l'émission des reçus et la qualification à l'Agence Digitale.",
    badge: "Accueil & Enregistrement",
    content: agentContent,
    color: '#0f592f',
    accentColor: '#c8963e'
  },
  {
    role: 'pilote',
    title: "Profil Pilote de Traitement",
    subtitle: "Guide technique pour la prise en charge, l'analyse technique des causes, la mise en œuvre d'actions correctives et la soumission pour validation.",
    badge: "Instruction & Résolution",
    content: piloteContent,
    color: '#0f592f',
    accentColor: '#c8963e'
  },
  {
    role: 'coordonnateur',
    title: "Profil Coordonnateur",
    subtitle: "Guide managérial pour le pilotage de l'activité, la validation finale ou le retour pour correction des dossiers, et la gestion des comptes de l'agence.",
    badge: "Validation & Management",
    content: coordonnateurContent,
    color: '#0f592f',
    accentColor: '#c8963e'
  },
  {
    role: 'superviseur',
    title: "Profil Superviseur",
    subtitle: "Manuel d'administration centrale pour la supervision multi-agences, la gestion des escalades nationales, la configuration des SLA et des règles de routage.",
    badge: "Supervision Nationale",
    content: superviseurContent,
    color: '#0f592f',
    accentColor: '#c8963e'
  }
];

async function generateAll() {
  console.log("Démarrage de la génération des guides utilisateurs...");
  
  // Create guides directory if it doesn't exist
  const outputDir = path.join(__dirname, '../guides');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Dossier de sortie créé : ${outputDir}`);
  }

  // Create scratch folder output for manual check of HTML
  const htmlOutputDir = path.join(__dirname, '../scratch/html_previews');
  if (!fs.existsSync(htmlOutputDir)) {
    fs.mkdirSync(htmlOutputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const guide of guides) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Génération du guide pour le rôle : ${guide.role.toUpperCase()}...`);
    
    const htmlContent = getBaseHtml(
      guide.title, 
      guide.subtitle, 
      guide.badge, 
      guide.content, 
      guide.color, 
      guide.accentColor
    );
    
    // Save HTML preview
    const htmlFilePath = path.join(htmlOutputDir, `preview_${guide.role}.html`);
    fs.writeFileSync(htmlFilePath, htmlContent);
    console.log(`Aperçu HTML enregistré : ${htmlFilePath}`);

    // Render to PDF
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Set content and wait for network idle to ensure Tailwind CSS CDN loads
    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
    
    // PDF output path
    const pdfFilePath = path.join(outputDir, `guide_${guide.role}.pdf`);
    
    await page.pdf({
      path: pdfFilePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '25mm',
        bottom: '25mm',
        left: '20mm',
        right: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8px; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; margin-top: 10px;">
          <span style="font-weight: bold; text-transform: uppercase;">eRéclamations CNPS — Guide Utilisateur</span>
          <span>Caisse Nationale de Prévoyance Sociale</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8px; width: 100%; display: flex; justify-content: space-between; padding: 0 20px; border-top: 1px solid #e2e8f0; color: #64748b; margin-bottom: 10px;">
          <span>Caisse Nationale de Prévoyance Sociale (Côte d'Ivoire)</span>
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
        </div>
      `
    });

    console.log(`Guide PDF généré avec succès : ${pdfFilePath}`);
    const stats = fs.statSync(pdfFilePath);
    console.log(`Taille du fichier : ${(stats.size / 1024).toFixed(1)} Ko`);
  }

  await browser.close();
  console.log(`\n==================================================`);
  console.log(`GÉNÉRATION TERMINÉE ! Tous les guides ont été générés dans le dossier :\n${outputDir}`);
}

generateAll().catch(err => {
  console.error("Erreur fatale lors de la génération :", err);
});
