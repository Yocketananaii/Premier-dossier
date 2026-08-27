const { Innertube } = require("youtubei.js");

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

// Client Innertube partagé (session générée une seule fois puis réutilisée).
// youtubei.js sait lire le panneau "Transcription" moderne de YouTube
// (endpoint get_transcript), contrairement aux libs plus anciennes qui ne
// lisent que les pistes de sous-titres classiques ("captionTracks") — ce
// qui les fait échouer sur des vidéos où seul ce nouveau panneau existe.
let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({ generate_session_locally: true });
  }
  return clientPromise;
}

async function fetchTranscript(videoId, lang) {
  const yt = await getClient();

  let info;
  try {
    info = await yt.getInfo(videoId);
  } catch (err) {
    console.error("Erreur de récupération des informations vidéo :", err);
    throw new Error("Cette vidéo n'est plus disponible sur YouTube (supprimée, privée, ou ID invalide).");
  }

  let transcriptInfo;
  try {
    transcriptInfo = await info.getTranscript();
  } catch (err) {
    console.error("Erreur de récupération de la transcription :", err);
    throw new Error("Cette vidéo n'a pas de sous-titres disponibles (ni automatiques, ni manuels).");
  }

  if (lang) {
    try {
      const withLang = await transcriptInfo.selectLanguage(lang);
      if (withLang) transcriptInfo = withLang;
    } catch (err) {
      // Langue précise indisponible : on garde la transcription dans sa langue
      // par défaut plutôt que d'échouer complètement.
      console.error(`Langue "${lang}" indisponible pour cette transcription, langue par défaut conservée :`, err);
    }
  }

  const nodes = transcriptInfo.transcript?.content?.body?.initial_segments || [];
  const segments = nodes
    .filter((node) => node.type === "TranscriptSegment")
    .map((node) => {
      const startMs = Number(node.start_ms) || 0;
      const endMs = Number(node.end_ms) || 0;
      return {
        text: node.snippet ? node.snippet.toString() : "",
        offset: startMs,
        duration: Math.max(0, endMs - startMs),
      };
    })
    .filter((s) => s.text.trim());

  if (segments.length === 0) {
    throw new Error("Aucune transcription disponible pour cette vidéo.");
  }

  const fullText = segments
    .map((s) => s.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");

  const durationSeconds = segments.reduce((max, s) => Math.max(max, s.offset + s.duration), 0);

  return { fullText, segments, durationSeconds };
}

module.exports = { extractVideoId, fetchMetadata, fetchTranscript };
