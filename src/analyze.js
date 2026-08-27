const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_TRANSCRIPT_CHARS = 350000; // marge de sécurité sous la fenêtre de contexte

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

const SYSTEM_PROMPT = `Tu es un analyste rigoureux chargé de traiter la transcription d'une vidéo YouTube.
Tu dois répondre UNIQUEMENT avec un objet JSON valide (aucun texte avant ou après, pas de balises markdown), respectant exactement ce schéma :

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
      "commentaire": string,           // explication du verdict, nuances, contexte
      "confiance": "haute" | "moyenne" | "faible"
    }
  ],
  "commentaireFiabilite": string,      // analyse globale de la viabilité/fiabilité du contenu, biais éventuels, sérieux de la source
  "limitesAnalyse": string             // rappel honnête des limites (pas de recherche web en temps réel, connaissances à jour jusqu'à une certaine date, transcription automatique possiblement imparfaite)
}

Consignes :
- Réponds en français.
- Base le fact-checking sur tes connaissances générales. Si tu n'es pas certain d'un fait, indique "invérifiable" ou "confiance: faible" plutôt que d'inventer une certitude.
- Distingue clairement les faits vérifiables des opinions ou jugements de valeur (verdict "opinion").
- Sois factuel, neutre et évite tout jugement sur les personnes ; concentre-toi sur les affirmations.
- N'invente jamais de contenu qui ne figure pas dans la transcription fournie.`;

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
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt({ title, author, fullText: text, truncated }),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Réponse inattendue de l'IA (aucun texte).");

  let analysis;
  try {
    analysis = extractJson(textBlock.text);
  } catch (err) {
    throw new Error("Impossible d'interpréter la réponse de l'IA : " + err.message);
  }

  return { analysis, truncated };
}

module.exports = { analyzeTranscript };
