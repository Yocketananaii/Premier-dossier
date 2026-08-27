# 🧲 Extracto

Application web (installable comme app sur **Android et iOS**) qui extrait la transcription complète d'une vidéo YouTube, la réorganise en un dossier structuré (résumé, points clés, plan thématique) et **vérifie la véracité des affirmations factuelles** énoncées via de vraies recherches web, avec un commentaire global sur la fiabilité du contenu. Le résultat est exportable en **PDF** ou en **texte brut**, dans la langue de votre choix.

## Fonctionnement et architecture

1. Vous collez l'URL d'une vidéo YouTube (ou vous la partagez directement depuis une autre app — voir plus bas).
2. Le **serveur** (Node/Express) récupère les sous-titres (automatiques ou manuels) de la vidéo, ainsi que son titre et sa chaîne — aucune clé API n'est nécessaire pour cette étape.
3. Le **navigateur** (votre téléphone ou ordinateur) envoie ensuite la transcription **directement au fournisseur IA choisi** (Google Gemini ou Anthropic Claude, au choix dans les Paramètres), avec **votre propre clé API**, en utilisant la recherche web intégrée du fournisseur pour vérifier chaque affirmation factuelle repérée dans la vidéo. Le serveur de l'application ne voit jamais votre clé ni le contenu de l'analyse.
4. Le modèle choisi produit :
   - un résumé et les points clés ;
   - le contenu réorganisé par thème ;
   - une liste des affirmations factuelles avec un verdict (vrai / faux / partiellement vrai / invérifiable / opinion), une explication et les **sources web** consultées ;
   - un commentaire global sur la fiabilité et la véracité de la vidéo ;
   - un rappel honnête des limites de l'analyse.
5. Vous pouvez télécharger le dossier en PDF ou en `.txt` (sources incluses) — cette étape repasse par le serveur (génération de fichier), sans clé API requise.

### Choisir son fournisseur IA (Gemini gratuit, ou Claude payant)

Dans les **Paramètres (⚙️)**, un menu **« Fournisseur IA »** permet de choisir entre :

- **Google Gemini** (recommandé, par défaut) — clé API **100 % gratuite, sans carte bancaire**, obtenue en 30 secondes sur [aistudio.google.com](https://aistudio.google.com/apikey) avec un simple compte Google. Utilise le modèle Gemini 3.6 Flash avec recherche Google intégrée (gratuite jusqu'à 5 000 recherches/mois — largement suffisant pour un usage familial).
- **Anthropic Claude** — qualité d'analyse généralement supérieure, mais nécessite une clé payante (facturée à l'usage, carte bancaire requise). Utile si vous ou vos proches avez déjà une clé Anthropic.

C'est ce choix Gemini qui rend l'app accessible à tous sans barrière financière : ChatGPT (OpenAI) et Perplexity n'offrent aucune clé API gratuite (carte bancaire exigée dès le premier appel), ils ne sont donc pas proposés ici.

**Recherche web indisponible (rare)** : si le quota gratuit de recherche Gemini est dépassé (au-delà de 5 000/mois) ou indisponible pour une autre raison, l'app se rabat automatiquement sur une analyse sans recherche en temps réel, et l'indique clairement dans la section « Limites de cette analyse » du dossier, en précisant la date jusqu'à laquelle les connaissances du modèle sont à jour (début 2025 pour la plupart des sujets, mi-2026 pour certains domaines techniques).

### Langue du dossier

Un sélecteur à côté du champ URL permet de choisir la langue du dossier généré : 🇫🇷 français, 🇬🇧 anglais, 🇪🇸 espagnol, 🇩🇪 allemand, 🇮🇹 italien ou 🇵🇹 portugais — indépendamment de la langue parlée dans la vidéo d'origine. Le choix est mémorisé sur l'appareil et s'applique au résumé, aux points clés, au fact-checking et à l'export PDF/texte.

### Partager un lien directement depuis WhatsApp

**Sur Android**, une fois l'app installée (voir plus bas), elle apparaît directement comme option dans le menu de partage du téléphone : quand quelqu'un vous envoie un lien YouTube sur WhatsApp, appuyez longuement dessus → **Partager** → choisissez **Extracto**. L'app s'ouvre avec le lien déjà collé et lance l'analyse automatiquement (si votre clé API est déjà enregistrée).

**Sur iPhone**, Apple ne permet pas à une app installée depuis Safari de s'ajouter elle-même au menu de partage (contrairement à Android) — c'est une limitation du système, pas de l'application. La solution gratuite et sans App Store consiste à créer un petit **Raccourci** (app **Raccourcis**, préinstallée sur tout iPhone), qui lui peut apparaître dans le menu de partage et transmettre le lien à Extracto. À faire une seule fois :

