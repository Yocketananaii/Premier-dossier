# Premier Dossier

Application web (installable comme app sur **Android et iOS**) qui extrait la transcription complète d'une vidéo YouTube, la réorganise en un dossier structuré (résumé, points clés, plan thématique) et **vérifie la véracité des affirmations factuelles** énoncées via de vraies recherches web, avec un commentaire global sur la fiabilité du contenu. Le résultat est exportable en **PDF** ou en **texte brut**.

## Fonctionnement et architecture

1. Vous collez l'URL d'une vidéo YouTube.
2. Le **serveur** (Node/Express) récupère les sous-titres (automatiques ou manuels) de la vidéo, ainsi que son titre et sa chaîne — aucune clé API n'est nécessaire pour cette étape.
3. Le **navigateur** (votre téléphone ou ordinateur) envoie ensuite la transcription **directement à l'API Claude** (Anthropic), avec **votre propre clé API**, en utilisant l'outil `web_search` pour vérifier chaque affirmation factuelle repérée dans la vidéo par de vraies recherches web. Le serveur de l'application ne voit jamais votre clé ni le contenu de l'analyse.
4. Claude produit :
   - un résumé et les points clés ;
   - le contenu réorganisé par thème ;
   - une liste des affirmations factuelles avec un verdict (vrai / faux / partiellement vrai / invérifiable / opinion), une explication et les **sources web** consultées ;
   - un commentaire global sur la fiabilité et la véracité de la vidéo ;
   - un rappel honnête des limites de l'analyse.
5. Vous pouvez télécharger le dossier en PDF ou en `.txt` (sources incluses) — cette étape repasse par le serveur (génération de fichier), sans clé API requise.

### Pourquoi une clé API par utilisateur ?

Un compte Claude.ai (l'abonnement de chat Free/Pro/Max) **n'est pas la même chose** qu'une clé API : l'API est facturée séparément, à l'usage, via https://console.anthropic.com/settings/keys. Chaque personne qui utilise cette application doit y créer sa propre clé (quelques dollars de crédit suffisent pour de nombreuses analyses) et la coller dans les **Paramètres (⚙️)** de l'app. Elle est stockée uniquement dans le navigateur de l'appareil (`localStorage`) et n'est jamais envoyée au serveur de l'application — seulement à l'API d'Anthropic, en HTTPS direct depuis le téléphone/ordinateur.

⚠️ **Important** : même avec une recherche web réelle, le fact-checking automatique peut se tromper (sources contradictoires, contenu difficile à trouver en ligne, nuances mal interprétées). Considérez-le comme une aide sérieuse à la vérification, pas comme une source définitive — les sources citées vous permettent de recouper vous-même les points importants.

## Installer l'application sur Android (PWA)

L'application est une **Progressive Web App** : pas besoin de Play Store ni de fichier `.apk`.

1. Déployez le serveur quelque part accessible en HTTPS depuis votre téléphone (voir « Déploiement » ci-dessous), ou lancez-le en local et exposez-le sur votre réseau.
2. Ouvrez l'URL de l'application dans **Chrome sur Android**.
3. Ouvrez le menu ⋮ de Chrome → **« Installer l'application »** (ou « Ajouter à l'écran d'accueil »).
4. Une icône « Premier Dossier » apparaît sur l'écran d'accueil et lance l'app en plein écran, comme une app native.
5. Ouvrez les **Paramètres (⚙️)** dans l'app et collez votre clé API Anthropic (une seule fois — elle reste sur l'appareil).

L'app fonctionne aussi installée sur ordinateur (Chrome/Edge : icône d'installation dans la barre d'adresse).

## Installer l'application sur iPhone / iPad (Safari)

Même application, même serveur — pas de build ni de fichier séparé pour iOS.

1. Ouvrez l'URL de l'application dans **Safari** (obligatoire : sur iOS, seul Safari peut ajouter une PWA à l'écran d'accueil avec un affichage plein écran — Chrome ou Firefox pour iOS ne le proposent pas, même si le reste du navigateur fonctionne).
2. Touchez le bouton **Partager** (le carré avec la flèche vers le haut), en bas de l'écran.
3. Choisissez **« Sur l'écran d'accueil »**, puis **« Ajouter »**.
4. Une icône « Dossier » apparaît sur l'écran d'accueil et lance l'app en plein écran, sans barre d'adresse.
5. Ouvrez les **Paramètres (⚙️)** dans l'app et collez votre clé API Anthropic.

⚠️ Particularité iOS : Safari peut occasionnellement vider le stockage local d'une app peu utilisée (au bout de plusieurs semaines d'inactivité), ce qui effacerait la clé API enregistrée. Si l'app la redemande après une longue pause, c'est normal — il suffit de la recoller.

### Déploiement

Le serveur Node doit tourner quelque part joignable en HTTPS (obligatoire pour qu'un navigateur autorise l'installation en PWA et l'appel à l'API Anthropic). N'importe quel hébergeur Node convient (Render, Railway, Fly.io, un VPS avec Nginx + certificat TLS, etc.) : il suffit de builder puis lancer `npm start` — aucune variable d'environnement secrète n'est nécessaire côté serveur, puisque les clés API restent sur l'appareil de chaque utilisateur.

## Prérequis

- Node.js 18 ou supérieur (pour faire tourner le serveur).
- Une clé API Anthropic par utilisateur : https://console.anthropic.com/settings/keys

## Installation (développement local)

```bash
npm install
```

## Lancement

```bash
npm start
```

L'application est accessible sur http://localhost:3000. Ouvrez les Paramètres (⚙️) pour y coller votre clé API Anthropic avant de lancer une analyse.

## Limites connues

- La vidéo doit avoir des sous-titres disponibles sur YouTube (automatiques ou ajoutés manuellement) ; sans sous-titres, la transcription ne peut pas être récupérée.
- Les vidéos très longues (plusieurs heures) peuvent voir leur transcription tronquée avant l'analyse afin de rester dans la limite de contexte du modèle ; un avertissement est alors affiché.
- Les vidéos privées, en accès restreint ou supprimées ne peuvent pas être traitées.
- L'appel à Claude se fait directement depuis le navigateur : sur un appareil partagé ou public, pensez à supprimer votre clé API dans les Paramètres après usage.
- Sur iOS, l'installation en écran d'accueil plein écran n'est possible que depuis Safari (pas depuis Chrome/Firefox iOS). Le stockage de la clé API peut être effacé par Safari après une longue période d'inactivité (voir ci-dessus).

## Structure du projet

```
server.js                serveur Express : récupération transcription + export PDF/texte (aucune clé API ici)
src/youtube.js           extraction de l'ID vidéo, récupération des métadonnées et de la transcription
src/pdf.js               génération du PDF
src/text.js              génération de l'export texte
scripts/generate-icons.js génère les icônes PNG de la PWA (public/icons/)
public/                  interface web (PWA) : HTML/CSS/JS, manifest, service worker
public/script.js         logique client : gestion de la clé API, appel direct à l'API Claude (avec web_search), rendu du résultat
```
