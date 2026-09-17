import zlib from 'node:zlib';

/**
 * Nettoie les balises HTML et entités courantes pour une édition fluide
 */
export function cleanHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const ENTITIES = {
    '&nbsp;': ' ', '&eacute;': 'é', '&Eacute;': 'É', '&egrave;': 'è', '&Egrave;': 'È',
    '&ecirc;': 'ê', '&Ecirc;': 'Ê', '&agrave;': 'à', '&Agrave;': 'À', '&ocirc;': 'ô',
    '&Ocirc;': 'Ô', '&ucirc;': 'û', '&icirc;': 'î', '&iuml;': 'ï', '&ccedil;': 'ç',
    '&Ccedil;': 'Ç', '&acirc;': 'â', '&ugrave;': 'ù', '&euml;': 'ë', '&iuml;': 'ï',
    '&euro;': '€', '&deg;': '°', '&laquo;': '«', '&raquo;': '»', '&aelig;': 'æ',
    '&oelig;': 'œ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&lt;': '<', '&gt;': '>'
  };
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => {
      if (ENTITIES[m]) return ENTITIES[m];
      const num = m.match(/^&#(\d+);$/);
      return num ? String.fromCodePoint(Number(num[1])) : m;
    })
    .trim();
}

/**
 * Décompresse et extrait les entrées d'une archive ZIP / .H5P sans outil externe
 */
export function extractZipEntries(buffer) {
  if (!Buffer.isBuffer(buffer)) return {};

  // Tentative 1 : via l'End of Central Directory (standard fiable)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    try {
      const entries = {};
      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
      const cdCount = buffer.readUInt16LE(eocdOffset + 10);
      let pos = cdOffset;

      for (let i = 0; i < cdCount && pos < buffer.length; i++) {
        if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
        const method = buffer.readUInt16LE(pos + 10);
        const compSize = buffer.readUInt32LE(pos + 20);
        const fnLen = buffer.readUInt16LE(pos + 28);
        const extraLen = buffer.readUInt16LE(pos + 30);
        const commentLen = buffer.readUInt16LE(pos + 32);
        const localHeaderOffset = buffer.readUInt32LE(pos + 42);
        const filename = buffer.toString('utf-8', pos + 46, pos + 46 + fnLen);

        if (localHeaderOffset + 30 <= buffer.length) {
          const localFnLen = buffer.readUInt16LE(localHeaderOffset + 26);
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataOffset = localHeaderOffset + 30 + localFnLen + localExtraLen;

          const rawData = buffer.subarray(dataOffset, dataOffset + compSize);
          let uncomp = rawData;
          if (method === 8) {
            try { uncomp = zlib.inflateRawSync(rawData); } catch (e) {}
          }
          entries[filename] = uncomp;
        }

        pos += 46 + fnLen + extraLen + commentLen;
      }

      if (Object.keys(entries).length > 0) {
        return entries;
      }
    } catch (err) {
      // Fallback vers scan séquentiel
    }
  }

  // Tentative 2 : scan séquentiel des Local File Headers
  const entries = {};
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const fnLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const filename = buffer.toString('utf-8', offset + 30, offset + 30 + fnLen);
    const dataOffset = offset + 30 + fnLen + extraLen;

    if (compSize > 0 && dataOffset + compSize <= buffer.length) {
      let data = buffer.subarray(dataOffset, dataOffset + compSize);
      if (method === 8) {
        try { data = zlib.inflateRawSync(data); } catch (e) {}
      }
      entries[filename] = data;
      offset = dataOffset + compSize;
    } else {
      offset = dataOffset;
    }
  }

  return entries;
}

/**
 * Parse un fichier .H5P ou JSON issu de Quiz Wizard
 */
