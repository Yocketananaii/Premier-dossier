const { getI18n } = require("./i18n");

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

function generateText({ meta, analysis, truncated, lang }) {
  const { locale, labels } = getI18n(lang);
  const lines = [];
  const sep = "=".repeat(70);
  const subsep = "-".repeat(70);

  lines.push(sep);
  lines.push(labels.dossierTitle.toUpperCase());
  lines.push(sep);
  lines.push(analysis.titreSynthetique || meta.title);
  lines.push("");
  lines.push(`${labels.sourceVideo} : ${meta.title}`);
  lines.push(`${labels.channel} : ${meta.author}`);
  lines.push(`${labels.duration} : ${formatDuration(meta.durationSeconds, labels)}`);
  lines.push(`${labels.urlLabel} : ${meta.url}`);
  lines.push(
    `${labels.generatedOn} : ${new Date().toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  if (truncated) {
    lines.push(labels.truncatedNote);
  }
  lines.push("");

  lines.push(subsep);
  lines.push(labels.summary.toUpperCase());
  lines.push(subsep);
  lines.push(analysis.resume || labels.noSummary);
  lines.push("");

  lines.push(subsep);
  lines.push(labels.keyPoints.toUpperCase());
  lines.push(subsep);
  (analysis.pointsCles || []).forEach((point) => lines.push(`- ${point}`));
  lines.push("");

  if (Array.isArray(analysis.plan) && analysis.plan.length > 0) {
    lines.push(subsep);
    lines.push(labels.reorganized.toUpperCase());
    lines.push(subsep);
    analysis.plan.forEach((section) => {
      lines.push(`## ${section.titre}`);
      lines.push(section.contenu);
      lines.push("");
    });
  }

  if (Array.isArray(analysis.affirmations) && analysis.affirmations.length > 0) {
    lines.push(subsep);
    lines.push(labels.factCheck.toUpperCase());
    lines.push(subsep);
    analysis.affirmations.forEach((item, idx) => {
      const verdictText = labels.verdicts[item.verdict] || item.verdict || "?";
      const confidenceText = item.confiance ? labels.confidences[item.confiance] || item.confiance : null;
      lines.push(`${idx + 1}. ${item.citation}`);
      lines.push(
        `   ${labels.verdictLabel} : ${verdictText}${confidenceText ? ` (${labels.confidenceLabel} : ${confidenceText})` : ""}`
      );
      lines.push(`   ${item.commentaire || ""}`);
      if (Array.isArray(item.sources) && item.sources.length > 0) {
        lines.push(`   ${labels.sourcesLabel} : ${item.sources.join(" | ")}`);
      }
      lines.push("");
    });
  }

  lines.push(subsep);
  lines.push(labels.reliability.toUpperCase());
  lines.push(subsep);
  lines.push(analysis.commentaireFiabilite || labels.noSummary);
  lines.push("");

  lines.push(subsep);
  lines.push(labels.limits.toUpperCase());
  lines.push(subsep);
  lines.push(analysis.limitesAnalyse || labels.defaultLimits);
  lines.push("");

  return lines.join("\n");
}

module.exports = { generateText };
