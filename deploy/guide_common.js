const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, LevelFormat, VerticalAlign,
  PageBreak, Header, Footer, PageNumber, ImageRun
} = require("docx");
const fs = require("fs");
const path = require("path");

const NAVY = "1B2A4A";
const ORANGE = "F2861D";
const GRAY = "6B7280";
const LIGHT = "F3F4F6";

function sizeOfPng(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function makeHelpers({ ref, version, titreProfil, totalPages, shotsDir }) {
  function pageRefCell(text, opts = {}) {
    return new TableCell({
      width: { size: opts.w || 3000, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
      children: [new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        children: [new TextRun({ text, bold: !!opts.bold, size: opts.size || 16, color: opts.color })]
      })]
    });
  }

  function headerTable() {
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 4680, 2340],
      rows: [
        new TableRow({
          children: [
            pageRefCell("CNPS", { w: 2340, bold: true, align: AlignmentType.CENTER, size: 20 }),
            pageRefCell("MODE OPERATOIRE", { w: 4680, bold: true, align: AlignmentType.CENTER, size: 22 }),
            pageRefCell(`Réf : ${ref}\nVersion : ${version}\nPage : 1 / ${totalPages}`, { w: 2340, align: AlignmentType.CENTER, size: 16 }),
          ]
        }),
        new TableRow({
          children: [
            pageRefCell("", { w: 2340 }),
            pageRefCell(`MANUEL D'UTILISATION DE L'APPLICATION E-RECLAMATIONS (PROFIL : ${titreProfil})`, { w: 4680, bold: true, align: AlignmentType.CENTER, size: 18 }),
            pageRefCell(`Réf : ${ref}\nVersion : ${version}\nPage : 1 / ${totalPages}`, { w: 2340, align: AlignmentType.CENTER, size: 16 }),
          ]
        }),
      ]
    });
  }

  function suiviTable() {
    const head = ["Date de mise à jour", "Numéro de version", "Parties modifiées", "Nature de la mise à jour"];
    const headerRow = new TableRow({
      tableHeader: true,
      children: head.map(t => pageRefCell(t, { w: 2340, bold: true, align: AlignmentType.CENTER, shade: NAVY, color: "FFFFFF" }))
    });
    const dataRow = new TableRow({
      children: [
        pageRefCell("30/08/2026", { w: 2340, align: AlignmentType.CENTER }),
        pageRefCell(version, { w: 2340, align: AlignmentType.CENTER }),
        pageRefCell("-", { w: 2340, align: AlignmentType.CENTER }),
        pageRefCell("Création", { w: 2340, align: AlignmentType.CENTER }),
      ]
    });
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2340, 2340, 2340, 2340],
      rows: [headerRow, dataRow]
    });
  }

  function validationTable() {
    const roles = ["Pilote de processus Institutionnel", "Président du Comité de validation", "Approbateur"];
    const roleRow = new TableRow({
      tableHeader: true,
      children: roles.map(t => pageRefCell(t, { w: 3120, bold: true, align: AlignmentType.CENTER, shade: LIGHT }))
    });
    const subRow = new TableRow({
      children: roles.map(() => pageRefCell("Noms et Fonction   |   Date et signature", { w: 3120, align: AlignmentType.CENTER, size: 14 }))
    });
    const blankRow = new TableRow({
      children: roles.map(() => new TableCell({
        width: { size: 3120, type: WidthType.DXA },
        children: [new Paragraph({ text: "" }), new Paragraph({ text: "" })]
      }))
    });
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3120, 3120, 3120],
      rows: [roleRow, subRow, blankRow]
    });
  }

  function h1(text) {
    return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 }, children: [new TextRun({ text, color: NAVY, bold: true })] });
  }
  function h2(text) {
    return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, color: ORANGE, bold: true })] });
  }
  function p(text) {
    return new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text })] });
  }
  function bullet(text, level = 0) {
    return new Paragraph({ numbering: { reference: "bullet-list", level }, spacing: { after: 80 }, children: [new TextRun({ text })] });
  }

  let numberedListCounter = 0;
  let currentNumberedRef = null;
  const numberedListRefs = [];
  function startNumberedList() {
    numberedListCounter += 1;
    currentNumberedRef = `numbered-list-${numberedListCounter}`;
    numberedListRefs.push(currentNumberedRef);
  }
  function numbered(text, level = 0) {
    if (!currentNumberedRef) startNumberedList();
    return new Paragraph({ numbering: { reference: currentNumberedRef, level }, spacing: { after: 80 }, children: [new TextRun({ text })] });
  }

  function note(text) {
    return new Paragraph({
      spacing: { before: 100, after: 160 },
      border: { left: { style: BorderStyle.SINGLE, size: 24, color: ORANGE, space: 8 } },
      shading: { type: ShadingType.CLEAR, fill: "FFF4E8" },
      children: [new TextRun({ text: "  " + text, italics: true, color: "7A4A0E" })]
    });
  }

  let figureCounter = 0;
  function screenshot(filename, captionText, targetWidth = 560) {
    figureCounter += 1;
    const filePath = path.join(shotsDir, filename);
    const buf = fs.readFileSync(filePath);
    const { width, height } = sizeOfPng(filePath);
    const targetHeight = Math.round((height / width) * targetWidth);
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" }, right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" } },
        children: [new ImageRun({ data: buf, transformation: { width: targetWidth, height: targetHeight }, type: "png" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Figure ${figureCounter} — ${captionText}`, italics: true, size: 16, color: "6B7280" })]
      })
    ];
  }

  return {
    headerTable, suiviTable, validationTable, h1, h2, p, bullet, numbered, startNumberedList, note, screenshot,
    numberedListRefs, get: () => ({ numberedListRefs })
  };
}

function buildDocument({ ref, version, titreProfil, totalPages, children, numberedListRefs, outFile }) {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 960, hanging: 260 } } } },
          ]
        },
        ...numberedListRefs.map(r => ({
          reference: r,
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 300 } } } },
            { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 960, hanging: 260 } } } },
          ]
        }))
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `${ref} — v${version}`, size: 14, color: GRAY })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CNPS Côte d'Ivoire — Guide Utilisateur e-Réclamations — Page ", size: 14, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, color: GRAY }),
              new TextRun({ text: " / ", size: 14, color: GRAY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: GRAY }),
            ]
          })]
        })
      },
      children
    }]
  });

  return Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync(outFile, buf);
    console.log("OK:", outFile);
  });
}

module.exports = { makeHelpers, buildDocument, NAVY, ORANGE, GRAY, LIGHT };
