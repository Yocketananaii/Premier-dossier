require("dotenv").config();
const path = require("path");
const express = require("express");

const { extractVideoId, fetchMetadata, fetchTranscript } = require("./src/youtube");
const { analyzeWithSharedGemini } = require("./src/gemini");
const { generatePdf } = require("./src/pdf");
const { generateText } = require("./src/text");

const app = express();
app.set("trust proxy", true); // nécessaire derrière le proxy de Render pour un req.ip correct
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Garde-fou anti-abus léger sur /api/analyze : cette route utilise la clé Gemini
// partagée du propriétaire de l'app (payée par lui), donc accessible sans
// authentification à quiconque a le lien. Limite le débit par IP pour éviter
// qu'un usage massif ou automatisé ne consomme le quota/budget de cette clé.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 heure
const rateLimitByIp = new Map();

function sharedKeyRateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const entry = rateLimitByIp.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: "Trop de requêtes depuis cette adresse pour la clé partagée. Réessaie plus tard, ou renseigne ta propre clé API Gemini dans les Paramètres.",
    });
  }
  entry.count += 1;
  next();
}

// Récupère uniquement la transcription + les métadonnées : aucune clé API
// n'est nécessaire côté serveur pour cette étape.
app.post("/api/transcript", async (req, res) => {
  const { url, lang } = req.body || {};
  const videoId = extractVideoId(url);

  if (!videoId) {
    return res.status(400).json({
      error: "URL YouTube invalide. Collez le lien complet de la vidéo (ex : https://www.youtube.com/watch?v=...).",
    });
  }

  try {
    const [meta, transcript] = await Promise.all([
      fetchMetadata(videoId),
      fetchTranscript(videoId, lang),
    ]);

    const fullMeta = {
      ...meta,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      durationSeconds: transcript.durationSeconds,
    };

    res.json({ meta: fullMeta, fullText: transcript.fullText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Une erreur inattendue est survenue." });
  }
});

// Analyse avec la clé Gemini partagée du propriétaire de l'app (configurée via la
// variable d'environnement GEMINI_API_KEY). Utilisée par défaut par le navigateur
// tant que l'utilisateur n'a pas renseigné sa propre clé dans les Paramètres.
app.post("/api/analyze", sharedKeyRateLimit, async (req, res) => {
  const { title, author, fullText, lang } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error:
        "Le service d'analyse gratuit n'est pas configuré sur ce serveur (clé partagée manquante). Renseigne ta propre clé API dans les Paramètres.",
    });
  }
  if (!fullText) {
    return res.status(400).json({ error: "Transcription manquante." });
  }

  try {
    const result = await analyzeWithSharedGemini({
      apiKey: process.env.GEMINI_API_KEY,
      title,
      author,
      fullText,
      lang,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Une erreur inattendue est survenue." });
  }
});

app.post("/api/export/pdf", (req, res) => {
  const { meta, analysis, truncated, lang } = req.body || {};
  if (!meta || !analysis) {
    return res.status(400).json({ error: "Données d'analyse manquantes." });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="dossier-${meta.videoId || "video"}.pdf"`);
  try {
    generatePdf({ meta, analysis, truncated, lang }, res);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.post("/api/export/text", (req, res) => {
  const { meta, analysis, truncated, lang } = req.body || {};
  if (!meta || !analysis) {
    return res.status(400).json({ error: "Données d'analyse manquantes." });
  }
  const text = generateText({ meta, analysis, truncated, lang });
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dossier-${meta.videoId || "video"}.txt"`);
  res.send(text);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
