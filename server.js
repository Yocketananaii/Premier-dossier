require("dotenv").config();
const path = require("path");
const express = require("express");

const { extractVideoId, fetchMetadata, fetchTranscript } = require("./src/youtube");
const { generatePdf } = require("./src/pdf");
const { generateText } = require("./src/text");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Récupère uniquement la transcription + les métadonnées : aucune clé API Claude
// n'est nécessaire côté serveur. L'appel au LLM (avec la clé propre à chaque
// utilisateur) est effectué directement depuis le navigateur (voir public/script.js).
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

app.post("/api/export/pdf", (req, res) => {
  const { meta, analysis, truncated } = req.body || {};
  if (!meta || !analysis) {
    return res.status(400).json({ error: "Données d'analyse manquantes." });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="dossier-${meta.videoId || "video"}.pdf"`);
  try {
    generatePdf({ meta, analysis, truncated }, res);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.post("/api/export/text", (req, res) => {
  const { meta, analysis, truncated } = req.body || {};
  if (!meta || !analysis) {
    return res.status(400).json({ error: "Données d'analyse manquantes." });
  }
  const text = generateText({ meta, analysis, truncated });
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="dossier-${meta.videoId || "video"}.txt"`);
  res.send(text);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
