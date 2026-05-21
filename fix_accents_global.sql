-- Forcer l'encodage UTF8 pour cette session
SET client_encoding TO 'UTF8';

-- Correction massive des causes
UPDATE causes SET libelle = REPLACE(libelle, 'non trait??', 'non traité') WHERE libelle LIKE '%non trait??%';
UPDATE causes SET libelle = REPLACE(libelle, 'r??alis??e', 'réalisée') WHERE libelle LIKE '%r??alis??e%';
UPDATE causes SET libelle = REPLACE(libelle, 'saisi(e) et non valid??(e)', 'saisie et non validée') WHERE libelle LIKE '%saisi(e)%';
UPDATE causes SET libelle = REPLACE(libelle, 'm??dical', 'médical') WHERE libelle LIKE '%m??dical%';
UPDATE causes SET libelle = REPLACE(libelle, 'r??vision', 'révision') WHERE libelle LIKE '%r??vision%';
UPDATE causes SET libelle = REPLACE(libelle, 'contr??le', 'contrôle') WHERE libelle LIKE '%contr??le%';
UPDATE causes SET libelle = REPLACE(libelle, 'r??ceptionn??', 'réceptionné') WHERE libelle LIKE '%r??ceptionn??%';
UPDATE causes SET libelle = REPLACE(libelle, 'M??connaissance', 'Méconnaissance') WHERE libelle LIKE '%M??connaissance%';
UPDATE causes SET libelle = REPLACE(libelle, 'Assur??', 'Assuré') WHERE libelle LIKE '%Assur??%';
UPDATE causes SET libelle = REPLACE(libelle, 'malgr??', 'malgré') WHERE libelle LIKE '%malgr??%';
UPDATE causes SET libelle = REPLACE(libelle, 'd??p??t', 'dépôt') WHERE libelle LIKE '%d??p??t%';
UPDATE causes SET libelle = REPLACE(libelle, 'pi??ces', 'pièces') WHERE libelle LIKE '%pi??ces%';
UPDATE causes SET libelle = REPLACE(libelle, 'D??faut', 'Défaut') WHERE libelle LIKE '%D??faut%';
UPDATE causes SET libelle = REPLACE(libelle, 'fr??quentation', 'fréquentation') WHERE libelle LIKE '%fr??quentation%';
UPDATE causes SET libelle = REPLACE(libelle, 'p??riode', 'période') WHERE libelle LIKE '%p??riode%';
UPDATE causes SET libelle = REPLACE(libelle, 'lev??e', 'levée') WHERE libelle LIKE '%lev??e%';
UPDATE causes SET libelle = REPLACE(libelle, 'apr??s', 'après') WHERE libelle LIKE '%apr??s%';
UPDATE causes SET libelle = REPLACE(libelle, 'carri??re', 'carrière') WHERE libelle LIKE '%carri??re%';

-- Correction des catégories
UPDATE categories_causes SET libelle = 'Catégorie' WHERE libelle LIKE 'Cat??gorie%';

-- Correction des processus au cas où
UPDATE processus SET libelle = REPLACE(libelle, 'G??n??rale', 'Générale') WHERE libelle LIKE '%G??n??rale%';
UPDATE processus SET libelle = REPLACE(libelle, 'Prestations', 'Prestations') WHERE libelle LIKE '%Prestations%';
UPDATE processus SET libelle = REPLACE(libelle, 'Accidents', 'Accidents') WHERE libelle LIKE '%Accidents%';
UPDATE processus SET libelle = REPLACE(libelle, 'Maladies', 'Maladies') WHERE libelle LIKE '%Maladies%';
UPDATE processus SET libelle = REPLACE(libelle, 'Professionnelles', 'Professionnelles') WHERE libelle LIKE '%Professionnelles%';

-- Une deuxième passe plus générique pour les ?? isolés
UPDATE causes SET libelle = REPLACE(libelle, '??', 'é') WHERE libelle LIKE '%??%';
UPDATE categories_causes SET libelle = REPLACE(libelle, '??', 'é') WHERE libelle LIKE '%??%';
UPDATE processus SET libelle = REPLACE(libelle, '??', 'é') WHERE libelle LIKE '%??%';
UPDATE motifs SET objet = REPLACE(objet, '??', 'é') WHERE objet LIKE '%??%';
