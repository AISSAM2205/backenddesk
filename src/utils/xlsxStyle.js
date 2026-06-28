// src/utils/xlsxStyle.js
// ─────────────────────────────────────────────────────────────────────────
// Thème Excel « salle des marchés » + styleur AUTOMATIQUE.
//
// S'appuie sur xlsx-js-style (fork de SheetJS qui sait écrire cell.s = styles).
// On RÉEXPORTE XLSX depuis ici : tous les exports importent { XLSX } de ce
// module → une seule source, et le style se règle en UN seul endroit (palette
// ci-dessous). API identique à "xlsx" (utils.aoa_to_sheet, writeFile, …) :
// le code d'export existant fonctionne tel quel, on ajoute juste les couleurs.
//
// Usage dans un export :
//   import { XLSX, styleWorkbook } from ".../utils/xlsxStyle";
//   ... construire le wb comme avant ...
//   styleWorkbook(wb);                 // ← UNE ligne, style toutes les feuilles
//   XLSX.writeFile(wb, "fichier.xlsx");
//
// styleWorkbook détecte seul, par feuille : la ligne d'entête (même s'il y a
// des lignes de titre au-dessus), les lignes « TOTAL », les colonnes P&L
// (couleur vert/rouge selon le signe) → aucun paramétrage par feuille.
// ─────────────────────────────────────────────────────────────────────────
import * as XLSXNS from "xlsx-js-style";

export const XLSX = XLSXNS;

// ── Palette (sobre, contrastée, imprimable). Modifier ICI recolore TOUT. ──
const C = {
  title:    "0B2A4A", // titre de feuille (texte navy AWB)
  header:   "12395E", // fond entête de colonnes
  headerTx: "FFFFFF", // texte entête
  band:     "EEF3F8", // fond ligne paire (zébrage)
  total:    "D9E2EC", // fond ligne de total
  totalTx:  "0B2A4A",
  border:   "B7C4D2",
  text:     "1F2A37",
  profit:   "157347", // P&L positif (vert)
  loss:     "C0202A", // P&L négatif (rouge)
};

const thin = (rgb = C.border) => ({ style: "thin", color: { rgb } });
const boxBorder = () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() });
const enc = (r, c) => XLSX.utils.encode_cell({ r, c });

// Colonnes « signées » → couleur P&L selon le signe (détection au libellé).
const SIGNED_RE =
  /(p&?l|pnl|carry|perf|\bnet\b|gap|variation|r[ée]sultat|gain|[ée]cart|delta|Δ|mtm)/i;

/** Repère la ligne d'entête : dernière ligne 100 % texte suivie de chiffres. */
function detectHeaderRow(ws, range) {
  const maxScan = Math.min(range.s.r + 8, range.e.r);
  for (let R = range.s.r; R <= maxScan; R++) {
    let strs = 0, nums = 0, nonEmpty = 0;
    for (let Col = range.s.c; Col <= range.e.c; Col++) {
      const cell = ws[enc(R, Col)];
      if (!cell || cell.v === "" || cell.v == null) continue;
      nonEmpty++;
      if (typeof cell.v === "number") nums++;
      else strs++;
    }
    if (nonEmpty >= 2 && nums === 0 && strs >= 2) {
      let nextNums = 0;
      for (let Col = range.s.c; Col <= range.e.c; Col++) {
        const cell = ws[enc(R + 1, Col)];
        if (cell && typeof cell.v === "number") nextNums++;
      }
      if (nextNums > 0) return R;
    }
  }
  return -1; // pas de table claire (feuille KPI/résumé) → style léger
}

/** Applique le thème à UNE feuille (in-place). */
export function styleWorksheet(ws) {
  if (!ws || !ws["!ref"]) return ws;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const headerRow = detectHeaderRow(ws, range);

  // Colonnes P&L (d'après les libellés de l'entête détecté)
  const signedCols = new Set();
  if (headerRow >= 0) {
    for (let Col = range.s.c; Col <= range.e.c; Col++) {
      const cell = ws[enc(headerRow, Col)];
      if (cell && typeof cell.v === "string" && SIGNED_RE.test(cell.v)) signedCols.add(Col);
    }
  }

  const rows = ws["!rows"] || [];

  for (let R = range.s.r; R <= range.e.r; R++) {
    const first = ws[enc(R, range.s.c)];
    const isTotal = !!(first && typeof first.v === "string" && /total/i.test(first.v));
    const isHeader = R === headerRow;
    const isTitle =
      headerRow > range.s.r ? R < headerRow : headerRow < 0 && R === range.s.r;

    for (let Col = range.s.c; Col <= range.e.c; Col++) {
      const cell = ws[enc(R, Col)];
      if (!cell) continue;
      const numeric = typeof cell.v === "number";
      const s = (cell.s = cell.s || {});
      s.border = boxBorder();
      s.alignment = {
        vertical: "center",
        horizontal: numeric ? "right" : Col === range.s.c ? "left" : "center",
      };
      s.font = { name: "Calibri", sz: 10, color: { rgb: C.text } };

      if (isTitle) {
        s.font = { name: "Calibri", sz: 12, bold: true, color: { rgb: C.title } };
        s.alignment = { vertical: "center", horizontal: "left" };
        s.border = undefined;
      } else if (isHeader) {
        s.fill = { patternType: "solid", fgColor: { rgb: C.header } };
        s.font = { name: "Calibri", sz: 10, bold: true, color: { rgb: C.headerTx } };
        s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
      } else if (isTotal) {
        s.fill = { patternType: "solid", fgColor: { rgb: C.total } };
        s.font = { name: "Calibri", sz: 10, bold: true, color: { rgb: C.totalTx } };
      } else if (headerRow >= 0 && (R - (headerRow + 1)) % 2 === 1) {
        s.fill = { patternType: "solid", fgColor: { rgb: C.band } };
      }

      // Couleur P&L (vert/rouge) sur colonnes signées, hors entête/titre.
      if (numeric && signedCols.has(Col) && !isHeader && !isTitle) {
        s.font = {
          ...s.font,
          bold: isTotal || s.font.bold,
          color: { rgb: cell.v < 0 ? C.loss : C.profit },
        };
      }
    }

    if (isTitle) rows[R] = { hpt: 22 };
    else if (isHeader) rows[R] = { hpt: 20 };
  }
  ws["!rows"] = rows;

  // Filtre automatique sur la table (entête → fin) — réflexe pro.
  if (headerRow >= 0) {
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRow, c: range.s.c },
        e: { r: range.e.r, c: range.e.c },
      }),
    };
  }

  // Largeurs auto si l'export ne les a pas déjà fixées.
  if (!ws["!cols"]) {
    const widths = [];
    for (let Col = range.s.c; Col <= range.e.c; Col++) {
      let w = 10;
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[enc(R, Col)];
        if (cell && cell.v != null) w = Math.max(w, String(cell.w ?? cell.v).length + 2);
      }
      widths.push({ wch: Math.min(w, 44) });
    }
    ws["!cols"] = widths;
  }
  return ws;
}

/** Applique le thème à TOUTES les feuilles d'un classeur (in-place). */
export function styleWorkbook(wb) {
  if (!wb || !Array.isArray(wb.SheetNames)) return wb;
  wb.SheetNames.forEach((name) => styleWorksheet(wb.Sheets[name]));
  return wb;
}
