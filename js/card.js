/* Rendu des cartes recto / verso, fidèle au design validé.
   Les tailles internes sont exprimées en cqw : la carte reste identique à elle-même
   quelle que soit sa largeur (session plein écran, vignette de catalogue, dates). */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Recto : l'image PAO + le bandeau de la phrase. */
  function recto(card, opts) {
    opts = opts || {};
    var parts = card.parts.map(function (p) {
      return p.bold
        ? '<b>' + esc(p.text) + '</b>'
        : '<span>' + esc(p.text) + '</span>';
    }).join('');

    var band = opts.hidePhrase
      ? ''
      : '<div class="card-band"><p class="card-phrase">' + parts + '</p></div>';

    return '<img class="card-img" src="' + esc(card.img) + '" alt="' + esc(card.phrase) +
      '" loading="lazy" decoding="async">' + band;
  }

  /* Verso : le fond d'environnement + le nombre, chaque chiffre dans son ancre couleur. */
  function verso(card, opts) {
    opts = opts || {};
    var digits = card.single
      ? '<span style="color:' + card.anchor + '">' + card.unitDigit + '</span>'
      : '<span style="color:' + card.tensColor + '">' + card.tensDigit + '</span>' +
        '<span style="color:' + card.anchor + '">' + card.unitDigit + '</span>';

    var num = opts.hideNumber ? '' : '<div class="card-num">' + digits + '</div>';

    return '<img class="card-img" src="' + esc(card.verso) + '" alt="' + esc(card.env) +
      '" loading="lazy" decoding="async">' + num;
  }

  /* Carte retournable. `front` et `back` valent 'recto' ou 'verso'. */
  function flipCard(card, front, back, opts) {
    opts = opts || {};
    var faceA = front === 'recto' ? recto(card, opts.front) : verso(card, opts.front);
    var faceB = back === 'recto' ? recto(card, opts.back) : verso(card, opts.back);
    return '<div class="card-frame">' +
      '<div class="card' + (opts.flipped ? ' is-flipped' : '') + '" data-card="' + esc(card.id) + '">' +
        '<div class="card-face card-face--front">' + faceA + '</div>' +
        '<div class="card-face card-face--back">' + faceB + '</div>' +
      '</div>' +
    '</div>';
  }

  /* Carte fixe (catalogue, dates) : une seule face, pas de rotation. */
  function staticCard(card, face, opts) {
    var inner = face === 'recto' ? recto(card, opts) : verso(card, opts);
    return '<div class="card-frame">' +
      '<div class="card card--static">' +
        '<div class="card-face card-face--front">' + inner + '</div>' +
      '</div>' +
    '</div>';
  }

  /* Phrase P-A-O en texte courant (récapitulatifs, réponses). */
  function phraseHTML(card) {
    return card.parts.map(function (p) {
      return p.bold ? '<b>' + esc(p.text) + '</b>' : '<span>' + esc(p.text) + '</span>';
    }).join(' ');
  }

  global.CardView = {
    esc: esc,
    recto: recto,
    verso: verso,
    flipCard: flipCard,
    staticCard: staticCard,
    phraseHTML: phraseHTML
  };
})(window);
