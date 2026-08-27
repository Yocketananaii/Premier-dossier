const PDFDocument = require("pdfkit");

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
  if (v === "vrai") return COLORS.vrai;
  if (v === "faux") return COLORS.faux;
  if (v.includes("partiel")) return COLORS.partiel;
  return COLORS.neutre;
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "durée inconnue";
  const totalSec = Math.round(seconds / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}min`
    : `${m}min ${String(s).padStart(2, "0")}s`;
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

function generatePdf({ meta, analysis, truncated }, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
  doc.pipe(stream);

  // En-tête
  doc.fontSize(20).fillColor(COLORS.title).font("Helvetica-Bold").text("Dossier vidéo");
  doc.moveDown(0.2);
  doc
    .fontSize(13)
    .fillColor(COLORS.heading)
    .font("Helvetica-Bold")
    .text(analysis.titreSynthetique || meta.title);

  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted);
  doc.text(`Vidéo source : ${meta.title}`);
  doc.text(`Chaîne : ${meta.author}`);
  doc.text(`Durée : ${formatDuration(meta.durationSeconds)}`);
  doc.text(`URL : ${meta.url}`);
  doc.text(`Dossier généré le : ${new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`);
  if (truncated) {
    doc
      .fillColor(COLORS.partiel)
      .text("Note : la transcription était très longue et a été tronquée pour l'analyse.");
  }

  // Résumé
  addSectionTitle(doc, "Résumé");
  doc.text(analysis.resume || "Non disponible.", { align: "justify" });

  // Points clés
  addSectionTitle(doc, "Points clés à retenir");
  (analysis.pointsCles || []).forEach((point) => {
    doc.text(`•  ${point}`, { align: "justify" });
    doc.moveDown(0.15);
  });

  // Plan thématique
  if (Array.isArray(analysis.plan) && analysis.plan.length > 0) {
    addSectionTitle(doc, "Contenu réorganisé par thème");
    analysis.plan.forEach((section) => {
      doc.font("Helvetica-Bold").fontSize(11.5).fillColor(COLORS.heading).text(section.titre);
      doc.font("Helvetica").fontSize(11).fillColor(COLORS.text);
      doc.text(section.contenu, { align: "justify" });
      doc.moveDown(0.4);
    });
  }

  // Vérification des faits
  if (Array.isArray(analysis.affirmations) && analysis.affirmations.length > 0) {
    addSectionTitle(doc, "Vérification des faits (fact-checking)");
    analysis.affirmations.forEach((item, idx) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text).text(`${idx + 1}. ${item.citation}`, {
        align: "justify",
      });
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(verdictColor(item.verdict))
        .text(`Verdict : ${item.verdict}${item.confiance ? `  (confiance : ${item.confiance})` : ""}`);
      doc.font("Helvetica").fontSize(10.5).fillColor(COLORS.text).text(item.commentaire || "", {
        align: "justify",
      });
      doc.moveDown(0.5);
    });
  }

  // Fiabilité globale
  addSectionTitle(doc, "Commentaire sur la fiabilité et la véracité globale");
  doc.text(analysis.commentaireFiabilite || "Non disponible.", { align: "justify" });

  // Limites
  addSectionTitle(doc, "Limites de cette analyse");
  doc
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(
      analysis.limitesAnalyse ||
        "Cette analyse a été générée automatiquement par une IA, sur la base de ses connaissances générales, sans recherche web en temps réel. Elle peut contenir des erreurs ou des approximations et ne remplace pas une vérification humaine approfondie.",
      { align: "justify" }
    );

  // Pagination
  const range = doc.bufferedPageRange();
  const bottomMargin = doc.page.margins.bottom;
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // évite qu'écrire près du bas ne déclenche une nouvelle page
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Page ${i + 1} / ${range.count}`, doc.page.margins.left, doc.page.height - 30, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
}

module.exports = { generatePdf };
