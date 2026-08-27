const { YoutubeTranscript } = require("youtube-transcript");

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
    throw new Error(
      "Impossible de récupérer la transcription de cette vidéo. Elle ne dispose peut-être pas de sous-titres (automatiques ou manuels)."
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
