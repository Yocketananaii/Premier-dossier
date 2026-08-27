const API_KEY_STORAGE = "premierDossier.anthropicApiKey";
const CLAUDE_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte
const MAX_WEB_SEARCHES = 10;
const MAX_PAUSE_CONTINUATIONS = 6;

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

const keyBanner = document.getElementById("key-banner");
const keyBannerBtn = document.getElementById("key-banner-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const clearKeyBtn = document.getElementById("clear-key-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");

let lastPayload = null;

// ---------- Clé API (stockée uniquement sur cet appareil) ----------

function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

function setApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // stockage indisponible (navigation privée, quota...) : on continue sans persister
  }
  refreshKeyBanner();
}

function refreshKeyBanner() {
  const hasKey = Boolean(getApiKey());
  keyBanner.classList.toggle("hidden", hasKey);
}

function openSettings() {
  apiKeyInput.value = getApiKey();
  settingsModal.classList.remove("hidden");
}
function closeSettings() {
  settingsModal.classList.add("hidden");
}

settingsBtn.addEventListener("click", openSettings);
keyBannerBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});
saveKeyBtn.addEventListener("click", () => {
  setApiKey(apiKeyInput.value.trim());
  closeSettings();
});
clearKeyBtn.addEventListener("click", () => {
  apiKeyInput.value = "";
  setApiKey("");
});

refreshKeyBanner();

// ---------- Service worker (installation PWA) ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // l'app fonctionne aussi sans service worker (juste pas d'installation hors-ligne)
    });
  });
}

// ---------- Utilitaires d'affichage ----------

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

// ---------- Appel direct à l'API Claude depuis le navigateur ----------

function buildSystemPrompt() {
  const today = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Tu es un analyste rigoureux chargé de traiter la transcription d'une vidéo YouTube. Nous sommes le ${today}.

Tu disposes d'un outil de recherche web (web_search). Utilise-le systématiquement pour vérifier chaque affirmation factuelle vérifiable présente dans la transcription (chiffres, dates, citations, événements, études, déclarations attribuées à quelqu'un, etc.) avant de rendre ton verdict. Fais autant de recherches distinctes que nécessaire, en croisant si possible plusieurs sources fiables. N'utilise PAS uniquement tes connaissances internes pour les affirmations vérifiables : cherche sur le web pour confirmer ou infirmer, en particulier si les faits sont récents, chiffrés, ou controversés.

Une fois toutes les recherches terminées, ta toute dernière réponse doit être UNIQUEMENT un objet JSON valide (aucun texte avant ou après, pas de balises markdown), respectant exactement ce schéma :

{
  "titreSynthetique": string,
  "resume": string,
  "pointsCles": [string, ...],
  "plan": [ { "titre": string, "contenu": string } ],
  "affirmations": [
    {
      "citation": string,
      "verdict": "vrai" | "faux" | "partiellement vrai" | "invérifiable" | "opinion",
      "commentaire": string,
      "confiance": "haute" | "moyenne" | "faible",
      "sources": [string, ...]
    }
  ],
  "commentaireFiabilite": string,
  "limitesAnalyse": string
}

Consignes :
- Réponds en français.
- Vérifie les affirmations factuelles par une recherche web réelle plutôt que par déduction ; cite les sources (URLs) qui t'ont permis de conclure.
- Si la recherche ne permet pas de trancher, indique "invérifiable" et "confiance: faible" plutôt que d'inventer une certitude.
- Distingue clairement les faits vérifiables des opinions ou jugements de valeur (verdict "opinion").
- Sois factuel, neutre et évite tout jugement sur les personnes ; concentre-toi sur les affirmations.
- N'invente jamais de contenu qui ne figure pas dans la transcription fournie.
- Ne renvoie le JSON final qu'une fois toutes les recherches utiles effectuées ; ne mélange pas commentaires de recherche et JSON dans le même message.`;
}

function buildUserPrompt({ title, author, fullText, truncated }) {
  return `Titre de la vidéo : ${title}
Chaîne : ${author}
${truncated ? "\n(Note : la transcription a été tronquée car elle est très longue ; l'analyse porte sur la première partie disponible.)\n" : ""}

Transcription complète de la vidéo :
"""
${fullText}
"""`;
}

