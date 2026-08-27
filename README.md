# 🧲 Extracto

Application web (installable comme app sur **Android et iOS**) qui extrait la transcription complète d'une vidéo YouTube, la réorganise en un dossier structuré (résumé, points clés, plan thématique) et **vérifie la véracité des affirmations factuelles** énoncées via de vraies recherches web, avec un commentaire global sur la fiabilité du contenu. Le résultat est exportable en **PDF** ou en **texte brut**, dans la langue de votre choix.

## Fonctionnement et architecture

1. Vous collez l'URL d'une vidéo YouTube (ou vous la partagez directement depuis une autre app — voir plus bas).
2. Le **serveur** (Node/Express) récupère les sous-titres (automatiques ou manuels) de la vidéo, ainsi que son titre et sa chaîne.
3. L'analyse se fait avec **Google Gemini**, en utilisant par défaut une **clé API partagée configurée par le propriétaire de l'app** (voir « Configurer la clé Gemini partagée » ci-dessous) : personne n'a besoin de créer de compte ni de clé pour utiliser l'app. Chacun peut aussi choisir dans les **Paramètres (⚙️)** de renseigner sa propre clé Gemini, ou de passer sur **Anthropic Claude** (payant, sa propre clé requise) pour une qualité d'analyse généralement supérieure.
4. Le modèle utilise la recherche web intégrée pour vérifier chaque affirmation factuelle repérée dans la vidéo, et produit :
   - un résumé et les points clés ;
   - le contenu réorganisé par thème ;
   - une liste des affirmations factuelles avec un verdict (vrai / faux / partiellement vrai / invérifiable / opinion), une explication et les **sources web** consultées ;
   - un commentaire global sur la fiabilité et la véracité de la vidéo ;
   - un rappel honnête des limites de l'analyse.
5. Vous pouvez télécharger le dossier en PDF ou en `.txt` (sources incluses).

### Configurer la clé Gemini partagée (celle que tout le monde utilise par défaut)

Le propriétaire de l'app crée **une seule clé Gemini** et la configure comme secret côté serveur : elle n'est **jamais envoyée au navigateur**, donc personne ne peut la récupérer en inspectant le code de la page (contrairement à une clé qui serait mise directement dans le JavaScript de l'app, ce qui la rendrait visible et copiable par n'importe qui).

1. Obtenez une clé sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (gratuite, sans carte bancaire — voir ci-dessous).
2. Sur Render (ou votre hébergeur), allez dans l'onglet **Environment** de votre service, ajoutez une variable **`GEMINI_API_KEY`** avec cette clé comme valeur, puis sauvegardez (Render redéploie automatiquement).
3. C'est tout : toute personne qui ouvre l'app peut analyser des vidéos immédiatement, sans aucun écran de configuration.

**Protection incluse** : la route qui utilise cette clé partagée est limitée à 30 analyses par heure et par adresse IP, pour éviter qu'un usage massif ou automatisé ne fasse grimper votre consommation. Suivez votre usage réel sur [aistudio.google.com](https://aistudio.google.com) (section quotas/facturation).

**Recherche web indisponible (rare)** : si le quota gratuit de recherche Gemini est dépassé (au-delà de 5 000/mois) ou indisponible pour une autre raison, l'app se rabat automatiquement sur une analyse sans recherche en temps réel, et l'indique clairement dans la section « Limites de cette analyse » du dossier, en précisant la date jusqu'à laquelle les connaissances du modèle sont à jour (début 2025 pour la plupart des sujets, mi-2026 pour certains domaines techniques).

### Utiliser sa propre clé plutôt que la clé partagée

Dans les **Paramètres (⚙️)**, chacun peut renseigner sa propre clé à la place de celle du propriétaire :

- **Google Gemini** — clé API **100 % gratuite, sans carte bancaire**, obtenue en 30 secondes sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) avec un simple compte Google.
- **Anthropic Claude** — qualité d'analyse généralement supérieure, mais nécessite une clé payante (facturée à l'usage, carte bancaire requise).

Une clé personnelle renseignée ici est appelée **directement depuis le navigateur de la personne** (jamais via le serveur), et n'est jamais partagée avec qui que ce soit d'autre. ChatGPT (OpenAI) et Perplexity ne sont pas proposés : aucun des deux n'offre de clé API gratuite (carte bancaire exigée dès le premier appel).

