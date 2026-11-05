#!/usr/bin/env python3
"""
Import des reclamations historiques (RECLAMATION.xlsx) -> script SQL autonome.

Le script LIT le fichier Excel et GENERE un fichier .sql (aucune connexion a la
base). Ce .sql, execute avec psql/DBeaver, fait tout dans UNE transaction :
  - cree le referentiel manquant (regimes, types de client, modes de saisine,
    processus, motifs, sous-motifs, causes) ou reutilise l'existant ;
  - cree un compte technique "Import historique" (inactif, non connectable) ;
  - insere les reclamations (dates d'origine conservees), actions et historique ;
  - est rejouable : une ligne deja importee (N° d'ordre) est ignoree.

Par defaut la transaction se termine par ROLLBACK (essai a blanc).
Utiliser --apply pour generer la version qui fait COMMIT.

ATTENTION : le .sql genere contient des donnees personnelles (noms, telephones,
identifiants CNPS). Ne pas le versionner ni le diffuser.

Usage :
  python import_reclamations.py --xlsx RECLAMATION.xlsx --agence-code AGP \
         --out import_reclamations.sql            # essai a blanc
  python import_reclamations.py ... --apply        # version qui valide
"""
import argparse, collections, datetime as dt, re, sys, warnings
import openpyxl

warnings.filterwarnings("ignore")

# Libelles du fichier -> libelle probable du referentiel existant. Utilises
# seulement si la cible existe en base, sinon la valeur du fichier est creee.
ALIAS_MODE = {
    "accueil agence cnps": "Accueil physique (Guichet)",
    "email": "Email (Support)",
    "courriel": "Email (Support)",
    "appel telephonique": "Téléphone (Call Center)",
    "courrier": "Courrier physique (Arrivée)",
}
ALIAS_TYPE = {
    "travailleur salarie": "Assuré Social (Salarié)",
    "ayant droit": "Ayant droit",
}
ALIAS_REGIME = {"regime general": "Régime Général (Salariés)"}

LIMITS = {"nom": 300, "ident": 100, "tel": 50, "email": 150, "employeur": 300}


def clean(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v).replace("_", " ")).strip()
    return s or None


def raw(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def norm(s):
    import unicodedata
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s.replace("_", " ")).strip()


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dt.datetime):
        return "'" + v.strftime("%Y-%m-%d %H:%M:%S") + "'"
    if isinstance(v, dt.date):
        return "'" + v.strftime("%Y-%m-%d") + "'"
    return "'" + str(v).replace("'", "''") + "'"


def to_dt(v):
    if isinstance(v, dt.datetime):
        return v
    if isinstance(v, dt.date):
        return dt.datetime(v.year, v.month, v.day)
    return None


