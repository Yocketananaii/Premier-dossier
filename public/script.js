const PROVIDER_STORAGE = "premierDossier.provider";
const GEMINI_KEY_STORAGE = "premierDossier.geminiApiKey";
const ANTHROPIC_KEY_STORAGE = "premierDossier.anthropicApiKey";
const LANG_STORAGE = "premierDossier.lang";

const CLAUDE_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte
const MAX_WEB_SEARCHES = 10;
const MAX_PAUSE_CONTINUATIONS = 6;

const GEMINI_KEY_HINT = "Par défaut, l'app utilise une clé Gemini déjà configurée : tu n'as rien à faire. Renseigne ta propre clé uniquement si tu préfères utiliser ton propre quota Gemini (stockée uniquement sur cet appareil).";
const CLAUDE_KEY_HINT = "Stockée uniquement sur cet appareil, jamais envoyée ailleurs qu'à Anthropic.";

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
const providerSelect = document.getElementById("provider-select");
const apiKeyLabel = document.getElementById("api-key-label");
const apiKeyInput = document.getElementById("api-key-input");
const apiKeyHint = document.getElementById("api-key-hint");
const helpGemini = document.getElementById("help-gemini");
const helpClaude = document.getElementById("help-claude");
const saveKeyBtn = document.getElementById("save-key-btn");
const clearKeyBtn = document.getElementById("clear-key-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");

let lastPayload = null;

// ---------- Fournisseur + clé API (stockés uniquement sur cet appareil) ----------
// Gemini n'exige pas de clé personnelle : à défaut, l'app utilise une clé
// partagée côté serveur (voir server.js /api/analyze). Claude exige toujours
// une clé personnelle, appelée directement depuis le navigateur.

function getProvider() {
  try {
    const p = localStorage.getItem(PROVIDER_STORAGE);
    return p === "claude" ? "claude" : "gemini";
  } catch {
    return "gemini";
  }
}

function setProvider(provider) {
  try {
    localStorage.setItem(PROVIDER_STORAGE, provider === "claude" ? "claude" : "gemini");
  } catch {
    // pas grave si on ne peut pas mémoriser la préférence
  }
}

function keyStorageFor(provider) {
  return provider === "claude" ? ANTHROPIC_KEY_STORAGE : GEMINI_KEY_STORAGE;
}

function getApiKey(provider = getProvider()) {
  try {
    return localStorage.getItem(keyStorageFor(provider)) || "";
  } catch {
    return "";
  }
}

function setApiKey(provider, key) {
  try {
    if (key) localStorage.setItem(keyStorageFor(provider), key);
    else localStorage.removeItem(keyStorageFor(provider));
  } catch {
    // stockage indisponible (navigation privée, quota...) : on continue sans persister
  }
  refreshKeyBanner();
}

function needsPersonalKey(provider = getProvider()) {
  // Seul Claude exige une clé personnelle ; Gemini a une clé partagée par défaut.
  return provider === "claude" && !getApiKey(provider);
}

function refreshKeyBanner() {
  keyBanner.classList.toggle("hidden", !needsPersonalKey());
}

function updateProviderUI(provider) {
  const isClaude = provider === "claude";
  apiKeyLabel.textContent = isClaude ? "Clé API Anthropic" : "Clé API Gemini (optionnelle)";
  apiKeyInput.placeholder = isClaude ? "sk-ant-..." : "Laisser vide pour utiliser la clé gratuite fournie";
  apiKeyHint.textContent = isClaude ? CLAUDE_KEY_HINT : GEMINI_KEY_HINT;
  helpGemini.classList.toggle("hidden", isClaude);
  helpClaude.classList.toggle("hidden", !isClaude);
}

