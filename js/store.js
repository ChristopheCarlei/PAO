/* Persistance (localStorage) + répétition espacée type SM-2 simplifié.
   Aucun backend : toute la progression vit dans le navigateur. */
(function (global) {
  'use strict';

  var KEY_PROGRESS = 'pao.progress.v1';
  var KEY_SETTINGS = 'pao.settings.v1';
  var KEY_HISTORY = 'pao.history.v1';

  var DAY = 86400000;
  var MINUTE = 60000;

  /* Intervalles validés : 1j, 3j, 7j, 16j, 35j. */
  var INTERVALS = [1, 3, 7, 16, 35];

  var DEFAULT_SETTINGS = {
    direction: 'mixed',   // 'num2pao' | 'pao2num' | 'mixed'
    chrono: true,
    sessionSize: 20       // 0 = illimité
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  var progress = read(KEY_PROGRESS, {});
  var settings = Object.assign({}, DEFAULT_SETTINGS, read(KEY_SETTINGS, {}));
  var history = read(KEY_HISTORY, { sessions: [] });

  function saveProgress() { write(KEY_PROGRESS, progress); }

  /* ---------- Réglages ---------- */

  function getSettings() { return Object.assign({}, settings); }

  function setSetting(key, value) {
    settings[key] = value;
    write(KEY_SETTINGS, settings);
  }

  /* ---------- État d'une carte ---------- */

  function blank() {
    return { step: 0, ease: 2.5, due: 0, lapses: 0, reps: 0, last: 0 };
  }

  function cardState(id) {
    return progress[id] ? Object.assign(blank(), progress[id]) : null;
  }

  function isNew(id) { return !progress[id]; }

  function isDue(id, now) {
    var st = progress[id];
    if (!st) return true;                       // jamais vue = à voir
    return (st.due || 0) <= (now || Date.now());
  }

  /* Nombre de jours du prochain intervalle pour une note donnée, sans rien écrire. */
  function preview(id, grade) {
    var next = schedule(cardState(id) || blank(), grade, Date.now());
    return next.due - Date.now();
  }

  /* Coeur SM-2 simplifié.
     grade : 0 = raté, 1 = difficile, 2 = acquis. */
  function schedule(st, grade, now) {
    var next = Object.assign({}, st);
    next.reps = (next.reps || 0) + 1;
    next.last = now;

    if (grade === 0) {
      next.step = 0;
      next.lapses = (next.lapses || 0) + 1;
      next.ease = Math.max(1.3, next.ease - 0.2);
      next.due = now + MINUTE;                  // revue dans la foulée
      return next;
    }

    if (grade === 1) {
      next.ease = Math.max(1.3, next.ease - 0.15);
      if (next.step === 0) {
        next.due = now + 10 * MINUTE;           // encore en apprentissage
        return next;
      }
      var held = INTERVALS[Math.min(next.step, INTERVALS.length) - 1];
      next.due = now + Math.max(1, Math.round(held * 0.6)) * DAY;
      return next;
    }

    next.ease = Math.min(3.0, next.ease + 0.05);
    next.step = Math.min(next.step + 1, INTERVALS.length);
    var base = INTERVALS[next.step - 1];
    var days = next.step <= 2 ? base : Math.round(base * (next.ease / 2.5));
    next.due = now + Math.max(1, days) * DAY;
    return next;
  }

  function grade(id, g) {
    var now = Date.now();
    progress[id] = schedule(cardState(id) || blank(), g, now);
    saveProgress();
    return progress[id];
  }

  /* ---------- Statistiques ---------- */

  /* Une carte est « maîtrisée » à partir de l'intervalle 7 jours (3e palier). */
  var MASTERY_STEP = 3;

  function isMastered(id) {
    var st = progress[id];
    return !!st && st.step >= MASTERY_STEP;
  }

  /* Avancement d'une carte vers la maîtrise, de 0 à 1.
     La maîtrise demandant trois révisions réparties sur plusieurs jours, un
     indicateur binaire resterait à zéro pendant une semaine entière : il ne
     dirait rien du travail déjà fait. Celui-ci bouge à chaque révision. */
  function cardProgress(id) {
    var st = progress[id];
    if (!st) return 0;
    return Math.min(st.step, MASTERY_STEP) / MASTERY_STEP;
  }

  function dueCards(deck, now) {
    now = now || Date.now();
    return deck.filter(function (c) { return isDue(c.id, now); });
  }

  function seriesStats(series, deck) {
    var ids = deck.filter(function (c) { return c.tens === series.tens; })
      .map(function (c) { return c.id; });
    var mastered = 0, seen = 0, due = 0, avance = 0;
    var now = Date.now();
    ids.forEach(function (id) {
      if (isMastered(id)) mastered++;
      if (!isNew(id)) seen++;
      if (isDue(id, now)) due++;
      avance += cardProgress(id);
    });
    return {
      total: ids.length,
      mastered: mastered,
      seen: seen,
      due: due,
      progress: ids.length ? avance / ids.length : 0
    };
  }

  function globalStats(deck) {
    var mastered = 0, seen = 0, avance = 0;
    deck.forEach(function (c) {
      if (isMastered(c.id)) mastered++;
      if (!isNew(c.id)) seen++;
      avance += cardProgress(c.id);
    });
    return {
      total: deck.length,
      mastered: mastered,
      seen: seen,
      due: dueCards(deck).length,
      progress: deck.length ? avance / deck.length : 0
    };
  }

  /* ---------- Historique de sessions ---------- */

  function pushSession(entry) {
    history.sessions.unshift(entry);
    history.sessions = history.sessions.slice(0, 40);
    write(KEY_HISTORY, history);
  }

  function getHistory() { return history.sessions.slice(); }

  /* ---------- Import / export / remise à zéro ---------- */

  function exportAll() {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: progress,
      settings: settings,
      history: history
    }, null, 2);
  }

  function importAll(json) {
    var data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !data.progress) {
      throw new Error('Fichier de sauvegarde non reconnu.');
    }
    progress = data.progress;
    settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
    history = data.history && data.history.sessions ? data.history : { sessions: [] };
    saveProgress();
    write(KEY_SETTINGS, settings);
    write(KEY_HISTORY, history);
  }

  function resetProgress() {
    progress = {};
    history = { sessions: [] };
    saveProgress();
    write(KEY_HISTORY, history);
  }

  global.Store = {
    INTERVALS: INTERVALS,
    getSettings: getSettings,
    setSetting: setSetting,
    cardState: cardState,
    isNew: isNew,
    isDue: isDue,
    isMastered: isMastered,
    cardProgress: cardProgress,
    preview: preview,
    grade: grade,
    dueCards: dueCards,
    seriesStats: seriesStats,
    globalStats: globalStats,
    pushSession: pushSession,
    getHistory: getHistory,
    exportAll: exportAll,
    importAll: importAll,
    resetProgress: resetProgress
  };
})(window);
