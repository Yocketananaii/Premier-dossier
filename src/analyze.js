const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte
const MAX_WEB_SEARCHES = 10;
const MAX_PAUSE_CONTINUATIONS = 6; // garde-fou contre une boucle infinie si le tour est mis en pause

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY n'est pas configurée sur le serveur. Ajoutez-la dans le fichier .env."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function buildSystemPrompt() {
  const today = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Tu es un analyste rigoureux chargé de traiter la transcription d'une vidéo YouTube. Nous sommes le ${today}.

Tu disposes d'un outil de recherche web (web_search). Utilise-le systématiquement pour vérifier chaque affirmation factuelle vérifiable présente dans la transcription (chiffres, dates, citations, événements, études, déclarations attribuées à quelqu'un, etc.) avant de rendre ton verdict. Fais autant de recherches distinctes que nécessaire (une par affirmation ou groupe d'affirmations liées), en croisant si possible plusieurs sources fiables. N'utilise PAS uniquement tes connaissances internes pour les affirmations vérifiables : cherche sur le web pour confirmer ou infirmer, en particulier si les faits sont récents, chiffrés, ou controversés.

Une fois toutes les recherches terminées, ta toute dernière réponse doit être UNIQUEMENT un objet JSON valide (aucun texte avant ou après, pas de balises markdown), respectant exactement ce schéma :

{
  "titreSynthetique": string,          // titre court et clair résumant le sujet réel de la vidéo
  "resume": string,                    // résumé général en 4 à 8 phrases
  "pointsCles": [string, ...],         // 5 à 12 points clés, phrases courtes et autonomes
  "plan": [                            // la vidéo réorganisée par thème/chronologie
    { "titre": string, "contenu": string }
  ],
  "affirmations": [                    // affirmations factuelles vérifiables énoncées dans la vidéo
    {
      "citation": string,              // l'affirmation reformulée brièvement
      "verdict": "vrai" | "faux" | "partiellement vrai" | "invérifiable" | "opinion",
      "commentaire": string,           // explication du verdict, nuances, contexte, ce que disent les sources trouvées
      "confiance": "haute" | "moyenne" | "faible",
      "sources": [string, ...]         // URLs des pages web consultées qui appuient ce verdict (vide si aucune recherche pertinente ou si "opinion")
    }
  ],
  "commentaireFiabilite": string,      // analyse globale de la viabilité/fiabilité du contenu, biais éventuels, sérieux de la source
  "limitesAnalyse": string             // rappel honnête des limites restantes (ex : sujets non trouvés en ligne, sources contradictoires, transcription automatique possiblement imparfaite)
}

Consignes :
- Réponds en français.
- Vérifie les affirmations factuelles par une recherche web réelle plutôt que par déduction ; cite les sources (URLs) qui t'ont permis de conclure.
- Si la recherche ne permet pas de trancher, indique "invérifiable" et "confiance: faible" plutôt que d'inventer une certitude.
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

async function analyzeTranscript({ title, author, fullText }) {
  const truncated = fullText.length > MAX_TRANSCRIPT_CHARS;
  const text = truncated ? fullText.slice(0, MAX_TRANSCRIPT_CHARS) : fullText;

  const anthropic = getClient();
  const messages = [
    {
      role: "user",
      content: buildUserPrompt({ title, author, fullText: text, truncated }),
    },
  ];

  let response;
  let continuations = 0;
  do {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: buildSystemPrompt(),
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_WEB_SEARCHES }],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Continue." });
      continuations += 1;
    } else {
      break;
    }
  } while (continuations < MAX_PAUSE_CONTINUATIONS);

  const textBlocks = response.content.filter((b) => b.type === "text");
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

module.exports = { analyzeTranscript };
