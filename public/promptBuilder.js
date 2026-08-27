// Construction des prompts et extraction du JSON, partagées entre le serveur
// (appel avec la clé Gemini partagée) et le navigateur (appel avec une clé
// personnelle, Gemini ou Claude). Même mécanique double-export que i18n.js.
//
// IMPORTANT : ce fichier doit rester identique à public/promptBuilder.js.

function buildSystemPrompt(lang, getI18n) {
  const langInfo = getI18n(lang);
  const today = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Tu es un analyste rigoureux chargé de traiter la transcription d'une vidéo YouTube. Nous sommes le ${today}.

Tu disposes d'un outil de recherche web. Utilise-le systématiquement pour vérifier chaque affirmation factuelle vérifiable présente dans la transcription (chiffres, dates, citations, événements, études, déclarations attribuées à quelqu'un, etc.) avant de rendre ton verdict. Fais autant de recherches distinctes que nécessaire, en croisant si possible plusieurs sources fiables. N'utilise PAS uniquement tes connaissances internes pour les affirmations vérifiables : cherche sur le web pour confirmer ou infirmer, en particulier si les faits sont récents, chiffrés, ou controversés.

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

const api = { buildSystemPrompt, buildUserPrompt, extractJson };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else if (typeof window !== "undefined") {
  window.buildSystemPrompt = (lang) => buildSystemPrompt(lang, window.getI18n);
  window.buildUserPrompt = buildUserPrompt;
  window.extractJson = extractJson;
}
