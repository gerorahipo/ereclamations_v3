SET client_encoding TO 'UTF8';
UPDATE causes SET libelle = REPLACE(libelle, 'trait?', 'traité') WHERE libelle LIKE '%trait?%';
UPDATE causes SET libelle = REPLACE(libelle, 'contr?le', 'contrôle') WHERE libelle LIKE '%contr?le%';
UPDATE causes SET libelle = REPLACE(libelle, 'm?dical', 'médical') WHERE libelle LIKE '%m?dical%';
UPDATE causes SET libelle = REPLACE(libelle, 'r?vision', 'révision') WHERE libelle LIKE '%r?vision%';
UPDATE causes SET libelle = REPLACE(libelle, 'r?ceptionn?', 'réceptionné') WHERE libelle LIKE '%r?ceptionn?%';
UPDATE causes SET libelle = REPLACE(libelle, 'M?connaissance', 'Méconnaissance') WHERE libelle LIKE '%M?connaissance%';
UPDATE causes SET libelle = REPLACE(libelle, 'Assur?', 'Assuré') WHERE libelle LIKE '%Assur?%';
UPDATE causes SET libelle = REPLACE(libelle, 'malgr?', 'malgré') WHERE libelle LIKE '%malgr?%';
UPDATE causes SET libelle = REPLACE(libelle, 'd?p?t', 'dépôt') WHERE libelle LIKE '%d?p?t%';
UPDATE causes SET libelle = REPLACE(libelle, 'pi?ces', 'pièces') WHERE libelle LIKE '%pi?ces%';
UPDATE causes SET libelle = REPLACE(libelle, 'D?faut', 'Défaut') WHERE libelle LIKE '%D?faut%';
UPDATE causes SET libelle = REPLACE(libelle, 'fr?quentation', 'fréquentation') WHERE libelle LIKE '%fr?quentation%';
UPDATE causes SET libelle = REPLACE(libelle, 'p?riode', 'période') WHERE libelle LIKE '%p?riode%';
UPDATE causes SET libelle = REPLACE(libelle, 'lev?e', 'levée') WHERE libelle LIKE '%lev?e%';
UPDATE causes SET libelle = REPLACE(libelle, 'apr?s', 'après') WHERE libelle LIKE '%apr?s%';
UPDATE causes SET libelle = REPLACE(libelle, 'carri?re', 'carrière') WHERE libelle LIKE '%carri?re%';

-- Correction pour "Dossier ou pi?ce saisi(e) et non valid?e"
UPDATE causes SET libelle = REPLACE(libelle, 'pi?ce', 'pièce') WHERE libelle LIKE '%pi?ce%';
UPDATE causes SET libelle = REPLACE(libelle, 'valid?e', 'validée') WHERE libelle LIKE '%valid?e%';
UPDATE causes SET libelle = REPLACE(libelle, 'saisi(e) et non validée', 'saisie et non validée') WHERE libelle LIKE '%saisi(e)%';
