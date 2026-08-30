-- Comptes de test pour les profils Administrateur fonctionnel et Administrateur systeme
INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif)
SELECT 'MAT-DG-ADMFONC', 'KONE', 'Fatou', 1, true
WHERE NOT EXISTS (SELECT 1 FROM ressources WHERE matricule = 'MAT-DG-ADMFONC');

INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif)
SELECT 'MAT-DG-ADMSYS', 'DIALLO', 'Moussa', 1, true
WHERE NOT EXISTS (SELECT 1 FROM ressources WHERE matricule = 'MAT-DG-ADMSYS');

INSERT INTO utilisateurs (ressource_id, email, password, role, actif)
SELECT r.id, 'admin.fonctionnel@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'administrateur_fonctionnel', true
FROM ressources r WHERE r.matricule = 'MAT-DG-ADMFONC'
AND NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'admin.fonctionnel@cnps.ci');

INSERT INTO utilisateurs (ressource_id, email, password, role, actif)
SELECT r.id, 'admin.systeme@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'administrateur_systeme', true
FROM ressources r WHERE r.matricule = 'MAT-DG-ADMSYS'
AND NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'admin.systeme@cnps.ci');

SELECT u.id, u.email, u.role, r.matricule, r.nom, r.prenoms
FROM utilisateurs u JOIN ressources r ON r.id = u.ressource_id
WHERE u.role IN ('administrateur_fonctionnel', 'administrateur_systeme');