### Langue du dossier

Un sélecteur à côté du champ URL permet de choisir la langue du dossier généré : 🇫🇷 français, 🇬🇧 anglais, 🇪🇸 espagnol, 🇩🇪 allemand, 🇮🇹 italien ou 🇵🇹 portugais — indépendamment de la langue parlée dans la vidéo d'origine. Le choix est mémorisé sur l'appareil et s'applique au résumé, aux points clés, au fact-checking et à l'export PDF/texte.

### Partager un lien directement depuis WhatsApp

**Sur Android**, une fois l'app installée (voir plus bas), elle apparaît directement comme option dans le menu de partage du téléphone : quand quelqu'un vous envoie un lien YouTube sur WhatsApp, appuyez longuement dessus → **Partager** → choisissez **Extracto**. L'app s'ouvre avec le lien déjà collé et lance l'analyse automatiquement (avec la clé partagée, ou votre clé personnelle si vous en avez renseigné une).

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

⚠️ Différence avec Android : le raccourci ouvre le lien dans Safari plutôt que dans l'icône installée d'Extracto — l'expérience reste identique, juste avec la barre d'adresse Safari visible. Une vraie intégration native (icône Extracto elle-même dans le menu de partage iOS) nécessiterait de publier une app sur l'App Store (compte développeur à 99 $/an, Mac ou service de build) — pas fait pour l'instant, mais possible plus tard si besoin.

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
5. Dans la section **Environment Variables**, ajoutez `GEMINI_API_KEY` avec votre clé Gemini (voir « Configurer la clé Gemini partagée » ci-dessus) — sinon chacun devra renseigner sa propre clé dans les Paramètres pour pouvoir analyser une vidéo.
6. Cliquez sur **Create Web Service**. Render construit et démarre l'app (quelques minutes).
7. Une fois prêt, Render vous donne une URL du type `https://extracto-xxxx.onrender.com` — c'est **cette URL** que vous envoyez à vos proches par WhatsApp, avec les instructions d'installation ci-dessous.

⚠️ Sur le plan gratuit, le serveur « s'endort » après 15 minutes sans visite et met 30 à 60 secondes à redémarrer au premier accès suivant — normal, pas un bug. Si vous voulez éviter ce délai (usage plus fréquent ou plus large), un plan payant Render (ou Railway/Fly.io) supprime cette limite.

## Installer l'application sur Android (PWA)

L'application est une **Progressive Web App** : pas besoin de Play Store ni de fichier `.apk`.

1. Ouvrez l'URL de l'application (celle donnée par Render, ou la vôtre) dans **Chrome sur Android**.
2. Ouvrez le menu ⋮ de Chrome → **« Installer l'application »** (ou « Ajouter à l'écran d'accueil »).
3. Une icône « Extracto » apparaît sur l'écran d'accueil et lance l'app en plein écran, comme une app native.
4. C'est prêt : collez une URL YouTube et touchez Analyser. Rien d'autre à configurer (une clé Gemini partagée est déjà prête à l'emploi) — sauf si vous préférez utiliser votre propre clé, via les **Paramètres (⚙️)**.

L'app fonctionne aussi installée sur ordinateur (Chrome/Edge : icône d'installation dans la barre d'adresse).

## Installer l'application sur iPhone / iPad (Safari)

Même application, même serveur — pas de build ni de fichier séparé pour iOS.

1. Ouvrez l'URL de l'application dans **Safari** (obligatoire : sur iOS, seul Safari peut ajouter une PWA à l'écran d'accueil avec un affichage plein écran — Chrome ou Firefox pour iOS ne le proposent pas, même si le reste du navigateur fonctionne).
2. Touchez le bouton **Partager** (le carré avec la flèche vers le haut), en bas de l'écran.
3. Choisissez **« Sur l'écran d'accueil »**, puis **« Ajouter »**.
4. Une icône « Extracto » apparaît sur l'écran d'accueil et lance l'app en plein écran, sans barre d'adresse.
5. C'est prêt : collez une URL YouTube et touchez Analyser. Rien d'autre à configurer — sauf si vous préférez utiliser votre propre clé, via les **Paramètres (⚙️)**.

⚠️ Particularité iOS : Safari peut occasionnellement vider le stockage local d'une app peu utilisée (au bout de plusieurs semaines d'inactivité), ce qui effacerait la clé API enregistrée. Si l'app la redemande après une longue pause, c'est normal — il suffit de la recoller.

