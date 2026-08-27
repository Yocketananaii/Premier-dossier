# Premier Dossier

Application web qui extrait la transcription complète d'une vidéo YouTube, la réorganise en un dossier structuré (résumé, points clés, plan thématique) et **vérifie la véracité des affirmations factuelles** énoncées, avec un commentaire global sur la fiabilité du contenu. Le résultat est exportable en **PDF** ou en **texte brut**.

## Fonctionnement

1. Vous collez l'URL d'une vidéo YouTube.
2. Le serveur récupère les sous-titres (automatiques ou manuels) de la vidéo, ainsi que son titre et sa chaîne.
3. La transcription est envoyée à l'API Claude (Anthropic), qui produit :
   - un résumé et les points clés ;
   - le contenu réorganisé par thème ;
   - une liste des affirmations factuelles avec un verdict (vrai / faux / partiellement vrai / invérifiable / opinion) et une explication ;
   - un commentaire global sur la fiabilité et la véracité de la vidéo ;
   - un rappel honnête des limites de l'analyse.
4. Vous pouvez télécharger le dossier en PDF ou en `.txt`.

⚠️ **Important** : le fact-checking s'appuie sur les connaissances générales du modèle d'IA, **sans recherche web en temps réel**. Il peut donc être incomplet, dépassé (au-delà de sa date de connaissance) ou se tromper sur des sujets très pointus ou très récents. Considérez-le comme une première vérification, pas comme une source définitive — croisez les points importants avec des sources fiables.

## Prérequis

- Node.js 18 ou supérieur.
- Une clé API Anthropic (Claude) : https://console.anthropic.com/

## Installation

```bash
npm install
cp .env.example .env
# puis éditez .env pour renseigner ANTHROPIC_API_KEY
```

## Lancement

```bash
npm start
```

L'application est accessible sur http://localhost:3000.

## Limites connues

- La vidéo doit avoir des sous-titres disponibles sur YouTube (automatiques ou ajoutés manuellement) ; sans sous-titres, la transcription ne peut pas être récupérée.
- Les vidéos très longues (plusieurs heures) peuvent voir leur transcription tronquée avant l'analyse afin de rester dans la limite de contexte du modèle ; un avertissement est alors affiché.
- Les vidéos privées, en accès restreint ou supprimées ne peuvent pas être traitées.

## Structure du projet

```
server.js              serveur Express et routes API
src/youtube.js          extraction de l'ID vidéo, récupération des métadonnées et de la transcription
src/analyze.js          appel à l'API Claude pour le résumé et le fact-checking
src/pdf.js               génération du PDF
src/text.js              génération de l'export texte
public/                  interface web (HTML/CSS/JS)
```
