-- ============================================================
-- Diagnostic du portail public (POST /api/public/declare -> HTTP 500)
-- ============================================================
-- Lecture seule : l'insertion de test est annulee (ROLLBACK).
-- Seul effet : un numero de la sequence ticket_seq est consomme.
--
-- Usage :
--   psql -h <HOTE> -U <USER> -d <BASE> -f diagnostic_portail.sql
--
-- 1) La section "PREREQUIS" doit afficher OK partout.
-- 2) La section "SIMULATION" rejoue l'INSERT du portail : si elle
--    affiche une ERREUR, c'est LA cause du 500 (copier le message).
-- ============================================================

\echo '=== PREREQUIS ==='
SELECT
  'Agence digitale (nom ~ digitale)'            AS controle,
  CASE WHEN EXISTS (SELECT 1 FROM agences WHERE nom ILIKE '%digitale%') THEN 'OK' ELSE 'KO - agence absente' END AS statut
UNION ALL SELECT 'Agence code ADG',
  CASE WHEN EXISTS (SELECT 1 FROM agences WHERE code = 'ADG') THEN 'OK' ELSE 'KO - code ADG absent' END
UNION ALL SELECT 'Processus NQ',
  CASE WHEN EXISTS (SELECT 1 FROM processus WHERE code = 'NQ') THEN 'OK' ELSE 'KO - processus NQ absent' END
UNION ALL SELECT 'Mode de saisine Portail/Web',
  CASE WHEN EXISTS (SELECT 1 FROM modes_saisine WHERE libelle ILIKE '%Portail%' OR libelle ILIKE '%Web%')
       THEN 'OK' ELSE 'KO - aucun mode "Portail"/"Web" (mode_saisine_id serait NULL = NOT NULL viole)' END
UNION ALL SELECT 'Au moins un utilisateur',
  CASE WHEN EXISTS (SELECT 1 FROM utilisateurs) THEN 'OK' ELSE 'KO - aucun utilisateur' END
UNION ALL SELECT 'Utilisateur dans l''agence digitale',
  CASE WHEN EXISTS (SELECT 1 FROM utilisateurs u JOIN ressources r ON r.id = u.ressource_id
                    JOIN agences a ON a.id = r.agence_id WHERE a.nom ILIKE '%digitale%')
       THEN 'OK' ELSE 'AVERTISSEMENT - aucun agent Digitale (repli sur un autre utilisateur)' END
UNION ALL SELECT 'Regimes / types clients / motifs / sous-motifs',
  CASE WHEN (SELECT count(*) FROM regimes) > 0 AND (SELECT count(*) FROM types_clients) > 0
        AND (SELECT count(*) FROM motifs) > 0 AND (SELECT count(*) FROM sous_motifs) > 0
       THEN 'OK' ELSE 'KO - referentiel vide' END
UNION ALL SELECT 'Trigger numero ticket / SLA',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reclamation_before_insert')
       THEN 'OK' ELSE 'KO - trigger trg_reclamation_before_insert absent' END
UNION ALL SELECT 'Colonne ' || c,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'reclamations' AND column_name = c) THEN 'OK' ELSE 'KO - colonne absente' END
FROM unnest(ARRAY['agence_origine_id','partenaire_immatricule','partenaire_identifiant',
                  'partenaire_employeur','partenaire_sexe','commentaire_agent']) AS c
UNION ALL SELECT 'Table ' || t,
  CASE WHEN to_regclass('public.' || t) IS NOT NULL THEN 'OK' ELSE 'KO - table absente' END
FROM unnest(ARRAY['pieces_jointes','historique','interims','notifications']) AS t;

\echo ''
\echo '=== SIMULATION de l''INSERT du portail (annulee ensuite) ==='
BEGIN;

INSERT INTO reclamations (
    numero_ticket, partenaire_type, partenaire_nom_prenoms, partenaire_immatricule,
    partenaire_sexe, partenaire_telephone, regime_id, type_client_id, mode_saisine_id,
    processus_id, motif_id, sous_motif_id, agence_id, agence_origine_id,
    description, statut, agent_createur_id, date_creation
) VALUES (
    'DIAG-0001', 'travailleur', 'DIAGNOSTIC', false,
    'M', '0000000000',
    (SELECT id FROM regimes ORDER BY id LIMIT 1),
    (SELECT id FROM types_clients ORDER BY id LIMIT 1),
    (SELECT id FROM modes_saisine WHERE libelle ILIKE '%Portail%' OR libelle ILIKE '%Web%' LIMIT 1),
    (SELECT id FROM processus WHERE code = 'NQ'),
    (SELECT id FROM motifs ORDER BY id LIMIT 1),
    (SELECT id FROM sous_motifs ORDER BY id LIMIT 1),
    (SELECT id FROM agences WHERE nom ILIKE '%digitale%' ORDER BY id LIMIT 1),
    (SELECT id FROM agences WHERE nom ILIKE '%digitale%' ORDER BY id LIMIT 1),
    'diagnostic', 'nouveau',
    COALESCE(
        (SELECT u.id FROM utilisateurs u JOIN ressources r ON r.id = u.ressource_id
         JOIN agences a ON a.id = r.agence_id WHERE a.nom ILIKE '%digitale%'
         ORDER BY CASE WHEN u.role = 'agent' THEN 0 ELSE 1 END LIMIT 1),
        (SELECT id FROM utilisateurs LIMIT 1)
    ),
    NOW()
) RETURNING numero_ticket, date_echeance_sla;

ROLLBACK;

\echo ''
\echo 'Si une ligne "numero_ticket" s''affiche ci-dessus : l''INSERT passe, la cause du 500 est ailleurs'
\echo '(piece jointe / droits sur storage/attachments, ou code deploye different) : voir le log d''erreur PHP.'
