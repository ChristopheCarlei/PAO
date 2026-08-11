# Cartes PAO — Logotopos

Application web de flashcards pour mémoriser les **110 nombres de 0 à 99** avec le système
PAO (Personnage – Action – Objet) du projet Logotopos.

Chaque nombre possède une carte recto-verso :

- **Recto** — l'image PAO générée (le personnage en pleine action avec son objet) et la phrase
  correspondante en bandeau bas.
- **Verso** — le fond de l'environnement de la dizaine et le nombre, chaque chiffre peint dans
  sa couleur d'ancre.

## Fonctionnalités

- **Répétition espacée** type SM-2 simplifié — intervalles 1 j · 3 j · 7 j · 16 j · 35 j,
  un « Raté » remet la carte à zéro et la repasse en fin de session.
- **Deux sens de révision** — *Nombre → PAO* (on part du verso) et *PAO → Nombre*
  (on part du recto, phrase masquée), ou alternance automatique.
- **Chronomètre** — temps de rappel par carte, moyenne affichée en fin de session.
- **Progression par environnement** — un anneau par dizaine sur l'accueil (0x Cimetière …
  9x Ciel).
- **Révision par environnement** — une session sur une seule dizaine, les 11 cartes mélangées.
- **Tirage aléatoire 00–99** — entraînement libre, hors file de révision (n'affecte pas le
  calendrier SRS).
- **Dates historiques** — saisissez une date (1492, 1789 …) : elle est découpée en paires et
  les cartes correspondantes s'affichent à enchaîner en une seule image mentale.
- **Catalogue** — les 110 cartes série par série, retournables d'un clic.
- **Hors ligne** — service worker : une fois les cartes vues, l'application fonctionne sans
  réseau et s'installe sur l'écran d'accueil (PWA).
- **Progression locale** — tout est stocké dans `localStorage`, avec export / import JSON.
  Aucun compte, aucun serveur.

## Raccourcis

| Geste / touche | Effet |
|---|---|
| Clic, tap, `Espace` | Retourner la carte |
| `1` / `2` / `3` | Noter Raté / Difficile / Acquis |
| `←` / `→`, balayage horizontal | Carte précédente / suivante |
| `Échap` | Quitter la session |

## Lancer en local

L'application est en HTML/CSS/JS natif : **aucune dépendance, aucune étape de build**.
Servez le dossier sur un serveur statique, par exemple :

```bash
npx serve .
```

Puis ouvrez l'adresse indiquée. (Un simple double-clic sur `index.html` fonctionne aussi,
mais le mode hors ligne demande `http://` ou `https://`.)

## Publier sur GitHub Pages

Dans **Settings → Pages**, choisir *Deploy from a branch* → branche `main`, dossier `/ (root)`.
Le fichier `.nojekyll` est déjà présent pour que Pages serve les dossiers tels quels.

## Structure

```
index.html                 coquille de l'application
css/app.css                feuille de style unique (thème sombre, mobile d'abord)
js/data.js                 les 110 cartes — source de vérité des données
js/store.js                localStorage + planification SM-2
js/card.js                 rendu recto / verso des cartes
js/app.js                  vues, sessions, interactions
sw.js                      service worker (hors ligne)
manifest.webmanifest       installation PWA
assets/pao/*.webp          110 images PAO, 620 × 620
assets/verso/*.webp        10 fonds d'environnement, 620 × 620
```

## Données

`js/data.js` contient les 110 tuples `[personnage, liaison, mot, liaison, mot]` ; les segments
d'index pair sont en gras, les segments impairs sont les mots de liaison. Les images viennent
du projet Logotopos (générées avec Nano Banana Pro) et sont converties en WebP pour l'écran.

**Ancres couleur** — la couleur du second chiffre :

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| noir | jaune doré | gris | bleu foncé | marron | blanc glacé | rouge martien | vert foncé | orange | bleu ciel |

Le premier chiffre, lui, est porté par l'environnement : cimetière, désert, lune, océan,
campagne, banquise, Mars, forêt, villes, ciel.
