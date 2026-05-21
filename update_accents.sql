-- Correction des noms et prénoms mal encodés
UPDATE ressources 
SET 
  nom = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nom, '??', 'é'), 'R??', 'Ré'), 'G??', 'Gé'), 'E??', 'É'), 'r??', 'ré'),
  prenoms = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(prenoms, '??', 'é'), 'R??', 'Ré'), 'G??', 'Gé'), 'E??', 'É'), 'r??', 'ré');

-- Correction des libellés de processus
UPDATE processus
SET libelle = REPLACE(REPLACE(libelle, '??', 'é'), 'R??', 'Ré');

-- Correction des objets de motifs
UPDATE motifs
SET objet = REPLACE(REPLACE(objet, '??', 'é'), 'r??', 'ré');
