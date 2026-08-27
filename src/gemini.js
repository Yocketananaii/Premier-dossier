const { buildSystemPrompt, buildUserPrompt, extractJson } = require("./promptBuilder");
const { getI18n } = require("./i18n");

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte

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

// Analyse via la clé Gemini partagée par le propriétaire de l'app (côté serveur,
// jamais exposée au navigateur). Utilisée par défaut tant qu'un utilisateur n'a
// pas renseigné sa propre clé dans les Paramètres.
async function analyzeWithSharedGemini({ apiKey, title, author, fullText, lang }) {
  const truncated = fullText.length > MAX_TRANSCRIPT_CHARS;
  const text = truncated ? fullText.slice(0, MAX_TRANSCRIPT_CHARS) : fullText;

  const systemPrompt = buildSystemPrompt(lang, getI18n);
  const userPrompt = buildUserPrompt({ title, author, fullText: text, truncated });

  let { res, data } = await requestGemini(apiKey, systemPrompt, userPrompt, true);
  let noSearchFallback = false;

  if (!res.ok) {
    const message = data?.error?.message || "";
    if (/search|ground|tool/i.test(message)) {
      ({ res, data } = await requestGemini(apiKey, systemPrompt, userPrompt, false));
      noSearchFallback = res.ok;
    }
    if (!res.ok) {
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
  const rawText = (candidate.content?.parts || []).map((p) => p.text || "").join("");

  let analysis;
  try {
    analysis = extractJson(rawText);
  } catch (err) {
    throw new Error("Impossible d'interpréter la réponse de Gemini : " + err.message);
  }

  if (noSearchFallback) {
    const note = getI18n(lang).labels.noSearchFallbackNote;
    analysis.limitesAnalyse = analysis.limitesAnalyse ? `${analysis.limitesAnalyse} ${note}` : note;
  }

  return { analysis, truncated };
}

module.exports = { analyzeWithSharedGemini };
