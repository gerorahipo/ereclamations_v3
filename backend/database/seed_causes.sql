-- Injection des causes pour GDATMP
DO $$
DECLARE
    proc_id_atmp INTEGER;
    cat_client_id INTEGER;
    cat_cnps_id INTEGER;
BEGIN
    SELECT id INTO proc_id_atmp FROM processus WHERE code = 'GDATMP';
    
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
END $$;

-- Injection des causes pour GDAV
DO $$
DECLARE
    proc_id_av INTEGER;
    cat_client_id INTEGER;
    cat_cnps_id INTEGER;
BEGIN
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
