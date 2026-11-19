# -*- coding: utf-8 -*-
"""Support de formation e-Reclamations (PPTX) - generateur."""
import os, sys
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "Support_formation_e-Reclamations.pptx")
CROPS = os.path.join(HERE, "crops"); os.makedirs(CROPS, exist_ok=True)

NAVY = RGBColor(0x00, 0x33, 0x66); BLUE = RGBColor(0x00, 0x4A, 0x99); ORANGE = RGBColor(0xF3, 0x86, 0x1D)
LIGHT = RGBColor(0xF1, 0xF5, 0xFA); WHITE = RGBColor(0xFF, 0xFF, 0xFF); DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x6B, 0x72, 0x80); GREEN = RGBColor(0x05, 0x96, 0x69); RED = RGBColor(0xDC, 0x26, 0x26)
PALE_ORANGE = RGBColor(0xFF, 0xF4, 0xE8); PALE_BLUE = RGBColor(0xE6, 0xEE, 0xF8)
FONT = "Calibri"


from PIL import ImageDraw, ImageFont
def _f(sz,b=False):
    for n in (["arialbd.ttf"] if b else ["arial.ttf"]):
        try: return ImageFont.truetype(n,sz)
        except Exception: pass
    return ImageFont.load_default()
def mock_modal(name, title, fields, button, btn_color=(0,74,153)):
    """Les modales n'ont pas ete rendues par la capture : reconstitution fidele des libelles."""
    im=Image.open(os.path.join(HERE,name+".png")).convert("RGB"); d=ImageDraw.Draw(im)
    x0,y0,x1=440,150,840; h=70+len(fields)*95+70; y1=y0+h
    d.rounded_rectangle((x0,y0,x1,y1),14,fill=(255,255,255),outline=(200,208,220),width=2)
    d.text((x0+24,y0+22),title,font=_f(20,True),fill=(0,51,102))
    y=y0+70
    for lab,val,tall in fields:
        d.text((x0+24,y),lab,font=_f(12,True),fill=(107,114,128))
        d.rounded_rectangle((x0+24,y+20,x1-24,y+62),6,fill=(246,248,251),outline=(200,208,220))
        d.text((x0+34,y+33),val,font=_f(13),fill=(31,41,55)); y+=95
    d.rounded_rectangle((x1-24-190,y1-62,x1-24,y1-20),8,fill=btn_color)
    d.text((x1-24-190+14,y1-50),button,font=_f(14,True),fill=(255,255,255))
    im.save(os.path.join(HERE,name+"_m.png"))
    return name+"_m", y0, y1

prs = Presentation(); prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
counter = {"n": 0}


def rect(s, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE, lw=0.75):
    sh = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: sh.fill.background()
    else: sh.fill.solid(); sh.fill.fore_color.rgb = fill
    if line is None: sh.line.fill.background()
    else: sh.line.color.rgb = line; sh.line.width = Pt(lw)
    sh.shadow.inherit = False
    return sh


def text(s, x, y, w, h, content, size=14, bold=False, color=DARK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, italic=False):
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
            f = run.font; f.name = FONT; f.size = Pt(o.get("size", size)); f.bold = o.get("bold", bold)
            f.italic = o.get("italic", italic); f.color.rgb = o.get("color", color)
        para.space_after = Pt(4)
    return tb


def notes(s, t):
    s.notes_slide.notes_text_frame.text = t


