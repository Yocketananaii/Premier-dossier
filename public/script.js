const API_KEY_STORAGE = "premierDossier.anthropicApiKey";
const LANG_STORAGE = "premierDossier.lang";
const CLAUDE_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte
const MAX_WEB_SEARCHES = 10;
const MAX_PAUSE_CONTINUATIONS = 6;

const form = document.getElementById("analyze-form");
const urlInput = document.getElementById("url-input");
const langSelect = document.getElementById("lang-select");
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

// ---------- Langue du dossier (mémorisée sur cet appareil) ----------

function getSavedLang() {
  try {
    return localStorage.getItem(LANG_STORAGE) || "fr";
  } catch {
    return "fr";
  }
}

if (window.SUPPORTED_LANGS && window.SUPPORTED_LANGS.includes(getSavedLang())) {
  langSelect.value = getSavedLang();
}
langSelect.addEventListener("change", () => {
  try {
    localStorage.setItem(LANG_STORAGE, langSelect.value);
  } catch {
    // pas grave si on ne peut pas mémoriser la préférence
  }
});

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
  if (v === "true") return "vrai";
  if (v === "false") return "faux";
  if (v === "partially_true") return "partiel";
  return "neutre";
}

function formatDuration(seconds, labels) {
  if (!seconds) return labels.unknownDuration;
  const totalSec = Math.round(seconds / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

// ---------- Appel direct à l'API Claude depuis le navigateur ----------

function buildSystemPrompt(lang) {
  const langInfo = window.getI18n(lang);
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
      "verdict": "true" | "false" | "partially_true" | "unverifiable" | "opinion",
      "commentaire": string,
      "confiance": "high" | "medium" | "low",
      "sources": [string, ...]
    }
  ],
  "commentaireFiabilite": string,
  "limitesAnalyse": string
}

Consignes :
- Rédige tout le contenu textuel libre (titreSynthetique, resume, pointsCles, plan, citation, commentaire, commentaireFiabilite, limitesAnalyse) en ${langInfo.name}, quelle que soit la langue de la vidéo d'origine.
- IMPORTANT : les valeurs des champs "verdict" et "confiance" doivent rester EXACTEMENT les tokens anglais indiqués ci-dessus ("true", "false", "partially_true", "unverifiable", "opinion", "high", "medium", "low"), sans les traduire ni les modifier — c'est un format technique interne, pas du texte affiché.
- Vérifie les affirmations factuelles par une recherche web réelle plutôt que par déduction ; cite les sources (URLs) qui t'ont permis de conclure.
- Si la recherche ne permet pas de trancher, utilise le verdict "unverifiable" avec une confiance "low" plutôt que d'inventer une certitude.
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

async function callClaude(apiKey, messages, lang) {
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
      system: buildSystemPrompt(lang),
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

async function analyzeTranscript({ apiKey, title, author, fullText, lang }) {
  const truncated = fullText.length > MAX_TRANSCRIPT_CHARS;
  const text = truncated ? fullText.slice(0, MAX_TRANSCRIPT_CHARS) : fullText;

  const messages = [{ role: "user", content: buildUserPrompt({ title, author, fullText: text, truncated }) }];

  let response;
  let continuations = 0;
  do {
    response = await callClaude(apiKey, messages, lang);
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

function renderResult({ meta, analysis, truncated, lang }) {
  const labels = window.getI18n(lang).labels;

  thumbEl.src = meta.thumbnailUrl || "";
  thumbEl.alt = meta.title;
  titleEl.textContent = analysis.titreSynthetique || meta.title;
  metaEl.textContent = `${meta.author} • ${formatDuration(meta.durationSeconds, labels)}${
    truncated ? ` • ${labels.truncatedNote}` : ""
  }`;

  contentEl.innerHTML = "";

  const summarySection = el("div", { className: "section" });
  summarySection.appendChild(el("h3", { text: labels.summary }));
  summarySection.appendChild(el("p", { text: analysis.resume || labels.noSummary }));
  contentEl.appendChild(summarySection);

  if (Array.isArray(analysis.pointsCles) && analysis.pointsCles.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: labels.keyPoints }));
    const list = el("ul", { className: "points-list" });
    analysis.pointsCles.forEach((point) => list.appendChild(el("li", { text: point })));
    section.appendChild(list);
    contentEl.appendChild(section);
  }

  if (Array.isArray(analysis.plan) && analysis.plan.length) {
    const section = el("div", { className: "section" });
    section.appendChild(el("h3", { text: labels.reorganized }));
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
    section.appendChild(el("h3", { text: labels.factCheck }));
    const list = el("div", { className: "claims-list" });
    analysis.affirmations.forEach((item) => {
      const claim = el("div", { className: "claim" });
      const verdictText = labels.verdicts[item.verdict] || item.verdict || "?";
      const verdictBadge = el("span", {
        className: `verdict ${verdictClass(item.verdict)}`,
        text: verdictText,
      });
      const wrap = document.createElement("div");
      wrap.appendChild(verdictBadge);
      if (item.confiance) {
        const confText = labels.confidences[item.confiance] || item.confiance;
        wrap.appendChild(el("span", { className: "confiance", text: `${labels.confidenceLabel} : ${confText}` }));
      }
      claim.appendChild(wrap);
      claim.appendChild(el("div", { className: "claim-text", text: item.citation }));
      claim.appendChild(el("p", { text: item.commentaire || "" }));
      if (Array.isArray(item.sources) && item.sources.length > 0) {
        const sourcesEl = el("p", { className: "sources" });
        sourcesEl.appendChild(el("span", { text: `${labels.sourcesLabel} : ` }));
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
  reliabilitySection.appendChild(el("h3", { text: labels.reliability }));
  reliabilitySection.appendChild(el("p", { text: analysis.commentaireFiabilite || labels.noSummary }));
  contentEl.appendChild(reliabilitySection);

  const limitsSection = el("div", { className: "section" });
  limitsSection.appendChild(el("h3", { text: labels.limits }));
  limitsSection.appendChild(el("p", { text: analysis.limitesAnalyse || labels.defaultLimits }));
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
  const lang = window.SUPPORTED_LANGS.includes(langSelect.value) ? langSelect.value : "fr";

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
      lang,
    });

    lastPayload = { meta: transcriptData.meta, analysis, truncated, lang };
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

// ---------- Réception d'un lien partagé depuis une autre app (WhatsApp, YouTube...) ----------
// Fonctionne quand l'app est installée sur Android via Chrome (Web Share Target).
// Non pris en charge sur iOS/Safari : voir README.

function extractYouTubeUrlFromText(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/\S*(?:youtube\.com|youtu\.be)\S*/i);
  return match ? match[0] : null;
}

(function handleSharedLink() {
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return;

  const shared =
    extractYouTubeUrlFromText(params.get("url")) ||
    extractYouTubeUrlFromText(params.get("text")) ||
    extractYouTubeUrlFromText(params.get("title"));

  // Nettoie l'URL de la barre d'adresse pour ne pas rejouer le partage au rechargement.
  window.history.replaceState({}, document.title, window.location.pathname);

  if (!shared) return;

  urlInput.value = shared;

  if (getApiKey()) {
    setStatus("Vidéo reçue, lancement de l'analyse…");
    form.requestSubmit();
  } else {
    setStatus("Vidéo reçue ! Ajoute ta clé API (⚙️) pour lancer l'analyse.", true);
    openSettings();
  }
})();