export function parseQuizWizardH5P(fileBufferOrJson, filename = 'quiz.h5p') {
  let h5pMeta = {};
  let content = {};
  let rawEntries = {};

  // 1. JSON direct (chaîne ou buffer)
  const asJson = typeof fileBufferOrJson === 'string'
    ? fileBufferOrJson.trim()
    : Buffer.isBuffer(fileBufferOrJson)
      ? fileBufferOrJson.toString('utf-8').trim()
      : null;
  if (asJson !== null && asJson.startsWith('{') && asJson.endsWith('}')) {
    try {
      const parsed = JSON.parse(asJson);
      if (parsed && typeof parsed === 'object' && (parsed.questions || parsed.dialogs || parsed.cards || parsed.title)) {
        content = parsed;
        h5pMeta = { title: parsed.title || filename.replace(/\.(h5p|json)$/i, '') };
      }
    } catch (e) {
      throw new Error('Le fichier JSON est invalide (syntaxe incorrecte).');
    }
  } else if (Buffer.isBuffer(fileBufferOrJson)) {
    rawEntries = extractZipEntries(fileBufferOrJson);

    // 1. Lire h5p.json
    if (rawEntries['h5p.json']) {
      try {
        h5pMeta = JSON.parse(rawEntries['h5p.json'].toString('utf-8'));
      } catch (e) {}
    }

    // 2. Lire content/content.json
    const contentEntry = rawEntries['content/content.json'] || rawEntries['content.json'];
    if (contentEntry) {
      try {
        content = JSON.parse(contentEntry.toString('utf-8'));
      } catch (e) {
        throw new Error("L'archive H5P contient un content.json illisible (JSON invalide).");
      }
    }
  } else if (typeof fileBufferOrJson === 'object' && fileBufferOrJson !== null) {
    content = fileBufferOrJson;
    h5pMeta = { title: content.title || 'Quiz' };
  }

  // Déterminer le type d'activité H5P
  const mainLib = (h5pMeta.mainLibrary || '').toLowerCase();
  let activityType = 'quiz';

  if (
    mainLib.includes('dialogcards') ||
    mainLib.includes('flashcard') ||
    content.dialogs ||
    content.cards
  ) {
    activityType = 'flashcards';
  }

  const defaultTitle = h5pMeta.title || filename.replace(/\.(h5p|json)$/i, '').replace(/[_-]/g, ' ') || 'Nouveau Quiz H5P';

  const defaultOptions = {
    correctionMode: 'immediate',
    randomizeQuestions: true,
    randomizeAnswers: true,
    showH5PActionBar: true,
    showDownloadButton: true,
    showEmbedButton: true,
    showCopyrightButton: true,
    passPercentage: 60,
    scoreTiers: [
      { min: 0, max: 49, feedback: "Des notions restent à consolider. Prenez le temps de revoir les points clés !" },
      { min: 50, max: 79, feedback: "Bon travail d'ensemble ! L'essentiel est acquis." },
      { min: 80, max: 100, feedback: "Excellent résultat ! Les notions et compétences sont parfaitement maîtrisées, bravo !" }
    ]
  };

  if (activityType === 'flashcards') {
    const rawCards = content.dialogs || content.cards || [];
    const normalizedCards = [];

    rawCards.forEach((c, idx) => {
      const front = cleanHtml(c.text || c.front || c.question || `Carte ${idx + 1}`);
      const back = cleanHtml(c.answer || c.back || c.solution || '');
      const hint = cleanHtml(c.tip || c.hint || '');
      if (front || back) {
        normalizedCards.push({
          id: `card_${idx + 1}`,
          front,
          back,
          hint: hint || undefined
        });
      }
    });

    return {
      type: 'flashcards',
      title: defaultTitle,
      theme: 'Général',
      description: cleanHtml(content.description || h5pMeta.description || 'Cartes de révision générées par Quiz Wizard.'),
      content: {
        cards: normalizedCards
      },
      options: defaultOptions,
      rawLibraries: Object.keys(rawEntries).filter(k => !k.startsWith('content/') && k !== 'h5p.json')
    };
  }

  // Type Quiz / QuestionSet
  const normalizedQuestions = [];
  const rawQuestions = content.questions || (content.answers ? [content] : []);

  rawQuestions.forEach((qItem, qIdx) => {
    const params = qItem.params || qItem;
    const qText = cleanHtml(params.question || params.text || `Question ${qIdx + 1}`);
    const qType = (params.type === 'truefalse' || (qItem.library && qItem.library.includes('TrueFalse')))
      ? 'truefalse'
      : 'multichoice';

    let answers = [];
    if (params.answers && Array.isArray(params.answers)) {
      answers = params.answers.map((a, aIdx) => {
        const isCorr = Boolean(a.correct !== undefined ? a.correct : a.isCorrect);
        return {
          id: a.id || `ans_${qIdx + 1}_${aIdx + 1}`,
          text: cleanHtml(a.text || a.answer || `Option ${aIdx + 1}`),
          correct: isCorr,
          feedback: cleanHtml(a.tipsAndFeedback?.chosenFeedback || a.feedback || '')
        };
      });
    } else if (params.correct !== undefined) {
      // Vrai / Faux — H5P.TrueFalse utilise feedbackCorrect / feedbackWrong
      const fbCorrect = cleanHtml(params.feedbackCorrect || '');
      const fbWrong = cleanHtml(params.feedbackWrong || params.feedbackIncorrect || '');
      const isTrueCorrect = Boolean(params.correct === 'true' || params.correct === true);
      answers = [
        {
          id: `ans_${qIdx + 1}_1`,
          text: 'Vrai',
          correct: isTrueCorrect,
          feedback: isTrueCorrect ? fbCorrect : fbWrong
        },
        {
          id: `ans_${qIdx + 1}_2`,
          text: 'Faux',
          correct: !isTrueCorrect,
          feedback: !isTrueCorrect ? fbCorrect : fbWrong
        }
      ];
    }

    normalizedQuestions.push({
      id: `q_${qIdx + 1}`,
      question: qText,
      type: qType,
      answers,
      explanation: cleanHtml(params.tipsAndFeedback?.overallFeedback || params.explanation || ''),
      feedbackCorrect: cleanHtml(params.feedbackCorrect || ''),
      feedbackIncorrect: cleanHtml(params.feedbackIncorrect || params.feedbackWrong || '')
    });
  });

  return {
    type: 'quiz',
    title: defaultTitle,
    theme: 'Général',
    description: cleanHtml(content.introPage?.introduction || content.description || h5pMeta.description || ''),
    content: {
      questions: normalizedQuestions
    },
    options: {
      ...defaultOptions,
      passPercentage: content.passPercentage || 60,
      randomizeQuestions: Boolean(content.randomQuestions)
    }
  };
}
