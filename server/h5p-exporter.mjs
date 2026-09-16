import crypto from 'node:crypto';

/**
 * Table CRC32 précalculée pour création de ZIP rapide et sans dépendance externe
 */
function createCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Crée un buffer ZIP en mémoire conforme aux spécifications PKZIP
 * @param {Array<{path: string, content: string|Buffer, isDir?: boolean}>} entries
 * @returns {Buffer}
 */
export function buildZipBuffer(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    let filePath = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (entry.isDir && !filePath.endsWith('/')) filePath += '/';
    const pathBuf = Buffer.from(filePath, 'utf-8');
    const contentBuf = entry.isDir
      ? Buffer.alloc(0)
      : (Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content || '', 'utf-8'));
    const crc = entry.isDir ? 0 : crc32(contentBuf);
    const size = contentBuf.length;

    // Local File Header
    const lh = Buffer.alloc(30 + pathBuf.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(pathBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    pathBuf.copy(lh, 30);

    localHeaders.push(lh, contentBuf);

    // Central Directory Header
    const cdh = Buffer.alloc(46 + pathBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(0, 10);
    cdh.writeUInt16LE(dosTime, 12);
    cdh.writeUInt16LE(dosDate, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(size, 20);
    cdh.writeUInt32LE(size, 24);
    cdh.writeUInt16LE(pathBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt16LE(entry.isDir ? 0x10 : 0x20, 38);
    cdh.writeUInt32LE(offset, 42);
    pathBuf.copy(cdh, 46);

    centralHeaders.push(cdh);
    offset += lh.length + contentBuf.length;
  }

  const centralDirSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const cdOffset = offset;

  // End of Central Directory (EOCD)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * Formate un texte brut en HTML pour H5P
 */
function toH5pHtml(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed;
  return `<p>${trimmed.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
}

/**
 * Génère le contenu d'un package .h5p QuestionSet compatible LogiQuiz & Digiquiz (La Digitale)
 * @param {object} quiz - Données du quiz avec feedbacks formateurs
 * @returns {Buffer} Buffer du fichier .h5p
 */
export function generateH5PQuestionSetPackage(quiz) {
  const title = quiz.title || 'Quiz H5P';
  const description = quiz.description || '';
  const rawQuestions = quiz.content?.questions || [];

  // Si c'est des flashcards, conversion automatique en QCM
  let questionsToExport = [];
  if (quiz.type === 'flashcards' && quiz.content?.cards) {
    questionsToExport = quiz.content.cards.map((card, idx) => ({
      id: `q_${idx + 1}`,
      question: card.front || `Carte ${idx + 1}`,
      type: 'multichoice',
      answers: [
        {
          id: `ans_${idx + 1}_1`,
          text: card.back || 'Réponse',
          correct: true,
          feedback: "Excellente réponse ! Définition parfaitement acquise."
        }
      ],
      explanation: card.hint || undefined
    }));
  } else {
    questionsToExport = rawQuestions;
  }

  // Structure des métadonnées H5P
  const h5pMeta = {
    title,
    language: 'fr',
    mainLibrary: 'H5P.QuestionSet',
    embedTypes: ['iframe'],
    license: 'CC BY-SA',
    defaultLanguage: 'fr',
    author: 'QuizFeedback',
    preloadedDependencies: [
      { machineName: 'H5P.QuestionSet', majorVersion: 1, minorVersion: 20 },
      { machineName: 'H5P.MultiChoice', majorVersion: 1, minorVersion: 16 },
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 },
      { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }
    ]
  };

  // Transformation des questions en blocs H5P.MultiChoice avec rétroactions Pascal Pansu
  const h5pQuestions = questionsToExport.map((q, qIdx) => {
    const qAnswers = (q.answers || []).map((ans, aIdx) => {
      const isCorrect = Boolean(ans.correct);
      const chosenFeedback = ans.feedback
        ? `<div>${ans.feedback}</div>`
        : (isCorrect && q.feedbackCorrect ? `<div>${q.feedbackCorrect}</div>` : '');

      return {
        text: `<div>${ans.text || `Option ${aIdx + 1}`}</div>`,
        correct: isCorrect,
        tipsAndFeedback: {
          tip: '',
          chosenFeedback,
          notChosenFeedback: ''
        }
      };
    });

    return {
      library: 'H5P.MultiChoice 1.16',
      params: {
        question: toH5pHtml(q.question || `Question ${qIdx + 1}`),
        answers: qAnswers,
        behaviour: {
          enableRetry: true,
          enableSolutionsButton: true,
          singlePoint: true,
          randomAnswers: quiz.options?.randomizeAnswers !== false,
          showSolutionsRequiresInput: true,
          confirmCheckDialog: false,
          confirmRetryDialog: false,
          autoCheck: quiz.options?.correctionMode === 'immediate',
          passPercentage: 100,
          showScorePoints: true
        },
        UI: {
          checkAnswerButton: 'Vérifier',
          showSolutionButton: 'Voir la solution',
          tryAgainButton: 'Recommencer'
        },
        tipsAndFeedback: {
          overallFeedback: q.explanation ? `<div>${q.explanation}</div>` : ''
        }
      },
      subContentId: crypto.randomUUID()
    };
  });

  const contentJson = {
    introPage: {
      showIntroPage: Boolean(description),
      title,
      introduction: toH5pHtml(description)
    },
    progressType: 'dots',
    passPercentage: quiz.options?.passPercentage || 60,
    disableBackwardsNavigation: false,
    randomQuestions: Boolean(quiz.options?.randomizeQuestions),
    endScreenScoreBar: true,
    override: {
      checkButton: true
    },
    questions: h5pQuestions
  };

  const entries = [
    {
      path: 'h5p.json',
      content: JSON.stringify(h5pMeta, null, 2)
    },
    {
      path: 'content/content.json',
      content: JSON.stringify(contentJson, null, 2)
    }
  ];

  return buildZipBuffer(entries);
}
