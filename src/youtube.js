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
//
// generate_session_locally n'est PAS utilisé ici volontairement : une session
// confirmée par les serveurs YouTube (comportement par défaut) est plus fiable
// pour get_transcript, qui peut renvoyer une erreur "Precondition check failed"
// (bug connu et documenté de youtubei.js, cf. issue LuanRT/YouTube.js #1102)
// avec une session générée uniquement en local.
let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create();
  }
  return clientPromise;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// L'erreur "Precondition check failed" (FAILED_PRECONDITION) sur get_transcript
// est intermittente côté YouTube : elle disparaît souvent après une ou deux
// nouvelles tentatives (comportement constaté par plusieurs utilisateurs de
// youtubei.js). On réessaie donc automatiquement avant d'abandonner.
const TRANSCRIPT_RETRY_DELAYS_MS = [500, 1500];

async function getTranscriptWithRetry(info) {
  let lastErr;
  for (let attempt = 0; attempt <= TRANSCRIPT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await info.getTranscript();
    } catch (err) {
      lastErr = err;
      const isPrecondition = /precondition|400/i.test(err?.message || "");
      if (!isPrecondition || attempt === TRANSCRIPT_RETRY_DELAYS_MS.length) break;
      console.error(
        `[youtube] get_transcript a échoué (tentative ${attempt + 1}/${TRANSCRIPT_RETRY_DELAYS_MS.length + 1}), nouvel essai dans ${TRANSCRIPT_RETRY_DELAYS_MS[attempt]}ms :`,
        err?.message
      );
      await sleep(TRANSCRIPT_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastErr;
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
    transcriptInfo = await getTranscriptWithRetry(info);
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
