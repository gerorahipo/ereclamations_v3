-- ============================================================
-- eReclamations CNPS CI — Données de test et de paramétrage (seed) unifiées
-- Version: 2.1 | Date: 2026-05-29
-- ============================================================

-- ─── AGENCES ────────────────────────────────────────────────
INSERT INTO agences (nom, code, type) VALUES
    ('Direction Générale - Centrale',      'DG',    'centrale'),
    ('Agence Plateau',                     'AGP',   'agence'),
    ('Agence Marcory',                     'AGM',   'agence'),
    ('Agence Yopougon',                    'AGY',   'agence');

-- ─── RÉGIMES ────────────────────────────────────────────────
INSERT INTO regimes (libelle) VALUES 
    ('Régime Général (Salariés)'),
    ('RSTI (Travailleurs Indépendants)');

-- ─── TYPES CLIENTS ──────────────────────────────────────────
INSERT INTO types_clients (regime_id, libelle) VALUES
    (1, 'Employeur'),
    (1, 'Assuré Social (Salarié)'),
    (1, 'Retraité'),
    (2, 'Artisan'),
    (2, 'Commerçant'),
    (2, 'Profession Libérale');

-- ─── MODES DE SAISINE ───────────────────────────────────────
INSERT INTO modes_saisine (libelle) VALUES
    ('Accueil physique (Guichet)'),
    ('Courrier physique (Arrivée)'),
    ('Email (Support)'),
    ('Portail Web'),
    ('Téléphone (Call Center)');

-- ─── RESSOURCES (Agents) ────────────────────────────────────
INSERT INTO ressources (matricule, nom, prenoms, agence_id) VALUES
    ('MAT-DG-001', 'KOUAME',    'Jean-Baptiste',    1),
    ('MAT-DG-002', 'BAMBA',     'Aminata Sali',     1),
    ('MAT-AGP-001', 'TOURE',    'Ibrahim',          2),
    ('MAT-AGP-002', 'YAO',      'Adjoua Marie',     2),
    ('MAT-AGP-003', 'KONE',     'Seydou',           2),
    ('MAT-AGM-001', 'TRAORE',   'Fatoumata',        3),
    ('MAT-AGM-002', 'COULIBALY','Moussa',            3),
    ('MAT-AGY-001', 'AKA',      'Bénédicte',        4),
    ('MAT-AGY-002', 'GNAGNE',   'Patrick',          4);