function extractJson(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("La réponse de l'IA ne contient pas de JSON exploitable.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function callClaude(apiKey, messages) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: buildSystemPrompt(),
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_WEB_SEARCHES }],
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Erreur API Claude (HTTP ${res.status}).`;
    if (res.status === 401) {
      throw new Error("Clé API Anthropic invalide ou expirée. Vérifie-la dans les paramètres.");
    }
    throw new Error(message);
  }
  return data;
}

async function analyzeTranscript({ apiKey, title, author, fullText }) {
  const truncated = fullText.length > MAX_TRANSCRIPT_CHARS;
  const text = truncated ? fullText.slice(0, MAX_TRANSCRIPT_CHARS) : fullText;

  const messages = [{ role: "user", content: buildUserPrompt({ title, author, fullText: text, truncated }) }];

  let response;
  let continuations = 0;
  do {
    response = await callClaude(apiKey, messages);
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Continue." });
      continuations += 1;
    } else {
      break;
    }
  } while (continuations < MAX_PAUSE_CONTINUATIONS);

  const textBlocks = (response.content || []).filter((b) => b.type === "text");
  if (textBlocks.length === 0) {
    throw new Error("Réponse inattendue de l'IA (aucun texte).");
  }

  const lastText = textBlocks[textBlocks.length - 1].text;
  let analysis;
  try {
    analysis = extractJson(lastText);
  } catch (err) {
    throw new Error("Impossible d'interpréter la réponse de l'IA : " + err.message);
  }

  return { analysis, truncated };
}

// ---------- Rendu du résultat ----------

function renderResult({ meta, analysis, truncated }) {
  thumbEl.src = meta.thumbnailUrl || "";
  thumbEl.alt = meta.title;
  titleEl.textContent = analysis.titreSynthetique || meta.title;
  metaEl.textContent = `${meta.author} • ${formatDuration(meta.durationSeconds)}${
    truncated ? " • transcription tronquée (vidéo très longue)" : ""
  }`;

  contentEl.innerHTML = "";

  const summarySection = el("div", { className: "section" });
  summarySection.appendChild(el("h3", { text: "Résumé" }));
  summarySection.appendChild(el("p", { text: analysis.resume || "Non disponible." }));
  contentEl.appendChild(summarySection);

  if (Array.isArray(analysis.pointsCles) && analysis.pointsCles.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: "Points clés" }));
    const list = el("ul", { className: "points-list" });
    analysis.pointsCles.forEach((point) => list.appendChild(el("li", { text: point })));
    section.appendChild(list);
    contentEl.appendChild(section);
  }

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

  const reliabilitySection = el("div", { className: "section" });
  reliabilitySection.appendChild(el("h3", { text: "Fiabilité et véracité globale" }));
  reliabilitySection.appendChild(el("p", { text: analysis.commentaireFiabilite || "Non disponible." }));
  contentEl.appendChild(reliabilitySection);

  const limitsSection = el("div", { className: "section" });
  limitsSection.appendChild(el("h3", { text: "Limites de cette analyse" }));
  limitsSection.appendChild(
    el("p", {
      text: analysis.limitesAnalyse || "Analyse générée automatiquement, avec recherche web en temps réel.",
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

// ---------- Soumission du formulaire ----------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    setStatus("Ajoute d'abord ta clé API Anthropic dans les paramètres (⚙️).", true);
    openSettings();
    return;
  }

  submitBtn.disabled = true;
  resultEl.classList.add("hidden");
  setStatus("Récupération de la transcription…");

  try {
    const transcriptRes = await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const transcriptData = await transcriptRes.json();
    if (!transcriptRes.ok) {
      throw new Error(transcriptData.error || "Impossible de récupérer la transcription.");
    }

    setStatus("Analyse et vérification des faits en cours (recherche web)… cela peut prendre une minute.");

    const { analysis, truncated } = await analyzeTranscript({
      apiKey,
      title: transcriptData.meta.title,
      author: transcriptData.meta.author,
      fullText: transcriptData.fullText,
    });

    lastPayload = { meta: transcriptData.meta, analysis, truncated };
    renderResult(lastPayload);
    setStatus(null);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

exportPdfBtn.addEventListener("click", () => downloadFile("/api/export/pdf", "dossier.pdf"));
exportTextBtn.addEventListener("click", () => downloadFile("/api/export/text", "dossier.txt"));
