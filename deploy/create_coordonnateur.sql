INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif)
SELECT 'MAT-DG-COORD', 'COULIBALY', 'Awa', 1, true
WHERE NOT EXISTS (SELECT 1 FROM ressources WHERE matricule = 'MAT-DG-COORD');

INSERT INTO utilisateurs (ressource_id, email, password, role, actif)
SELECT r.id, 'coordonnateur.rq@cnps.ci', '$2y$10$YyFv8CKTXAI3ZDBUkYs5Pea6eRxY/0sN0QNECVyoMQFfksImVvCGe', 'coordonnateur', true
FROM ressources r WHERE r.matricule = 'MAT-DG-COORD'
AND NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'coordonnateur.rq@cnps.ci');

SELECT u.id, u.email, u.role FROM utilisateurs u WHERE u.email = 'coordonnateur.rq@cnps.ci';