function openSettings() {
  const provider = getProvider();
  providerSelect.value = provider;
  apiKeyInput.value = getApiKey(provider);
  updateProviderUI(provider);
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
providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value === "claude" ? "claude" : "gemini";
  setProvider(provider);
  apiKeyInput.value = getApiKey(provider);
  updateProviderUI(provider);
  refreshKeyBanner();
});
saveKeyBtn.addEventListener("click", () => {
  const provider = providerSelect.value === "claude" ? "claude" : "gemini";
  setApiKey(provider, apiKeyInput.value.trim());
  closeSettings();
});
clearKeyBtn.addEventListener("click", () => {
  apiKeyInput.value = "";
  setApiKey(providerSelect.value === "claude" ? "claude" : "gemini", "");
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

// ---------- Appel direct à l'API (Gemini ou Claude) depuis le navigateur ----------
// buildSystemPrompt / buildUserPrompt / extractJson viennent de promptBuilder.js
// (partagé avec le serveur, voir src/promptBuilder.js).

// ----- Claude (Anthropic) -----

async function callClaude(apiKey, systemPrompt, messages) {
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
      system: systemPrompt,
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

async function runClaude(apiKey, systemPrompt, userPrompt) {
  const messages = [{ role: "user", content: userPrompt }];
  let response;
  let continuations = 0;
  do {
    response = await callClaude(apiKey, systemPrompt, messages);
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
  return { text: textBlocks[textBlocks.length - 1].text, noSearchFallback: false };
}

// ----- Gemini (Google), avec une clé personnelle -----

async function requestGemini(apiKey, systemPrompt, userPrompt, withSearch) {
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  };
  if (withSearch) payload.tools = [{ google_search: {} }];

  const res = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { res, data };
}

async function runGemini(apiKey, systemPrompt, userPrompt) {
  let { res, data } = await requestGemini(apiKey, systemPrompt, userPrompt, true);
  let noSearchFallback = false;

  if (!res.ok) {
    const message = data?.error?.message || "";
    const searchRelated = /search|ground|tool/i.test(message);
    if (searchRelated) {
      ({ res, data } = await requestGemini(apiKey, systemPrompt, userPrompt, false));
      noSearchFallback = res.ok;
    }
    if (!res.ok) {
      if (res.status === 400 || res.status === 403) {
        throw new Error(
          "Clé API Gemini invalide, ou fonctionnalité non disponible avec cette clé. Vérifie-la dans les paramètres."
        );
      }
      throw new Error(data?.error?.message || `Erreur API Gemini (HTTP ${res.status}).`);
    }
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    const reason = data?.promptFeedback?.blockReason;
    throw new Error(
      reason ? `Réponse bloquée par Gemini (${reason}).` : "Réponse inattendue de Gemini (aucun résultat)."
    );
  }
  const text = (candidate.content?.parts || []).map((p) => p.text || "").join("");
  return { text, noSearchFallback };
}

// ----- Orchestration -----

async function analyzeWithSharedGemini({ title, author, fullText, lang }) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, author, fullText, lang }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erreur du service d'analyse (HTTP ${res.status}).`);
  }
  return data; // { analysis, truncated }
}

async function analyzeTranscript({ provider, apiKey, title, author, fullText, lang }) {
  // Gemini sans clé personnelle : l'app utilise la clé partagée côté serveur.
  if (provider === "gemini" && !apiKey) {
    return analyzeWithSharedGemini({ title, author, fullText, lang });
  }

  const truncated = fullText.length > MAX_TRANSCRIPT_CHARS;
  const text = truncated ? fullText.slice(0, MAX_TRANSCRIPT_CHARS) : fullText;

  const systemPrompt = window.buildSystemPrompt(lang);
  const userPrompt = window.buildUserPrompt({ title, author, fullText: text, truncated });

  const { text: rawText, noSearchFallback } =
    provider === "claude"
      ? await runClaude(apiKey, systemPrompt, userPrompt)
      : await runGemini(apiKey, systemPrompt, userPrompt);

  let analysis;
  try {
    analysis = window.extractJson(rawText);
  } catch (err) {
    throw new Error("Impossible d'interpréter la réponse de l'IA : " + err.message);
  }

  if (noSearchFallback) {
    const note = window.getI18n(lang).labels.noSearchFallbackNote;
    analysis.limitesAnalyse = analysis.limitesAnalyse ? `${analysis.limitesAnalyse} ${note}` : note;
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
  const provider = getProvider();

  if (needsPersonalKey(provider)) {
    setStatus("Ajoute d'abord ta clé API Claude dans les paramètres (⚙️), ou choisis Google Gemini.", true);
    openSettings();
    return;
  }
  const apiKey = getApiKey(provider);

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
      provider,
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
// Fonctionne quand l'app est installée sur Android via Chrome (Web Share Target),
// ou sur iOS via le Raccourci décrit dans le README.

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

  if (!needsPersonalKey()) {
    setStatus("Vidéo reçue, lancement de l'analyse…");
    form.requestSubmit();
  } else {
    setStatus("Vidéo reçue ! Ajoute ta clé API (⚙️) pour lancer l'analyse.", true);
    openSettings();
  }
})();