def base(title, tag=None):
    counter["n"] += 1
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, 13.333, 0.95, NAVY); rect(s, 0, 0.95, 13.333, 0.05, ORANGE)
    text(s, 0.45, 0.12, 10.2, 0.75, title, size=26, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    if tag:
        pill = rect(s, 10.75, 0.27, 2.2, 0.42, ORANGE, shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        pill.adjustments[0] = 0.5
        text(s, 10.75, 0.27, 2.2, 0.42, tag, size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 0.45, 7.1, 8, 0.3, "e-Réclamations — Support de formation  |  CNPS Côte d'Ivoire", size=10, color=GRAY)
    text(s, 12.0, 7.1, 0.9, 0.3, str(counter["n"]), size=10, color=GRAY, align=PP_ALIGN.RIGHT)
    return s


def marker(s, n, cx, cy, r=0.17):
    c = rect(s, cx - r, cy - r, 2 * r, 2 * r, ORANGE, WHITE, MSO_SHAPE.OVAL, lw=1.5)
    tf = c.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    run = p.add_run(); run.text = str(n); run.font.size = Pt(12); run.font.bold = True
    run.font.color.rgb = WHITE; run.font.name = FONT


def picture(s, name, box, marks=None, crop=None):
    path = os.path.join(HERE, name + ".png")
    im = Image.open(path).convert("RGB")
    ox, oy = 0, 0
    if crop:
        im = im.crop(crop); ox, oy = crop[0], crop[1]
        path = os.path.join(CROPS, name + "_c.png"); im.save(path)
    bx, by, bw, bh = box; iw, ih = im.size
    sc = min(bw / iw, bh / ih); w, h = iw * sc, ih * sc
    x, y = bx + (bw - w) / 2, by + (bh - h) / 2
    rect(s, x - 0.03, y - 0.03, w + 0.06, h + 0.06, WHITE, RGBColor(0xC8, 0xD0, 0xDC), lw=1)
    s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    for (n, px, py) in (marks or []):
        marker(s, n, x + (px - ox) * sc, y + (py - oy) * sc)


def legend(s, items, x=9.0, y=1.25, w=3.95, tip=None, numbered=True, size=13):
    cy = y
    for i, (head, desc) in enumerate(items, 1):
        if numbered:
            c = rect(s, x, cy + 0.04, 0.34, 0.34, ORANGE, shape=MSO_SHAPE.OVAL)
            tf = c.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE; p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
            r_ = p.add_run(); r_.text = str(i); r_.font.size = Pt(12); r_.font.bold = True; r_.font.color.rgb = WHITE; r_.font.name = FONT
            tx = x + 0.45
        else:
            rect(s, x, cy + 0.12, 0.1, 0.1, ORANGE, shape=MSO_SHAPE.OVAL); tx = x + 0.25
        lines = max(1, int(len(desc) / 34) + 1)
        hh = 0.3 + 0.2 * lines
        text(s, tx, cy, w - (tx - x), hh, [[(head, {"bold": True, "color": NAVY, "size": size})],
                                            [(desc, {"size": size - 2, "color": DARK})]] if desc else [[(head, {"bold": True, "color": NAVY, "size": size})]])
        cy += hh + 0.06
    if tip:
        th = 0.35 + 0.19 * (int(len(tip) / 38) + 1)
        ty = max(cy + 0.08, 6.9 - th)
        rect(s, x - 0.05, ty, w + 0.1, th, PALE_ORANGE, ORANGE, MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.08
        text(s, x, ty + 0.04, w, th - 0.06, [[("À retenir  ", {"bold": True, "color": ORANGE, "size": 12})], [(tip, {"size": 12})]])


def shot_slide(title, tag, img, items, marks=None, crop=None, tip=None, note="", box=(0.45, 1.2, 8.35, 5.75), numbered=True):
    s = base(title, tag)
    picture(s, img, box, marks if numbered else None, crop)
    legend(s, items, tip=tip, numbered=numbered)
    notes(s, note)
    return s


def divider(num, title, subtitle, tag, note=""):
    counter["n"] += 1
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, 13.333, 7.5, NAVY); rect(s, 0, 4.6, 13.333, 0.06, ORANGE)
    text(s, 0.9, 1.5, 3.0, 2.2, num, size=120, bold=True, color=ORANGE)
    text(s, 4.2, 1.9, 8.5, 1.3, title, size=44, bold=True, color=WHITE, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 4.2, 3.3, 8.5, 1.2, subtitle, size=20, color=RGBColor(0xC8, 0xD6, 0xEA))
    text(s, 0.9, 5.0, 11, 0.6, tag, size=16, bold=True, color=ORANGE)
    notes(s, note)
    return s


def card(s, x, y, w, h, head, body, color=BLUE, hs=16, bs=12):
    rect(s, x, y, w, h, WHITE, RGBColor(0xC8, 0xD0, 0xDC), MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.05
    rect(s, x, y, w, 0.12, color)
    text(s, x + 0.12, y + 0.2, w - 0.24, 0.5, head, size=hs, bold=True, color=color)
    text(s, x + 0.12, y + 0.75, w - 0.24, h - 0.85, body, size=bs, color=DARK)


# ========================================================================
# 1. Titre
counter["n"] += 1
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, 13.333, 7.5, NAVY); rect(s, 0, 5.3, 13.333, 0.07, ORANGE)
text(s, 0.8, 1.4, 11.5, 1.2, "Formation e-Réclamations", size=54, bold=True, color=WHITE)
text(s, 0.8, 2.7, 11.5, 1.6, "Espace assuré  ·  Agent accueil et relations client  ·  Pilote  ·  Manager de service/section accueil réclamations",
     size=24, color=RGBColor(0xC8, 0xD6, 0xEA))
text(s, 0.8, 4.4, 11.5, 0.6, "Support de formation avec cas pratique complet", size=20, bold=True, color=ORANGE)
text(s, 0.8, 5.6, 11.5, 0.9, ["Caisse Nationale de Prévoyance Sociale — Côte d'Ivoire",
                              "Captures réalisées sur la plateforme de test (e-reclamation-test.cnps.ci)"], size=16, color=WHITE)
notes(s, "Accueil des participants. Présenter l'objectif : à la fin de la session, chacun sait réaliser les actions de son profil et comprend le rôle des autres. "
         "Préciser que les captures proviennent de la plateforme de TEST : les dossiers et noms affichés sont fictifs ou de démonstration.")

# 2. Objectifs
s = base("Objectifs et déroulé de la formation")
card(s, 0.45, 1.3, 6.1, 5.5, "À l'issue de la formation, vous saurez",
     ["•  Expliquer le circuit complet d'une réclamation, de la déclaration à la clôture",
      "•  Accompagner un assuré sur le portail (déclarer et suivre)",
      "•  Réaliser les actions de votre profil : agent, pilote ou manager",
      "•  Comprendre ce que font les autres profils et à quel moment ils interviennent",
      "•  Rejouer seul un cas pratique de bout en bout",
      "•  Savoir demander de l'aide (catalogue GLPI « GREL / E-RECLAMATION »)"], bs=15)
card(s, 6.85, 1.3, 6.0, 5.5, "Déroulé conseillé (≈ 3 h 30)",
     ["•  Introduction et cycle de vie ......... 20 min",
      "•  Module 1 — Espace assuré ................ 30 min",
      "•  Module 2 — Agent accueil ................ 40 min",
      "•  Module 3 — Pilote .............................. 50 min",
      "•  Module 4 — Manager ......................... 30 min",
      "•  Module 5 — Cas pratique et exercices 40 min",
      "•  Assistance, questions-réponses ...... 20 min"], color=ORANGE, bs=15)
notes(s, "Adapter la durée selon le public. Les modules 2, 3 et 4 peuvent être donnés séparément à chaque profil ; le module 1 et le cas pratique sont utiles à tous.")

# 3. Programme (modules)
s = base("Programme")
mods = [("0", "Introduction", "Application, acteurs, statuts, connexion", BLUE),
        ("1", "Espace assuré", "Déclarer et suivre une réclamation", GREEN),
        ("2", "Agent accueil", "Saisir, qualifier les dossiers du portail", ORANGE),
        ("3", "Pilote", "Prendre en charge, analyser, agir, soumettre", BLUE),
        ("4", "Manager", "Examiner, clôturer ou retourner", GREEN),
        ("5", "Cas pratique", "Le dossier REC-2026-000009 de bout en bout", ORANGE)]
for i, (n, h, d, c) in enumerate(mods):
    x = 0.45 + (i % 3) * 4.2; y = 1.4 + (i // 3) * 2.9
    rect(s, x, y, 4.0, 2.6, WHITE, RGBColor(0xC8, 0xD0, 0xDC), MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.06
    rect(s, x, y, 4.0, 0.1, c)
    text(s, x + 0.2, y + 0.25, 1.0, 1.1, n, size=54, bold=True, color=c)
    text(s, x + 1.3, y + 0.35, 2.6, 0.7, h, size=22, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.2, y + 1.5, 3.6, 1.0, d, size=15, color=DARK)
notes(s, "Présenter rapidement les six blocs. Insister sur le fil rouge : un seul dossier, REC-2026-000009, suivi du début à la fin par tous les profils.")

# 4. L'application en bref
s = base("e-Réclamations en bref", "INTRODUCTION")
text(s, 0.45, 1.2, 12.4, 0.8, "Une plateforme web unique pour recevoir, traiter et suivre les réclamations des assurés, avec un portail public et un espace réservé au personnel CNPS.",
     size=17, color=DARK)
actors = [("Assuré", "Portail public, sans compte", "Déclare sa réclamation et suit son avancement avec un numéro de ticket (REC-AAAA-NNNNNN).", GREEN),
          ("Agent accueil et relations client", "Espace agent", "Saisit les réclamations reçues au guichet et qualifie celles venues du portail (Agence Digitale).", ORANGE),
          ("Pilote", "Espace agent", "Prend le dossier en charge, analyse la cause, enregistre les actions et soumet à validation.", BLUE),
          ("Manager de service / section", "Espace agent", "Examine le traitement puis clôture le dossier ou le retourne au pilote.", NAVY)]
for i, (h, sub, d, c) in enumerate(actors):
    x = 0.45 + i * 3.15
    rect(s, x, 2.3, 3.0, 4.4, WHITE, RGBColor(0xC8, 0xD0, 0xDC), MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.05
    rect(s, x, 2.3, 3.0, 0.12, c)
    text(s, x + 0.12, 2.55, 2.76, 0.9, h, size=18, bold=True, color=c)
    text(s, x + 0.12, 3.45, 2.76, 0.4, sub, size=12, bold=True, color=GRAY)
    text(s, x + 0.12, 3.95, 2.76, 2.6, d, size=14)
notes(s, "Les profils Superviseur, Coordonnateur et Administrateurs existent aussi mais ne sont pas traités dans ce support. "
         "Rappeler que chaque réclamation reçoit un numéro de ticket unique, à communiquer à l'assuré.")

# 5. Cycle de vie
s = base("Le cycle de vie d'une réclamation", "INTRODUCTION")
steps = [("Nouveau", "Déclarée (portail) ou saisie (guichet)", "Assuré / Agent", ORANGE),
         ("En cours", "Prise en charge par un pilote", "Pilote", BLUE),
         ("À clôturer", "Soumise à validation", "Pilote → Manager", RGBColor(0x7C, 0x3A, 0xED)),
         ("Résolu", "Clôturée, réponse disponible", "Manager", GREEN)]
for i, (h, d, who, c) in enumerate(steps):
    x = 0.45 + i * 3.15
    ch = rect(s, x, 1.5, 3.1, 1.2, c, shape=MSO_SHAPE.CHEVRON if i else MSO_SHAPE.PENTAGON)
    text(s, x + 0.45, 1.5, 2.3, 1.2, h, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, x + 0.1, 2.85, 2.9, 0.9, d, size=14, align=PP_ALIGN.CENTER)
    text(s, x + 0.1, 3.75, 2.9, 0.4, who, size=13, bold=True, color=c, align=PP_ALIGN.CENTER)
card(s, 0.45, 4.4, 6.1, 2.4, "Et aussi…",
     ["•  « Retourner » : le manager renvoie le dossier au pilote (retour à « En cours »)",
      "•  « Escalader » : le pilote transmet un dossier relevant d'une autre structure",
      "•  Dossier « Non qualifié » : venu du portail, à qualifier avant traitement"], bs=13, color=ORANGE)
card(s, 6.85, 4.4, 6.0, 2.4, "Les délais (SLA)",
     ["•  Chaque sous-motif a un délai de traitement (échéance affichée sur le dossier)",
      "•  Au-delà de l'échéance : le dossier passe « Hors délai » (corbeille dédiée)",
      "•  La cloche et les compteurs du bandeau signalent les urgences"], bs=13, color=RED)
notes(s, "Faire verbaliser le cycle : qui déclenche chaque changement de statut ? "
         "Le statut côté assuré est simplifié en 4 étapes (Réception, Traitement, Clôture, Terminée).")

# 6. Connexion
shot_slide("Se connecter à l'espace agent", "INTRODUCTION", "login",
           [("Page d'accueil → Espace agent", "Depuis le portail public, bouton « Espace agent CNPS »."),
            ("Identifiant", "Matricule ou adresse e-mail professionnelle."),
            ("Mot de passe", "Saisi masqué ; l'œil permet de le vérifier."),
            ("Se connecter", "Vous arrivez sur votre tableau de bord.")],
           marks=[(2, 255, 400), (3, 255, 485), (4, 255, 600)], tip="Un identifiant = une personne. Ne partagez jamais votre mot de passe.",
           note="Montrer l'accès depuis le portail public (bouton en haut à droite) puis la page de connexion. Les comptes de test utilisent le mot de passe communiqué par le formateur ; il doit être changé en production.")

# 7. Profil / mot de passe
shot_slide("Mon profil et changement de mot de passe", "INTRODUCTION", "common_profil",
           [("Administration & Profil", "Menu de gauche, pour tous les profils."),
            ("Mon profil", "Votre matricule, votre e-mail et votre agence d'affectation."),
            ("Mot de passe", "Ancien mot de passe, nouveau (6 caractères minimum), confirmation.")],
           marks=[(1, 130, 267), (2, 440, 560), (3, 880, 480)],
           tip="Changez votre mot de passe dès la première connexion.",
           note="Les champs de mot de passe sont masqués. Rappeler qu'après modification il faut se reconnecter.")

# ===== MODULE 1 =====
divider("1", "Espace assuré", "Déclarer une réclamation et suivre son avancement", "MODULE 1  ·  PORTAIL PUBLIC — SANS COMPTE",
        "Le portail est ouvert à tout assuré, sans création de compte. L'agent d'accueil peut aussi accompagner l'assuré sur place ou au téléphone.")

shot_slide("Le portail assuré", "MODULE 1 · ASSURÉ", "assure_01_accueil",
           [("Déposer une réclamation", "Ouvre le formulaire en 2 étapes. Un numéro de suivi est remis à la fin."),
            ("Suivre une réclamation", "Saisir le numéro (REC-AAAA-NNNNNN) pour voir l'avancement."),
            ("Espace agent CNPS", "Réservé au personnel (connexion).")],
           marks=[(1, 392, 634), (2, 829, 634), (3, 1098, 32)],
           tip="Le numéro de ticket est la clé du suivi : il doit être conservé.",
           note="Page d'accueil publique : deux actions principales pour l'assuré. Le lien « Espace agent CNPS » mène à la connexion du personnel.")

shot_slide("Déclarer — étape 1 : vos informations (1/2)", "MODULE 1 · ASSURÉ", "assure_02_etape1_haut",
           [("Régime et type d'assuré", "Régime (RGTS, RSTI, RCTI) puis « Vous êtes… » (travailleur, retraité, employeur…)."),
            ("Immatriculé à la CNPS ?", "Oui : le numéro d'immatriculation est demandé. Non : aucun numéro requis."),
            ("Numéro d'immatriculation", "Contrôlé automatiquement : 12 chiffres (Régime Général), 14 (RSTI), 1 à 6 (employeur).")],
           tip="Un numéro mal saisi est refusé avec un message clair : vérifier avec la carte CNPS.",
           numbered=False,
           note="Insister sur le contrôle du numéro CNPS : il empêche la saisie d'un numéro incomplet. Si l'assuré n'est pas immatriculé, répondre « Non ». Les règles de format sont celles appliquées par l'application.")

shot_slide("Déclarer — étape 1 : coordonnées (2/2)", "MODULE 1 · ASSURÉ", "assure_03_etape1_bas",
           [("Nom et prénoms, civilité", "Tels qu'ils figurent sur les documents CNPS."),
            ("Nom de l'employeur", "Facultatif mais utile pour retrouver le dossier."),
            ("Téléphone (obligatoire)", "Sert au contact et à la communication du numéro de suivi par SMS."),
            ("E-mail (recommandé)", "Permet de recevoir le suivi.")],
           numbered=False, tip="Téléphone obligatoire : demander à l'assuré un numéro joignable.",
           note="Le bouton « Continuer » passe à l'étape 2. Le téléphone est obligatoire ; l'e-mail est recommandé.")

shot_slide("Déclarer — étape 2 : votre réclamation", "MODULE 1 · ASSURÉ", "assure_04_etape2",
           [("Sujet de la réclamation", "Liste des objets disponibles pour le régime et le type choisis (ex. Non réception d'un paiement)."),
            ("Précision (sous-motif)", "Affine le sujet ; il détermine le délai de traitement."),
            ("Description", "Dates, montants et références (n° de dossier, de courrier) pour un traitement plus rapide.")],
           marks=[(1, 432, 544), (2, 845, 544), (3, 635, 688)],
           tip="Pièces jointes facultatives : PDF, Word, Excel, JPG, PNG, TXT — 5 Mo maximum par fichier.",
           note="Présenter les trois champs obligatoires. Insister sur la qualité de la description : c'est ce qui permet à l'agent de qualifier correctement. "
                "Pour la démonstration, un assuré fictif (KOUASSI DEMO FORMATION) a été utilisé.")

shot_slide("Déclaration envoyée : le numéro de ticket", "MODULE 1 · ASSURÉ", "assure_05_confirmation",
           [("Numéro de suivi", "REC-2026-000009 : à noter précieusement et à communiquer à l'assuré.")],
           marks=[(1, 637, 427)], tip="Le dossier est transmis aux services compétents ; l'assuré reçoit son numéro par SMS.",
           note="Ce numéro est celui que nous suivrons pendant tout le cas pratique : REC-2026-000009.")

shot_slide("Suivre sa réclamation (état initial)", "MODULE 1 · ASSURÉ", "assure_06_suivi",
           [("Statut actuel", "« Réceptionnée » juste après la déclaration."),
            ("Les 4 étapes", "Réception → Traitement → Clôture → Terminée."),
            ("Informations du dossier", "Objet, agence de traitement, date de dépôt, dernière mise à jour."),
            ("Accusé / Partager", "Télécharger l'accusé de réception ou partager le suivi.")],
           marks=[(1, 890, 700), (2, 640, 830), (3, 460, 1065), (4, 366, 1323)], crop=(230, 600, 1050, 1410),
           tip="Le dossier est rattaché à l'Agence Digitale tant qu'il n'a pas été qualifié.",
           note="Montrer la page /suivi avec le numéro saisi. L'agence de traitement affichée est l'Agence Digitale : c'est elle qui qualifie les dossiers du portail.")

# ===== MODULE 2 : AGENT =====
divider("2", "Agent accueil et relations client", "Saisir les réclamations et qualifier celles du portail", "MODULE 2  ·  PROFIL AGENT  (compte de test : BEDEL ZAKRO — Agence Digitale)",
        "Deux missions : saisir les réclamations reçues au guichet ou par téléphone, et qualifier les réclamations arrivées du portail public.")

shot_slide("Le tableau de bord de l'agent", "MODULE 2 · AGENT", "agent_01_dashboard",
           [("Bandeau d'accueil", "Résumé de vos réclamations à traiter."),
            ("Compteurs", "À traiter, échéance du jour, en retard."),
            ("Nouvelle réclamation", "Saisie d'une réclamation reçue au guichet."),
            ("Corbeilles de traitement", "Vues par statut : Non affectées, En cours, Hors délai, Non qualifiées…"),
            ("Liste des dossiers", "Bouton « Traiter » pour ouvrir un dossier.")],
           marks=[(1, 480, 144), (2, 960, 136), (3, 1160, 242), (4, 110, 380), (5, 1203, 547)],
           tip="La cloche en haut à droite signale les nouveaux événements.",
           note="Parcourir le tableau de bord de haut en bas. Les chiffres du bandeau supérieur (nouveau, en cours, à clôturer, hors délai) sont visibles depuis toutes les pages.")

shot_slide("Saisir une réclamation reçue au guichet", "MODULE 2 · AGENT", "agent_09_nouvelle_reclamation",
           [("Menu « Nouvelle réclamation »", "Formulaire complet pour un assuré qui se présente ou appelle."),
            ("Références du client", "Régime, type, numéro d'immatriculation, nom, téléphone."),
            ("Motif et description", "Choisir le motif et le sous-motif, puis décrire la demande."),
            ("Enregistrement", "Un numéro de ticket est généré : à communiquer à l'assuré.")],
           numbered=False, tip="Vérifier l'identité et le numéro CNPS avec l'assuré avant d'enregistrer.",
           note="La saisie au guichet suit la même logique que le portail, avec en plus le choix du mode de saisine. "
                "Cette étape n'a pas été validée dans le cas fil rouge (le dossier REC-2026-000009 vient du portail).")

shot_slide("Les réclamations non qualifiées", "MODULE 2 · AGENT", "agent_02_non_qualifiees",
           [("Corbeille « Non qualifiées »", "Dossiers venus du portail en attente de qualification par l'Agence Digitale."),
            ("Description de la corbeille", "Rappelle la règle : qualification par l'Agence Digitale."),
            ("Dossier REC-2026-000009", "Statut « Nouveau », processus NQ (non qualifié)."),
            ("Traiter", "Ouvre la fiche du dossier.")],
           marks=[(1, 88, 531), (2, 432, 320), (3, 360, 565), (4, 1211, 565)],
           tip="Tant que le processus est « NQ », le dossier ne peut pas être pris en charge par un pilote.",
           note="C'est le cœur du rôle de l'agent d'Agence Digitale : transformer un dossier brut du portail en dossier exploitable.")

shot_slide("La fiche du dossier", "MODULE 2 · AGENT", "agent_04_fiche_vue",
           [("Statut", "« Nouveau » : personne n'a encore agi."),
            ("4 onglets", "Vue d'ensemble, Traitement, Documents, Historique."),
            ("Client", "Identité, n° CNPS, régime, coordonnées. « Corriger » permet de rectifier (modification tracée)."),
            ("Dossier et délais", "Agence, processus (NQ), motif, sous-motif, échéance."),
            ("Contexte", "Réclamant, échéance, pièces jointes, dernières actions.")],
           marks=[(1, 1218, 94), (2, 568, 232), (3, 384, 304), (4, 704, 304), (5, 1040, 240)],
           tip="Toute modification d'une information est horodatée et attribuée dans l'historique.",
           note="Faire repérer les quatre onglets. Le panneau « Contexte » à droite reste visible pendant tout le traitement.")

shot_slide("Qualifier : le formulaire", "MODULE 2 · AGENT", "agent_05_qualif_vide",
           [("Bloc de qualification", "« Réservé aux agents de l'Agence Digitale » — action requise."),
            ("Processus concerné", "À choisir : détermine le service qui traitera (ex. GDPF, GDAV, GREC…)."),
            ("Objet principal", "Pré-rempli avec le choix de l'assuré, modifiable."),
            ("Précision (sous-motif)", "Détermine le délai de traitement."),
            ("Commentaire interne", "Consignes pour le pilote ; n'est pas visible de l'assuré."),
            ("Valider la qualification", "Enregistre et oriente le dossier.")],
           marks=[(1, 467, 307), (2, 400, 418), (3, 616, 418), (4, 827, 418), (5, 616, 528), (6, 810, 648)],
           tip="Choisir le processus d'après le sujet réel de la demande, pas seulement d'après le titre.",
           note="Onglet Traitement du dossier non qualifié. Expliquer que le commentaire interne est destiné au pilote.")

shot_slide("Qualifier : le dossier REC-2026-000009", "MODULE 2 · AGENT", "agent_06_qualif_remplie",
           [("Processus", "Gérer les Dossiers de Prestations Familiales (GDPF) : le sujet porte sur des allocations familiales."),
            ("Commentaire interne", "Consignes pour le pilote : vérifier la liquidation, contacter l'assuré si pièce manquante."),
            ("Valider la qualification", "Message « La réclamation a été qualifiée avec succès ».")],
           marks=[(1, 400, 428), (2, 616, 528), (3, 810, 648)],
           tip="Après validation, le dossier quitte la corbeille « Non qualifiées ».",
           note="Dans notre cas : sujet = non réception d'allocations familiales, donc processus GDPF.")

shot_slide("Après la qualification : historique", "MODULE 2 · AGENT", "agent_08_historique",
           [("Historique", "La qualification est tracée : qui, quand, quel processus, motif et précision."),
            ("Statut du dossier", "Toujours « Nouveau » : un pilote doit maintenant le prendre en charge.")],
           numbered=False, tip="Fin du rôle de l'agent pour ce dossier : le pilote prend le relais.",
           note="Montrer l'onglet Historique : première ligne du journal du dossier.")

# ===== MODULE 3 : PILOTE =====
divider("3", "Pilote", "Prendre en charge, analyser, agir et soumettre à validation", "MODULE 3  ·  PROFIL PILOTE  (compte de test : HERMANN BANZERE — Agence Digitale)",
        "Le pilote est responsable du traitement. Quatre gestes : prendre en charge, analyser, enregistrer des actions, soumettre.")

shot_slide("Le tableau de bord du pilote", "MODULE 3 · PILOTE", "pilote_01_dashboard",
           [("Bandeau", "Vos réclamations à traiter, échéances du jour, retards."),
            ("Filtres rapides", "Toutes agences, Non qualifiées, Non affectées, À corriger, Résolus, Suivi escalades."),
            ("Actions rapides", "« Traiter » ouvre le dossier ; « Assigner » depuis la liste."),
            ("Escaladées", "Corbeille propre aux profils non-agent.")],
           marks=[(1, 480, 144), (2, 432, 438), (3, 1195, 566), (4, 72, 531)],
           tip="« À corriger » rassemble les dossiers que le manager vous a retournés.",
           note="Comparer avec le tableau de bord de l'agent : mêmes corbeilles, mais le pilote voit en plus « Escaladées » et « À corriger ».")

shot_slide("Ouvrir un dossier à traiter", "MODULE 3 · PILOTE", "pilote_02_fiche_avant",
           [("Messages de contrôle", "Deux conditions avant soumission : analyse complétée et au moins une action réalisée."),
            ("Prendre en charge", "Vous devenez le responsable du dossier."),
            ("Escalader le dossier", "Si la demande relève d'une autre structure."),
            ("Statut « Nouveau »", "Aucun pilote n'est encore assigné."),
            ("Pilote assigné", "Vide tant que le dossier n'est pas pris en charge.")],
           marks=[(1, 768, 170), (2, 384, 275), (3, 552, 275), (4, 1216, 94), (5, 680, 584)],
           tip="Le processus est maintenant GDPF : le dossier a bien été qualifié par l'agent.",
           note="Le dossier est désormais en processus GPRES/GDPF. Les deux bandeaux d'avertissement rappellent ce qui sera exigé avant de soumettre.")

shot_slide("Prendre en charge", "MODULE 3 · PILOTE", "pilote_03_prise_en_charge",
           [("Statut « En cours »", "Dès la prise en charge."),
            ("Avertissements", "Toujours présents : le traitement reste à faire."),
            ("Dernières actions", "« Prise en charge du dossier » est enregistrée."),
            ("Pilote assigné", "Votre nom apparaît.")],
           marks=[(1, 1216, 94), (2, 768, 170), (3, 1104, 656), (4, 704, 765)],
           tip="Le bouton « Prendre en charge » disparaît : vous êtes désormais responsable du dossier.",
           note="Un seul clic ; le dossier passe de « Nouveau » à « En cours » et l'événement est tracé.")

shot_slide("Traitement : analyse et actions", "MODULE 3 · PILOTE", "pilote_04_traitement_vide",
           [("Onglet Traitement", "Deux zones : l'analyse du problème et la liste des corrections."),
            ("Analyse", "Catégorie de cause, cause, commentaire. « Suggestions » propose des pistes."),
            ("Liste des corrections", "Actions à mener ; vide au départ."),
            ("Ajouter une action", "Enregistre une action de traitement.")],
           marks=[(1, 515, 362), (2, 416, 443), (3, 800, 435), (4, 864, 448)],
           tip="Soumission impossible tant que l'analyse n'est pas enregistrée et qu'aucune action n'est réalisée.",
           note="Expliquer la logique : comprendre la cause (analyse) puis agir (actions).")

shot_slide("Renseigner l'analyse", "MODULE 3 · PILOTE", "pilote_05_analyse_remplie",
           [("Catégorie", "Cause CNPS ou Cause client."),
            ("Cause", "La liste dépend de la catégorie et du processus (ex. « Emission non payée »)."),
            ("Commentaire", "Décrire précisément la cause constatée."),
            ("Enregistrer", "Message « L'analyse a été mise à jour ».")],
           marks=[(1, 442, 530), (2, 442, 598), (3, 442, 675), (4, 541, 443)],
           tip="Une bonne analyse facilite la validation par le manager.",
           note="La liste des causes se charge après le choix de la catégorie : patienter une seconde.")

_n6,_a,_b=mock_modal("pilote_06_action_modal","Ajouter une action",[("LIBELLÉ DE L'ACTION *","Demande de paiement de l'émission…",0),("STRUCTURE SOLLICITÉE","Prestations familiales",0),("OBSERVATIONS","Notes complémentaires",0)],"Ajouter l'action")
shot_slide("Ajouter une action de traitement", "MODULE 3 · PILOTE", _n6,
           [("Libellé de l'action", "Obligatoire. Ex. : « Demande de paiement de l'émission… »."),
            ("Structure sollicitée", "Service à qui l'action est demandée (facultatif)."),
            ("Observations", "Notes complémentaires."),
            ("Ajouter l'action", "L'action est créée au statut « en attente ».")],
           marks=[(1, 440, 241), (2, 440, 336), (3, 440, 431), (4, 650, 520)],
           tip="Une action = une chose précise à faire, vérifiable.",
           note="Détailler un exemple d'action pour le cas fil rouge.")

shot_slide("L'action est enregistrée", "MODULE 3 · PILOTE", "pilote_07_action_ajoutee",
           [("Liste des corrections", "1 action, statut « en attente »."),
            ("Statut de l'action", "« en_attente » tant qu'elle n'est pas réalisée."),
            ("Avertissement", "« Au moins une action doit être enregistrée et réalisée » : il reste à la marquer réalisée.")],
           marks=[(1, 704, 384), (2, 877, 602), (3, 768, 170)],
           tip="Si le tableau semble tronqué, repliez le panneau « Contexte » (icône à droite des onglets).",
           note="Astuce d'usage vue pendant la préparation : les icônes d'action (modifier, supprimer, réalisé) sont à droite du tableau ; "
                "replier le panneau Contexte libère de la place.")

_n8,_a,_b=mock_modal("pilote_08_action_realisee_modal","Marquer comme réalisé",[("ACTION","Demande de paiement de l'émission…",0),("COMMENTAIRE DE RÉALISATION","Paiement effectué, assuré informé",0)],"Confirmer la réalisation",(5,150,105))
shot_slide("Marquer l'action comme réalisée", "MODULE 3 · PILOTE", _n8,
           [("Fenêtre de réalisation", "Rappelle l'action concernée."),
            ("Commentaire de réalisation", "Résultat obtenu (facultatif mais recommandé)."),
            ("Confirmer la réalisation", "L'action passe à « terminé ».")],
           marks=[(1, 440, 241), (2, 440, 336), (3, 650, 425)],
           tip="Seules les actions « terminées » permettent de soumettre le dossier.",
           note="(Fenêtre reconstituée à partir des libellés réels de l'application.) Cliquer sur la coche verte de la ligne de l'action.")

shot_slide("Soumettre à validation", "MODULE 3 · PILOTE", "pilote_09_pret_soumettre",
           [("Soumettre à validation", "Le bouton apparaît quand les conditions sont réunies."),
            ("Action terminée", "Le commentaire de réalisation est conservé.")],
           marks=[(1, 395, 168), (2, 1000, 531)],
           tip="Après soumission, le dossier passe « À clôturer » et attend le manager.",
           note="Les avertissements ont disparu : analyse enregistrée et action réalisée. Un clic suffit pour soumettre.")

shot_slide("Soumission confirmée et historique", "MODULE 3 · PILOTE", "pilote_11_historique",
           [("Statut « À clôturer »", "Le dossier attend la décision du manager."),
            ("Journal du dossier", "Qualification, prise en charge, action ajoutée, soumission à validation : tout est tracé.")],
           marks=[(1, 1226, 94), (2, 712, 496)],
           tip="Le journal permet à chacun de reconstituer l'historique complet du dossier.",
           note="Message affiché à la soumission : « Dossier soumis à la validation ».")

s = base("Cas particulier : l'escalade", "MODULE 3 · PILOTE")
card(s, 0.45, 1.3, 6.1, 5.4, "Quand escalader ?",
     ["•  Le dossier relève d'une autre structure ou d'une autre agence",
      "•  Une décision ou une information extérieure est nécessaire pour avancer",
      "",
      "Comment ?",
      "•  Bouton « Escalader le dossier » en haut de la fiche",
      "•  Le dossier est suivi ensuite dans la corbeille « Escaladées » et le compteur « Suivi escalades »"], bs=15, color=ORANGE)
card(s, 6.85, 1.3, 6.0, 5.4, "Bonnes pratiques du pilote",
     ["•  Prendre en charge rapidement : le délai (SLA) court dès la déclaration",
      "•  Une analyse claire avant les actions",
      "•  Une action = un résultat vérifiable",
      "•  Renseigner le commentaire de réalisation",
      "•  Consulter « À corriger » chaque jour : ce sont les dossiers retournés par le manager"], bs=15, color=BLUE)
notes(s, "L'escalade n'a pas été déclenchée dans le cas fil rouge : présenter le principe oralement. Insister sur le suivi des dossiers escaladés.")

# ===== MODULE 4 : MANAGER =====
divider("4", "Manager de service / section accueil réclamations", "Examiner le traitement, clôturer ou retourner", "MODULE 4  ·  PROFIL MANAGER  (compte de test : CLARISSE KOUADIO — Agence Digitale)",
        "Le manager est le garant de la qualité : il valide ou renvoie les dossiers soumis par les pilotes.")

shot_slide("Le tableau de bord du manager", "MODULE 4 · MANAGER", "manager_02_dashboard_a_valider",
           [("Bandeau", "« 1 dossier attend votre validation »."),
            ("Compteur « à valider »", "Nombre de dossiers soumis par les pilotes."),
            ("Dossier à clôturer", "Statut « À clôturer » mis en évidence."),
            ("Clôturer", "Raccourci pour valider depuis la liste.")],
           marks=[(1, 480, 144), (2, 979, 136), (3, 1056, 566), (4, 1187, 582)],
           tip="Le raccourci « Clôturer » ne remplace pas l'examen du dossier.",
           note="La corbeille « À clôturer » est la priorité quotidienne du manager.")

shot_slide("Examiner le dossier soumis", "MODULE 4 · MANAGER", "manager_03_fiche_validation",
           [("Bandeau de validation", "« Dossier en attente de validation. Veuillez examiner l'analyse et les actions réalisées. »"),
            ("Clôturer", "Valide le traitement : le dossier passe « Résolu »."),
            ("Retourner", "Renvoie le dossier au pilote pour complément."),
            ("Onglets", "Contrôler Vue d'ensemble, Traitement et Historique avant de décider.")],
           marks=[(1, 760, 170), (2, 331, 221), (3, 475, 221), (4, 568, 307)],
           tip="Vérifier : analyse cohérente, action réalisée, réponse adaptée à la demande.",
           note="Le manager n'agit que sur les dossiers de son agence.")

shot_slide("Contrôler l'analyse et les actions", "MODULE 4 · MANAGER", "manager_04_traitement",
           [("Analyse du pilote", "Catégorie, cause et commentaire."),
            ("Liste des corrections", "Action terminée avec son commentaire de réalisation."),
            ("Observations du Manager", "Zone d'observations du manager.")],
           numbered=False, tip="En cas de doute, ouvrez l'Historique avant de clôturer.",
           note="Le manager retrouve exactement ce que le pilote a saisi.")

_n5,_a,_b=mock_modal("manager_05_cloture_modal","Clôturer le dossier",[("COMMENTAIRE / JUSTIFICATION *","Traitement conforme, dossier clôturé",0)],"Valider et Clôturer",(5,150,105))
shot_slide("Clôturer le dossier", "MODULE 4 · MANAGER", _n5,
           [("Commentaire / justification", "Obligatoire : motive la décision."),
            ("Valider et Clôturer", "Le dossier passe « Résolu » ; la réponse est disponible pour l'assuré.")],
           marks=[(1, 440, 241), (2, 650, 330)],
           tip="Le commentaire de clôture est conservé dans l'historique.",
           note="Rédiger un commentaire utile : il sera relu en cas de contrôle.")

s = base("Retourner un dossier au pilote", "MODULE 4 · MANAGER")
card(s, 0.45, 1.3, 6.1, 5.4, "Quand retourner ?",
     ["•  Analyse insuffisante ou incohérente",
      "•  Action non réalisée ou non conforme",
      "•  Réponse qui ne répond pas à la demande",
      "",
      "Comment ?",
      "•  Bouton rouge « Retourner » sur la fiche",
      "•  Indiquer le motif du retour (obligatoire)",
      "•  Le dossier repasse « En cours » chez le pilote"], bs=15, color=RED)
card(s, 6.85, 1.3, 6.0, 5.4, "Côté pilote",
     ["•  Le dossier apparaît dans « À corriger »",
      "•  Le pilote lit le motif du retour dans l'historique",
      "•  Il complète l'analyse ou les actions",
      "•  Il soumet de nouveau à validation",
      "",
      "Ce cas n'a pas été joué dans le dossier fil rouge : à faire en exercice (module 5)."], bs=15, color=BLUE)
notes(s, "Le retour n'est pas dans le déroulé du dossier REC-2026-000009 (clôturé du premier coup). Proposer en exercice de créer un second dossier et de le retourner.")

shot_slide("Dossier résolu", "MODULE 4 · MANAGER", "manager_06_resolu",
           [("Statut « Résolu »", "Fin du traitement."),
            ("Documents", "« Accusé » et « Réponse » (lettre) sont désormais disponibles."),
            ("Dernières actions", "Clôture avec le commentaire du manager.")],
           marks=[(1, 1221, 94), (2, 1144, 158), (3, 1056, 520)],
           tip="La lettre de réponse peut être remise ou transmise à l'assuré.",
           note="Le dossier est clôturé ; l'assuré voit « Traitée / Résolue » sur le portail.")

shot_slide("Historique complet du dossier", "MODULE 4 · MANAGER", "manager_07_historique",
           [("Cinq événements", "Qualification (agent), prise en charge, action ajoutée, soumission (pilote), validation (manager)."),
            ("Traçabilité", "Qui, quoi, quand : chaque étape est attribuée à son auteur.")],
           numbered=False, tip="L'historique est la mémoire du dossier : consultez-le avant toute décision.",
           note="Cette frise résume le travail des trois profils sur un même dossier.")

# ===== MODULE 5 : CAS PRATIQUE =====
divider("5", "Cas pratique complet", "Un dossier suivi de bout en bout : REC-2026-000009", "MODULE 5  ·  WORKFLOW INTÉGRAL",
        "Récapitulatif du cas puis exercices en binôme ou trinôme (un assuré, un agent, un pilote, un manager).")

s = base("Le dossier REC-2026-000009 : le parcours complet", "MODULE 5 · CAS PRATIQUE")
rows = [("1", "Assuré", "Déclare sur le portail : allocations familiales non reçues", "Statut « Nouveau » — processus NQ", GREEN),
        ("2", "Agent", "Qualifie : processus GDPF, motif et précision confirmés", "Toujours « Nouveau », qualifié", ORANGE),
        ("3", "Pilote", "Prend en charge le dossier", "« En cours »", BLUE),
        ("4", "Pilote", "Analyse (Cause CNPS — Emission non payée), ajoute et réalise une action", "Action « terminée »", BLUE),
        ("5", "Pilote", "Soumet à validation", "« À clôturer »", BLUE),
        ("6", "Manager", "Examine et clôture avec commentaire", "« Résolu »", NAVY),
        ("7", "Assuré", "Consulte le suivi : « Traitée / Résolue », lettre de réponse disponible", "Terminée", GREEN)]
for i, (n, who, what, st, c) in enumerate(rows):
    y = 1.25 + i * 0.8
    rect(s, 0.45, y, 12.4, 0.72, WHITE if i % 2 else LIGHT, RGBColor(0xC8, 0xD0, 0xDC))
    o = rect(s, 0.6, y + 0.12, 0.46, 0.46, c, shape=MSO_SHAPE.OVAL)
    tf = o.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER; r_ = p.add_run(); r_.text = n; r_.font.size = Pt(16); r_.font.bold = True; r_.font.color.rgb = WHITE; r_.font.name = FONT
    text(s, 1.2, y, 1.6, 0.72, who, size=16, bold=True, color=c, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 2.85, y, 6.6, 0.72, what, size=14, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 9.6, y, 3.2, 0.72, st, size=13, bold=True, color=GRAY, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "Reprendre chaque ligne en pointant la capture correspondante dans les modules précédents. Durée du parcours réel : environ vingt minutes entre la déclaration et la clôture.")

shot_slide("Retour côté assuré : dossier traité", "MODULE 5 · CAS PRATIQUE", "assure_07_suivi_final",
           [("Statut actuel", "« Traitée / Résolue »."),
            ("4 étapes complétées", "Réception, Traitement, Clôture, Terminée."),
            ("Réclamation traitée", "Message : une solution a été apportée."),
            ("Documents", "Accusé et Lettre de réponse à télécharger.")],
           marks=[(1, 890, 700), (2, 640, 830), (3, 640, 1335), (4, 548, 1467)], crop=(230, 600, 1050, 1540),
           tip="Boucle bouclée : l'assuré constate lui-même la résolution avec son numéro de ticket.",
           note="Comparer avec la capture initiale (« Réceptionnée ») : mêmes informations, statut différent.")

s = base("Exercices de mise en pratique", "MODULE 5 · CAS PRATIQUE")
ex = [("A", "Assuré", "Déclarer une réclamation fictive (sujet au choix), noter le numéro, vérifier le suivi.", GREEN),
      ("B", "Agent", "Retrouver le dossier dans « Non qualifiées » et le qualifier avec le bon processus.", ORANGE),
      ("C", "Pilote", "Prendre en charge, renseigner l'analyse, ajouter et réaliser une action, soumettre.", BLUE),
      ("D", "Manager", "Examiner puis clôturer — ou retourner avec un motif précis.", NAVY),
      ("E", "Tous", "Rejouer un dossier avec retour : le manager retourne, le pilote corrige et resoumet.", RED)]
for i, (l, who, d, c) in enumerate(ex):
    y = 1.3 + i * 1.1
    rect(s, 0.45, y, 12.4, 0.95, WHITE, RGBColor(0xC8, 0xD0, 0xDC), MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.12
    o = rect(s, 0.65, y + 0.17, 0.62, 0.62, c, shape=MSO_SHAPE.OVAL)
    tf = o.text_frame; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER; r_ = p.add_run(); r_.text = l; r_.font.size = Pt(22); r_.font.bold = True; r_.font.color.rgb = WHITE; r_.font.name = FONT
    text(s, 1.5, y, 2.0, 0.95, who, size=20, bold=True, color=c, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 3.5, y, 9.2, 0.95, d, size=16, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "Former des groupes de quatre. Chaque groupe enchaîne A, B, C, D puis E. Utiliser exclusivement la plateforme de test et des données fictives.")

s = base("Questions de contrôle", "MODULE 5 · CAS PRATIQUE")
qs = ["Que doit conserver l'assuré après avoir déclaré une réclamation ?",
      "Pourquoi un dossier du portail est-il « Non qualifié » ? Qui le qualifie ?",
      "Quelles sont les deux conditions pour qu'un pilote puisse soumettre un dossier ?",
      "Quelle différence entre « Clôturer » et « Retourner » ?",
      "Où l'assuré voit-il que son dossier est résolu ?",
      "Où retrouver qui a fait quoi et quand sur un dossier ?"]
for i, q in enumerate(qs):
    y = 1.3 + i * 0.9
    rect(s, 0.45, y, 0.7, 0.7, ORANGE, shape=MSO_SHAPE.OVAL)
    text(s, 0.45, y, 0.7, 0.7, str(i + 1), size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 1.4, y, 11.4, 0.7, q, size=18, anchor=MSO_ANCHOR.MIDDLE)
notes(s, "Réponses : 1) le numéro de ticket ; 2) il vient du portail avec le processus de repli NQ, l'agent de l'Agence Digitale le qualifie ; "
         "3) analyse enregistrée et au moins une action réalisée ; 4) clôturer valide (Résolu), retourner renvoie au pilote (En cours) ; "
         "5) sur le portail de suivi (/suivi) avec le numéro ; 6) onglet Historique.")

# ===== ASSISTANCE =====
s = base("Besoin d'aide ? Le catalogue GLPI", "ASSISTANCE")
text(s, 0.45, 1.2, 12.4, 0.8, "Tout problème d'utilisation se signale par un ticket GLPI : famille « BESOIN APPLICATIF », sous-famille « GREL », sous-famille 2 « E-RECLAMATION ».",
     size=16)
card(s, 0.45, 2.1, 4.0, 4.6, "Coordonnateur qualité",
     ["Questions fonctionnelles :", "•  Impossible de qualifier, soumettre ou valider", "•  Dossier invisible", "•  Délai SLA incorrect", "•  Paramétrage (motifs, délais, causes)", "•  Assistance ou formation"], color=BLUE, bs=13)
card(s, 4.65, 2.1, 4.0, 4.6, "Technicien support SI",
     ["Questions techniques :", "•  Création de compte, mot de passe", "•  Connexion impossible ou déconnexion immédiate", "•  Pièce jointe, PDF, export", "•  Notification non reçue", "•  Application lente ou indisponible"], color=ORANGE, bs=13)
card(s, 8.85, 2.1, 4.0, 4.6, "Niveaux d'urgence",
     [[("BLOQUANT ", {"bold": True, "color": RED}), ("— vous ne pouvez plus travailler", {})],
      [("MAJORITAIRE ", {"bold": True, "color": ORANGE}), ("— gêne importante", {})],
      [("MINEUR ", {"bold": True, "color": GREEN}), ("— demande non urgente", {})],
      "",
      "Indiquez toujours : le n° de ticket concerné, ce que vous faisiez et le message affiché (capture d'écran)."], color=NAVY, bs=13)
notes(s, "Présenter le catalogue GLPI préparé pour e-Réclamations (31 catégories, deux groupes responsables, trois niveaux d'urgence). "
         "Rappeler l'intérêt de joindre une capture d'écran.")

s = base("Points clés à retenir")
keys = [("Le numéro de ticket", "est la clé du dossier, pour l'assuré comme pour le personnel.", GREEN),
        ("Agent", "saisit au guichet et qualifie les dossiers du portail (processus NQ → processus réel).", ORANGE),
        ("Pilote", "prend en charge, analyse, agit, puis soumet : l'analyse et une action réalisée sont obligatoires.", BLUE),
        ("Manager", "examine puis clôture ou retourne avec un motif.", NAVY),
        ("L'historique", "trace chaque étape : qui, quoi, quand.", GRAY),
        ("En cas de souci", "ticket GLPI GREL / E-RECLAMATION avec capture d'écran.", RED)]
for i, (h, d, c) in enumerate(keys):
    x = 0.45 + (i % 3) * 4.2; y = 1.4 + (i // 3) * 2.8
    rect(s, x, y, 4.0, 2.5, WHITE, RGBColor(0xC8, 0xD0, 0xDC), MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.06
    rect(s, x, y, 0.14, 2.5, c)
    text(s, x + 0.3, y + 0.2, 3.6, 0.6, h, size=20, bold=True, color=c)
    text(s, x + 0.3, y + 0.9, 3.6, 1.5, d, size=15)
notes(s, "Conclure en reprenant le fil rouge. Inviter les participants à poser leurs questions et à refaire les exercices sur la plateforme de test.")

counter["n"] += 1
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, 13.333, 7.5, NAVY); rect(s, 0, 4.4, 13.333, 0.07, ORANGE)
text(s, 0.8, 2.0, 11.7, 1.4, "Merci !", size=66, bold=True, color=WHITE)
text(s, 0.8, 3.4, 11.7, 0.9, "Questions et échanges", size=26, color=RGBColor(0xC8, 0xD6, 0xEA))
text(s, 0.8, 4.8, 11.7, 1.2, ["Plateforme de test : e-reclamation-test.cnps.ci", "Assistance : GLPI — GREL / E-RECLAMATION"], size=18, color=WHITE)
notes(s, "Fin de la session.")

prs.save(OUT)
print("OK:", OUT, "-", len(prs.slides), "diapositives")