## Prérequis

- Node.js 18 ou supérieur (pour faire tourner le serveur).
- Une clé API Gemini pour le propriétaire de l'app (gratuite, [aistudio.google.com/apikey](https://aistudio.google.com/apikey)), à configurer comme secret serveur pour que tout le monde puisse l'utiliser sans rien renseigner. Optionnel : chacun peut aussi renseigner sa propre clé Gemini ou Anthropic Claude ([console.anthropic.com](https://console.anthropic.com/settings/keys)) dans les Paramètres.

## Installation (développement local)

```bash
npm install
cp .env.example .env
# éditez .env pour y ajouter votre GEMINI_API_KEY (optionnel en local)
```

## Lancement

```bash
npm start
```

L'application est accessible sur http://localhost:3000. Si `GEMINI_API_KEY` est configurée, l'analyse fonctionne immédiatement ; sinon, ouvrez les Paramètres (⚙️) pour renseigner une clé personnelle.

## Limites connues

- La vidéo doit avoir des sous-titres disponibles sur YouTube (automatiques ou ajoutés manuellement). YouTube bloque parfois la récupération automatique (mesures anti-robot) même quand des sous-titres existent réellement ; dans ce cas, l'app propose de coller manuellement la transcription (copiée depuis le bouton « Afficher la transcription » sur YouTube) plutôt que d'échouer complètement.
- Les vidéos très longues (plusieurs heures) peuvent voir leur transcription tronquée avant l'analyse afin de rester dans la limite de contexte du modèle ; un avertissement est alors affiché.
- Les vidéos privées, en accès restreint ou supprimées ne peuvent pas être traitées.
- La route qui utilise la clé Gemini partagée est limitée à 30 analyses/heure/IP ; au-delà, elle demande de patienter ou d'utiliser sa propre clé (voir « Configurer la clé Gemini partagée »). Une clé personnelle renseignée dans les Paramètres est appelée directement depuis le navigateur : sur un appareil partagé ou public, pensez à la supprimer après usage.
- Sur iOS, l'installation en écran d'accueil plein écran n'est possible que depuis Safari (pas depuis Chrome/Firefox iOS), et le partage direct depuis WhatsApp nécessite de créer un Raccourci une fois (voir ci-dessus) — sans lui, il faut copier-coller le lien manuellement. Le stockage d'une clé personnelle peut être effacé par Safari après une longue période d'inactivité.
- Sur le plan gratuit Render, le serveur peut mettre jusqu'à une minute à répondre après une période d'inactivité.

## Structure du projet

```
server.js                 serveur Express : transcription, analyse via la clé Gemini partagée (avec limite de débit), export PDF/texte
src/youtube.js             extraction de l'ID vidéo, récupération des métadonnées et de la transcription
src/gemini.js               appel serveur à l'API Gemini avec la clé partagée (GEMINI_API_KEY)
src/promptBuilder.js        construction des prompts et extraction du JSON, partagé serveur/navigateur (copié en public/promptBuilder.js)
src/pdf.js                 génération du PDF (multilingue)
src/text.js                 génération de l'export texte (multilingue)
src/i18n.js                 dictionnaire de traduction des libellés (PDF/texte), copié tel quel en public/i18n.js pour le navigateur
scripts/generate-icons.js  génère les icônes PNG de la PWA (public/icons/) — logo "entonnoir" représentant l'extraction
public/                    interface web (PWA) : HTML/CSS/JS, manifest (avec share_target), service worker
public/script.js            logique client : clé/fournisseur, langue, liens partagés, appel à la clé partagée (serveur) ou à une clé personnelle (Gemini/Claude, direct navigateur), rendu du résultat
```

**Note pour la maintenance** : `src/i18n.js`/`public/i18n.js` et `src/promptBuilder.js`/`public/promptBuilder.js` sont chacun deux copies identiques d'un même fichier (l'une chargée par le navigateur, l'autre via `require()` côté serveur). Toute modification de l'un doit être répercutée dans son jumeau.
