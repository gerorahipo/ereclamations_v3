-- ============================================================
-- Creation d'un compte Administrateur systeme (production)
-- ============================================================
-- 1) Generer le hash de votre mot de passe AVANT d'executer ce
--    script (ne jamais mettre de mot de passe en clair ici) :
--
--      php -r "echo password_hash('VotreMotDePasseSolideIci', PASSWORD_DEFAULT), PHP_EOL;"
--
-- 2) Remplacer les 5 valeurs ci-dessous (matricule, nom, prenoms,
--    email, hash) par les vraies informations.
-- 3) Remplacer AGENCE_ID par l'id de l'agence de rattachement
--    (ex: la Direction Generale). Verifier avec :
--
--      SELECT id, code, nom FROM agences ORDER BY id;
--
-- ============================================================

BEGIN;

INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif)
SELECT 'MAT-DG-ADMSYS-01', 'NOM_DE_FAMILLE', 'PRENOMS', 1, true
WHERE NOT EXISTS (SELECT 1 FROM ressources WHERE matricule = 'MAT-DG-ADMSYS-01');

INSERT INTO utilisateurs (ressource_id, email, password, role, actif)
SELECT r.id,
       'admin.systeme@votredomaine.ci',
       '$2y$10$REMPLACER_PAR_LE_HASH_GENERE_A_L_ETAPE_1',
       'administrateur_systeme',
       true
FROM ressources r
WHERE r.matricule = 'MAT-DG-ADMSYS-01'
  AND NOT EXISTS (
      SELECT 1 FROM utilisateurs WHERE email = 'admin.systeme@votredomaine.ci'
  );

COMMIT;

-- Verification :
SELECT u.id, u.email, u.role, u.actif, r.matricule, r.nom, r.prenoms
FROM utilisateurs u
JOIN ressources r ON r.id = u.ressource_id
WHERE u.email = 'admin.systeme@votredomaine.ci';
