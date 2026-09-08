/* Données PAO — source de vérité des 110 cartes (0-9 et 00-99).
   Chaque carte est un tuple [personnage, liaison, mot2, liaison, mot3] :
   les segments 0, 2 et 4 sont en gras, les segments 1 et 3 sont les mots de liaison. */
(function (global) {
  'use strict';

  var ANCHOR_NAMES = ['noir', 'jaune doré', 'gris', 'bleu foncé', 'marron',
    'blanc glacé', 'rouge martien', 'vert foncé', 'orange', 'bleu ciel'];

  var ANCHOR_COLORS = ['#111111', '#e3ae1c', '#aab3bd', '#1d4f8a', '#8a5327',
    '#f2fbff', '#c0392b', '#2f6b3a', '#ef8214', '#4fb3e8'];

  /* Code phonétique (système majeur) : c'est lui qui fait le lien entre un
     nombre et son objet. Les deux consonnes de l'objet sont les deux chiffres. */
  var PHONEMES = ['S·Z·C', 'T·D', 'N', 'M', 'R', 'L', 'CH·J', 'K·G', 'F·V', 'P·B'];

  var SERIES = [
    {
      tens: 0, label: '0x', env: 'Cimetière', verso: 'assets/verso/Verso00.webp',
      single: ['Squelette', '', 'vide', '', 'un sceau'],
      cards: [
        ['Faucheuse', '', 'coupe', 'avec', 'des ciseaux'],
        ['Scarabée', '', 'grave', '', 'un CD'],
        ['Chat', 'sur', 'une scène', '', 'tire sa révérence'],
        ['Piranha', 'dans', 'le ciment', '', 'se fige'],
        ['Rat', '', 'télécommande', '', 'une souris'],
        ['Élan', '', 'se baisse en avant', 'avec', 'une selle'],
        ['Kobold', '', 'tire à la fronde', 'sur', "une souche d'arbre"],
        ['Panthère', '', 'porte', '', 'un sac à dos'],
        ['Sith', '', 'enclenche son sabre laser', 'sur', 'un savon'],
        ['Corbeau', '', 'plante', '', 'un sapin']
      ]
    },
    {
      tens: 1, label: '1x', env: 'Désert', verso: 'assets/verso/Verso1_.webp',
      single: ['Aladin', '', 'jette', '', 'des dés'],
      cards: [
        ['Anubis', 'dans', 'une tasse', '', 'tourne sur lui-même'],
        ['Chameau', '', 'se cache', 'derrière', 'une tente'],
        ['Kangourou', '', 'compte', 'de', 'la thune'],
        ['Crabe', '', 'soulève', '', 'un diamant'],
        ['Girafe', '', 'monte', 'dans', 'une tour'],
        ['Bison', '', 'charge', '', 'une télé'],
        ['Serpent', '', 'hypnotise', 'sur', 'une tige'],
        ['Pumba', '', 'conduit', '', 'un tank'],
        ['Touareg', '', 'se couvre', 'avec', 'un duvet'],
        ['Vautour', '', 'plane', 'sur', 'un tapis volant']
      ]
    },
    {
      tens: 2, label: '2x', env: 'Lune', verso: 'assets/verso/Verso2_.webp',
      single: ['ET', '', 'éclaire son doigt', 'sur', 'un nid'],
      cards: [
        ['Shrek', '', 'répare', '', 'un satellite de la NASA'],
        ['Coyote', 'avec', 'une natte', '', 'fait du stop'],
        ['Batman', '', 'projette un batarang', 'dans', 'un ananas'],
        ['Leviathan', '', 'divise', '', 'un nem'],
        ['Bip Bip', '', 'court sur place', 'pour alimenter', 'une noria'],
        ['Husky', '', 'tombe au sol', 'emmêlé dans', 'le fil nylon'],
        ['Taz', '', 'gobe', '', 'une niche'],
        ['Hyène', '', 'rit', 'avec', 'un nougat à la main'],
        ['Un cosmonaute', '', 'flotte', 'devant', 'un navet'],
        ['Hibou', '', 'écrit', 'sur', 'une nappe']
      ]
    },
    {
      tens: 3, label: '3x', env: 'Océan', verso: 'assets/verso/Verso3_.webp',
      single: ['Capitaine Crochet', '', 'tire une corde', 'sur', 'un mât'],
      cards: [
        ['Monstre du Loch Ness', '', 'se goinfre', 'de', 'pop-corn'],
        ['Némo', '', 'accélère', 'sur', 'sa moto'],
        ['Étoile de mer', '', 'déclenche', '', 'une mine'],
        ['Dauphin', '', 'se colle', '', 'un post-it'],
        ['Tortue', '', 'escalade', '', 'un mur'],
        ['Orque', '', 'saute', 'dans', 'une malle'],
        ['Requin', '', 'mâche', '', 'une salade'],
        ['Crocodile', '', 'se balance', 'dans', 'un hamac'],
        ['Plongeur', '', 'fait des bulles', 'entouré de', 'muffins'],
        ['Daffy Duck', '', 'lit', '', 'une carte']
      ]
    },
    {
      tens: 4, label: '4x', env: 'Campagne', verso: 'assets/verso/Verso4_.webp',
      single: ['Golem', '', 'saisit du riz', 'avec', 'ses baguettes'],
      cards: [
        ['Cerbère', '', 'mord', '', 'une rose'],
        ['Éléphant', '', 'danse', 'en écoutant', 'la radio'],
        ['Sonic', '', 'se met en boule', 'dans', 'une arène'],
        ['Escargot', '', 'rame', '', ''],
        ['Taupe', '', 'chausse des lunettes', 'pour voir', 'le RER'],
        ['Phoque', '', 'patine', 'avec', 'des rollers'],
        ['Araignée', '', 'pique', '', 'une ruche'],
        ['Bugs Bunny', '', 'bande', '', 'son arc'],
        ['Spiderman', '', 'fait un jet de toile', 'sur', 'une revue'],
        ['Chauve-souris', '', 'se retourne', 'dans', 'une robe']
      ]
    },
    {
      tens: 5, label: '5x', env: 'Banquise', verso: 'assets/verso/Verso5_.webp',
      single: ['Sid', '', 'dort', 'dans', 'un lit'],
      cards: [
        ['Odin', '', 'forge', '', 'une lance'],
        ['Zèbre', '', 'gratte', '', 'son luth'],
        ['Lama', '', 'tricote', '', 'la laine'],
        ['Morse', '', 'lime', '', 'ses défenses'],
        ['Rhinocéros', '', 'gracie', 'avec', 'des lauriers'],
        ['Pingouin', '', 'tète', '', 'un biberon'],
        ['Ours blanc', '', 'glisse', 'sur', 'une luge'],
        ['Manny', '', 'pilote', '', 'un hélico'],
        ['Olaf', '', 'fait de la balançoire', '', ''],
        ['Eurêka', '', 'regarde', '', 'une loupe']
      ]
    },
    {
      tens: 6, label: '6x', env: 'Mars', verso: 'assets/verso/Verso6_.webp',
      single: ['Élémentaire de feu', '', 'enflamme', '', 'une hache'],
      cards: [
        ['Zombie', '', 'déambule', 'vers', 'une chaise'],
        ['Scorpion', '', 'enfile', '', 'une ceinture de judo'],
        ['Loup-Garou', '', 'traîne', '', 'un boulet'],
        ['Kraken', '', 'secoue', 'de', 'la chaume'],
        ['Ankegh', '', 'remonte', 'sur', 'un char'],
        ['Yéti', '', 'proteste', 'avec', 'un gilet jaune'],
        ['Diable', '', 'secoue', '', 'un joujou'],
        ['Dragon', '', 'fait une bulle', 'avec', 'une chique'],
        ['Soldat', '', 'mitraille', '', 'un chiffon'],
        ['Phénix', '', 'pleure', 'avec', 'un chapeau']
      ]
    },
    {
      tens: 7, label: '7x', env: 'Forêt', verso: 'assets/verso/Verso7_.webp',
      single: ['Ent', '', 'creuse', 'avec', 'ses gants'],
      cards: [
        ['T-Rex', '', 'enfile un masque', 'devant', 'une bouteille de gaz'],
        ['Autruche', '', 'se terre', 'avec', 'un couteau'],
        ['Vieux loup', '', 'boite', 'avec', 'une canne'],
        ['Castor', '', 'ronge', '', 'un camion'],
        ['Écureuil', '', 'tape', 'sur', 'une grue'],
        ['Panda', '', "s'orne", "d'", 'un collier'],
        ['Tigre', '', "s'enferme", 'dans', 'une cage'],
        ['Lion', '', 'sirote', '', 'un coca'],
        ['Singe', '', 'boit', '', 'un café'],
        ['Aigle', '', 'disparaît', 'dans', 'une cape']
      ]
    },
    {
      tens: 8, label: '8x', env: 'Villes', verso: 'assets/verso/Verso8_.webp',
      single: ['Homer', '', 'boit', 'du', 'vin'],
      cards: [
        ['Momie', '', 'lâche', '', 'un vase'],
        ['Cléopâtre', '', 'filme', '', 'une vidéo'],
        ['Nain', '', 'téléphone', '', ''],
        ['Sirène', '', 'souffle', 'de', 'la fumée'],
        ['Barbare', '', 'frappe', '', 'son verre'],
        ['Esquimau', '', 'fait du vélo', '', ''],
        ['Vampire', '', 'suce', 'avec', 'ses fiches'],
        ['Elfe', '', 'touche', '', 'une figue'],
        ['Robot', '', 'offre', '', 'une fève'],
        ['Superman', '', 'décolle', 'devant', 'une barrière Vauban']
      ]
    },
    {
      tens: 9, label: '9x', env: 'Ciel', verso: 'assets/verso/Verso9_.webp',
      single: ['Fée', '', 'lance un sort', 'sur', 'une épée'],
      cards: [
        ['Fantôme', '', 'traverse', '', 'une pizza'],
        ['Génie', '', 'frotte sa lampe', 'avec', 'une batte'],
        ['Soucoupe', '', 'joue', 'du', 'piano'],
        ['Poséidon', '', 'harponne', '', 'une pomme'],
        ['Sorcière', '', 'chevauche un balai', 'avec', 'une poire'],
        ['Père Noël', '', 'gonfle', '', 'des ballons'],
        ['Ptérodactyle', '', 'allume une bougie', 'avec', 'une allumette'],
        ['Pégase', '', 'ouvre', '', 'un paquet'],
        ['Pape', '', 'brandit un crucifix', 'avec', 'un pavé'],
        ['Zeus', '', 'fume', '', 'la pipe']
      ]
    }
  ];

  /* Découpe un tuple en segments affichables, sans les vides. */
  function toParts(tuple) {
    var parts = [];
    for (var i = 0; i < tuple.length; i++) {
      if (tuple[i]) parts.push({ text: tuple[i], bold: i % 2 === 0 });
    }
    return parts;
  }

  function phrase(tuple) {
    return toParts(tuple).map(function (p) { return p.text; }).join(' ');
  }

  /* Deck à plat : pour chaque série, le chiffre simple puis les dix nombres. */
  var DECK = [];
  var BY_ID = {};

  SERIES.forEach(function (s) {
    function push(id, tuple, tensDigit, unitDigit, isSingle) {
      var card = {
        id: id,
        tens: s.tens,
        tensDigit: tensDigit,
        unitDigit: unitDigit,
        single: isSingle,
        env: s.env,
        label: s.label,
        parts: toParts(tuple),
        phrase: phrase(tuple),
        img: 'assets/pao/' + id + '.webp',
        verso: s.verso,
        anchor: ANCHOR_COLORS[unitDigit],
        anchorName: ANCHOR_NAMES[unitDigit],
        tensColor: ANCHOR_COLORS[s.tens]
      };
      DECK.push(card);
      BY_ID[id] = card;
    }

    push(String(s.tens), s.single, null, s.tens, true);
    s.cards.forEach(function (tuple, i) {
      push(String(s.tens) + String(i), tuple, s.tens, i, false);
    });
  });

  /* Les 100 cartes à deux chiffres, pour le tirage aléatoire et les dates. */
  var PAIRS = DECK.filter(function (c) { return !c.single; });

  /* Les 45 dates historiques illustrées (dossier Dates/ du projet),
     dans l'ordre chronologique. `value` = chiffres saisis dans le champ,
     `label` = affichage (− pour av. J.-C.), `event` = libellé court de la
     grille, `events` = tous les événements de la scène quand elle en fusionne
     plusieurs (ou précise le libellé court), `place` = le lieu choisi pour
     l'image, `img` = nom de fichier quand il diffère de `value`. */
  var DATES = [
    { value: '753',  label: '−753',  event: 'Fondation de Rome', place: 'Bord du Tibre', img: '0753' },
    { value: '563',  label: '−563',  event: 'Naissance de Bouddha', place: 'Jardin de Lumbini', img: '0563' },
    { value: '509',  label: '−509',  event: 'République romaine',
      events: ['Expulsion de Tarquin le Superbe', 'Serment de Brutus'], place: 'Forum de Rome', img: '0509' },
    { value: '490',  label: '−490',  event: 'Bataille de Marathon', place: 'Plaine de Marathon', img: '0490' },
    { value: '333',  label: '−333',  event: 'Bataille d’Issos', place: 'Plaine d’Issos', img: '0333' },
    { value: '52',   label: '−52',   event: 'Alésia',
      events: ['Reddition de Vercingétorix'], place: 'Alésia', img: '052' },
    { value: '46',   label: '−46',   event: 'Calendrier julien', place: 'Domus Publica, Rome', img: '046' },
    { value: '27',   label: '−27',   event: 'Octave devient Auguste', place: 'Curie Julia, Rome', img: '027' },
    { value: '64',   label: '64',    event: 'Incendie de Rome', place: 'Le Palatin, Rome' },
    { value: '293',  label: '293',   event: 'Tétrarchie',
      events: ['Fondation de la Tétrarchie'], place: 'Palais de Mediolanum (Milan)' },
    { value: '313',  label: '313',   event: 'Édit de Milan', place: 'Palais impérial de Milan' },
    { value: '392',  label: '392',   event: 'Édit de Théodose',
      events: ['Édit de Théodose contre le paganisme'], place: 'Temple païen, Constantinople' },
    { value: '410',  label: '410',   event: 'Sac de Rome par Alaric', place: 'Porte Salaria, Rome', img: '0410' },
    { value: '451',  label: '451',   event: 'Champs Catalauniques',
      events: ['Bataille des champs Catalauniques'], place: 'Champs Catalauniques' },
    { value: '476',  label: '476',   event: 'Fin de l’Empire d’Occident',
      events: ['Abdication de Romulus Augustule'], place: 'Ravenne' },
    { value: '496',  label: '496',   event: 'Baptême de Clovis', place: 'Baptistère de Reims' },
    { value: '622',  label: '622',   event: 'Hégire', place: 'Médine' },
    { value: '751',  label: '751',   event: 'Sacre de Pépin le Bref',
      events: ['Onction de Pépin le Bref', 'Tonsure de Childéric III'], place: 'Abbatiale de Soissons' },
    { value: '800',  label: '800',   event: 'Couronnement de Charlemagne', place: 'Saint-Pierre de Rome' },
    { value: '987',  label: '987',   event: 'Sacre d’Hugues Capet', place: 'Cathédrale de Noyon', img: '0987' },
    { value: '1099', label: '1099',  event: 'Prise de Jérusalem',
      events: ['Prise de Jérusalem', 'Godefroy refuse la couronne'], place: 'Saint-Sépulcre, Jérusalem' },
    { value: '1204', label: '1204',  event: 'Sac de Constantinople', place: 'Constantinople' },
    { value: '1453', label: '1453',  event: 'Chute de Constantinople', place: 'Constantinople' },
    { value: '1455', label: '1455',  event: 'Bible de Gutenberg', place: 'Atelier de Gutenberg, Mayence' },
    { value: '1492', label: '1492',  event: 'Découverte de l’Amérique', place: 'Plage de Guanahani' },
    { value: '1498', label: '1498',  event: 'Vasco de Gama en Inde', place: 'Palais du Zamorin, Calicut' },
    { value: '1515', label: '1515',  event: 'Marignan',
      events: ['Bataille de Marignan', 'François Ier adoubé par Bayard'], place: 'Champ de bataille de Marignan' },
    { value: '1517', label: '1517',  event: '95 thèses de Luther', place: 'Schlosskirche, Wittenberg' },
    { value: '1522', label: '1522',  event: 'Premier tour du monde',
      events: ['Retour du premier tour du monde'], place: 'Port de Séville' },
    { value: '1530', label: '1530',  event: 'Diète d’Augsbourg',
      events: ['Confession d’Augsbourg', 'Couronnement de Charles Quint à Bologne'], place: 'Augsbourg' },
    { value: '1789', label: '1789',  event: 'Prise de la Bastille', place: 'La Bastille, Paris' },
    { value: '1804', label: '1804',  event: 'Sacre de Napoléon',
      events: ['Sacre de Napoléon', 'Code civil'], place: 'Notre-Dame de Paris' },
    { value: '1805', label: '1805',  event: 'Austerlitz · Trafalgar',
      events: ['Bataille d’Austerlitz', 'Bataille de Trafalgar'], place: 'Champ de bataille d’Austerlitz' },
    { value: '1885', label: '1885',  event: 'Vaccin contre la rage',
      events: ['Premier vaccin contre la rage'], place: 'Laboratoire de la rue d’Ulm, Paris' },
    { value: '1933', label: '1933',  event: 'Hitler chancelier',
      events: ['Hitler chancelier', 'Incendie du Reichstag', 'Investiture de Roosevelt'], place: 'Le Reichstag, Berlin' },
    { value: '1957', label: '1957',  event: 'Traité de Rome',
      events: ['Traité de Rome', 'Laïka dans l’espace'], place: 'Piazza del Campidoglio, Rome' },
    { value: '1961', label: '1961',  event: 'Mur de Berlin · Gagarine',
      events: ['Construction du mur de Berlin', 'Vol de Gagarine'], place: 'Bernauer Straße, Berlin' },
    { value: '1962', label: '1962',  event: 'Crise de Cuba · Évian',
      events: ['Crise des missiles de Cuba', 'Accords d’Évian'], place: 'Bureau ovale, Maison-Blanche' },
    { value: '1963', label: '1963',  event: 'Assassinat de Kennedy',
      events: ['Assassinat de Kennedy', 'Discours « I have a dream »'], place: 'Dealey Plaza, Dallas' },
    { value: '1969', label: '1969',  event: 'Premiers pas sur la Lune', place: 'Mer de la Tranquillité, Lune' },
    { value: '1982', label: '1982',  event: 'Lancement du Minitel', place: 'Agence Télécom, Rennes' },
    { value: '1989', label: '1989',  event: 'Chute du mur de Berlin',
      events: ['Chute du mur de Berlin', 'Concert de Rostropovitch'], place: 'Checkpoint Charlie, Berlin' },
    { value: '1990', label: '1990',  event: 'Naissance du Web', place: 'Bureau de Tim Berners-Lee, CERN' },
    { value: '1991', label: '1991',  event: 'Fin de l’URSS',
      events: ['Démission de Gorbatchev', 'Fin de l’URSS'], place: 'Le Kremlin, Moscou' },
    { value: '1992', label: '1992',  event: 'Traité de Maastricht', place: 'Maastricht' }
  ];

  global.PAO = {
    ANCHOR_NAMES: ANCHOR_NAMES,
    ANCHOR_COLORS: ANCHOR_COLORS,
    PHONEMES: PHONEMES,
    SERIES: SERIES,
    DECK: DECK,
    PAIRS: PAIRS,
    DATES: DATES,
    byId: function (id) { return BY_ID[id] || null; }
  };
})(window);