-- ─── UTILISATEURS (password = "Password@1234") ──────────────
-- Hash : $2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe
INSERT INTO utilisateurs (ressource_id, email, password, role) VALUES
    (1, 'superviseur@cnps.ci',    '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'superviseur'),
    (2, 'coordonnateur@cnps.ci',  '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'coordonnateur'),
    (3, 'pilote.plateau@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'pilote'),
    (4, 'agent.plateau@cnps.ci',  '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'agent'),
    (5, 'coord.plateau@cnps.ci',  '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'coordonnateur'),
    (6, 'pilote.marcory@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'pilote'),
    (7, 'agent.marcory@cnps.ci',  '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'agent'),
    (8, 'agent.yopougon@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'agent'),
    (9, 'pilote.yopougon@cnps.ci','$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'pilote');

-- ─── PROCESSUS CNPS ─────────────────────────────────────────
INSERT INTO processus (code, libelle) VALUES
    ('GRC',     'Gestion des Réclamations Clients'),
    ('GDAV',    'Gestion des Droits Vieillesse (Retraite)'),
    ('PF',      'Prestations Familiales'),
    ('ATMP',    'Accidents du Travail et Maternité');

-- ─── MOTIFS ─────────────────────────────────────────────────
INSERT INTO motifs (regime_id, type_client_id, libelle) VALUES
    (1, 1,    'Problème d''immatriculation'),
    (1, 1,    'Problème de cotisations'),
    (1, 3,    'Retard de liquidation retraite'),
    (1, 2,    'Non réception des allocations'),
    (1, 2,    'Dossier indemnités journalières');

-- ─── SOUS-MOTIFS (Délai SLA spécifique) ─────────────────────
INSERT INTO sous_motifs (motif_id, libelle, delai_traitement_jours) VALUES
    (1, 'Non réception numéro CNPS', 3),
    (1, 'Erreur identité sur carte', 2),
    (2, 'Contestation montant déclaré', 5),
    (2, 'Paiement non pris en compte', 4),
    (3, 'Dossier incomplet bloqué', 7),
    (3, 'Rejet de pièces injustifié', 5),
    (4, 'Changement de mode de paiement', 3),
    (5, 'Non réception indemnité maternité', 5);

-- ─── AFFECTATIONS AUTOMATIQUES ──────────────────────────────
INSERT INTO affectations_pilotes (agence_id, processus_id, pilote_id) VALUES
    -- Plateau
    (2, 1, 3), (2, 2, 3), (2, 3, 3), (2, 4, 3),
    -- Marcory
    (3, 1, 6), (3, 2, 6), (3, 3, 6), (3, 4, 6),
    -- Yopougon
    (4, 1, 9), (4, 2, 9), (4, 3, 9), (4, 4, 9);

-- ─── PARTENAIRES ────────────────────────────────────────────
INSERT INTO partenaires (type, numero_cnps, nom, telephone, email) VALUES
    ('entreprise',  'ENT-123', 'SOCIÉTÉ INDUSTRIELLE', '0102030405', 'hr@sici.ci'),
    ('travailleur', 'TRV-789', 'DIALLO Mamadou',      '0708091011', NULL);

-- ─── INSÉRER LES CATÉGORIES DE CAUSES PAR DÉFAUT ─────────────
INSERT INTO categories_causes (processus_id, libelle)
SELECT id, 'Cause Client' FROM processus;

INSERT INTO categories_causes (processus_id, libelle)
SELECT id, 'Cause CNPS' FROM processus;

-- ─── INJECTION DES CAUSES (ATMP & GDAV) ──────────────────────
DO $$
DECLARE
    proc_id_atmp INTEGER;
    proc_id_av INTEGER;
    cat_client_id INTEGER;
    cat_cnps_id INTEGER;
BEGIN
    -- Causes ATMP
    SELECT id INTO proc_id_atmp FROM processus WHERE code = 'ATMP';
    IF proc_id_atmp IS NOT NULL THEN
        -- Catégorie Client
        SELECT id INTO cat_client_id FROM categories_causes WHERE processus_id = proc_id_atmp AND libelle = 'Cause Client';
        INSERT INTO causes (categorie_id, libelle) VALUES 
        (cat_client_id, 'Non dépôt de pièces de maintien de droit'),
        (cat_client_id, 'Assuré injoignable'),
        (cat_client_id, 'Dossier incomplet malgré les DRP');

        -- Catégorie CNPS
        SELECT id INTO cat_cnps_id FROM categories_causes WHERE processus_id = proc_id_atmp AND libelle = 'Cause CNPS';
        INSERT INTO causes (categorie_id, libelle) VALUES 
        (cat_cnps_id, 'Défaut de communication'),
        (cat_cnps_id, 'Méconnaissance du mode de calcul des IJ AT/MP'),
        (cat_cnps_id, 'Erreur de rattachement du certificat de vie CV'),
        (cat_cnps_id, 'Omission de la saisie du certificat de vie CV'),
        (cat_cnps_id, 'Dossier complet non traité (saisie et validation)'),
        (cat_cnps_id, 'Dossier réceptionné non conforme'),
        (cat_cnps_id, 'Dossier de base introuvable'),
        (cat_cnps_id, 'DRP non réalisée'),
        (cat_cnps_id, 'Dossier ou pièce saisi(e) et non validé(e)'),
        (cat_cnps_id, 'Dossier en instance au contrôle médical (expertise révision)'),
        (cat_cnps_id, 'Dossier en instance de contrôle');
    END IF;

    -- Causes GDAV
    SELECT id INTO proc_id_av FROM processus WHERE code = 'GDAV';
    IF proc_id_av IS NOT NULL THEN
        -- Catégorie Client
        SELECT id INTO cat_client_id FROM categories_causes WHERE processus_id = proc_id_av AND libelle = 'Cause Client';
        INSERT INTO causes (categorie_id, libelle) VALUES 
        (cat_client_id, 'Non dépôt du certificat de vie CV'),
        (cat_client_id, 'Non dépôt du certificat de vie et entretien CVE dans la période requise'),
        (cat_client_id, 'Non dépôt de l''attestation de fréquentation'),
        (cat_client_id, 'Assuré injoignable'),
        (cat_client_id, 'Dossier incomplet malgré information assuré'),
        (cat_client_id, 'Non dépôt du RIB');

        -- Catégorie CNPS
        SELECT id INTO cat_cnps_id FROM categories_causes WHERE processus_id = proc_id_av AND libelle = 'Cause CNPS';
        INSERT INTO causes (categorie_id, libelle) VALUES 
        (cat_cnps_id, 'Défaut de communication'),
        (cat_cnps_id, 'Méconnaissance du mode de calcul des droits'),
        (cat_cnps_id, 'Erreur de rattachement d''enfant'),
        (cat_cnps_id, 'Erreur de rattachement du certificat de vie CV'),
        (cat_cnps_id, 'Omission de la saisie du certificat de vie CV'),
        (cat_cnps_id, 'Omission de la saisie du certificat de vie et entretien CVE'),
        (cat_cnps_id, 'Non levée de suspension après dépôt des pièces de mise à jour'),
        (cat_cnps_id, 'Dossier complet non traité'),
        (cat_cnps_id, 'Dossier de base introuvable'),
        (cat_cnps_id, 'Dossier en instance à la carrière');
    END IF;
END $$;

-- ─── BASE DE CONNAISSANCES / SUGGESTIONS ─────────────────────
INSERT INTO suggestions_reponses (titre, contenu) VALUES 
('Remerciements standard', 'Nous vous remercions pour votre message. Nous avons bien pris en compte votre réclamation et nos services travaillent à sa résolution dans les plus brefs délais.'),
('Clôture positive', 'Après analyse de votre dossier, nous avons procédé à la régularisation de votre situation. Votre paiement sera effectif sous 48h.');

-- ─── RÉCLAMATIONS DE TEST ────────────────────────────────────
-- On insère sans spécifier le numero_ticket et date_echeance_sla (gérés par trigger)
INSERT INTO reclamations (
    partenaire_type, partenaire_id, partenaire_nom, 
    regime_id, type_client_id, mode_saisine_id, 
    processus_id, motif_id, sous_motif_id, 
    description, statut, agent_createur_id, pilote_id, agence_id, date_creation
) VALUES
    ('entreprise', 1, 'SOCIÉTÉ INDUSTRIELLE', 1, 1, 1, 1, 1, 1, 'Test description', 'en_cours', 4, 3, 2, NOW() - INTERVAL '1 day');