1. Ouvrez l'app **Raccourcis** → onglet **Mes raccourcis** → **+** (nouveau raccourci).
2. **Ajouter une action** → cherchez **Texte** → ajoutez-la. Touchez le champ de texte, puis touchez **Entrée du raccourci** dans la barre de variables au-dessus du clavier pour l'insérer.
3. **Ajouter une action** → cherchez **Encoder l'URL** → ajoutez-la (elle prendra automatiquement le texte de l'étape précédente en entrée).
4. **Ajouter une action** → cherchez **URL** → dans le champ, tapez `https://VOTRE-URL.onrender.com/?text=` puis insérez le résultat de l'étape « Encoder l'URL » juste après (via la barre de variables).
5. **Ajouter une action** → cherchez **Ouvrir les URL** → laissez-la utiliser l'URL de l'étape précédente.
6. Touchez l'icône **⚙️** en haut du raccourci → activez **« Utiliser avec le partage »** → réglez les types acceptés sur **URLs** et **Texte**.
7. Renommez le raccourci **« Extracto »**, donnez-lui une icône/couleur sympa si vous voulez, puis fermez.

Le raccourci apparaît désormais dans le menu de partage de Safari, WhatsApp, YouTube, etc. — même principe que sur Android : sélectionner **Extracto** ouvre l'app avec le lien déjà rempli.

**Pour l'envoyer à vos proches** (pas besoin qu'ils refassent toutes ces étapes) : dans l'app Raccourcis, appui long sur le raccourci **Extracto** → **Partager** → **Copier le lien iCloud**. Collez ce lien dans WhatsApp ; chacun n'a plus qu'à l'ouvrir et toucher **« Ajouter un raccourci »** (un message « raccourci non signé » peut apparaître — c'est normal pour un raccourci personnel, sans rapport avec la sécurité de l'app elle-même).

*Remplacez `VOTRE-URL.onrender.com` par l'adresse réelle de votre app une fois déployée (voir « Déployer l'app » ci-dessous).*

⚠️ Différence avec Android : le raccourci ouvre le lien dans Safari plutôt que dans l'icône installée d'Extracto — l'expérience reste identique (même clé API reconnue, même analyse), juste avec la barre d'adresse Safari visible. Une vraie intégration native (icône Extracto elle-même dans le menu de partage iOS) nécessiterait de publier une app sur l'App Store (compte développeur à 99 $/an, Mac ou service de build) — pas fait pour l'instant, mais possible plus tard si besoin.

### Pourquoi une clé API par utilisateur ?

Un compte de chat grand public (claude.ai, gemini.google.com...) **n'est pas la même chose** qu'une clé API : l'API est un accès séparé, pensé pour les développeurs. Avec Gemini, cette clé reste gratuite (voir ci-dessus) ; avec Claude, elle est facturée à l'usage via https://console.anthropic.com/settings/keys. Chaque personne qui utilise cette application crée sa propre clé et la colle dans les **Paramètres (⚙️)** de l'app. Elle est stockée uniquement dans le navigateur de l'appareil (`localStorage`) et n'est jamais envoyée au serveur de l'application — seulement au fournisseur choisi, en HTTPS direct depuis le téléphone/ordinateur.

⚠️ **Important** : même avec une recherche web réelle, le fact-checking automatique peut se tromper (sources contradictoires, contenu difficile à trouver en ligne, nuances mal interprétées). Considérez-le comme une aide sérieuse à la vérification, pas comme une source définitive — les sources citées vous permettent de recouper vous-même les points importants.

## Déployer l'app pour pouvoir l'envoyer à sa famille (Render, gratuit)

Pour que vos proches puissent installer l'app en collant simplement un lien, il faut d'abord la mettre en ligne (une adresse `http://localhost:3000` ne fonctionne que sur votre propre ordinateur). **Render** propose un plan gratuit suffisant pour un usage familial, sans carte bancaire :

1. Créez un compte sur https://render.com (vous pouvez vous connecter directement avec votre compte GitHub).
2. Cliquez sur **New +** → **Web Service**.
3. Connectez votre dépôt GitHub `premier-dossier` (autorisez Render à y accéder si demandé).
4. Renseignez :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free
5. Cliquez sur **Create Web Service**. Render construit et démarre l'app (quelques minutes).
6. Une fois prêt, Render vous donne une URL du type `https://extracto-xxxx.onrender.com` — c'est **cette URL** que vous envoyez à vos proches par WhatsApp, avec les instructions d'installation ci-dessous.

⚠️ Sur le plan gratuit, le serveur « s'endort » après 15 minutes sans visite et met 30 à 60 secondes à redémarrer au premier accès suivant — normal, pas un bug. Si vous voulez éviter ce délai (usage plus fréquent ou plus large), un plan payant Render (ou Railway/Fly.io) supprime cette limite.

