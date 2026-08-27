// Dictionnaire de traduction pour le rendu du dossier (PDF, export texte, interface).
// Le contenu généré par l'IA (résumé, points clés, commentaires...) est lui-même
// rédigé dans la langue choisie via le prompt (voir buildSystemPrompt côté client) ;
// ce fichier ne traduit que les libellés fixes du gabarit (titres de section, etc.)
// et les valeurs d'énumération "verdict"/"confiance", qui restent des tokens fixes
// en anglais dans le JSON quelle que soit la langue de réponse, pour ne jamais
// casser la détection de couleur/tri selon la langue choisie.
//
// IMPORTANT : ce fichier doit rester identique à public/i18n.js (copie navigateur).

const SUPPORTED_LANGS = ["fr", "en", "es", "de", "it", "pt"];

const I18N = {
  fr: {
    name: "français",
    locale: "fr-FR",
    labels: {
      dossierTitle: "Dossier vidéo",
      summary: "Résumé",
      keyPoints: "Points clés à retenir",
      reorganized: "Contenu réorganisé par thème",
      factCheck: "Vérification des faits (fact-checking)",
      reliability: "Commentaire sur la fiabilité et la véracité globale",
      limits: "Limites de cette analyse",
      sourceVideo: "Vidéo source",
      channel: "Chaîne",
      duration: "Durée",
      urlLabel: "URL",
      generatedOn: "Dossier généré le",
      sourcesLabel: "Sources",
      verdictLabel: "Verdict",
      confidenceLabel: "confiance",
      truncatedNote: "Note : la transcription était très longue et a été tronquée pour l'analyse.",
      unknownDuration: "durée inconnue",
      noSummary: "Non disponible.",
      defaultLimits:
        "Cette analyse a été générée automatiquement par une IA, à l'aide de recherches web en temps réel pour vérifier les affirmations factuelles.",
      noSearchFallbackNote:
        "Vérification web non disponible avec cette clé (quota atteint ou fonctionnalité non activée) : cette analyse se base uniquement sur les connaissances générales du modèle, sans recherche en temps réel. Ces connaissances datent d'environ début 2025 (avec des mises à jour partielles pour certains domaines techniques jusqu'à début 2026) — les faits plus récents peuvent ne pas être connus du modèle.",
      verdicts: {
        true: "Vrai",
        false: "Faux",
        partially_true: "Partiellement vrai",
        unverifiable: "Invérifiable",
        opinion: "Opinion",
      },
      confidences: { high: "Haute", medium: "Moyenne", low: "Faible" },
    },
  },
  en: {
    name: "anglais",
    locale: "en-US",
    labels: {
      dossierTitle: "Video report",
      summary: "Summary",
      keyPoints: "Key takeaways",
      reorganized: "Content reorganized by topic",
      factCheck: "Fact-checking",
      reliability: "Overall reliability and accuracy assessment",
      limits: "Limitations of this analysis",
      sourceVideo: "Source video",
      channel: "Channel",
      duration: "Duration",
      urlLabel: "URL",
      generatedOn: "Report generated on",
      sourcesLabel: "Sources",
      verdictLabel: "Verdict",
      confidenceLabel: "confidence",
      truncatedNote: "Note: the transcript was very long and was truncated for this analysis.",
      unknownDuration: "unknown duration",
      noSummary: "Not available.",
      defaultLimits:
        "This analysis was generated automatically by an AI, using real-time web searches to verify factual claims.",
      noSearchFallbackNote:
        "Web verification was not available with this key (quota reached or feature not enabled): this analysis relies only on the model's general knowledge, without real-time search. That knowledge dates from around early 2025 (with partial updates for some technical domains up to early 2026) — more recent facts may not be known to the model.",
      verdicts: {
        true: "True",
        false: "False",
        partially_true: "Partially true",
        unverifiable: "Unverifiable",
        opinion: "Opinion",
      },
      confidences: { high: "High", medium: "Medium", low: "Low" },
    },
  },
  es: {
    name: "espagnol",
    locale: "es-ES",
    labels: {
      dossierTitle: "Informe del vídeo",
      summary: "Resumen",
      keyPoints: "Puntos clave",
      reorganized: "Contenido reorganizado por tema",
      factCheck: "Verificación de hechos",
      reliability: "Comentario sobre la fiabilidad y veracidad global",
      limits: "Límites de este análisis",
      sourceVideo: "Vídeo de origen",
      channel: "Canal",
      duration: "Duración",
      urlLabel: "URL",
      generatedOn: "Informe generado el",
      sourcesLabel: "Fuentes",
      verdictLabel: "Veredicto",
      confidenceLabel: "confianza",
      truncatedNote: "Nota: la transcripción era muy larga y se truncó para este análisis.",
      unknownDuration: "duración desconocida",
      noSummary: "No disponible.",
      defaultLimits:
        "Este análisis fue generado automáticamente por una IA, utilizando búsquedas web en tiempo real para verificar las afirmaciones factuales.",
      noSearchFallbackNote:
        "La verificación web no estaba disponible con esta clave (cuota alcanzada o función no habilitada): este análisis se basa únicamente en el conocimiento general del modelo, sin búsqueda en tiempo real. Ese conocimiento data de principios de 2025 aproximadamente (con actualizaciones parciales en algunos ámbitos técnicos hasta principios de 2026) — es posible que el modelo no conozca los hechos más recientes.",
      verdicts: {
        true: "Verdadero",
        false: "Falso",
        partially_true: "Parcialmente verdadero",
        unverifiable: "No verificable",
        opinion: "Opinión",
      },
      confidences: { high: "Alta", medium: "Media", low: "Baja" },
    },
  },
  de: {
    name: "allemand",
    locale: "de-DE",
    labels: {
      dossierTitle: "Video-Dossier",
      summary: "Zusammenfassung",
      keyPoints: "Wichtigste Punkte",
      reorganized: "Nach Themen geordneter Inhalt",
      factCheck: "Faktencheck",
      reliability: "Kommentar zur Zuverlässigkeit und Richtigkeit insgesamt",
      limits: "Grenzen dieser Analyse",
      sourceVideo: "Quellvideo",
      channel: "Kanal",
      duration: "Dauer",
      urlLabel: "URL",
      generatedOn: "Dossier erstellt am",
      sourcesLabel: "Quellen",
      verdictLabel: "Urteil",
      confidenceLabel: "Konfidenz",
      truncatedNote: "Hinweis: Das Transkript war sehr lang und wurde für diese Analyse gekürzt.",
      unknownDuration: "unbekannte Dauer",
      noSummary: "Nicht verfügbar.",
      defaultLimits:
        "Diese Analyse wurde automatisch von einer KI erstellt, wobei Web-Suchen in Echtzeit zur Überprüfung der Fakten verwendet wurden.",
      noSearchFallbackNote:
        "Web-Überprüfung mit diesem Schlüssel nicht verfügbar (Kontingent erreicht oder Funktion nicht aktiviert): Diese Analyse basiert ausschließlich auf dem allgemeinen Wissen des Modells, ohne Echtzeitsuche. Dieses Wissen stammt etwa von Anfang 2025 (mit teilweisen Aktualisierungen für einige technische Bereiche bis Anfang 2026) — neuere Fakten sind dem Modell möglicherweise nicht bekannt.",
      verdicts: {
        true: "Wahr",
        false: "Falsch",
        partially_true: "Teilweise wahr",
        unverifiable: "Nicht überprüfbar",
        opinion: "Meinung",
      },
      confidences: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
    },
  },
  it: {
    name: "italien",
    locale: "it-IT",
    labels: {
      dossierTitle: "Dossier video",
      summary: "Riepilogo",
      keyPoints: "Punti chiave",
      reorganized: "Contenuto riorganizzato per argomento",
      factCheck: "Verifica dei fatti",
      reliability: "Commento sull'affidabilità e veridicità complessiva",
      limits: "Limiti di questa analisi",
      sourceVideo: "Video di origine",
      channel: "Canale",
      duration: "Durata",
      urlLabel: "URL",
      generatedOn: "Dossier generato il",
      sourcesLabel: "Fonti",
      verdictLabel: "Verdetto",
      confidenceLabel: "affidabilità",
      truncatedNote: "Nota: la trascrizione era molto lunga ed è stata troncata per questa analisi.",
      unknownDuration: "durata sconosciuta",
      noSummary: "Non disponibile.",
      defaultLimits:
        "Questa analisi è stata generata automaticamente da un'IA, utilizzando ricerche web in tempo reale per verificare le affermazioni fattuali.",
      noSearchFallbackNote:
        "Verifica web non disponibile con questa chiave (quota raggiunta o funzione non abilitata): questa analisi si basa solo sulla conoscenza generale del modello, senza ricerca in tempo reale. Questa conoscenza risale a circa inizio 2025 (con aggiornamenti parziali per alcuni ambiti tecnici fino a inizio 2026) — i fatti più recenti potrebbero non essere noti al modello.",
      verdicts: {
        true: "Vero",
        false: "Falso",
        partially_true: "Parzialmente vero",
        unverifiable: "Non verificabile",
        opinion: "Opinione",
      },
      confidences: { high: "Alta", medium: "Media", low: "Bassa" },
    },
  },
  pt: {
    name: "portugais",
    locale: "pt-PT",
    labels: {
      dossierTitle: "Dossiê do vídeo",
      summary: "Resumo",
      keyPoints: "Pontos-chave",
      reorganized: "Conteúdo reorganizado por tema",
      factCheck: "Verificação de fatos",
      reliability: "Comentário sobre a fiabilidade e veracidade geral",
      limits: "Limites desta análise",
      sourceVideo: "Vídeo de origem",
      channel: "Canal",
      duration: "Duração",
      urlLabel: "URL",
      generatedOn: "Dossiê gerado em",
      sourcesLabel: "Fontes",
      verdictLabel: "Veredito",
      confidenceLabel: "confiança",
      truncatedNote: "Nota: a transcrição era muito longa e foi truncada para esta análise.",
      unknownDuration: "duração desconhecida",
      noSummary: "Não disponível.",
      defaultLimits:
        "Esta análise foi gerada automaticamente por uma IA, utilizando pesquisas na web em tempo real para verificar as afirmações factuais.",
      noSearchFallbackNote:
        "Verificação na web não disponível com esta chave (quota atingida ou funcionalidade não ativada): esta análise baseia-se apenas no conhecimento geral do modelo, sem pesquisa em tempo real. Esse conhecimento é de cerca do início de 2025 (com atualizações parciais em alguns domínios técnicos até início de 2026) — factos mais recentes podem não ser conhecidos pelo modelo.",
      verdicts: {
        true: "Verdadeiro",
        false: "Falso",
        partially_true: "Parcialmente verdadeiro",
        unverifiable: "Não verificável",
        opinion: "Opinião",
      },
      confidences: { high: "Alta", medium: "Média", low: "Baixa" },
    },
  },
};

function getI18n(lang) {
  return I18N[lang] || I18N.fr;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SUPPORTED_LANGS, I18N, getI18n };
} else if (typeof window !== "undefined") {
  window.SUPPORTED_LANGS = SUPPORTED_LANGS;
  window.I18N = I18N;
  window.getI18n = getI18n;
}
