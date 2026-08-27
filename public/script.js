const form = document.getElementById("analyze-form");
const urlInput = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const contentEl = document.getElementById("content");
const thumbEl = document.getElementById("thumb");
const titleEl = document.getElementById("result-title");
const metaEl = document.getElementById("result-meta");
const exportPdfBtn = document.getElementById("export-pdf");
const exportTextBtn = document.getElementById("export-text");

let lastPayload = null;

function setStatus(message, isError) {
  if (!message) {
    statusEl.classList.add("hidden");
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  statusEl.classList.toggle("error", Boolean(isError));
}

function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text !== undefined) node.textContent = opts.text;
  return node;
}

function verdictClass(verdict) {
  const v = (verdict || "").toLowerCase();
  if (v === "vrai") return "vrai";
  if (v === "faux") return "faux";
  if (v.includes("partiel")) return "partiel";
  return "neutre";
}

function formatDuration(seconds) {
  if (!seconds) return "durée inconnue";
  const totalSec = Math.round(seconds / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min ${String(s).padStart(2, "0")}s`;
}

function renderResult({ meta, analysis, truncated }) {
  thumbEl.src = meta.thumbnailUrl || "";
  thumbEl.alt = meta.title;
  titleEl.textContent = analysis.titreSynthetique || meta.title;
  metaEl.textContent = `${meta.author} • ${formatDuration(meta.durationSeconds)}${
    truncated ? " • transcription tronquée (vidéo très longue)" : ""
  }`;

  contentEl.innerHTML = "";

  // Résumé
  const summarySection = el("div", { className: "section" });
  summarySection.appendChild(el("h3", { text: "Résumé" }));
  summarySection.appendChild(el("p", { text: analysis.resume || "Non disponible." }));
  contentEl.appendChild(summarySection);

  // Points clés
  if (Array.isArray(analysis.pointsCles) && analysis.pointsCles.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: "Points clés" }));
    const list = el("ul", { className: "points-list" });
    analysis.pointsCles.forEach((point) => list.appendChild(el("li", { text: point })));
    section.appendChild(list);
    contentEl.appendChild(section);
  }

  // Plan thématique
  if (Array.isArray(analysis.plan) && analysis.plan.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: "Contenu réorganisé par thème" }));
    analysis.plan.forEach((item) => {
      const wrapper = el("div", { className: "plan-item" });
      wrapper.appendChild(el("h4", { text: item.titre }));
      wrapper.appendChild(el("p", { text: item.contenu }));
      section.appendChild(wrapper);
    });
    contentEl.appendChild(section);
  }

  // Fact-checking
  if (Array.isArray(analysis.affirmations) && analysis.affirmations.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: "Vérification des faits" }));
    const list = el("div", { className: "claims-list" });
    analysis.affirmations.forEach((item) => {
      const claim = el("div", { className: "claim" });
      const verdictBadge = el("span", {
        className: `verdict ${verdictClass(item.verdict)}`,
        text: item.verdict || "?",
      });
      const wrap = document.createElement("div");
      wrap.appendChild(verdictBadge);
      if (item.confiance) {
        wrap.appendChild(el("span", { className: "confiance", text: `confiance : ${item.confiance}` }));
      }
      claim.appendChild(wrap);
      claim.appendChild(el("div", { className: "claim-text", text: item.citation }));
      claim.appendChild(el("p", { text: item.commentaire || "" }));
      if (Array.isArray(item.sources) && item.sources.length > 0) {
        const sourcesEl = el("p", { className: "sources" });
        sourcesEl.appendChild(el("span", { text: "Sources : " }));
        item.sources.forEach((url, i) => {
          if (i > 0) sourcesEl.appendChild(document.createTextNode("  •  "));
          const link = el("a", { text: url });
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          sourcesEl.appendChild(link);
        });
        claim.appendChild(sourcesEl);
      }
      list.appendChild(claim);
    });
    section.appendChild(list);
    contentEl.appendChild(section);
  }

  // Fiabilité
  const reliabilitySection = el("div", { className: "section" });
  reliabilitySection.appendChild(el("h3", { text: "Fiabilité et véracité globale" }));
  reliabilitySection.appendChild(el("p", { text: analysis.commentaireFiabilite || "Non disponible." }));
  contentEl.appendChild(reliabilitySection);

  // Limites
  const limitsSection = el("div", { className: "section" });
  limitsSection.appendChild(el("h3", { text: "Limites de cette analyse" }));
  limitsSection.appendChild(
    el("p", {
      text:
        analysis.limitesAnalyse ||
        "Analyse générée automatiquement, sans recherche web en temps réel.",
    })
  );
  contentEl.appendChild(limitsSection);

  resultEl.classList.remove("hidden");
}

async function downloadFile(endpoint, filenameFallback) {
  if (!lastPayload) return;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lastPayload),
  });
  if (!res.ok) {
    setStatus("Échec du téléchargement.", true);
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : filenameFallback;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  submitBtn.disabled = true;
  resultEl.classList.add("hidden");
  setStatus("Récupération de la transcription et analyse en cours… cela peut prendre une minute.");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Une erreur est survenue.");
    }
    lastPayload = data;
    renderResult(data);
    setStatus(null);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

exportPdfBtn.addEventListener("click", () => downloadFile("/api/export/pdf", "dossier.pdf"));
exportTextBtn.addEventListener("click", () => downloadFile("/api/export/text", "dossier.txt"));
