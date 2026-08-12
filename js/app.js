/* Application flashcards PAO — vues, sessions et interactions.
   Pas de framework, pas d'étape de build : le fichier est chargé tel quel. */
(function (global) {
  'use strict';

  var PAO = global.PAO;
  var Store = global.Store;
  var CV = global.CardView;
  var esc = CV.esc;

  var root = document.getElementById('app');
  var DAY = 86400000;

  var state = {
    view: 'home',
    session: null,
    summary: null,
    browseSeries: 0,
    dateValue: '',
    toast: null
  };

  var timerHandle = null;

  /* Couleur d'accent de chaque environnement — reprend l'ancre de la dizaine,
     éclaircie quand elle serait illisible sur fond sombre (cimetière, océan, forêt). */
  var ENV_ACCENT = ['#8b93a1', '#e3ae1c', '#aab3bd', '#4a9fe0', '#b57a3f',
    '#bfe0ee', '#d4503f', '#5aa76a', '#ef8214', '#4fb3e8'];

  /* ============================================================
     Utilitaires
     ============================================================ */

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fmtInterval(ms) {
    if (ms < 45 * 60000) return Math.max(1, Math.round(ms / 60000)) + ' min';
    if (ms < DAY) return Math.round(ms / 3600000) + ' h';
    var d = Math.round(ms / DAY);
    if (d < 30) return d + ' j';
    return Math.round(d / 30) + ' mois';
  }

  function fmtSeconds(ms) {
    var s = ms / 1000;
    return (s < 10 ? s.toFixed(1) : Math.round(s)) + ' s';
  }

  function plural(n, one, many) { return n + ' ' + (n <= 1 ? one : many); }

  function toast(message) {
    state.toast = message;
    render();
    setTimeout(function () {
      if (state.toast === message) { state.toast = null; render(); }
    }, 2600);
  }

  /* ============================================================
     Sessions
     ============================================================ */

  function pickDirection() {
    var dir = Store.getSettings().direction;
    if (dir === 'mixed') return Math.random() < 0.5 ? 'num2pao' : 'pao2num';
    return dir;
  }

  function buildSession(opts) {
    var ids = opts.ids;
    var size = opts.size;
    if (size && ids.length > size) ids = ids.slice(0, size);

    var dirs = ids.map(pickDirection);
    return {
      mode: opts.mode,
      title: opts.title,
      subtitle: opts.subtitle || '',
      srs: opts.srs !== false,
      queue: ids,
      dirs: dirs,
      idx: 0,
      revealed: false,
      shownAt: Date.now(),
      elapsed: 0,
      results: [],
      relearned: {}
    };
  }

  function startSRS() {
    var settings = Store.getSettings();
    var now = Date.now();
    var due = PAO.DECK.filter(function (c) { return !Store.isNew(c.id) && Store.isDue(c.id, now); });
    var fresh = PAO.DECK.filter(function (c) { return Store.isNew(c.id); });

    due.sort(function (a, b) {
      return (Store.cardState(a.id).due) - (Store.cardState(b.id).due);
    });

    var ids = due.map(function (c) { return c.id; })
      .concat(fresh.map(function (c) { return c.id; }));

    if (!ids.length) { toast('Rien à réviser pour le moment — bien joué.'); return; }

    state.session = buildSession({
      mode: 'srs',
      title: 'Révision',
      subtitle: plural(due.length, 'carte due', 'cartes dues') + ' · ' + fresh.length + ' nouvelle' + (fresh.length > 1 ? 's' : ''),
      ids: ids,
      size: settings.sessionSize || 0
    });
    state.view = 'session';
    render();
  }

  function startSeries(tens) {
    var s = PAO.SERIES[tens];
    var ids = PAO.DECK.filter(function (c) { return c.tens === tens; }).map(function (c) { return c.id; });
    state.session = buildSession({
      mode: 'series',
      title: s.label + ' · ' + s.env,
      subtitle: '11 cartes de la série',
      ids: shuffle(ids)
    });
    state.view = 'session';
    render();
  }

  function startAll() {
    state.session = buildSession({
      mode: 'all',
      title: 'Tout le paquet',
      subtitle: '110 cartes mélangées',
      ids: shuffle(PAO.DECK.map(function (c) { return c.id; })),
      size: Store.getSettings().sessionSize || 0
    });
    state.view = 'session';
    render();
  }

  function startRandom() {
    state.session = buildSession({
      mode: 'random',
      title: 'Tirage aléatoire',
      subtitle: 'Deux chiffres, hors file de révision',
      ids: shuffle(PAO.PAIRS.map(function (c) { return c.id; })),
      size: Store.getSettings().sessionSize || 20,
      srs: false
    });
    state.view = 'session';
    render();
  }

  function startFromIds(ids, title) {
    state.session = buildSession({ mode: 'series', title: title, subtitle: plural(ids.length, 'carte', 'cartes'), ids: ids });
    state.view = 'session';
    render();
  }

  function currentCard() {
    var s = state.session;
    return s ? PAO.byId(s.queue[s.idx]) : null;
  }

  function reveal() {
    var s = state.session;
    if (!s || s.revealed) return;
    s.revealed = true;
    s.elapsed = Date.now() - s.shownAt;
    stopTimer();

    var card = document.querySelector('.card');
    if (card) card.classList.add('is-flipped');
    renderSessionFooter();
  }

  function gradeCard(g) {
    var s = state.session;
    if (!s || !s.revealed || !s.srs) return;
    var id = s.queue[s.idx];

    Store.grade(id, g);
    s.results.push({ id: id, grade: g, ms: s.elapsed });

    /* Un « raté » repasse en fin de file, une seule fois par session. */
    if (g === 0 && !s.relearned[id]) {
      s.relearned[id] = true;
      s.queue.push(id);
      s.dirs.push(pickDirection());
    }
    next();
  }

  function next() {
    var s = state.session;
    if (!s) return;
    if (s.mode === 'random' && s.revealed) {
      s.results.push({ id: s.queue[s.idx], grade: null, ms: s.elapsed });
    }
    if (s.idx >= s.queue.length - 1) { finish(); return; }
    s.idx++;
    s.revealed = false;
    s.shownAt = Date.now();
    s.elapsed = 0;
    render();
  }

  function prev() {
    var s = state.session;
    if (!s || s.idx === 0) return;
    s.idx--;
    s.revealed = false;
    s.shownAt = Date.now();
    s.elapsed = 0;
    render();
  }

  function finish() {
    var s = state.session;
    stopTimer();
    var graded = s.results.filter(function (r) { return r.grade !== null; });
    var timed = s.results.filter(function (r) { return r.ms > 0; });
    var avg = timed.length
      ? timed.reduce(function (sum, r) { return sum + r.ms; }, 0) / timed.length
      : 0;
    var good = graded.filter(function (r) { return r.grade === 2; }).length;

    var summary = {
      title: s.title,
      seen: s.results.length,
      graded: graded.length,
      good: good,
      rate: graded.length ? Math.round((good / graded.length) * 100) : null,
      avg: avg,
      results: s.results.slice(),
      mode: s.mode
    };

    if (s.results.length) {
      Store.pushSession({
        at: Date.now(),
        mode: s.mode,
        seen: summary.seen,
        rate: summary.rate,
        avg: Math.round(avg)
      });
    }

    state.summary = summary;
    state.session = null;
    state.view = 'summary';
    render();
  }

  function quitSession() {
    if (state.session && state.session.results.length) { finish(); return; }
    stopTimer();
    state.session = null;
    state.view = 'home';
    render();
  }

  /* ============================================================
     Chrono
     ============================================================ */

  function startTimer() {
    stopTimer();
    if (!Store.getSettings().chrono) return;
    timerHandle = setInterval(function () {
      var el = document.querySelector('[data-chrono]');
      var s = state.session;
      if (!el || !s || s.revealed) return;
      el.textContent = fmtSeconds(Date.now() - s.shownAt);
    }, 100);
  }

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  /* ============================================================
     Vue : accueil
     ============================================================ */

  function viewHome() {
    var g = Store.globalStats(PAO.DECK);
    var pct = Math.round((g.mastered / g.total) * 100);

    var tiles = PAO.SERIES.map(function (s) {
      var st = Store.seriesStats(s, PAO.DECK);
      var p = Math.round((st.mastered / st.total) * 100);
      return '<button class="series-tile" data-action="series" data-tens="' + s.tens + '">' +
        '<span class="ring" style="--p:' + p + ';--ring-color:' + ENV_ACCENT[s.tens] + '"><b>' + p + '</b></span>' +
        '<span><span class="name">' + s.label + ' · ' + esc(s.env) + '</span>' +
        '<span class="sub">' + st.mastered + '/' + st.total + ' maîtrisées' +
          (st.due ? ' · ' + st.due + ' dues' : '') + '</span></span>' +
      '</button>';
    }).join('');

    var hist = Store.getHistory().slice(0, 3).map(function (h) {
      var d = new Date(h.at);
      return '<div class="recap-row"><span class="muted small">' +
        d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
        '</span><span class="spacer"></span><span class="small">' + h.seen + ' cartes' +
        (h.rate !== null && h.rate !== undefined ? ' · ' + h.rate + '% acquis' : '') +
        (h.avg ? ' · ' + fmtSeconds(h.avg) : '') + '</span></div>';
    }).join('');

    return '' +
    '<div class="home-head">' +
      '<div><div class="eyebrow">Logotopos</div>' +
      '<h1 class="home-title">Cartes PAO</h1></div>' +
      '<button class="icon-btn" data-action="settings" aria-label="Réglages">⚙</button>' +
    '</div>' +

    '<div class="stack stack-24">' +

      '<div class="hero stack stack-12">' +
        '<div class="row">' +
          '<div><div class="eyebrow">À réviser</div>' +
          '<div class="hero-figure">' + g.due + '</div></div>' +
          '<div class="spacer"></div>' +
          '<div class="center"><div class="tiny">Maîtrisées</div>' +
          '<div style="font-size:18px;font-weight:700">' + pct + '%</div></div>' +
        '</div>' +
        '<button class="btn btn--primary btn--block" data-action="start-srs">Réviser maintenant</button>' +
      '</div>' +

      '<div class="stat-row">' +
        '<div class="stat"><div class="v">' + g.mastered + '</div><div class="k">maîtrisées</div></div>' +
        '<div class="stat"><div class="v">' + g.seen + '</div><div class="k">déjà vues</div></div>' +
        '<div class="stat"><div class="v">' + (g.total - g.seen) + '</div><div class="k">jamais vues</div></div>' +
      '</div>' +

      '<div class="stack stack-12">' +
        '<div class="eyebrow">Par environnement</div>' +
        '<div class="series-grid">' + tiles + '</div>' +
      '</div>' +

      '<div class="stack stack-8">' +
        '<div class="eyebrow">Autres modes</div>' +
        '<button class="btn btn--block" data-action="start-random">🎲 Tirage aléatoire 00–99</button>' +
        '<button class="btn btn--block" data-action="dates">📅 Dates historiques</button>' +
        '<button class="btn btn--block" data-action="start-all">🔁 Réviser tout le paquet</button>' +
        '<button class="btn btn--block" data-action="browse">🗂 Parcourir les 110 cartes</button>' +
      '</div>' +

      (hist ? '<div class="stack stack-8"><div class="eyebrow">Dernières sessions</div>' +
        '<div class="recap-list">' + hist + '</div></div>' : '') +

    '</div>';
  }

  /* ============================================================
     Vue : session
     ============================================================ */

  function sessionFooterHTML() {
    var s = state.session;
    var card = currentCard();
    var chrono = Store.getSettings().chrono;

    if (!s.revealed) {
      return '<p class="answer muted small">' +
          (s.dirs[s.idx] === 'num2pao'
            ? 'Récitez la scène, puis retournez la carte.'
            : 'Retrouvez le nombre, puis retournez la carte.') +
        '</p>' +
        '<button class="btn btn--primary" style="width:min(92vw,520px)" data-action="reveal">Retourner la carte</button>';
    }

    var answer = '<p class="answer"><b style="font-size:17px">' + esc(card.id) + '</b> — ' +
      CV.phraseHTML(card) + '</p>';

    if (!s.srs) {
      return answer +
        (chrono && s.elapsed ? '<p class="tiny">Rappel en ' + fmtSeconds(s.elapsed) + '</p>' : '') +
        '<button class="btn btn--primary" style="width:min(92vw,520px)" data-action="next">Carte suivante</button>';
    }

    var labels = [
      { g: 0, cls: 'grade--bad', name: 'Raté', key: '1' },
      { g: 1, cls: 'grade--mid', name: 'Difficile', key: '2' },
      { g: 2, cls: 'grade--good', name: 'Acquis', key: '3' }
    ].map(function (b) {
      return '<button class="grade ' + b.cls + '" data-action="grade" data-grade="' + b.g + '">' +
        b.name + '<small>' + fmtInterval(Store.preview(card.id, b.g)) + '</small></button>';
    }).join('');

    return answer +
      (chrono && s.elapsed ? '<p class="tiny">Rappel en ' + fmtSeconds(s.elapsed) + '</p>' : '') +
      '<div class="grades">' + labels + '</div>';
  }

  function renderSessionFooter() {
    var footer = document.querySelector('[data-footer]');
    if (footer) footer.innerHTML = sessionFooterHTML();
  }

  function viewSession() {
    var s = state.session;
    var card = currentCard();
    var dir = s.dirs[s.idx];
    var chrono = Store.getSettings().chrono;
    var pct = Math.round(((s.idx) / s.queue.length) * 100);

    /* En « nombre → PAO » on part du verso ; sinon du recto, phrase masquée. */
    var front = dir === 'num2pao' ? 'verso' : 'recto';
    var back = dir === 'num2pao' ? 'recto' : 'verso';
    var faceOpts = dir === 'num2pao'
      ? { front: {}, back: {} }
      : { front: { hidePhrase: true }, back: {} };

    return '' +
    '<div class="session">' +
      '<div class="session-bar">' +
        '<button class="icon-btn" data-action="quit" aria-label="Quitter">✕</button>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="small muted" style="font-variant-numeric:tabular-nums">' +
          (s.idx + 1) + '/' + s.queue.length + '</span>' +
        (chrono ? '<span class="chrono" data-chrono>0.0 s</span>' : '') +
      '</div>' +

      '<div class="center stack stack-8">' +
        '<div class="prompt">' + (dir === 'num2pao' ? 'Nombre → PAO' : 'PAO → Nombre') + '</div>' +
        '<div class="tiny">' + esc(s.title) + '</div>' +
      '</div>' +

      '<div class="session-card" data-swipe>' +
        CV.flipCard(card, front, back, faceOpts) +
      '</div>' +

      '<div class="stack stack-12 center" data-footer style="align-items:center;width:min(92vw,520px)">' +
        sessionFooterHTML() +
      '</div>' +

      '<p class="tiny center">Espace : retourner · 1 / 2 / 3 : noter · ← → : naviguer</p>' +
    '</div>';
  }

  /* ============================================================
     Vue : récapitulatif
     ============================================================ */

  function viewSummary() {
    var sum = state.summary;
    var colors = ['#c0392b', '#e3ae1c', '#3ba55d'];

    var rows = sum.results.map(function (r) {
      var card = PAO.byId(r.id);
      return '<div class="recap-row">' +
        '<span class="dot" style="background:' + (r.grade === null ? '#5a5f6b' : colors[r.grade]) + '"></span>' +
        '<span class="recap-num">' + esc(r.id) + '</span>' +
        '<span class="muted" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(card.phrase) + '</span>' +
        (r.ms ? '<span class="tiny">' + fmtSeconds(r.ms) + '</span>' : '') +
      '</div>';
    }).join('');

    return '' +
    '<div class="stack stack-24">' +
      '<div class="center stack stack-8">' +
        '<div class="eyebrow">Session terminée</div>' +
        '<h1 class="home-title">' + esc(sum.title) + '</h1>' +
      '</div>' +

      '<div class="summary-grid">' +
        '<div class="stat"><div class="v">' + sum.seen + '</div><div class="k">cartes vues</div></div>' +
        (sum.rate !== null ? '<div class="stat"><div class="v">' + sum.rate + '%</div><div class="k">acquises</div></div>' : '') +
        (sum.avg ? '<div class="stat"><div class="v">' + fmtSeconds(sum.avg) + '</div><div class="k">rappel moyen</div></div>' : '') +
      '</div>' +

      '<div class="recap-list">' + rows + '</div>' +

      '<div class="stack stack-8">' +
        '<button class="btn btn--primary btn--block" data-action="start-srs">Continuer à réviser</button>' +
        '<button class="btn btn--block" data-action="home">Retour à l\'accueil</button>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     Vue : catalogue
     ============================================================ */

  function viewBrowse() {
    var tens = state.browseSeries;
    var s = PAO.SERIES[tens];

    var pills = PAO.SERIES.map(function (x) {
      return '<button class="pill' + (x.tens === tens ? ' is-active' : '') +
        '" data-action="browse-series" data-tens="' + x.tens + '">' +
        x.label + ' · ' + esc(x.env) + '</button>';
    }).join('');

    var cards = PAO.DECK.filter(function (c) { return c.tens === tens; }).map(function (c) {
      var st = Store.cardState(c.id);
      var tag = !st ? 'jamais vue'
        : Store.isMastered(c.id) ? 'maîtrisée'
        : 'palier ' + st.step;
      return '<div class="browse-item">' +
        CV.flipCard(c, 'recto', 'verso', {}) +
        '<div class="cap">' + esc(c.id) + ' · ' + tag + '</div>' +
      '</div>';
    }).join('');

    return '' +
    '<div class="stack stack-16">' +
      '<div class="row">' +
        '<button class="icon-btn" data-action="home" aria-label="Retour">←</button>' +
        '<h1 style="font-size:19px;font-weight:700;margin:0">Catalogue</h1>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn--sm" data-action="series" data-tens="' + tens + '">Réviser cette série</button>' +
      '</div>' +
      '<div class="row row-wrap" style="gap:8px">' + pills + '</div>' +
      '<div class="tiny">Série ' + s.label + ' — ' + esc(s.env) + ' · touchez une carte pour la retourner</div>' +
      '<div class="browse-grid">' + cards + '</div>' +
    '</div>';
  }

  /* ============================================================
     Vue : dates historiques
     ============================================================ */

  function chunkDate(value) {
    var digits = value.replace(/\D/g, '');
    var chunks = [];
    var i = 0;
    if (digits.length % 2 === 1) { chunks.push(digits[0]); i = 1; }
    for (; i < digits.length; i += 2) chunks.push(digits.substr(i, 2));
    return chunks;
  }

  function viewDates() {
    var value = state.dateValue;
    var chunks = chunkDate(value);
    var cards = chunks.map(function (ch) { return PAO.byId(ch); }).filter(Boolean);

    var chain = cards.map(function (c, i) {
      return '<div class="date-step">' +
        '<div class="step-num">' + (i + 1) + ' · ' + esc(c.id) + '</div>' +
        CV.staticCard(c, 'recto', {}) +
        '<div class="step-phrase">' + CV.phraseHTML(c) + '</div>' +
      '</div>';
    }).join('');

    var hint = cards.length >= 2
      ? 'Enchaînez les ' + cards.length + ' scènes en une seule image mentale, dans l\'ordre.'
      : 'Saisissez une date à 4 chiffres (par exemple 1492) — elle est découpée en paires.';

    return '' +
    '<div class="stack stack-16">' +
      '<div class="row">' +
        '<button class="icon-btn" data-action="home" aria-label="Retour">←</button>' +
        '<h1 style="font-size:19px;font-weight:700;margin:0">Dates historiques</h1>' +
      '</div>' +

      '<input class="date-input" data-date inputmode="numeric" pattern="[0-9]*" maxlength="8" ' +
        'placeholder="1492" value="' + esc(value) + '" aria-label="Date à mémoriser">' +

      '<div class="row row-wrap" style="gap:8px">' +
        ['1492', '1515', '1789', '1969'].map(function (d) {
          return '<button class="pill" data-action="date-preset" data-value="' + d + '">' + d + '</button>';
        }).join('') +
      '</div>' +

      '<p class="small muted center">' + hint + '</p>' +

      (cards.length ? '<div class="date-chain">' + chain + '</div>' +
        '<button class="btn btn--block" data-action="date-review">Réviser ces ' +
        cards.length + ' cartes</button>' : '') +
    '</div>';
  }

  /* ============================================================
     Vue : réglages
     ============================================================ */

  function viewSettings() {
    var st = Store.getSettings();

    function seg(action, options, current) {
      return options.map(function (o) {
        return '<button class="pill' + (String(o.value) === String(current) ? ' is-active' : '') +
          '" data-action="' + action + '" data-value="' + o.value + '">' + o.label + '</button>';
      }).join('');
    }

    return '' +
    '<div class="stack stack-16">' +
      '<div class="row">' +
        '<button class="icon-btn" data-action="home" aria-label="Retour">←</button>' +
        '<h1 style="font-size:19px;font-weight:700;margin:0">Réglages</h1>' +
      '</div>' +

      '<div class="field">' +
        '<div class="label">Sens de révision</div>' +
        '<div class="hint">Ce qui est montré en premier sur la carte.</div>' +
        '<div class="seg">' + seg('set-direction', [
          { value: 'mixed', label: 'Alterné' },
          { value: 'num2pao', label: 'Nombre → PAO' },
          { value: 'pao2num', label: 'PAO → Nombre' }
        ], st.direction) + '</div>' +
      '</div>' +

      '<div class="field">' +
        '<div class="row">' +
          '<div><div class="label">Chronomètre</div>' +
          '<div class="hint">Mesure le temps de rappel, moyenne en fin de session.</div></div>' +
          '<div class="spacer"></div>' +
          '<button class="switch' + (st.chrono ? ' is-on' : '') + '" data-action="toggle-chrono" ' +
            'role="switch" aria-checked="' + (st.chrono ? 'true' : 'false') + '" aria-label="Chronomètre"></button>' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<div class="label">Taille de session</div>' +
        '<div class="hint">Nombre maximum de cartes par session de révision.</div>' +
        '<div class="seg">' + seg('set-size', [
          { value: 10, label: '10' },
          { value: 20, label: '20' },
          { value: 40, label: '40' },
          { value: 0, label: 'Illimité' }
        ], st.sessionSize) + '</div>' +
      '</div>' +

      '<div class="field stack stack-8">' +
        '<div class="label">Sauvegarde</div>' +
        '<div class="hint">La progression est stockée dans ce navigateur uniquement.</div>' +
        '<div class="row row-wrap" style="gap:8px;margin-top:8px">' +
          '<button class="btn btn--sm" data-action="export">Exporter</button>' +
          '<button class="btn btn--sm" data-action="import">Importer</button>' +
          '<button class="btn btn--sm btn--danger" data-action="reset">Réinitialiser</button>' +
        '</div>' +
        '<input type="file" accept="application/json" data-import-file hidden>' +
      '</div>' +

      '<p class="tiny center">Intervalles : ' + Store.INTERVALS.join(' j · ') + ' j</p>' +
    '</div>';
  }

  /* ============================================================
     Rendu
     ============================================================ */

  /* L'interface prend l'ambiance de l'environnement affiché ; neutre ailleurs. */
  function applyEnvTheme() {
    var tens = null;
    if (state.view === 'session' && state.session) tens = currentCard().tens;
    else if (state.view === 'browse') tens = state.browseSeries;

    if (tens === null) delete document.documentElement.dataset.env;
    else document.documentElement.dataset.env = String(tens);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content',
        getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#14151a');
    }
  }

  function render() {
    var html;
    if (state.view === 'session' && state.session) html = viewSession();
    else if (state.view === 'summary' && state.summary) html = viewSummary();
    else if (state.view === 'browse') html = viewBrowse();
    else if (state.view === 'dates') html = viewDates();
    else if (state.view === 'settings') html = viewSettings();
    else html = viewHome();

    applyEnvTheme();
    root.innerHTML = html + (state.toast ? '<div class="toast">' + esc(state.toast) + '</div>' : '');
    hydrate();
  }

  function hydrate() {
    /* Fondu à l'arrivée des images. */
    Array.prototype.forEach.call(root.querySelectorAll('.card-img'), function (img) {
      if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
      else img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    });

    fitPhrases();

    if (state.view === 'session' && state.session) {
      startTimer();
      preloadNext();
    } else {
      stopTimer();
    }

    if (state.view === 'dates') {
      var input = root.querySelector('[data-date]');
      if (input && state.focusDate) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  /* Filet de sécurité : la phrase doit tenir sur une seule ligne (règle du design).
     Les longueurs sont validées à la taille de référence, mais la police peut
     arriver après le rendu — on resserre alors très légèrement. */
  function fitPhrases() {
    Array.prototype.forEach.call(root.querySelectorAll('.card-phrase'), function (ph) {
      ph.style.transform = '';
      var band = ph.parentElement;
      var cs = getComputedStyle(band);
      var avail = band.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail > 0 && ph.scrollWidth > avail) {
        ph.style.transform = 'scale(' + Math.max(0.78, avail / ph.scrollWidth) + ')';
      }
    });
  }

  function preloadNext() {
    var s = state.session;
    var nextId = s.queue[s.idx + 1];
    if (!nextId) return;
    var card = PAO.byId(nextId);
    var img = new Image();
    img.src = card.img;
  }

  /* ============================================================
     Interactions
     ============================================================ */

  var ACTIONS = {
    'start-srs': startSRS,
    'start-all': startAll,
    'start-random': startRandom,
    'series': function (el) { startSeries(Number(el.dataset.tens)); },
    'browse': function () { state.view = 'browse'; render(); },
    'browse-series': function (el) { state.browseSeries = Number(el.dataset.tens); render(); },
    'dates': function () { state.view = 'dates'; state.focusDate = false; render(); },
    'settings': function () { state.view = 'settings'; render(); },
    'home': function () { state.view = 'home'; state.summary = null; render(); },
    'reveal': reveal,
    'next': next,
    'quit': quitSession,
    'grade': function (el) { gradeCard(Number(el.dataset.grade)); },

    'date-preset': function (el) { state.dateValue = el.dataset.value; state.focusDate = false; render(); },
    'date-review': function () {
      var ids = chunkDate(state.dateValue).filter(function (id) { return PAO.byId(id); });
      if (ids.length) startFromIds(ids, 'Date ' + state.dateValue);
    },

    'set-direction': function (el) { Store.setSetting('direction', el.dataset.value); render(); },
    'set-size': function (el) { Store.setSetting('sessionSize', Number(el.dataset.value)); render(); },
    'toggle-chrono': function () { Store.setSetting('chrono', !Store.getSettings().chrono); render(); },

    'export': function () {
      var blob = new Blob([Store.exportAll()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pao-progression-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    },
    'import': function () {
      var input = root.querySelector('[data-import-file]');
      if (input) input.click();
    },
    'reset': function () {
      if (!confirm('Effacer toute la progression enregistrée ? Cette action est définitive.')) return;
      Store.resetProgress();
      toast('Progression réinitialisée.');
    }
  };

  var swallowClick = false;

  root.addEventListener('click', function (e) {
    if (swallowClick) { swallowClick = false; return; }
    var el = e.target.closest('[data-action]');
    if (el) {
      var fn = ACTIONS[el.dataset.action];
      if (fn) { e.preventDefault(); fn(el); }
      return;
    }

    /* Clic sur une carte : retourner. */
    var card = e.target.closest('.card');
    if (!card) return;
    if (state.view === 'session') { reveal(); return; }
    if (state.view === 'browse') card.classList.toggle('is-flipped');
  });

  root.addEventListener('input', function (e) {
    if (!e.target.matches('[data-date]')) return;
    state.dateValue = e.target.value.replace(/\D/g, '').slice(0, 8);
    state.focusDate = true;
    render();
  });

  root.addEventListener('change', function (e) {
    if (!e.target.matches('[data-import-file]')) return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importAll(String(reader.result));
        toast('Progression importée.');
      } catch (err) {
        toast('Import impossible : ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  document.addEventListener('keydown', function (e) {
    var target = e.target;
    if (target && target.matches) {
      /* Champs de saisie : la frappe leur appartient. */
      if (target.matches('input, textarea')) return;
      /* Bouton au clavier : Espace et Entrée doivent l'activer, pas nous. */
      if (target.matches('button') && (e.key === ' ' || e.key === 'Enter')) return;
    }

    if (state.view === 'session' && state.session) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (state.session.revealed) { if (!state.session.srs) next(); }
        else reveal();
        return;
      }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); return; }
      if (e.key === 'Escape') { quitSession(); return; }
      if (state.session.revealed && state.session.srs && ['1', '2', '3'].indexOf(e.key) !== -1) {
        e.preventDefault();
        gradeCard(Number(e.key) - 1);
      }
      return;
    }

    if (e.key === 'Escape' && state.view !== 'home') {
      state.view = 'home';
      render();
    }
  });

  /* Balayage horizontal : carte précédente / suivante. */
  var touch = null;
  root.addEventListener('touchstart', function (e) {
    if (!e.target.closest('[data-swipe]')) return;
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });

  root.addEventListener('touchend', function (e) {
    if (!touch) return;
    var dx = e.changedTouches[0].clientX - touch.x;
    var dy = e.changedTouches[0].clientY - touch.y;
    var swipe = touch;
    touch = null;
    if (Date.now() - swipe.t > 600) return;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    swallowClick = true;                    // le balayage ne doit pas aussi retourner la carte
    if (dx < 0) next(); else prev();
  }, { passive: true });

  /* ============================================================
     Démarrage
     ============================================================ */

  render();

  /* La police Sora est plus large que les polices de repli : on remesure à son arrivée. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitPhrases);
  }
  window.addEventListener('resize', fitPhrases);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne indisponible */ });
    });
  }
})(window);
