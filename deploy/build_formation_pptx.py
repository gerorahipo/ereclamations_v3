# -*- coding: utf-8 -*-
"""Support de formation e-Reclamations - version modele CNPS (EXEMPLE.pptx)."""
import os, sys, copy
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = sys.argv[1]
OUT = sys.argv[2]

BLUE = RGBColor(0x1F, 0x3A, 0x93); ORANGE = RGBColor(0xFF, 0x6B, 0x35); DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x5B, 0x65, 0x75); LIGHT = RGBColor(0xF5, 0xF7, 0xFA); WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x05, 0x96, 0x69); RED = RGBColor(0xDC, 0x26, 0x26); PALE = RGBColor(0xFF, 0xF1, 0xEA)
LINE = RGBColor(0xD5, 0xDB, 0xE5)
BODY = "Century Gothic"

prs = Presentation(TEMPLATE)
# supprimer les diapositives d'exemple
sldIdLst = prs.slides._sldIdLst
for sldId in list(sldIdLst):
    prs.part.drop_rel(sldId.rId); sldIdLst.remove(sldId)
LAY = [m.slide_layouts[0] for m in prs.slide_masters]   # 0 titre, 1 sommaire, 2 section, 3 contenu, 4 merci


def clean(s):
    for ph in list(s.placeholders):
        if ph.has_text_frame and not ph.text_frame.text.strip():
            ph._element.getparent().remove(ph._element)


def ph(s, idx):
    for p in s.placeholders:
        if p.placeholder_format.idx == idx:
            return p


def settext(p, t):
    p.text_frame.text = t


def rect(s, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE, lw=0.75):
    sh = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: sh.fill.background()
    else: sh.fill.solid(); sh.fill.fore_color.rgb = fill
    if line is None: sh.line.fill.background()
    else: sh.line.color.rgb = line; sh.line.width = Pt(lw)
    sh.shadow.inherit = False
    return sh


def text(s, x, y, w, h, content, size=14, bold=False, color=DARK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05); tf.margin_top = tf.margin_bottom = Inches(0.03)
    paras = content if isinstance(content, list) else [content]
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = align
        runs = p if isinstance(p, list) else [(p, {})]
        for r in runs:
            t, o = (r, {}) if isinstance(r, str) else r
            run = para.add_run(); run.text = t
            f = run.font; f.name = o.get("font", BODY); f.size = Pt(o.get("size", size)); f.bold = o.get("bold", bold)
            f.color.rgb = o.get("color", color)
        para.space_after = Pt(5)
    return tb


def badge(s, n, cx, cy, d=0.3, fill=ORANGE, size=12):
    c = rect(s, cx - d / 2, cy - d / 2, d, d, fill, WHITE, MSO_SHAPE.OVAL, lw=1.25)
    tf = c.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = str(n); r.font.size = Pt(size); r.font.bold = True; r.font.color.rgb = WHITE; r.font.name = BODY
    return c


from lxml import etree
def notes(s, t):
    ns = s.notes_slide
    if ns.notes_text_frame is None:
        xml = ('<p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
               '<p:nvSpPr><p:cNvPr id="99" name="Notes Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>'
               '<p:spPr><a:xfrm><a:off x="685800" y="4400550"/><a:ext cx="5486400" cy="3600450"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="fr-FR"/></a:p></p:txBody></p:sp>')
        ns.shapes._spTree.append(etree.fromstring(xml))
    ns.notes_text_frame.text = t


counter = {"n": 0}


def content(part, title, sub, note=""):
    counter["n"] += 1
    s = prs.slides.add_slide(LAY[3])
    short = {"INTRODUCTION": "INTRO", "ASSISTANCE": "AIDE", "CONCLUSION": "FIN"}
    if " · " in part:
        part, extra = part.split(" · ", 1); sub = extra.capitalize() + " — " + sub
    part = short.get(part, part)
    settext(ph(s, 0), title); settext(ph(s, 12), part); settext(ph(s, 11), sub)
    clean(s); notes(s, note)
    return s


def section(num, title, sub, note=""):
    counter["n"] += 1
    s = prs.slides.add_slide(LAY[2])
    settext(ph(s, 11), "MODULE " + num); settext(ph(s, 12), sub); settext(ph(s, 0), title)
    clean(s); notes(s, note)
    return s


def picture(s, name, box, marks=None):
    path = os.path.join(HERE, name + ".png")
    im = Image.open(path); iw, ih = im.size
    bx, by, bw, bh = box
    sc = min(bw / iw, bh / ih); w, h = iw * sc, ih * sc
    x, y = bx + (bw - w) / 2, by + (bh - h) / 2
    rect(s, x - 0.02, y - 0.02, w + 0.04, h + 0.04, WHITE, LINE, lw=1)
    s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    for i, (x0, y0, x1, y1) in enumerate(marks or [], 1):      # cadre en repere 1000 x 625
        rx, ry = x + x0 / 1000 * w, y + y0 / 625 * h
        rw, rh = (x1 - x0) / 1000 * w, (y1 - y0) / 625 * h
        rect(s, rx, ry, rw, rh, None, ORANGE, lw=2.25)
        badge(s, i, rx, ry, d=0.27, size=11)


