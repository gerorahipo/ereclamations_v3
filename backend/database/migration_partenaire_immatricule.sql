-- ============================================================
-- Migration : Statut "client immatriculé" + contrôle du Numéro CNPS
-- ============================================================
-- Ajoute une colonne explicite pour distinguer un client réellement
-- non immatriculé (Numéro CNPS volontairement absent) d'une saisie
-- incomplète. Les réclamations existantes sont considérées comme
-- immatriculées par défaut (comportement inchangé) et ne sont pas
-- revalidées par ce correctif.

ALTER TABLE reclamations
    ADD COLUMN IF NOT EXISTS partenaire_immatricule BOOLEAN NOT NULL DEFAULT TRUE;
