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

function generateText({ meta, analysis, truncated }) {
  const lines = [];
  const sep = "=".repeat(70);
  const subsep = "-".repeat(70);

  lines.push(sep);
  lines.push("DOSSIER VIDÉO");
  lines.push(sep);
  lines.push(analysis.titreSynthetique || meta.title);
  lines.push("");
  lines.push(`Vidéo source : ${meta.title}`);
  lines.push(`Chaîne       : ${meta.author}`);
  lines.push(`Durée        : ${formatDuration(meta.durationSeconds)}`);
  lines.push(`URL          : ${meta.url}`);
  lines.push(
    `Généré le    : ${new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  if (truncated) {
    lines.push("Note : la transcription était très longue et a été tronquée pour l'analyse.");
  }
  lines.push("");

  lines.push(subsep);
  lines.push("RÉSUMÉ");
  lines.push(subsep);
  lines.push(analysis.resume || "Non disponible.");
  lines.push("");

  lines.push(subsep);
  lines.push("POINTS CLÉS");
  lines.push(subsep);
  (analysis.pointsCles || []).forEach((point) => lines.push(`- ${point}`));
  lines.push("");

  if (Array.isArray(analysis.plan) && analysis.plan.length > 0) {
    lines.push(subsep);
    lines.push("CONTENU RÉORGANISÉ PAR THÈME");
    lines.push(subsep);
    analysis.plan.forEach((section) => {
      lines.push(`## ${section.titre}`);
      lines.push(section.contenu);
      lines.push("");
    });
  }

  if (Array.isArray(analysis.affirmations) && analysis.affirmations.length > 0) {
    lines.push(subsep);
    lines.push("VÉRIFICATION DES FAITS (FACT-CHECKING)");
    lines.push(subsep);
    analysis.affirmations.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.citation}`);
      lines.push(
        `   Verdict : ${item.verdict}${item.confiance ? ` (confiance : ${item.confiance})` : ""}`
      );
      lines.push(`   ${item.commentaire || ""}`);
      if (Array.isArray(item.sources) && item.sources.length > 0) {
        lines.push(`   Sources : ${item.sources.join(" | ")}`);
      }
      lines.push("");
    });
  }

  lines.push(subsep);
  lines.push("COMMENTAIRE SUR LA FIABILITÉ ET LA VÉRACITÉ GLOBALE");
  lines.push(subsep);
  lines.push(analysis.commentaireFiabilite || "Non disponible.");
  lines.push("");

  lines.push(subsep);
  lines.push("LIMITES DE CETTE ANALYSE");
  lines.push(subsep);
  lines.push(
    analysis.limitesAnalyse ||
      "Cette analyse a été générée automatiquement par une IA, à l'aide de recherches web en temps réel pour vérifier les affirmations factuelles."
  );
  lines.push("");

  return lines.join("\n");
}

module.exports = { generateText };
