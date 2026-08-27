const {
  YoutubeTranscript,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} = require("youtube-transcript");

const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
];

function extractVideoId(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();

  // Accepte aussi un ID brut de 11 caractères
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  try {
    const u = new URL(trimmed);
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
  } catch {
    // pas une URL valide, on abandonne
  }

  return null;
}

async function fetchMetadata(videoId) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;

  const res = await fetch(oembedUrl);
  if (!res.ok) {
    throw new Error(
      "Impossible de récupérer les informations de la vidéo (elle est peut-être privée, supprimée ou l'URL est invalide)."
    );
  }
  const data = await res.json();
  return {
    title: data.title || "Titre inconnu",
    author: data.author_name || "Chaîne inconnue",
    thumbnailUrl: data.thumbnail_url || null,
  };
}

async function fetchTranscript(videoId, lang) {
  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
  } catch (err) {
    // Log l'erreur réelle côté serveur (visible dans les logs Render) : le message
    // renvoyé au navigateur ne doit pas dévoiler de détails techniques inutiles,
    // mais on distingue les cas pour donner un message exploitable à l'utilisateur.
    console.error("Erreur de récupération de la transcription :", err);

    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      throw new Error(
        "YouTube bloque temporairement les requêtes automatiques depuis ce serveur (trop de demandes). Réessayez dans quelques minutes."
      );
    }
    if (err instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new Error("Cette vidéo n'est plus disponible sur YouTube (supprimée, privée, ou ID invalide).");
    }
    if (err instanceof YoutubeTranscriptDisabledError || err instanceof YoutubeTranscriptNotAvailableError) {
      throw new Error("Cette vidéo n'a pas de sous-titres disponibles (ni automatiques, ni manuels).");
    }
    if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
      throw new Error("Cette vidéo n'a pas de sous-titres dans la langue demandée.");
    }
    throw new Error(
      "Impossible de récupérer la transcription de cette vidéo pour le moment. Réessayez, ou essayez avec une autre vidéo."
    );
  }

  if (!segments || segments.length === 0) {
    throw new Error("Aucune transcription disponible pour cette vidéo.");
  }

  const fullText = segments
    .map((s) => s.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");

  const durationSeconds = segments.reduce(
    (max, s) => Math.max(max, (s.offset || 0) + (s.duration || 0)),
    0
  );

  return { fullText, segments, durationSeconds };
}

module.exports = { extractVideoId, fetchMetadata, fetchTranscript };