def sentence_case(s):
    s = s.strip()
    return (s[:1].upper() + s[1:].lower()) if s and s == s.upper() else s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--agence-code", required=True)
    ap.add_argument("--out", default="import_reclamations.sql")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    ws = openpyxl.load_workbook(a.xlsx, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    data = [r for r in rows[1:] if any(c not in (None, "") for c in r)]
    print(f"{len(data)} lignes lues dans {a.xlsx}")

    # ---- cause : libelle canonique (variante la plus frequente par cle normalisee)
    cause_variants = collections.defaultdict(collections.Counter)
    for r in data:
        c = raw(r[19])
        if c:
            cause_variants[norm(c)][c] += 1
    cause_label = {k: sentence_case(v.most_common(1)[0][0]) for k, v in cause_variants.items()}

    # ---- valeurs majoritaires par tuple (processus d'un motif, delai d'un sous-motif)
    motif_proc = collections.defaultdict(collections.Counter)
    sm_delai = collections.defaultdict(collections.Counter)
    for r in data:
        k_m = (norm(clean(r[3])), norm(clean(r[4])), norm(clean(r[5])))
        motif_proc[k_m][(raw(r[18]) or "NQ").upper()] += 1
        try:
            d = int(float(r[8]))
        except (TypeError, ValueError):
            d = 0
        if d > 0:
            sm_delai[k_m + (norm(clean(r[6]) or "Non précisé"),)][d] += 1

    warnings_list, stg = [], []
    for i, r in enumerate(data, 1):
        n_ordre = raw(r[0]) or str(i)
        dcre = to_dt(r[2])
        if not dcre:
            warnings_list.append(f"N°{n_ordre}: date de reception invalide -> ligne ignoree")
            continue
        regime, typec, mode = clean(r[3]), clean(r[4]), clean(r[1])
        motif, sm = clean(r[5]), clean(r[6]) or "Non précisé"
        k_m = (norm(regime), norm(typec), norm(motif))
        k_s = k_m + (norm(sm),)
        proc = (raw(r[18]) or "NQ").upper()
        delai = (sm_delai[k_s].most_common(1)[0][0] if sm_delai[k_s] else 5)
        dech = to_dt(r[9]) or (dcre + dt.timedelta(days=delai))

        cloturee = (raw(r[24]) or "").upper().startswith("CL") and "NON" not in (raw(r[24]) or "").upper()
        stat_act = (raw(r[22]) or "").upper()
        dfin, dclo = to_dt(r[23]), to_dt(r[25])
        if cloturee:
            statut = "resolu"
        elif stat_act.startswith("TRAIT"):
            statut = "a_valider"
        elif stat_act.startswith("EN COURS"):
            statut = "en_cours"
        else:
            statut = "nouveau"
        dres = None
        if statut == "resolu":
            dres = dclo or dfin or dcre
            if dres < dcre:
                dres = dcre

        ident = raw(r[13])
        ident = re.sub(r"\s+", "", ident) if ident else None
        nom = raw(r[11])
        tel = raw(r[15])
        email = raw(r[16])
        if email and norm(email) in ("neant", "neants", "aucun", "n/a", "-"):
            email = None
        for fld, val, lim in (("nom", nom, LIMITS["nom"]), ("ident", ident, LIMITS["ident"]),
                              ("tel", tel, LIMITS["tel"]), ("email", email, LIMITS["email"])):
            if val and len(val) > lim:
                warnings_list.append(f"N°{n_ordre}: {fld} tronque ({len(val)}>{lim})")
        nom = nom[:300] if nom else nom
        ident = ident[:100] if ident else ident
        tel = tel[:50] if tel else tel
        email = email[:150] if email else email

        sexe = raw(r[12])
        sexe = sexe.upper() if sexe and sexe.upper() in ("M", "F") else None
        affaire = raw(r[17])
        descr = raw(r[7]) or "(sans description)"
        if affaire and norm(affaire) not in ("non defini", "neant"):
            descr += f" [N° affaire : {affaire}]"

        c_raw = raw(r[19])
        stg.append(dict(
            n_ordre=n_ordre, mode=mode, mode_alias=ALIAS_MODE.get(norm(mode)),
            regime=regime, regime_alias=ALIAS_REGIME.get(norm(regime)),
            typec=typec, type_alias=ALIAS_TYPE.get(norm(typec)),
            motif=motif, motif_proc=motif_proc[k_m].most_common(1)[0][0],
            sm=sm, sm_delai=delai, proc=proc,
            cause=cause_label.get(norm(c_raw)) if c_raw else None,
            entreprise=norm(typec) == "employeur",
            nom=nom, sexe=sexe, ident=ident, immat=bool(ident), tel=tel, email=email,
            employeur=raw(r[14]), descr=descr,
            dcre=dcre, dech=dech, dres=dres, statut=statut,
            act_lib=raw(r[20]), act_stat=stat_act, act_fin=dfin,
            obs=raw(r[26]),
        ))

    cols = ["n_ordre", "mode", "mode_alias", "regime", "regime_alias", "typec", "type_alias",
            "motif", "motif_proc", "sm", "sm_delai", "proc", "cause", "entreprise", "nom",
            "sexe", "ident", "immat", "tel", "email", "employeur", "descr", "dcre", "dech",
            "dres", "statut", "act_lib", "act_stat", "act_fin", "obs"]
    types = {"sm_delai": "INTEGER", "entreprise": "BOOLEAN", "immat": "BOOLEAN",
             "dcre": "TIMESTAMP", "dech": "TIMESTAMP", "dres": "TIMESTAMP", "act_fin": "TIMESTAMP"}
    stg_ddl = ",\n    ".join(f"{c} {types.get(c, 'TEXT')}" for c in cols)
    values = ",\n".join("(" + ", ".join(q(s[c]) for c in cols) + ")" for s in stg)

    sql = SQL_TEMPLATE.format(
        agence_code=q(a.agence_code), stg_ddl=stg_ddl, cols=", ".join(cols),
        values=values, total=len(stg), ending="COMMIT" if a.apply else "ROLLBACK",
        mode_txt="VALIDATION (COMMIT)" if a.apply else "ESSAI A BLANC (ROLLBACK)")
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(sql)

    cnt = collections.Counter(s["statut"] for s in stg)
    print(f"{len(stg)} lignes retenues -> {a.out}  [{'COMMIT' if a.apply else 'ROLLBACK (essai a blanc)'}]")
    print("statuts :", dict(cnt))
    print("avertissements :", len(warnings_list))
    for w in warnings_list[:20]:
        print("  -", w)


SQL_TEMPLATE = r"""-- ============================================================
-- Import des reclamations historiques  --  {mode_txt}
-- {total} lignes. Genere par deploy/import_reclamations.py
-- Contient des donnees personnelles : ne pas versionner / diffuser.
-- ============================================================
BEGIN;

CREATE FUNCTION pg_temp.norm(t text) RETURNS text AS $f$
    SELECT lower(translate(regexp_replace(replace(trim(coalesce(t,'')),'_',' '), '\s+', ' ', 'g'),
        'àâäáãéèêëíîïìóôöòõúùûüçÀÂÄÁÃÉÈÊËÍÎÏÌÓÔÖÒÕÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'))
$f$ LANGUAGE sql IMMUTABLE;

CREATE TEMP TABLE stg (
    id SERIAL,
    {stg_ddl},
    regime_id INTEGER, type_id INTEGER, mode_id INTEGER, proc_id INTEGER, motif_id INTEGER,
    sm_id INTEGER, cat_id INTEGER, cause_id INTEGER, deja BOOLEAN DEFAULT FALSE
) ON COMMIT DROP;

INSERT INTO stg ({cols}) VALUES
{values};

CREATE TEMP TABLE ctx (agence_id INTEGER, user_id INTEGER) ON COMMIT DROP;

-- 1. Agence cible --------------------------------------------------------
INSERT INTO ctx (agence_id) SELECT id FROM agences WHERE code = {agence_code};
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM ctx) THEN
        RAISE EXCEPTION 'Agence introuvable (code=%). Import annule.', {agence_code};
    END IF;
END $$;

-- 2. Compte technique "Import historique" (inactif : non connectable) -----
INSERT INTO ressources (matricule, nom, prenoms, agence_id, actif)
SELECT 'MAT-IMPORT', 'IMPORT', 'Historique', agence_id, FALSE FROM ctx
WHERE NOT EXISTS (SELECT 1 FROM ressources WHERE matricule = 'MAT-IMPORT');

INSERT INTO utilisateurs (ressource_id, email, password, role, actif)
SELECT r.id, 'import.historique@invalid.local', '!import-non-connectable', 'agent', FALSE
FROM ressources r WHERE r.matricule = 'MAT-IMPORT'
  AND NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'import.historique@invalid.local');

UPDATE ctx SET user_id = (SELECT id FROM utilisateurs WHERE email = 'import.historique@invalid.local');

-- 3. Referentiel : regimes ------------------------------------------------
INSERT INTO regimes (libelle)
SELECT DISTINCT regime FROM stg s
WHERE regime IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM regimes r WHERE pg_temp.norm(r.libelle) IN (pg_temp.norm(s.regime), pg_temp.norm(s.regime_alias)));
UPDATE stg s SET regime_id = (SELECT r.id FROM regimes r
    WHERE pg_temp.norm(r.libelle) IN (pg_temp.norm(s.regime), pg_temp.norm(s.regime_alias))
    ORDER BY (pg_temp.norm(r.libelle) = pg_temp.norm(s.regime_alias)) DESC, r.id LIMIT 1);

-- modes de saisine
INSERT INTO modes_saisine (libelle)
SELECT DISTINCT mode FROM stg s
WHERE mode IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM modes_saisine m WHERE pg_temp.norm(m.libelle) IN (pg_temp.norm(s.mode), pg_temp.norm(s.mode_alias)));
UPDATE stg s SET mode_id = (SELECT m.id FROM modes_saisine m
    WHERE pg_temp.norm(m.libelle) IN (pg_temp.norm(s.mode), pg_temp.norm(s.mode_alias))
    ORDER BY (pg_temp.norm(m.libelle) = pg_temp.norm(s.mode_alias)) DESC, m.id LIMIT 1);

-- types de client (rattaches a un regime)
INSERT INTO types_clients (regime_id, libelle)
SELECT DISTINCT s.regime_id, s.typec FROM stg s
WHERE s.typec IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM types_clients t WHERE t.regime_id = s.regime_id
      AND pg_temp.norm(t.libelle) IN (pg_temp.norm(s.typec), pg_temp.norm(s.type_alias)));
UPDATE stg s SET type_id = (SELECT t.id FROM types_clients t WHERE t.regime_id = s.regime_id
    AND pg_temp.norm(t.libelle) IN (pg_temp.norm(s.typec), pg_temp.norm(s.type_alias))
    ORDER BY (pg_temp.norm(t.libelle) = pg_temp.norm(s.type_alias)) DESC, t.id LIMIT 1);

-- processus (par code)
INSERT INTO processus (code, libelle)
SELECT DISTINCT p, p FROM (SELECT proc AS p FROM stg UNION SELECT motif_proc FROM stg) x
WHERE p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM processus WHERE upper(code) = x.p);
UPDATE stg s SET proc_id = (SELECT id FROM processus WHERE upper(code) = s.proc);

-- motifs : un motif par (regime, type de client, libelle), comme l'exigent les formulaires
INSERT INTO motifs (processus_id, regime_id, type_client_id, libelle)
SELECT DISTINCT ON (s.regime_id, s.type_id, pg_temp.norm(s.motif))
       (SELECT id FROM processus WHERE upper(code) = s.motif_proc), s.regime_id, s.type_id, s.motif
FROM stg s
WHERE s.motif IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM motifs m WHERE m.regime_id = s.regime_id AND m.type_client_id = s.type_id
      AND pg_temp.norm(m.libelle) = pg_temp.norm(s.motif));
UPDATE stg s SET motif_id = (SELECT m.id FROM motifs m WHERE m.regime_id = s.regime_id
    AND m.type_client_id = s.type_id AND pg_temp.norm(m.libelle) = pg_temp.norm(s.motif) ORDER BY m.id LIMIT 1);

-- sous-motifs (delai = valeur majoritaire du fichier pour ce sous-motif)
INSERT INTO sous_motifs (motif_id, libelle, delai_traitement_jours)
SELECT DISTINCT ON (s.motif_id, pg_temp.norm(s.sm)) s.motif_id, s.sm, s.sm_delai
FROM stg s
WHERE s.motif_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sous_motifs x WHERE x.motif_id = s.motif_id AND pg_temp.norm(x.libelle) = pg_temp.norm(s.sm));
UPDATE stg s SET sm_id = (SELECT x.id FROM sous_motifs x WHERE x.motif_id = s.motif_id
    AND pg_temp.norm(x.libelle) = pg_temp.norm(s.sm) ORDER BY x.id LIMIT 1);

-- causes : categorie "Import historique" par processus, causes normalisees
INSERT INTO categories_causes (processus_id, libelle)
SELECT DISTINCT s.proc_id, 'Import historique' FROM stg s
WHERE s.cause IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM categories_causes c WHERE c.processus_id = s.proc_id AND c.libelle = 'Import historique');
UPDATE stg s SET cat_id = (SELECT id FROM categories_causes c
    WHERE c.processus_id = s.proc_id AND c.libelle = 'Import historique') WHERE s.cause IS NOT NULL;
INSERT INTO causes (categorie_id, libelle)
SELECT DISTINCT ON (s.cat_id, pg_temp.norm(s.cause)) s.cat_id, s.cause FROM stg s
WHERE s.cause IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM causes c WHERE c.categorie_id = s.cat_id AND pg_temp.norm(c.libelle) = pg_temp.norm(s.cause));
UPDATE stg s SET cause_id = (SELECT c.id FROM causes c WHERE c.categorie_id = s.cat_id
    AND pg_temp.norm(c.libelle) = pg_temp.norm(s.cause) ORDER BY c.id LIMIT 1) WHERE s.cause IS NOT NULL;

-- 4. Lignes deja importees (rejeu) ----------------------------------------
UPDATE stg s SET deja = TRUE WHERE EXISTS (
    SELECT 1 FROM historique h WHERE h.acteur_nom = 'Import historique'
      AND h.commentaire = 'Import historique - N° d''ordre ' || s.n_ordre);

-- 5. Controle : toute reference doit etre resolue ---------------------------
DO $$
DECLARE manque INTEGER;
BEGIN
    SELECT count(*) INTO manque FROM stg WHERE NOT deja AND (regime_id IS NULL OR type_id IS NULL
        OR mode_id IS NULL OR proc_id IS NULL OR motif_id IS NULL OR sm_id IS NULL);
    IF manque > 0 THEN
        RAISE EXCEPTION '% ligne(s) avec reference non resolue. Import annule.', manque;
    END IF;
END $$;

-- 6. Insertion des reclamations, actions et historique ----------------------
DO $$
DECLARE
    r RECORD; v_id INTEGER; v_ctx ctx%ROWTYPE; n_rec INTEGER := 0; n_act INTEGER := 0;
BEGIN
    SELECT * INTO v_ctx FROM ctx;
    FOR r IN SELECT * FROM stg WHERE NOT deja ORDER BY id LOOP
        -- numero_ticket et date_echeance_sla sont recalcules par le trigger a l'INSERT :
        -- l'echeance du fichier est donc remise juste apres.
        INSERT INTO reclamations (
            numero_ticket, partenaire_type, partenaire_nom_prenoms, partenaire_raison_sociale,
            partenaire_identifiant, partenaire_immatricule, partenaire_sexe, partenaire_telephone,
            partenaire_email, partenaire_employeur, date_reception, regime_id, type_client_id,
            mode_saisine_id, processus_id, motif_id, sous_motif_id, categorie_cause_id, cause_id,
            description, statut, agent_createur_id, agence_id, agence_origine_id, date_creation,
            analyse_commentaire)
        VALUES (
            'IMPORT', CASE WHEN r.entreprise THEN 'entreprise' ELSE 'travailleur' END,
            CASE WHEN r.entreprise THEN NULL ELSE r.nom END, CASE WHEN r.entreprise THEN r.nom ELSE NULL END,
            r.ident, r.immat, r.sexe, r.tel, r.email, r.employeur, r.dcre::date, r.regime_id, r.type_id,
            r.mode_id, r.proc_id, r.motif_id, r.sm_id, r.cat_id, r.cause_id,
            r.descr, r.statut, v_ctx.user_id, v_ctx.agence_id, v_ctx.agence_id, r.dcre, r.obs)
        RETURNING id INTO v_id;

        UPDATE reclamations SET
            date_echeance_sla = r.dech,
            date_resolution   = r.dres,
            hors_sla          = (r.statut <> 'resolu' AND r.dech < NOW())
        WHERE id = v_id;

        IF r.act_lib IS NOT NULL THEN
            INSERT INTO actions_traitement (reclamation_id, libelle, echeance, statut, observations,
                                            commentaire_cloture, created_at, updated_at)
            VALUES (v_id, left(r.act_lib, 300), r.dech::date,
                    CASE WHEN r.act_stat LIKE 'TRAIT%' THEN 'termine'
                         WHEN r.act_stat LIKE 'EN COURS%' THEN 'en_cours' ELSE 'en_attente' END,
                    NULL, NULL, r.dcre, coalesce(r.act_fin, r.dcre));
            n_act := n_act + 1;
        END IF;

        INSERT INTO historique (reclamation_id, acteur_id, acteur_nom, action_type, commentaire, date_action)
        VALUES (v_id, v_ctx.user_id, 'Import historique', 'creation',
                'Import historique - N° d''ordre ' || r.n_ordre, r.dcre);
        IF r.statut = 'resolu' THEN
            INSERT INTO historique (reclamation_id, acteur_id, acteur_nom, action_type, commentaire, date_action)
            VALUES (v_id, v_ctx.user_id, 'Import historique', 'resolution',
                    'Reclamation cloturee (donnees historiques)', r.dres);
        END IF;
        n_rec := n_rec + 1;
    END LOOP;
    RAISE NOTICE 'Reclamations inserees : %, actions : %', n_rec, n_act;
END $$;

-- 7. Bilan -------------------------------------------------------------------
SELECT 'lignes du fichier' AS element, count(*) AS nb FROM stg
UNION ALL SELECT 'deja importees (ignorees)', count(*) FROM stg WHERE deja
UNION ALL SELECT 'reclamations "Import historique" en base', count(*) FROM historique
    WHERE acteur_nom = 'Import historique' AND action_type = 'creation';
SELECT statut, count(*) FROM reclamations r JOIN utilisateurs u ON u.id = r.agent_createur_id
    WHERE u.email = 'import.historique@invalid.local' GROUP BY statut ORDER BY 2 DESC;

{ending};
"""

if __name__ == "__main__":
    main()