def legend(s, items, numbered, tip=None, x=9.4, y=1.25, w=3.55):
    cy = y
    for i, (head, desc) in enumerate(items, 1):
        if numbered:
            badge(s, i, x + 0.15, cy + 0.17, d=0.3, size=11); tx = x + 0.42
        else:
            rect(s, x + 0.03, cy + 0.1, 0.11, 0.11, ORANGE, shape=MSO_SHAPE.OVAL); tx = x + 0.25
        lines = max(1, -(-len(desc) // 32)) if desc else 0
        hh = 0.3 + 0.19 * lines
        paras = [[(head, {"bold": True, "color": BLUE, "size": 13})]]
        if desc: paras.append([(desc, {"size": 11, "color": GRAY})])
        text(s, tx, cy, w - (tx - x), hh, paras)
        cy += hh + 0.07
    if tip:
        th = 0.55 + 0.18 * (-(-len(tip) // 36))
        ty = max(cy + 0.1, 6.85 - th)
        r = rect(s, x - 0.02, ty, w + 0.04, th, PALE, ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE); r.adjustments[0] = 0.08
        text(s, x + 0.05, ty + 0.04, w - 0.1, th - 0.06, [[("À retenir", {"bold": True, "color": ORANGE, "size": 12})], [(tip, {"size": 11})]])


def shot(part, title, sub, img, items, marks=None, tip=None, note=""):
    s = content(part, title, sub, note)
    picture(s, img, (0.4, 1.2, 8.8, 5.6), marks)
    legend(s, items, bool(marks), tip)
    return s


def card(s, x, y, w, h, head, body, color=BLUE, hs=17, bs=13):
    r = rect(s, x, y, w, h, WHITE, LINE, MSO_SHAPE.ROUNDED_RECTANGLE); r.adjustments[0] = 0.04
    rect(s, x, y, w, 0.1, color)
    text(s, x + 0.15, y + 0.2, w - 0.3, 0.5, head, size=hs, bold=True, color=color)
    text(s, x + 0.15, y + 0.75, w - 0.3, h - 0.85, body, size=bs)


# ======================== 1. Titre
counter["n"] += 1
s = prs.slides.add_slide(LAY[0])
settext(ph(s, 0), "Formation e-Réclamations")
settext(ph(s, 10), "Espace assuré · Agent · Pilote · Manager — avec cas pratique complet")
clean(s)
notes(s, "Accueil des participants. Objectif : à la fin de la session, chacun sait réaliser les actions de son profil et comprend le rôle des autres. "
         "Les captures proviennent de la plateforme de TEST : dossiers et noms affichés sont fictifs.")

# ======================== 2. Sommaire
counter["n"] += 1
s = prs.slides.add_slide(LAY[1])
mods = [("Introduction", ["0.1 L'application et ses acteurs", "0.2 Cycle de vie et connexion"]),
        ("Espace assuré", ["1.1 Déclarer une réclamation", "1.2 Suivre son dossier"]),
        ("Agent accueil et relations client", ["2.1 Saisir au guichet", "2.2 Qualifier les dossiers du portail"]),
        ("Pilote", ["3.1 Prendre en charge, analyser", "3.2 Actions et soumission"]),
        ("Manager de service / section", ["4.1 Examiner le dossier", "4.2 Clôturer ou retourner"]),
        ("Cas pratique", ["5.1 Le dossier REC-2026-000010", "5.2 Exercices et assistance"])]
for i, (h, subs) in enumerate(mods):
    x = 0.72 + (i % 3) * 4.22; y = 1.55 + (i // 3) * 2.55
    c = rect(s, x, y, 0.7, 0.7, ORANGE, shape=MSO_SHAPE.OVAL)
    tf = c.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER; r = p.add_run(); r.text = str(i); r.font.size = Pt(20); r.font.bold = True; r.font.color.rgb = WHITE
    text(s, x, y + 0.9, 3.7, 0.7, h, size=17, bold=True)
    text(s, x, y + 1.55, 3.7, 0.8, [[(t, {"size": 12, "color": GRAY})] for t in subs])
notes(s, "Présenter les six blocs. Fil rouge : un seul dossier, REC-2026-000010, suivi du début à la fin par tous les profils.")

# ======================== Introduction
s = content("INTRODUCTION", "Objectifs de la formation", "Ce que vous saurez faire", "Durée conseillée : environ 3 h 30. Les modules 2, 3 et 4 peuvent être donnés séparément à chaque profil.")
card(s, 0.5, 1.3, 6.0, 5.4, "À l'issue de la formation",
     ["•  Expliquer le circuit d'une réclamation, de la déclaration à la clôture", "•  Accompagner un assuré sur le portail", "•  Réaliser les actions de votre profil",
      "•  Comprendre le rôle des autres profils", "•  Rejouer seul un cas pratique complet", "•  Demander de l'aide via GLPI (GREL / E-RECLAMATION)"], bs=14)
card(s, 6.85, 1.3, 6.0, 5.4, "Déroulé conseillé (≈ 3 h 30)",
     ["•  Introduction et cycle de vie — 20 min", "•  Module 1 · Espace assuré — 30 min", "•  Module 2 · Agent accueil — 40 min", "•  Module 3 · Pilote — 50 min",
      "•  Module 4 · Manager — 30 min", "•  Module 5 · Cas pratique et exercices — 40 min", "•  Assistance et questions — 20 min"], color=ORANGE, bs=14)

s = content("INTRODUCTION", "e-Réclamations en bref", "Une plateforme, quatre acteurs",
            "Les profils Superviseur, Coordonnateur et Administrateurs existent mais ne sont pas traités ici. Chaque réclamation reçoit un numéro de ticket unique.")
text(s, 0.5, 1.2, 12.3, 0.8, "Une plateforme web pour recevoir, traiter et suivre les réclamations des assurés : un portail public et un espace réservé au personnel CNPS.", size=15, color=GRAY)
actors = [("Assuré", "Portail public, sans compte", "Déclare sa réclamation et la suit avec un numéro de ticket (REC-AAAA-NNNNNN).", GREEN),
          ("Agent accueil et relations client", "Espace agent", "Saisit les réclamations du guichet et qualifie celles du portail (Agence Digitale).", ORANGE),
          ("Pilote", "Espace agent", "Prend en charge, analyse la cause, enregistre les actions et soumet à validation.", BLUE),
          ("Manager de service / section", "Espace agent", "Examine le traitement puis clôture le dossier ou le retourne au pilote.", RGBColor(0x0F, 0x24, 0x4D))]
for i, (h, sub, d, c) in enumerate(actors):
    card(s, 0.5 + i * 3.12, 2.1, 2.95, 4.6, h, [[(sub, {"size": 11, "bold": True, "color": GRAY})], d], color=c, hs=16, bs=13)

s = content("INTRODUCTION", "Le cycle de vie d'une réclamation", "De la déclaration à la clôture",
            "Faire verbaliser : qui déclenche chaque changement de statut ? Côté assuré le statut est simplifié en 4 étapes.")
steps = [("Nouveau", "Déclarée (portail) ou saisie (guichet)", "Assuré / Agent", ORANGE), ("En cours", "Prise en charge par un pilote", "Pilote", BLUE),
         ("À clôturer", "Soumise à validation", "Pilote → Manager", RGBColor(0x7C, 0x3A, 0xED)), ("Résolu", "Clôturée, réponse disponible", "Manager", GREEN)]
for i, (h, d, who, c) in enumerate(steps):
    x = 0.5 + i * 3.12
    rect(s, x, 1.5, 3.05, 1.1, c, shape=MSO_SHAPE.CHEVRON if i else MSO_SHAPE.PENTAGON)
    text(s, x + 0.45, 1.5, 2.2, 1.1, h, size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.1, 2.75, 2.85, 0.8, d, size=13, align=PP_ALIGN.CENTER)
    text(s, x + 0.1, 3.5, 2.85, 0.4, who, size=12, bold=True, color=c, align=PP_ALIGN.CENTER)
card(s, 0.5, 4.2, 6.0, 2.5, "Et aussi…", ["•  « Retourner » : le manager renvoie le dossier au pilote (retour « En cours »)", "•  « Escalader » : le pilote transmet à une autre structure",
                                          "•  « Non qualifié » : dossier du portail à qualifier avant traitement"], bs=12, color=ORANGE)
card(s, 6.85, 4.2, 6.0, 2.5, "Les délais (SLA)", ["•  Chaque sous-motif a un délai de traitement (échéance affichée)", "•  Au-delà : « Hors délai » (corbeille dédiée)", "•  Les compteurs du bandeau signalent les urgences"], bs=12, color=RED)

shot("INTRODUCTION", "Se connecter à l'espace agent", "Page de connexion", "login",
     [("Matricule ou e-mail", "Votre matricule ou adresse e-mail professionnelle."), ("Mot de passe", "Saisi masqué ; l'œil permet de le vérifier."),
      ("Se connecter", "Vous arrivez sur votre tableau de bord.")],
     marks=[(30, 298, 368, 328), (30, 365, 368, 400), (30, 452, 368, 484)],
     tip="Un identifiant = une personne. Ne partagez jamais votre mot de passe.",
     note="L'accès se fait depuis le portail public (bouton « Espace agent CNPS ») ou directement par /login. Changer le mot de passe dès la première connexion.")

# ======================== Module 1
section("1", "Espace assuré", "Déclarer une réclamation et suivre son avancement", "Le portail est ouvert à tout assuré, sans compte. L'agent d'accueil peut aussi accompagner l'assuré.")

shot("MODULE 1 · ASSURÉ", "Le portail assuré", "Deux actions principales", "assure_01_accueil",
     [("Déposer une réclamation", "Formulaire en 2 étapes ; un numéro de suivi est remis."), ("Suivre une réclamation", "Saisir le numéro REC-AAAA-NNNNNN."), ("Espace agent CNPS", "Réservé au personnel (connexion).")],
     marks=[(125, 305, 490, 535), (510, 305, 875, 535), (788, 10, 925, 42)], tip="Le numéro de ticket est la clé du suivi : il doit être conservé.",
     note="Page d'accueil publique : deux actions pour l'assuré.")

shot("MODULE 1 · ASSURÉ", "Déclarer — étape 1 : identification", "Vos informations (1/2)", "assure_02_etape1_haut",
     [("Régime", "RGTS, RSTI ou RCTI."), ("Vous êtes…", "Travailleur, retraité, employeur, ayant droit…"), ("Immatriculé à la CNPS ?", "Oui : un numéro d'immatriculation est demandé.")],
     marks=[(188, 448, 488, 492), (512, 405, 812, 448), (194, 538, 805, 585)],
     tip="Le numéro CNPS est contrôlé automatiquement (12 chiffres au Régime Général).",
     note="Le contrôle du numéro évite une saisie incomplète. Si l'assuré n'est pas immatriculé, répondre « Non ».")

shot("MODULE 1 · ASSURÉ", "Déclarer — étape 1 : coordonnées", "Vos informations (2/2)", "assure_03_etape1_bas",
     [("Nom de l'employeur", "Facultatif, utile pour retrouver le dossier."), ("Téléphone", "Obligatoire : contact et communication du numéro de suivi."),
      ("E-mail", "Recommandé pour recevoir le suivi."), ("Continuer", "Passe à l'étape 2.")],
     marks=[(188, 111, 812, 156), (188, 291, 488, 337), (512, 291, 812, 337), (677, 380, 812, 424)],
     tip="Demander à l'assuré un numéro de téléphone joignable.", note="Téléphone obligatoire, e-mail recommandé.")

shot("MODULE 1 · ASSURÉ", "Déclarer — étape 2 : votre réclamation", "Motif et description", "assure_04_etape2",
     [("Sujet", "Objet de la réclamation (ex. Non réception d'un paiement)."), ("Précision", "Affine le sujet ; détermine le délai de traitement."),
      ("Description", "Dates, montants et références du dossier.")],
     marks=[(188, 403, 488, 447), (512, 403, 812, 447), (188, 515, 812, 620)],
     tip="Pièces jointes facultatives : PDF, Word, Excel, JPG, PNG, TXT — 5 Mo maximum.",
     note="Insister sur la qualité de la description : elle permet à l'agent de qualifier correctement. Assuré fictif : KOUASSI DEMO FORMATION.")

shot("MODULE 1 · ASSURÉ", "Déclaration envoyée", "Le numéro de ticket", "assure_05_confirmation",
     [("Numéro de suivi", "REC-2026-000010 : à conserver et à communiquer à l'assuré.")],
     marks=[(388, 312, 612, 348)], tip="Ce numéro permet de suivre le dossier sans se déplacer.",
     note="Ce numéro est celui suivi pendant tout le cas pratique : REC-2026-000010.")

shot("MODULE 1 · ASSURÉ", "Suivre sa réclamation", "État juste après la dépôt", "assure_06b_suivi_carte",
     [("Statut actuel", "« Réceptionnée » juste après la déclaration."), ("Les 4 étapes", "Réception → Traitement → Clôture → Terminée."),
      ("Informations du dossier", "Objet, agence de traitement, dates."), ("Accusé / Partager", "Accusé de réception et partage du suivi.")],
     marks=[(615, 49, 775, 106), (238, 165, 762, 265), (238, 333, 762, 508), (238, 559, 459, 592)],
     tip="Tant que le dossier n'est pas qualifié, il est rattaché à l'Agence Digitale.",
     note="Page /suivi avec le numéro saisi. L'agence affichée est l'Agence Digitale, qui qualifie les dossiers du portail.")

# ======================== Module 2
section("2", "Agent accueil et relations client", "Saisir les réclamations et qualifier celles du portail",
        "Deux missions : saisir les réclamations reçues au guichet ou par téléphone, et qualifier les réclamations du portail public.")

shot("MODULE 2 · AGENT", "Le tableau de bord de l'agent", "Votre point de départ", "agent_01_dashboard",
     [("Bandeau d'accueil", "Résumé de vos réclamations à traiter."), ("Compteurs", "À traiter, échéance du jour, en retard."),
      ("Nouvelle réclamation", "Saisie d'une réclamation du guichet."), ("Corbeilles", "Non affectées, En cours, Hors délai, Non qualifiées…"), ("Liste des dossiers", "Bouton « Traiter » pour ouvrir un dossier.")],
     marks=[(218, 62, 977, 160), (730, 95, 950, 140), (833, 175, 977, 203), (10, 238, 192, 430), (218, 375, 977, 600)],
     tip="La cloche en haut à droite signale les nouveaux événements.", note="Parcourir le tableau de bord de haut en bas.")

shot("MODULE 2 · AGENT", "Saisir une réclamation au guichet", "Menu « Nouvelle réclamation »", "agent_09_nouvelle_reclamation",
     [("Références du client", "Régime, type, numéro d'immatriculation, nom, téléphone."), ("Motif et description", "Choisir le motif et le sous-motif, puis décrire."),
      ("Enregistrement", "Un numéro de ticket est généré : à communiquer à l'assuré.")],
     tip="Vérifier l'identité et le numéro CNPS avec l'assuré avant d'enregistrer.",
     note="Même logique que le portail, avec en plus le mode de saisine. Cet écran n'a pas été soumis dans le cas fil rouge (le dossier vient du portail).")

shot("MODULE 2 · AGENT", "Les réclamations non qualifiées", "Corbeille « Non qualifiées »", "agent_02_non_qualifiees",
     [("Titre de la corbeille", "Dossiers du portail en attente de qualification."), ("Corbeille active", "Menu de gauche : « Non qualifiées »."),
      ("Dossier REC-2026-000010", "Statut « Nouveau », processus NQ."), ("Traiter", "Ouvre la fiche du dossier.")],
     marks=[(225, 238, 520, 270), (10, 400, 190, 432), (225, 425, 977, 490), (918, 430, 970, 455)],
     tip="Tant que le processus est « NQ », le dossier ne peut pas être pris en charge.",
     note="Cœur du rôle de l'agent d'Agence Digitale : transformer un dossier brut du portail en dossier exploitable.")

shot("MODULE 2 · AGENT", "La fiche du dossier", "Quatre onglets", "agent_04_fiche_vue",
     [("Statut", "« Nouveau » : personne n'a encore agi."), ("Onglets", "Vue d'ensemble, Traitement, Documents, Historique."),
      ("Client", "Identité, n° CNPS, régime, coordonnées."), ("Dossier et délais", "Agence, processus, motif, sous-motif, échéance.")],
     marks=[(925, 65, 978, 84), (222, 167, 668, 200), (218, 222, 470, 610), (487, 222, 735, 610)],
     tip="Toute modification est horodatée et attribuée dans l'historique.", note="Faire repérer les quatre onglets.")

shot("MODULE 2 · AGENT", "Qualifier : le formulaire", "Onglet Traitement", "agent_05_qualif_vide",
     [("Bloc de qualification", "« Réservé aux agents de l'Agence Digitale » — action requise."), ("Processus, objet, précision", "Le processus détermine le service qui traitera."),
      ("Commentaire interne", "Consignes pour le pilote ; non visible de l'assuré."), ("Valider la qualification", "Enregistre et oriente le dossier.")],
     marks=[(220, 216, 740, 276), (240, 303, 722, 347), (240, 382, 722, 460), (545, 490, 722, 525)],
     tip="Choisir le processus d'après le sujet réel de la demande.", note="Le commentaire interne est destiné au pilote.")

shot("MODULE 2 · AGENT", "Qualifier : le dossier REC-2026-000010", "Formulaire complété", "agent_06_qualif_remplie",
     [("Processus", "GPRES/GDPF : le sujet porte sur des allocations familiales."), ("Commentaire interne", "Consignes pour le pilote."),
      ("Valider la qualification", "Le dossier quitte la corbeille « Non qualifiées ».")],
     marks=[(240, 303, 722, 347), (240, 382, 722, 460), (545, 490, 722, 525)],
     tip="Après validation, le dossier est affecté au processus choisi.", note="Sujet : allocations familiales non perçues → processus GDPF.")

shot("MODULE 2 · AGENT", "Après la qualification : historique", "Traçabilité", "agent_08_historique",
     [("Journal du dossier", "La qualification est tracée : qui, quand, quel processus."), ("Statut du dossier", "Toujours « Nouveau » : un pilote doit maintenant prendre en charge.")],
     tip="Fin du rôle de l'agent pour ce dossier : le pilote prend le relais.", note="Montrer l'onglet Historique.")

# ======================== Module 3
section("3", "Pilote", "Prendre en charge, analyser, agir, soumettre", "Quatre gestes : prendre en charge, analyser, enregistrer des actions, soumettre.")

shot("MODULE 3 · PILOTE", "Le tableau de bord du pilote", "Vos dossiers à traiter", "pilote_01_dashboard",
     [("Bandeau", "Vos réclamations à traiter, échéances, retards."), ("Filtres rapides", "Non qualifiées, Non affectées, À corriger, Clôturées, Suivi escalades."),
      ("Actions rapides", "« Traiter » ouvre le dossier ; « Assigner » depuis la liste."), ("Corbeilles", "Menu de gauche, dont « Escaladées ».")],
     marks=[(218, 62, 977, 160), (230, 335, 830, 362), (908, 415, 970, 468), (10, 240, 192, 450)],
     tip="« À corriger » rassemble les dossiers retournés par le manager.", note="Mêmes corbeilles que l'agent, plus « À corriger » et « Escaladées ».")

shot("MODULE 3 · PILOTE", "Ouvrir un dossier à traiter", "Avant la prise en charge", "pilote_02_fiche_avant",
     [("Messages de contrôle", "Analyse complétée et au moins une action réalisée avant soumission."), ("Prendre en charge", "Vous devenez responsable du dossier."),
      ("Escalader le dossier", "Si la demande relève d'une autre structure."), ("Statut « Nouveau »", "Aucun pilote n'est assigné."), ("Pilote assigné", "Vide tant que le dossier n'est pas pris en charge.")],
     marks=[(235, 118, 960, 195), (235, 203, 368, 232), (372, 203, 508, 232), (925, 66, 978, 86), (600, 562, 930, 605)],
     tip="Le processus est GPRES/GDPF : le dossier a bien été qualifié.", note="Les deux bandeaux rappellent ce qui sera exigé avant de soumettre.")

shot("MODULE 3 · PILOTE", "Prendre en charge", "Un seul clic", "pilote_03_prise_en_charge",
     [("Statut « En cours »", "Dès la prise en charge."), ("Avertissements", "Le traitement reste à faire."),
      ("Escalader", "Toujours possible."), ("Pilote assigné", "Votre nom apparaît.")],
     marks=[(925, 66, 978, 84), (235, 118, 960, 195), (235, 203, 373, 232), (600, 562, 930, 600)],
     tip="Le bouton « Prendre en charge » disparaît.", note="Le dossier passe de « Nouveau » à « En cours » et l'événement est tracé.")

shot("MODULE 3 · PILOTE", "Traitement : analyse et actions", "Onglet Traitement", "pilote_04_traitement_vide",
     [("Avertissements", "Deux conditions avant la soumission."), ("Analyse", "Catégorie de cause, cause, commentaire."),
      ("Liste des corrections", "Actions à mener ; vide au départ."), ("Ajouter une action", "Enregistre une action de traitement.")],
     marks=[(235, 118, 965, 192), (219, 320, 570, 605), (586, 320, 937, 420), (805, 332, 921, 354)],
     tip="Soumission impossible sans analyse enregistrée et action réalisée.", note="Comprendre la cause (analyse) puis agir (actions).")

shot("MODULE 3 · PILOTE", "Renseigner l'analyse", "Catégorie, cause, commentaire", "pilote_05_analyse_remplie",
     [("Catégorie", "Cause CNPS ou Cause client."), ("Cause", "La liste dépend de la catégorie (ex. « Emission non payée »)."),
      ("Commentaire", "Décrire précisément la cause constatée."), ("Enregistrer", "Message « L'analyse a été mise à jour ».")],
     tip="Une bonne analyse facilite la validation par le manager.", note="La liste des causes se charge après le choix de la catégorie.")

shot("MODULE 3 · PILOTE", "Ajouter une action de traitement", "Fenêtre d'ajout", "pilote_06_action_modal",
     [("Libellé de l'action", "Obligatoire. Ex. : « Demande de paiement… »."), ("Structure sollicitée", "Service à qui l'action est demandée (facultatif)."),
      ("Observations", "Notes complémentaires."), ("Ajouter l'action", "Créée au statut « en attente ».")],
     marks=[(315, 229, 684, 258), (315, 287, 684, 316), (315, 344, 684, 406), (569, 430, 684, 458)],
     tip="Une action = une chose précise et vérifiable.", note="Détailler un exemple d'action pour le cas fil rouge.")

shot("MODULE 3 · PILOTE", "L'action est enregistrée", "Statut « en attente »", "pilote_07_action_ajoutee",
     [("Liste des corrections", "1 action enregistrée."), ("Statut de l'action", "« en_attente » tant qu'elle n'est pas réalisée."),
      ("Icônes d'action", "Modifier, supprimer, marquer comme réalisé (coche verte).")],
     tip="Si le tableau semble tronqué, repliez le panneau « Contexte » (icône à droite des onglets).",
     note="Les icônes sont à droite du tableau ; replier le panneau Contexte libère de la place.")

shot("MODULE 3 · PILOTE", "Marquer l'action comme réalisée", "Fenêtre de réalisation", "pilote_08_action_realisee_modal",
     [("Fenêtre de réalisation", "Rappelle l'action concernée."), ("Commentaire de réalisation", "Résultat obtenu (recommandé)."),
      ("Confirmer", "L'action passe à « terminé ».")],
     tip="Seules les actions « terminées » permettent de soumettre.", note="Cliquer sur la coche verte de la ligne de l'action.")

shot("MODULE 3 · PILOTE", "Soumettre à validation", "Conditions réunies", "pilote_09_pret_soumettre",
     [("Soumettre à validation", "Le bouton apparaît quand les conditions sont réunies."), ("Escalader", "Reste disponible."),
      ("Analyse enregistrée", "Catégorie, cause et commentaire."), ("Action terminée", "Avec son commentaire de réalisation.")],
     marks=[(235, 117, 384, 146), (390, 117, 528, 146), (219, 235, 570, 522), (586, 235, 937, 503)],
     tip="Après soumission, le dossier passe « À clôturer ».", note="Les avertissements ont disparu. Un clic suffit pour soumettre.")

shot("MODULE 3 · PILOTE", "Soumission confirmée", "Historique du dossier", "pilote_11_historique",
     [("Statut « À clôturer »", "Le dossier attend la décision du manager."), ("Journal du dossier", "Qualification, prise en charge, action, soumission : tout est tracé.")],
     tip="Le journal permet de reconstituer l'historique complet.", note="Message affiché à la soumission : « Dossier soumis à la validation ».")

s = content("MODULE 3 · PILOTE", "Escalade et bonnes pratiques", "Pour aller plus loin", "L'escalade n'a pas été déclenchée dans le cas fil rouge : présenter le principe oralement.")
card(s, 0.5, 1.3, 6.0, 5.4, "Quand escalader ?", ["•  Le dossier relève d'une autre structure ou agence", "•  Une décision ou une information extérieure est nécessaire", "",
                                                  "Comment ?", "•  Bouton « Escalader le dossier » en haut de la fiche", "•  Suivi dans « Escaladées » et « Suivi escalades »"], bs=14, color=ORANGE)
card(s, 6.85, 1.3, 6.0, 5.4, "Bonnes pratiques du pilote", ["•  Prendre en charge rapidement : le délai court dès la déclaration", "•  Une analyse claire avant les actions", "•  Une action = un résultat vérifiable",
                                                            "•  Renseigner le commentaire de réalisation", "•  Consulter « À corriger » chaque jour"], bs=14, color=BLUE)

# ======================== Module 4
section("4", "Manager de service / section", "Examiner le traitement, clôturer ou retourner", "Le manager est garant de la qualité : il valide ou renvoie les dossiers soumis par les pilotes.")

shot("MODULE 4 · MANAGER", "Le tableau de bord du manager", "Dossiers à valider", "manager_02_dashboard_a_valider",
     [("Bandeau", "Indique les dossiers qui attendent votre validation."), ("Compteur « à valider »", "Dossiers soumis par les pilotes."),
      ("Statut « À clôturer »", "Mis en évidence dans la liste.")],
     marks=[(218, 62, 977, 160)], tip="Le raccourci « Clôturer » ne remplace pas l'examen du dossier.", note="La corbeille « À clôturer » est la priorité quotidienne du manager.")

shot("MODULE 4 · MANAGER", "Examiner le dossier soumis", "Fiche en attente de validation", "manager_03_fiche_validation",
     [("Bandeau de validation", "Examiner l'analyse et les actions réalisées."), ("Clôturer", "Valide le traitement : le dossier passe « Résolu »."),
      ("Retourner", "Renvoie le dossier au pilote pour complément."), ("Onglets", "Contrôler Traitement et Historique avant de décider.")],
     marks=[(235, 118, 960, 150), (235, 160, 310, 187), (323, 160, 415, 187), (225, 238, 700, 262)],
     tip="Vérifier : analyse cohérente, action réalisée, réponse adaptée.", note="Le manager n'agit que sur les dossiers de son agence.")

shot("MODULE 4 · MANAGER", "Contrôler l'analyse et les actions", "Onglet Traitement", "manager_04_traitement",
     [("Analyse du pilote", "Catégorie, cause et commentaire."), ("Liste des corrections", "Action terminée avec son commentaire de réalisation."),
      ("Observations du Manager", "Zone d'observations en bas de page.")],
     tip="En cas de doute, ouvrez l'Historique avant de clôturer.", note="Le manager retrouve ce que le pilote a saisi.")

shot("MODULE 4 · MANAGER", "Clôturer le dossier", "Fenêtre de clôture", "manager_05_cloture_modal",
     [("Boutons Clôturer / Retourner", "En haut de la fiche."), ("Commentaire / justification", "Obligatoire : motive la décision."),
      ("Valider et Clôturer", "Le dossier passe « Résolu ».")],
     marks=[(235, 159, 415, 187), (315, 280, 684, 356), (554, 378, 684, 408)],
     tip="Le commentaire de clôture est conservé dans l'historique.", note="Rédiger un commentaire utile : il sera relu en cas de contrôle.")

s = content("MODULE 4 · MANAGER", "Retourner un dossier au pilote", "Cas du retour", "Le retour n'est pas dans le déroulé du dossier REC-2026-000010. Proposer en exercice de créer un second dossier et de le retourner.")
card(s, 0.5, 1.3, 6.0, 5.4, "Quand retourner ?", ["•  Analyse insuffisante ou incohérente", "•  Action non réalisée ou non conforme", "•  Réponse inadaptée à la demande", "",
                                                  "Comment ?", "•  Bouton rouge « Retourner »", "•  Indiquer le motif du retour", "•  Le dossier repasse « En cours »"], bs=14, color=RED)
card(s, 6.85, 1.3, 6.0, 5.4, "Côté pilote", ["•  Le dossier apparaît dans « À corriger »", "•  Le pilote lit le motif dans l'historique", "•  Il complète l'analyse ou les actions", "•  Il soumet de nouveau", "",
                                             "Cas non joué sur le dossier fil rouge : à faire en exercice (module 5)."], bs=14, color=BLUE)

shot("MODULE 4 · MANAGER", "Dossier résolu", "Fin du traitement", "manager_06_resolu",
     [("Statut « Résolu »", "Fin du traitement."), ("Documents", "« Accusé » et « Réponse » (lettre) disponibles."), ("Dernières actions", "Clôture avec le commentaire du manager.")],
     tip="La lettre de réponse peut être remise ou transmise à l'assuré.", note="Le dossier est clôturé ; l'assuré voit « Traitée / Résolue » sur le portail.")

shot("MODULE 4 · MANAGER", "Historique complet du dossier", "Qui, quoi, quand", "manager_07_historique",
     [("Cinq événements", "Qualification, prise en charge, action ajoutée, soumission, validation."), ("Traçabilité", "Chaque étape est attribuée à son auteur.")],
     tip="L'historique est la mémoire du dossier.", note="Cette frise résume le travail des trois profils sur un même dossier.")

# ======================== Module 5
section("5", "Cas pratique complet", "Un dossier suivi de bout en bout : REC-2026-000010", "Récapitulatif du cas puis exercices en groupes (un assuré, un agent, un pilote, un manager).")

s = content("MODULE 5 · CAS PRATIQUE", "Le parcours du dossier REC-2026-000010", "Sept étapes, quatre acteurs", "Reprendre chaque ligne en pointant la capture correspondante.")
rows = [("1", "Assuré", "Déclare sur le portail : allocations familiales non reçues", "« Nouveau » — processus NQ", GREEN), ("2", "Agent", "Qualifie : processus GDPF, motif et précision confirmés", "Qualifié", ORANGE),
        ("3", "Pilote", "Prend en charge le dossier", "« En cours »", BLUE), ("4", "Pilote", "Analyse (Cause CNPS — Emission non payée), ajoute et réalise une action", "Action « terminée »", BLUE),
        ("5", "Pilote", "Soumet à validation", "« À clôturer »", BLUE), ("6", "Manager", "Examine et clôture avec commentaire", "« Résolu »", RGBColor(0x0F, 0x24, 0x4D)),
        ("7", "Assuré", "Consulte le suivi : « Traitée / Résolue », lettre de réponse disponible", "Terminée", GREEN)]
for i, (n, who, what, st, c) in enumerate(rows):
    y = 1.25 + i * 0.78
    rect(s, 0.5, y, 12.3, 0.7, WHITE if i % 2 else LIGHT, LINE)
    badge(s, n, 0.85, y + 0.35, d=0.44, fill=c, size=14)
    text(s, 1.2, y, 1.6, 0.7, who, size=14, bold=True, color=c, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 2.8, y, 6.7, 0.7, what, size=12, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 9.6, y, 3.2, 0.7, st, size=12, bold=True, color=GRAY, anchor=MSO_ANCHOR.MIDDLE)

shot("MODULE 5 · CAS PRATIQUE", "Retour côté assuré : dossier traité", "Boucle bouclée", "assure_07_suivi_final",
     [("Statut actuel", "« Traitée / Résolue »."), ("4 étapes complétées", "Réception, Traitement, Clôture, Terminée."), ("Réclamation traitée", "Une solution a été apportée.")],
     marks=[(590, 48, 775, 104), (238, 165, 762, 265), (238, 543, 762, 620)],
     tip="L'assuré constate lui-même la résolution avec son numéro de ticket.", note="Comparer avec la capture initiale « Réceptionnée ».")

s = content("MODULE 5 · CAS PRATIQUE", "Exercices de mise en pratique", "En groupes de quatre", "Utiliser exclusivement la plateforme de test et des données fictives.")
ex = [("A", "Assuré", "Déclarer une réclamation fictive, noter le numéro, vérifier le suivi.", GREEN), ("B", "Agent", "Retrouver le dossier dans « Non qualifiées » et le qualifier.", ORANGE),
      ("C", "Pilote", "Prendre en charge, analyser, ajouter et réaliser une action, soumettre.", BLUE), ("D", "Manager", "Examiner puis clôturer — ou retourner avec un motif.", RGBColor(0x0F, 0x24, 0x4D)),
      ("E", "Tous", "Rejouer un dossier avec retour : retour, correction, nouvelle soumission.", RED)]
for i, (l, who, d, c) in enumerate(ex):
    y = 1.3 + i * 1.08
    r = rect(s, 0.5, y, 12.3, 0.95, WHITE, LINE, MSO_SHAPE.ROUNDED_RECTANGLE); r.adjustments[0] = 0.12
    badge(s, l, 1.0, y + 0.47, d=0.6, fill=c, size=20)
    text(s, 1.5, y, 2.0, 0.95, who, size=17, bold=True, color=c, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 3.5, y, 9.2, 0.95, d, size=14, anchor=MSO_ANCHOR.MIDDLE)

s = content("MODULE 5 · CAS PRATIQUE", "Questions de contrôle", "Vérifier les acquis",
            "Réponses : 1) le numéro de ticket ; 2) il vient du portail avec le processus de repli NQ, l'Agence Digitale le qualifie ; 3) analyse enregistrée et au moins une action réalisée ; "
            "4) clôturer valide, retourner renvoie au pilote ; 5) sur /suivi avec le numéro ; 6) onglet Historique.")
qs = ["Que doit conserver l'assuré après avoir déclaré une réclamation ?", "Pourquoi un dossier du portail est-il « Non qualifié » ? Qui le qualifie ?",
      "Quelles sont les deux conditions pour qu'un pilote puisse soumettre ?", "Quelle différence entre « Clôturer » et « Retourner » ?",
      "Où l'assuré voit-il que son dossier est résolu ?", "Où retrouver qui a fait quoi et quand ?"]
for i, q in enumerate(qs):
    y = 1.3 + i * 0.9
    badge(s, i + 1, 0.85, y + 0.35, d=0.6, size=18)
    text(s, 1.35, y, 11.4, 0.7, q, size=16, anchor=MSO_ANCHOR.MIDDLE)

s = content("ASSISTANCE", "Besoin d'aide ? Le catalogue GLPI", "BESOIN APPLICATIF › GREL › E-RECLAMATION", "Catalogue GLPI préparé pour e-Réclamations : deux groupes responsables, trois niveaux d'urgence.")
text(s, 0.5, 1.2, 12.3, 0.8, "Tout problème d'utilisation se signale par un ticket GLPI : famille « BESOIN APPLICATIF », sous-famille « GREL », sous-famille 2 « E-RECLAMATION ».", size=14, color=GRAY)
card(s, 0.5, 2.1, 4.0, 4.6, "Coordonnateur qualité", ["Questions fonctionnelles :", "•  Impossible de qualifier, soumettre ou valider", "•  Dossier invisible", "•  Délai SLA incorrect", "•  Paramétrage (motifs, délais, causes)", "•  Assistance ou formation"], color=BLUE, bs=12)
card(s, 4.7, 2.1, 4.0, 4.6, "Technicien support SI", ["Questions techniques :", "•  Création de compte, mot de passe", "•  Connexion impossible", "•  Pièce jointe, PDF, export", "•  Notification non reçue", "•  Application lente ou indisponible"], color=ORANGE, bs=12)
card(s, 8.9, 2.1, 3.9, 4.6, "Niveaux d'urgence", [[("BLOQUANT ", {"bold": True, "color": RED}), ("— vous ne pouvez plus travailler", {})],
                                                    [("MAJORITAIRE ", {"bold": True, "color": ORANGE}), ("— gêne importante", {})], [("MINEUR ", {"bold": True, "color": GREEN}), ("— demande non urgente", {})], "",
                                                    "Indiquez le n° de ticket, ce que vous faisiez et le message affiché (capture d'écran)."], color=RGBColor(0x0F, 0x24, 0x4D), bs=12)

s = content("CONCLUSION", "Points clés à retenir", "L'essentiel en six messages", "Conclure en reprenant le fil rouge. Inviter à refaire les exercices sur la plateforme de test.")
keys = [("Le numéro de ticket", "est la clé du dossier, pour l'assuré comme pour le personnel.", GREEN), ("Agent", "saisit au guichet et qualifie les dossiers du portail (NQ → processus réel).", ORANGE),
        ("Pilote", "prend en charge, analyse, agit puis soumet : analyse et action réalisée obligatoires.", BLUE), ("Manager", "examine puis clôture ou retourne avec un motif.", RGBColor(0x0F, 0x24, 0x4D)),
        ("L'historique", "trace chaque étape : qui, quoi, quand.", GRAY), ("En cas de souci", "ticket GLPI GREL / E-RECLAMATION avec capture d'écran.", RED)]
for i, (h, d, c) in enumerate(keys):
    card(s, 0.5 + (i % 3) * 4.2, 1.3 + (i // 3) * 2.8, 4.0, 2.55, h, d, color=c, hs=17, bs=13)

# ======================== Merci (modele)
counter["n"] += 1
s = prs.slides.add_slide(LAY[4])
settext(ph(s, 10), "Siège, Abidjan (Plateau)\nNuméro direct : 1396"); settext(ph(s, 11), "Site internet\nhttps://www.cnps.ci")
settext(ph(s, 12), "Informations\nrelationclients@cnps.ci"); settext(ph(s, 13), "WhatsApp\n05 54 57 57 57")
clean(s); notes(s, "Fin de la session. Assistance : GLPI — GREL / E-RECLAMATION. Plateforme de test : e-reclamation-test.cnps.ci")

prs.save(OUT)
print("OK", OUT, len(prs.slides))
