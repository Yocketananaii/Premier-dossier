const PDFDocument = require("pdfkit");
const { getI18n } = require("./i18n");

const COLORS = {
  title: "#1a1a2e",
  heading: "#16213e",
  text: "#222222",
  muted: "#666666",
  vrai: "#1a7f37",
  faux: "#cf222e",
  partiel: "#9a6700",
  neutre: "#57606a",
};

function verdictColor(verdict) {
  const v = (verdict || "").toLowerCase();
  if (v === "true") return COLORS.vrai;
  if (v === "false") return COLORS.faux;
  if (v === "partially_true") return COLORS.partiel;
  return COLORS.neutre;
}

function formatDuration(seconds, labels) {
  if (!seconds || Number.isNaN(seconds)) return labels.unknownDuration;
  const totalSec = Math.round(seconds / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function addSectionTitle(doc, text) {
  doc.moveDown(1);
  doc.fontSize(15).fillColor(COLORS.heading).font("Helvetica-Bold").text(text);
  doc.moveDown(0.3);
  doc
    .strokeColor("#dddddd")
    .lineWidth(1)
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(11);
}

function generatePdf({ meta, analysis, truncated, lang }, stream) {
  const { locale, labels } = getI18n(lang);
  const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
  doc.pipe(stream);

  // En-tête
  doc.fontSize(20).fillColor(COLORS.title).font("Helvetica-Bold").text(labels.dossierTitle);
  doc.moveDown(0.2);
  doc
    .fontSize(13)
    .fillColor(COLORS.heading)
    .font("Helvetica-Bold")
    .text(analysis.titreSynthetique || meta.title);

  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted);
  doc.text(`${labels.sourceVideo} : ${meta.title}`);
  doc.text(`${labels.channel} : ${meta.author}`);
  doc.text(`${labels.duration} : ${formatDuration(meta.durationSeconds, labels)}`);
  doc.text(`${labels.urlLabel} : ${meta.url}`);
  doc.text(`${labels.generatedOn} : ${new Date().toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`);
  if (truncated) {
    doc.fillColor(COLORS.partiel).text(labels.truncatedNote);
  }

  // Résumé
  addSectionTitle(doc, labels.summary);
  doc.text(analysis.resume || labels.noSummary, { align: "justify" });

  // Points clés
  addSectionTitle(doc, labels.keyPoints);
  (analysis.pointsCles || []).forEach((point) => {
    doc.text(`•  ${point}`, { align: "justify" });
    doc.moveDown(0.15);
  });

  // Plan thématique
  if (Array.isArray(analysis.plan) && analysis.plan.length > 0) {
    addSectionTitle(doc, labels.reorganized);
    analysis.plan.forEach((section) => {
      doc.font("Helvetica-Bold").fontSize(11.5).fillColor(COLORS.heading).text(section.titre);
      doc.font("Helvetica").fontSize(11).fillColor(COLORS.text);
      doc.text(section.contenu, { align: "justify" });
      doc.moveDown(0.4);
    });
  }

  // Vérification des faits
  if (Array.isArray(analysis.affirmations) && analysis.affirmations.length > 0) {
    addSectionTitle(doc, labels.factCheck);
    analysis.affirmations.forEach((item, idx) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text).text(`${idx + 1}. ${item.citation}`, {
        align: "justify",
      });
      const verdictText = labels.verdicts[item.verdict] || item.verdict || "?";
      const confidenceText = item.confiance ? labels.confidences[item.confiance] || item.confiance : null;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(verdictColor(item.verdict))
        .text(`${labels.verdictLabel} : ${verdictText}${confidenceText ? `  (${labels.confidenceLabel} : ${confidenceText})` : ""}`);
      doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(item.commentaire || "", {
        align: "justify",
      });
      if (Array.isArray(item.sources) && item.sources.length > 0) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(`${labels.sourcesLabel} : ${item.sources.join("  •  ")}`, { align: "justify" });
      }
      doc.moveDown(0.5);
    });
  }

  // Fiabilité globale
  addSectionTitle(doc, labels.reliability);
  doc.text(analysis.commentaireFiabilite || labels.noSummary, { align: "justify" });

  // Limites
  addSectionTitle(doc, labels.limits);
  doc
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(analysis.limitesAnalyse || labels.defaultLimits, { align: "justify" });

  // Pagination
  const range = doc.bufferedPageRange();
  const bottomMargin = doc.page.margins.bottom;
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // évite qu'écrire près du bas ne déclenche une nouvelle page
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`${i + 1} / ${range.count}`, doc.page.margins.left, doc.page.height - 30, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
}

module.exports = { generatePdf };