## Installer l'application sur Android (PWA)

L'application est une **Progressive Web App** : pas besoin de Play Store ni de fichier `.apk`.

1. Ouvrez l'URL de l'application (celle donnée par Render, ou la vôtre) dans **Chrome sur Android**.
2. Ouvrez le menu ⋮ de Chrome → **« Installer l'application »** (ou « Ajouter à l'écran d'accueil »).
3. Une icône « Extracto » apparaît sur l'écran d'accueil et lance l'app en plein écran, comme une app native.
4. Ouvrez les **Paramètres (⚙️)** dans l'app, choisissez votre fournisseur (Gemini par défaut) et collez votre clé API (une seule fois — elle reste sur l'appareil).

L'app fonctionne aussi installée sur ordinateur (Chrome/Edge : icône d'installation dans la barre d'adresse).

## Installer l'application sur iPhone / iPad (Safari)

Même application, même serveur — pas de build ni de fichier séparé pour iOS.

1. Ouvrez l'URL de l'application dans **Safari** (obligatoire : sur iOS, seul Safari peut ajouter une PWA à l'écran d'accueil avec un affichage plein écran — Chrome ou Firefox pour iOS ne le proposent pas, même si le reste du navigateur fonctionne).
2. Touchez le bouton **Partager** (le carré avec la flèche vers le haut), en bas de l'écran.
3. Choisissez **« Sur l'écran d'accueil »**, puis **« Ajouter »**.
4. Une icône « Extracto » apparaît sur l'écran d'accueil et lance l'app en plein écran, sans barre d'adresse.
5. Ouvrez les **Paramètres (⚙️)** dans l'app, choisissez votre fournisseur (Gemini par défaut) et collez votre clé API.

⚠️ Particularité iOS : Safari peut occasionnellement vider le stockage local d'une app peu utilisée (au bout de plusieurs semaines d'inactivité), ce qui effacerait la clé API enregistrée. Si l'app la redemande après une longue pause, c'est normal — il suffit de la recoller.

## Prérequis

- Node.js 18 ou supérieur (pour faire tourner le serveur).
- Une clé API par utilisateur : gratuite avec Google Gemini ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)), ou payante avec Anthropic Claude ([console.anthropic.com](https://console.anthropic.com/settings/keys)).

## Installation (développement local)

```bash
npm install
```

## Lancement

```bash
npm start
```

L'application est accessible sur http://localhost:3000. Ouvrez les Paramètres (⚙️) pour choisir un fournisseur et y coller votre clé API avant de lancer une analyse.

## Limites connues

- La vidéo doit avoir des sous-titres disponibles sur YouTube (automatiques ou ajoutés manuellement) ; sans sous-titres, la transcription ne peut pas être récupérée.
- Les vidéos très longues (plusieurs heures) peuvent voir leur transcription tronquée avant l'analyse afin de rester dans la limite de contexte du modèle ; un avertissement est alors affiché.
- Les vidéos privées, en accès restreint ou supprimées ne peuvent pas être traitées.
- L'appel au fournisseur IA se fait directement depuis le navigateur : sur un appareil partagé ou public, pensez à supprimer votre clé API dans les Paramètres après usage.
- Sur iOS, l'installation en écran d'accueil plein écran n'est possible que depuis Safari (pas depuis Chrome/Firefox iOS), et le partage direct depuis WhatsApp nécessite de créer un Raccourci une fois (voir ci-dessus) — sans lui, il faut copier-coller le lien manuellement. Le stockage de la clé API peut être effacé par Safari après une longue période d'inactivité (voir ci-dessus).
- Sur le plan gratuit Render, le serveur peut mettre jusqu'à une minute à répondre après une période d'inactivité.

## Structure du projet

```
server.js                serveur Express : récupération transcription + export PDF/texte (aucune clé API ici)
src/youtube.js           extraction de l'ID vidéo, récupération des métadonnées et de la transcription
src/pdf.js               génération du PDF (multilingue)
src/text.js              génération de l'export texte (multilingue)
src/i18n.js              dictionnaire de traduction des libellés (PDF/texte), copié tel quel en public/i18n.js pour le navigateur
scripts/generate-icons.js génère les icônes PNG de la PWA (public/icons/) — logo "entonnoir" représentant l'extraction
public/                  interface web (PWA) : HTML/CSS/JS, manifest (avec share_target), service worker
public/script.js         logique client : gestion du fournisseur/clé API et de la langue, réception des liens partagés, appel direct à Gemini ou Claude (avec recherche web), rendu du résultat
```

**Note pour la maintenance** : `src/i18n.js` et `public/i18n.js` doivent rester identiques (le second est chargé tel quel par le navigateur, le premier via `require()` côté serveur). Toute modification des traductions doit être répercutée dans les deux fichiers.
